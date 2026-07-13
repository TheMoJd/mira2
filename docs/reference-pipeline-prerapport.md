# Référence — Pipeline du pré-rapport freemium

> **Quadrant Diataxis : Reference.** Description factuelle et exhaustive du sous-système
> pré-rapport, dérivée du code. Pour comprendre *pourquoi* il est construit ainsi, voir
> [explanation-architecture-et-garde-fous.md](explanation-architecture-et-garde-fous.md).
> Pour le faire tourner, voir [howto-developpement-local.md](howto-developpement-local.md).

Le pré-rapport est un diagnostic gratuit : un visiteur remplit un formulaire, MIRA croise
ses réponses avec une banque de statistiques sourcées, un LLM rédige un rapport structuré,
et le PDF part par email. Tout le compute vit dans des **Netlify Functions** ; la donnée
et les fichiers dans **Supabase**.

## Vue d'ensemble du flux

```
Navigateur (SPA /pre-rapport)
   │  multipart/form-data
   ▼
submit-prerapport            (function synchrone, < quelques s)
   │  valide · honeypot · rate-limit · upload plaquette · insert lead (received)
   │  → 202 { ok, leadId }
   │  POST { leadId }
   ▼
generate-prerapport-background   (background function, ≤ 15 min)
   │  claim atomique (received → generating)
   │  enrichissement SIRET + site (best-effort)
   │  OpenAI (sortie structurée json_schema) → report_json
   │  renderReportHtml → htmlToPdf (Chromium) → bucket reports
   │  insert reports · email Resend (PDF joint)
   ▼  status = sent   (ou failed + notifyFailure si exception)
Supabase (Postgres + Storage)
```

---

## Frontend (SPA)

| Élément | Fichier | Rôle |
|---------|---------|------|
| Routing | [`src/App.tsx`](../src/App.tsx) | `/` = landing, `/pre-rapport` = wizard, `/rapport/:leadId` = page d'atterrissage des anciens liens, `*` → redirige vers `/`. |
| Page wizard | [`src/pages/PreRapport.tsx`](../src/pages/PreRapport.tsx) | Header épuré + `<Wizard/>`. |
| Page rapport (héritée) | [`src/pages/ReportView.tsx`](../src/pages/ReportView.tsx) | N'affiche **plus** le rapport : depuis le passage en livraison email-only, elle montre « Votre pré-rapport arrive par email ». La route est conservée pour que les anciens liens partagés ne tombent pas sur une 404. |
| Wizard | [`src/components/prerapport/Wizard.tsx`](../src/components/prerapport/Wizard.tsx) | Formulaire en 3 vues (`intro` → `form` → `success`), 5 étapes. |
| Validation | [`src/components/prerapport/validation.ts`](../src/components/prerapport/validation.ts) | `validateStep(step, form)` — `STEP_COUNT = 5`. Exporte les règles **partagées avec le serveur** (`EMAIL_RE`, `PHONE_RE`, `MAX_IDENTITY_LEN`, `normalizePhone`) : `submit-prerapport` importe les mêmes constantes pour éviter toute dérive client/serveur. |
| Soumission | [`src/components/prerapport/submit.ts`](../src/components/prerapport/submit.ts) | `submitPreRapport(form, honeypot)` → POST multipart. |
| Contrat de données | [`src/types/prerapport.ts`](../src/types/prerapport.ts) | `PreRapportForm`, `PreRapportErrors`, `emptyPreRapportForm`. |
| Contenu (copie) | [`src/data/prerapport.ts`](../src/data/prerapport.ts) | Tous les textes du wizard (intro, étapes, champs, consentement, succès). |

### Les 5 étapes

| Étape | Champs | Obligatoire ? |
|-------|--------|---------------|
| 0 — Entreprise | `secteurActivite` (Q1, textarea), `siret` (14 chiffres) | secteur oui ; SIRET optionnel |
| 1 — Offre | `produitsServices` (Q2), `clients` (Q3) | oui |
| 2 — Métiers | `famillesMetiers` (Q4, liste de tags, 1 à 6) | oui (≥ 1) |
| 3 — Compléments | `siteUrl` (URL), `plaquette` (fichier) | optionnels |
| 4 — Réception | `prenom`, `nom`, `fonction`, `telephone`, `email` (pro), `consentRgpd` (case) | prénom, nom, email et consentement oui ; fonction et téléphone optionnels |

Les champs d'identité (prénom, nom, fonction, téléphone) qualifient le lead pour le suivi
commercial (réunion du 10/07/2026). Le téléphone est normalisé (`normalizePhone` : espaces,
points, tirets et parenthèses retirés, `0033…`/`+33 (0)…` repliés sur `+33…`) avant validation
par `PHONE_RE` (format FR : `0X…` ou `+33X…`).

Le champ `company_website_hp` est un **honeypot** anti-bot (hors flux, invisible) ; un humain
ne le remplit jamais. Voir [explanation](explanation-architecture-et-garde-fous.md#anti-abus).

Au succès de la soumission, le wizard affiche l'écran « Votre pré-rapport arrive par email »
(pas de redirection : le rapport n'est plus consultable en ligne).
`src/components/report/ReportDocument.tsx` (affichage web React du rapport) est un **héritage**
de l'époque du rapport en ligne : plus monté par aucune page, il n'est référencé que par son
test. Le rendu de référence du rapport est `reportHtml.ts` (PDF).

---

## Netlify Functions

Configuration dans [`netlify.toml`](../netlify.toml) :

```toml
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
  external_node_modules = ["@sparticuz/chromium", "puppeteer-core"]
```

`external_node_modules` empêche esbuild d'inliner le binaire Chromium (résolu au runtime).

### `submit-prerapport` (synchrone)

[`netlify/functions/submit-prerapport.ts`](../netlify/functions/submit-prerapport.ts)

- **Méthode** : `POST` uniquement (sinon `405`).
- **Entrée** : `multipart/form-data` (sinon `415` / `400` si boundary absente).
- **Déroulé** : parse multipart → honeypot → validation serveur → rate-limit → upload plaquette → insert lead → déclenche la génération → `202`.
- **Sortie** : `202 { ok: true, leadId }` (ou `{ ok: true }` factice si honeypot piégé).

Validation serveur (jamais de confiance au client) :

| Règle | Détail |
|-------|--------|
| Champs obligatoires | `secteurActivite`, `produitsServices`, `clients` non vides → sinon `422`. |
| Longueurs | Textes libres Q1–Q3 ≤ 3 000 caractères (`MAX_FREETEXT_LEN`) ; chaque famille ≤ 120 → sinon `422`. Garde anti-abus : ces textes partent dans le prompt OpenAI. |
| Familles | 1 à 6 entrées → sinon `422`. |
| Identité | `prenom` et `nom` non vides après `cleanIdentity` (caractères de contrôle/format retirés, espaces repliés) ; prénom, nom et fonction ≤ 120 caractères (`MAX_IDENTITY_LEN`) → sinon `422`. |
| Téléphone | si fourni, doit matcher `PHONE_RE` après normalisation → sinon `422`. |
| Email | regex `EMAIL_RE` (partagée avec le wizard) → sinon `422`. |
| Consentement | `consentRgpd === 'true'` → sinon `422`. |
| SIRET | si fourni, exactement 14 chiffres → sinon `422`. |
| Plaquette | `≤ 4 Mo` (`MAX_PLAQUETTE_BYTES`), extensions `.pdf .ppt .pptx .doc .docx` → sinon `413` / `415`. |
| Rate-limit | max **3 soumissions par email / heure** → sinon `429`. |

Codes d'erreur : `405` méthode, `415` type, `400` multipart, `422` validation, `413` taille,
`429` rate-limit, `502` échec upload/insert, `500` config serveur manquante.

La plaquette est stockée dans le bucket `uploads` à `{uuid}/{nom-fichier-assaini}`.

### `generate-prerapport-background` (asynchrone)

[`netlify/functions/generate-prerapport-background.ts`](../netlify/functions/generate-prerapport-background.ts)

Background function Netlify (suffixe `-background`) : répond immédiatement et tourne
jusqu'à **15 min**.

- **Entrée** : `POST { leadId }`.
- **Déroulé** :
  1. Charge le lead. **Claim atomique** `received → generating` (compare-and-set) — garantit l'idempotence (un second déclenchement ne matche aucune ligne et abandonne).
  2. Enrichissement best-effort : `enrichSiret(siret)` + `fetchSiteResume(siteUrl)`. Persiste `naf_code` / `effectif_tranche` découverts (sans écraser l'existant).
  3. Construit le `GenerationContext`, mappe les familles déclarées vers ISCO (`mapFamilles`).
  4. Appel **OpenAI** `chat.completions.create` avec `response_format = RESPONSE_FORMAT` (json_schema strict). Parse → `report_json`, persisté sur le lead.
  5. `renderReportHtml(report, ctx)` → `htmlToPdf(html)` → upload `reports/{leadId}/prerapport-mira.pdf` (`upsert: true`).
  6. Insert ligne `reports` (`sources` = ids de stats réellement citées, filtrés sur la stat-bank par `citedStatIds`).
  7. `sendReportEmail(...)`. Si l'email échoue alors que Resend était configuré → `notifyFailure` (mais on reste en `sent`, le PDF est récupérable).
  8. `status = sent`.
- **Échec** : toute exception → `status = failed` + `notifyFailure`.

### `envcheck` (diagnostic, temporaire)

[`netlify/functions/envcheck.ts`](../netlify/functions/envcheck.ts)

`GET /.netlify/functions/envcheck` renvoie, pour les variables d'env critiques (Resend,
Supabase, OpenAI), **uniquement leur présence** (booléen) et la longueur de la valeur —
jamais la valeur — plus le préfixe (3 caractères) de la clé Resend pour vérifier qu'elle
commence par `re_`. Sert à diagnostiquer ce que le runtime des functions voit réellement
(cas typique : variable posée dans Netlify mais absente au runtime). **À supprimer une fois
le diagnostic terminé** (le fichier porte le même avertissement).

### Bibliothèques de functions

| Fichier | Export | Rôle |
|---------|--------|------|
| [`lib/enrichment.ts`](../netlify/functions/lib/enrichment.ts) | `enrichSiret(siret)` | SIRET (14 chiffres) → `{ nomEntreprise, nafCode, nafLibelle, effectifTranche, categorieEntreprise, anneeCreation, localisation, actif }` via `recherche-entreprises.api.gouv.fr` (gratuit, sans clé). Tous les champs sont best-effort (souvent partiels). Retourne `{}` en cas d'échec. |
| | `fetchSiteResume(siteUrl)` | URL → résumé texte (≤ 2500 car.). Suit les redirections **manuellement** en re-validant l'hôte (anti-SSRF). Retourne `undefined` en cas d'échec. |
| [`lib/pdf.ts`](../netlify/functions/lib/pdf.ts) | `htmlToPdf(html, opts?)` | HTML autoportant → `Buffer` PDF A4 via `puppeteer-core` + `@sparticuz/chromium`. Override local par `CHROME_EXECUTABLE_PATH`. |
| [`lib/email.ts`](../netlify/functions/lib/email.ts) | `sendReportEmail({to, pdf, nomEntreprise})` | Resend, PDF en pièce jointe. Retourne `'sent' \| 'skipped' \| 'error'` — `'skipped'` si Resend non configuré (jamais de throw). Si `RESEND_REPLY_TO` est définie, les réponses des prospects partent vers cette boîte (sinon vers le `from`). |
| | `notifyFailure({leadId, error})` | Email de repli ops (no-op loggé si `OPS_EMAIL`/Resend absents). |

---

## Couche données & contenu (`src/data`)

Partagée entre le front et les functions (les functions importent ces modules ; voir
`include` dans [`netlify/functions/tsconfig.json`](../netlify/functions/tsconfig.json)).

| Module | Rôle | Surface clé |
|--------|------|-------------|
| [`statbank.ts`](../src/data/statbank.ts) | Banque de ~76 statistiques sourcées, **seule source de chiffres citables**. | `statbank`, `StatEntry`, `statsForSection`, `socleStats`, `franceLayerStats`, `statsBySource`, `statsByTheme`, `statById`. |
| [`rapportStructure.ts`](../src/data/rapportStructure.ts) | Les 10 sections §0→§9 + la **grille `allowedSources`** (section → sources autorisées). | `reportSections`, `statsForSection(section)`, types `ExpositionLevel`/`ImpactNature`/`ConfidenceLevel`. |
| [`reportPrompt.ts`](../src/data/reportPrompt.ts) | Prompt de génération. | `SYSTEM_PROMPT` (10 règles absolues), `buildUserMessage(ctx)`, `GenerationContext`. |
| [`reportSchema.ts`](../src/data/reportSchema.ts) | Contrat de sortie OpenAI. `parseReport(raw)` parse, valide **et normalise** (via `sanitizeReportProse`) la réponse du modèle. | `RESPONSE_FORMAT` (json_schema, `strict: true`), `parseReport`, `PreRapportOutput`, `ReportSectionOutput`, `ReportFamille`. |
| [`reportSanitize.ts`](../src/data/reportSanitize.ts) | Verrou de style sur la prose LLM : tirets cadratins/demi-cadratins et points-virgules → virgules (plages numériques « 2025-2030 » et signes moins « -5 % » préservés). Appliqué par `parseReport` avant persistance et rendu PDF. | `sanitizeProse`, `sanitizeReportProse`. |
| [`reportHtml.ts`](../src/data/reportHtml.ts) | Gabarit HTML du PDF (fonction pure, sans React). Structure : page de garde brandée (logo, slogan, proposition de valeur) → carte d'identité (page 2) → sections §0→§9 avec tableau récapitulatif « En un coup d'œil » en §3 → « Sources mobilisées » (titres dédupliqués org + année) → page de fin « Transparence et mentions » (génération assistée par IA + mention RGPD). Un filigrane « MIRA AUDIT » (élément `position:fixed`, opacité 5 %) est répété sur chaque page du PDF. | `renderReportHtml(report, ctx)`, `ReportRenderContext`, `SLOGAN`, `VALUE_PROP`. |
| [`famillesMetiers.ts`](../src/data/famillesMetiers.ts) | ~28 familles de métiers (ISCO-08) du champ guidé Q4. | `famillesMetiers`, `famillesParDomaine`, `famillesByIsco`. |
| [`rgpd.ts`](../src/data/rgpd.ts) | Mentions RGPD factuelles (pied de la page de fin du PDF + bas de l'email). Pas d'affirmation de conformité ; la mention d'information juridique complète reste à intégrer après validation métier/juridique. | `RGPD_PDF_FOOTER`, `RGPD_EMAIL_NOTICE`, `EMAIL_SENDER_NAME`. |

### Sources de la stat-bank

- **Socle des 11 sources** (`inSocle: true`) : `S01` ILO · `S02` Stanford AI Index 2026 · `S04` MIT Collaborating with AI Agents · `S05` OCDE Inclusive transformation · `S06` WEF Future of Jobs 2025 · `S07` CIANum · `S08` OCDE Capability · `S10` Indeed · `S12` PwC · `S13` MIT Iceberg · `S14` OCDE Workers most affected.
- **Couche France** (`inSocle: false`) : `FR1` Parlons RH 2025 · `FR2` Parlons RH 2026 · `FR3` CEGOS 2025 · `FR4` Neobrain × Sopra Steria.

Chaque `StatEntry` porte : `id`, `value`, `unit`, `claim` (FR citable), `verbatim` (audit),
`theme`, `scope`, `source` (avec `sourceId` + `inSocle` + `page`), `provenance`
(`primaire`/`secondaire`), `projection?`.

### Les 10 sections (§0→§9)

| § | id | Contenu | Sources autorisées |
|---|----|---------|--------------------|
| 0 | `perimetre` | Carte d'identité du rapport | — |
| 1 | `synthese-strategique` | 3-4 messages clés | `*` (transversal) |
| 2 | `contexte` | État de l'IA | S02, S07, S08, FR1, FR2 |
| 3 | `familles-metiers` | **Cœur** : caractérisation par famille | S01, S06, S10, S12, S13, S14, FR1, FR2 |
| 4 | `competences` | Compétences montantes/déclinantes | S06, S08, S10, S12 |
| 5 | `reorganisation` | Collaboration humain-IA | S04, S07 |
| 6 | `facteur-humain` | Profils exposés, équité | S01, S14 |
| 7 | `repere-sectoriel` | Benchmark adoption secteur | S02, S05, S06, FR1–FR4 |
| 8 | `lecture-strategique` | Pont vers le payant (texte figé) | `*` |
| 9 | `sources-methode` | **Figé** : socle + limites | `*` |

`statsForSection(section)` applique cette grille : une section ne peut citer QUE les stats
dont `source.sourceId` figure dans son `allowedSources` (`'*'` = toutes). C'est le verrou
anti-hors-périmètre.

---

## Modèle de données (Supabase)

Types générés dans [`src/types/supabase.ts`](../src/types/supabase.ts) (régénérer après
migration via le MCP Supabase `generate_typescript_types` ou `supabase gen types`).

Le schéma est versionné dans [`supabase/migrations/`](../supabase/migrations/) :
`0001_init_prerapport.sql` (tables, enum, buckets), `0002_add_report_json_to_leads.sql`
(rattrapage de la colonne `report_json` appliquée en prod le 22/06/2026) et
`0003_leads_qualification.sql` (colonnes de qualification, 10/07/2026). Ces fichiers visent
la **reconstruction d'un environnement neuf** ; contre la prod, l'historique distant utilise
des versions horodatées différentes — ne pas lancer `supabase db push` sans
`supabase migration repair` (voir l'en-tête de `0003`).

### Table `leads`

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | uuid (pk) | |
| `created_at` | timestamptz | |
| `email` | text | |
| `prenom` | text \| null | qualification lead — requis côté formulaire depuis le 10/07/2026 (null pour les leads antérieurs) |
| `nom` | text \| null | idem `prenom` |
| `fonction` | text \| null | optionnel — ciblage RH / dirigeant |
| `telephone` | text \| null | optionnel — normalisé (`0X…` / `+33X…`) |
| `siret` | text \| null | |
| `secteur_activite` | text | Q1 |
| `produits_services` | text | Q2 |
| `clients` | text | Q3 |
| `familles_metiers` | text[] | Q4 |
| `site_url` | text \| null | Q5a |
| `plaquette_path` | text \| null | chemin dans bucket `uploads` |
| `naf_code` | text \| null | enrichissement INSEE |
| `effectif_tranche` | text \| null | enrichissement INSEE |
| `report_json` | jsonb \| null | sortie LLM structurée |
| `consent_rgpd` | boolean | |
| `status` | enum `lead_status` | `received \| generating \| sent \| failed` |

### Table `reports`

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | uuid (pk) | |
| `lead_id` | uuid (fk → leads) | |
| `pdf_path` | text | chemin dans bucket `reports` |
| `generated_at` | timestamptz | |
| `model` | text \| null | modèle OpenAI utilisé |
| `sources` | jsonb \| null | ids des stats citées (audit) |

### Storage

- Bucket `uploads` — plaquettes envoyées par les leads (privé).
- Bucket `reports` — PDF générés (privé). Pas de lien public ; le PDF circule par email.

---

## Variables d'environnement

À placer dans `.env` en local, et dans Netlify → Site configuration → Environment variables
en production. Voir [`.env.example`](../.env.example).

| Variable | Requis | Utilisé par | Rôle |
|----------|--------|-------------|------|
| `SUPABASE_URL` | ✅ | submit, generate | Endpoint du projet Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | submit, generate | Clé `service_role` — **secrète, serveur uniquement**, bypass RLS. |
| `OPENAI_API_KEY` | ✅ | generate | Clé OpenAI. |
| `OPENAI_MODEL` | optionnel | generate | Modèle. Défaut : `gpt-4.1`. |
| `RESEND_API_KEY` | optionnel | email | Absent → email `skipped` (le PDF reste stocké). |
| `RESEND_FROM` | optionnel | email | Adresse expéditeur (domaine vérifié). Format « Nom <adresse> » ou adresse seule. |
| `RESEND_REPLY_TO` | optionnel | email | Boîte qui reçoit les réponses des prospects (le domaine d'envoi n'a pas de boîte derrière). Absent → réponses vers le `from`. |
| `OPS_EMAIL` | optionnel | email | Destinataire des alertes d'échec (`notifyFailure`). |
| `CHROME_EXECUTABLE_PATH` | dev local | pdf | Chemin vers Chrome/Edge local (le binaire `@sparticuz/chromium` est Linux). |
| `URL` | fourni par Netlify | submit | Base URL pour déclencher la background function. |

En cas de doute sur ce que le runtime voit réellement en production, la function
[`envcheck`](#envcheck-diagnostic-temporaire) renvoie la présence (jamais la valeur) de
chacune de ces variables.

---

## Scripts d'exploitation (`scripts/`)

Scripts ponctuels lancés à la main avec `npx tsx` (ils lisent `.env` directement, sans
dotenv). Ils utilisent la clé `service_role` : **usage interne uniquement**.

| Script | Usage | Rôle |
|--------|-------|------|
| [`resend-report.ts`](../scripts/resend-report.ts) | `npx tsx scripts/resend-report.ts <leadId>` | Renvoie par email un rapport **déjà généré** : télécharge `reports/{leadId}/prerapport-mira.pdf`, l'envoie via Resend à l'email du lead (respecte `RESEND_REPLY_TO`). Ne régénère rien. |
| [`investigate-leads.ts`](../scripts/investigate-leads.ts) | `npx tsx scripts/investigate-leads.ts` | Liste les 20 derniers leads (statut, présence du `report_json`) et les 20 dernières lignes `reports` — le premier réflexe quand « un email n'est pas parti ». |
| [`generate-samples.ts`](../scripts/generate-samples.ts) | `npx tsx scripts/generate-samples.ts` | Génère des pré-rapports d'exemple sur de **vraies entreprises** (enrichissement INSEE réel + vrai appel OpenAI + rendu HTML), audite la grille de sources au passage, et écrit les artefacts versionnés dans [`docs/samples/`](samples/). |

> Pour renvoyer un rapport ou diagnostiquer un lead pas à pas, voir le
> [how-to](howto-developpement-local.md#scripts-dexploitation).

---

## Tests

`npm test` (Vitest). Exemples notables :

- [`netlify/functions/lib/enrichment.test.ts`](../netlify/functions/lib/enrichment.test.ts) — garde anti-SSRF (refus des hôtes internes, non-suivi des redirections vers IP privées / métadonnées cloud), nettoyage HTML, rejet SIRET invalide sans appel réseau.
- [`src/data/reportPrompt.test.ts`](../src/data/reportPrompt.test.ts), [`src/data/reportSchema.test.ts`](../src/data/reportSchema.test.ts), [`src/data/rapportStructure.test.ts`](../src/data/rapportStructure.test.ts), [`src/data/statbank.test.ts`](../src/data/statbank.test.ts), [`src/data/reportHtml.test.ts`](../src/data/reportHtml.test.ts) — invariants de la couche contenu.
- [`src/components/prerapport/validation.test.ts`](../src/components/prerapport/validation.test.ts) — validation du wizard (dont identité et normalisation téléphone).
- [`src/data/reportSanitize.test.ts`](../src/data/reportSanitize.test.ts) — verrou de style (tirets/points-virgules → virgules, plages et signes moins préservés).
- [`netlify/functions/__tests__/submit-prerapport.test.ts`](../netlify/functions/__tests__/submit-prerapport.test.ts) — validation serveur de `submit-prerapport` (branches `422`, insert Supabase mocké : normalisation téléphone, `cleanIdentity`, `null` pour les optionnels vides).
- [`src/components/prerapport/submit.test.ts`](../src/components/prerapport/submit.test.ts) — contrat de transport client/serveur : les clés `FormData` envoyées correspondent exactement à ce que lit le handler.
