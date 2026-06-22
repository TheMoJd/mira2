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
| Routing | [`src/App.tsx`](../src/App.tsx) | `/` = landing, `/pre-rapport` = wizard, `*` → redirige vers `/`. |
| Page wizard | [`src/pages/PreRapport.tsx`](../src/pages/PreRapport.tsx) | Header épuré + `<Wizard/>`. |
| Wizard | [`src/components/prerapport/Wizard.tsx`](../src/components/prerapport/Wizard.tsx) | Formulaire en 3 vues (`intro` → `form` → `success`), 5 étapes. |
| Validation | [`src/components/prerapport/validation.ts`](../src/components/prerapport/validation.ts) | `validateStep(step, form)` — `STEP_COUNT = 5`. |
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
| 4 — Réception | `email` (pro), `consentRgpd` (case) | oui |

Le champ `company_website_hp` est un **honeypot** anti-bot (hors flux, invisible) ; un humain
ne le remplit jamais. Voir [explanation](explanation-architecture-et-garde-fous.md#anti-abus).

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
| Familles | 1 à 6 entrées → sinon `422`. |
| Email | regex `^[^\s@]+@[^\s@]+\.[^\s@]+$` → sinon `422`. |
| Consentement | `consentRgpd === 'true'` → sinon `422`. |
| SIRET | si fourni, exactement 14 chiffres → sinon `422`. |
| Plaquette | `≤ 4 Mo` (`MAX_PLAQUETTE_BYTES`), extensions `.pdf .ppt .pptx .doc .docx` → sinon `413` / `415`. |
| Rate-limit | max **3 soumissions par email / heure** → sinon `429`. |

> **Écart connu** : le hint UI ([`prerapport.ts`](../src/data/prerapport.ts)) annonce « 10 Mo
> maximum » alors que le serveur plafonne à **4 Mo**. Comportement réel = 4 Mo.

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

### Bibliothèques de functions

| Fichier | Export | Rôle |
|---------|--------|------|
| [`lib/enrichment.ts`](../netlify/functions/lib/enrichment.ts) | `enrichSiret(siret)` | SIRET (14 chiffres) → `{ nomEntreprise, nafCode, nafLibelle, effectifTranche }` via `recherche-entreprises.api.gouv.fr` (gratuit, sans clé). Retourne `{}` en cas d'échec. |
| | `fetchSiteResume(siteUrl)` | URL → résumé texte (≤ 2500 car.). Suit les redirections **manuellement** en re-validant l'hôte (anti-SSRF). Retourne `undefined` en cas d'échec. |
| [`lib/pdf.ts`](../netlify/functions/lib/pdf.ts) | `htmlToPdf(html, opts?)` | HTML autoportant → `Buffer` PDF A4 via `puppeteer-core` + `@sparticuz/chromium`. Override local par `CHROME_EXECUTABLE_PATH`. |
| [`lib/email.ts`](../netlify/functions/lib/email.ts) | `sendReportEmail({to, pdf, nomEntreprise})` | Resend, PDF en pièce jointe. Retourne `'sent' \| 'skipped' \| 'error'` — `'skipped'` si Resend non configuré (jamais de throw). |
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
| [`reportSchema.ts`](../src/data/reportSchema.ts) | Contrat de sortie OpenAI. | `RESPONSE_FORMAT` (json_schema, `strict: true`), `PreRapportOutput`, `ReportSectionOutput`, `ReportFamille`. |
| [`reportHtml.ts`](../src/data/reportHtml.ts) | Gabarit HTML du PDF (fonction pure, sans React). | `renderReportHtml(report, ctx)`, `ReportRenderContext`. |
| [`famillesMetiers.ts`](../src/data/famillesMetiers.ts) | ~28 familles de métiers (ISCO-08) du champ guidé Q4. | `famillesMetiers`, `famillesParDomaine`, `famillesByIsco`. |
| [`rgpd.ts`](../src/data/rgpd.ts) | Mentions RGPD (placeholders Victor/Jean-Marie). | `RGPD_PDF_FOOTER`, `RGPD_EMAIL_NOTICE`, `EMAIL_SENDER_NAME`. |

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

### Table `leads`

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | uuid (pk) | |
| `created_at` | timestamptz | |
| `email` | text | |
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
| `RESEND_FROM` | optionnel | email | Adresse expéditeur (domaine vérifié). |
| `OPS_EMAIL` | optionnel | email | Destinataire des alertes d'échec (`notifyFailure`). |
| `CHROME_EXECUTABLE_PATH` | dev local | pdf | Chemin vers Chrome/Edge local (le binaire `@sparticuz/chromium` est Linux). |
| `URL` | fourni par Netlify | submit | Base URL pour déclencher la background function. |

> **Écart connu** : le code lit `process.env.RESEND_FROM`, mais `.env.example` nomme la
> variable `RESEND_FROM_EMAIL`. Avec le nom du `.env.example`, `senderOrNull()` renvoie `null`
> et **aucun email n'est envoyé** (`skipped`). Aligner les deux avant d'activer Resend.
> `OPS_EMAIL` est par ailleurs absent de `.env.example`.

---

## Tests

`npm test` (Vitest). Exemples notables :

- [`netlify/functions/lib/enrichment.test.ts`](../netlify/functions/lib/enrichment.test.ts) — garde anti-SSRF (refus des hôtes internes, non-suivi des redirections vers IP privées / métadonnées cloud), nettoyage HTML, rejet SIRET invalide sans appel réseau.
- [`src/data/reportPrompt.test.ts`](../src/data/reportPrompt.test.ts), [`src/data/reportSchema.test.ts`](../src/data/reportSchema.test.ts), [`src/data/rapportStructure.test.ts`](../src/data/rapportStructure.test.ts), [`src/data/statbank.test.ts`](../src/data/statbank.test.ts), [`src/data/reportHtml.test.ts`](../src/data/reportHtml.test.ts) — invariants de la couche contenu.
- [`src/components/prerapport/validation.test.ts`](../src/components/prerapport/validation.test.ts) — validation du wizard.
