# TODO — Pré-rapport freemium MIRA

Backlog issu des demandes CEO (réunions du 25/06 puis du 10/07/2026). **À valider en équipe
avant implémentation.** Sert de PRD léger + backlog : chaque item porte un *contrat* (ce que
« fait » veut dire), des *critères d'acceptation* et ses *dépendances*.

**Légende priorité** — `P0` = à faire maintenant · `S1` = sprint courant · `S2` = ensuite.
Statut : `[ ]` à faire · `[~]` en cours · `[x]` fait.

---

## 🔴 Réunion du 10/07/2026 — objectif : comm officielle West Web le **mercredi 15/07**

Jalons : modifs plateforme pour le **10/07** · feedbacks Caroline **12/07** · benchmark
modèles **14/07** · **point de suivi 14/07 à 17h30** · comm le **15/07** · plaquette de
vente **24/07** · commercialisation fin août.

### [x] R1 · Rapport : filigrane + chasse aux signaux « IA » (P0, deadline 10/07) — fait le 10/07
- **Contrat** : (a) filigrane « Mira Audit » en fond de chaque page du PDF ; (b) plus aucun
  tiret long dans les rapports générés ; (c) suppression de la mention « rapports croisés /
  5 sources ».
- **Fait** :
  - (a) `renderWatermark()` dans `src/data/reportHtml.ts` — contrairement à la crainte
    initiale, `position:fixed` **est** re-peint par Chromium sur chaque page imprimée :
    vérifié empiriquement sur un PDF local de 7 pages (rendu Doctolib, 1 filigrane/page).
  - (b) verrou garanti ajouté : `src/data/reportSanitize.ts` (tirets cadratins/demi-cadratins
    → virgule, plages numériques préservées, `;` → virgule), appliqué dans `parseReport`
    (donc prod + script d'échantillons) + tests `reportSanitize.test.ts`. Justifié : un
    échantillon existant contenait déjà « (Parlons RH, 2025 ; Parlons RH, 2026) ».
  - (c) ticker du hero : « Rapports croisés / 5 sources » → « Pré-rapport en / 10 minutes »
    (claim produit déjà utilisé ailleurs, défendable).
- **Reste** : intégrer les feedbacks précis de Caroline sur le rapport (12/07).

### [x] R2 · Formulaire : qualification des leads (P0, deadline 10/07) — fait le 10/07
- **Contrat** : le wizard collecte **nom, prénom, fonction, téléphone (optionnel)** en plus
  de l'email, et ces champs arrivent en base pour permettre le suivi commercial.
- **Tranché (proposition retenue, à confirmer en équipe)** : prénom + nom **obligatoires**,
  fonction et téléphone **optionnels** (fonction marquée « recommandée » dans le hint).
- **Fait** : types + copie + étape 5 du wizard (prénom/nom côte à côte, classe responsive
  `.pr-identity`), validation client (`PHONE_RE` FR + `normalizePhone`) et serveur alignées
  (422 + garde longueur 120), transport `submit.ts`, insert `submit-prerapport.ts`,
  migration `supabase/migrations/0003_leads_qualification.sql` **appliquée en prod** (colonnes
  nullable : les leads historiques n'ont pas ces champs), `src/types/supabase.ts` régénéré
  via MCP, `TESTS-MANUELS.md` (cas 2f/2g + SQL de vérif), tests validation étendus.
  Au passage (review /ship) : migration `0002_add_report_json_to_leads.sql` rattrapée —
  la colonne existait en prod depuis le 22/06 mais n'avait jamais été versionnée.
- **⚠️ RGPD (reste ouvert)** : `RGPD_EMAIL_NOTICE` ajustée factuellement (recontact si
  accepté) ; le consentement wizard couvrait déjà le recontact. **Validation juridique
  (Victor) toujours attendue** — minimisation : le téléphone reste optionnel et justifié
  par le suivi commercial.

### [~] R3 · Landing : clarifier les deux offres (P0, deadline 10/07) — code fait, copie en attente Caroline
- **Contrat** : deux parcours lisibles — pré-rapport gratuit automatisé **vs** rapport
  complet personnalisé (prestation **Polaria**). Renommer « Explorer un rapport » en
  « Générer mon pré-rapport » ; ajouter un bouton « Nous contacter pour une analyse
  complète ».
- **Fait (décisions intérimaires, faciles à ajuster)** :
  - Pour éviter deux CTA identiques vers `/pre-rapport`, le **CTA principal** porte le
    wording demandé : `mira.brand.cta` = « Générer mon pré-rapport gratuit » (Nav + Hero +
    FinalCTA, « gratuit » conservé car c'est l'angle de la comm West Web).
  - Le bouton secondaire du hero devient « Nous contacter pour une analyse complète » →
    **`#tarifs`** (la section Pricing porte l'offre payante et son CTA « Parler à
    l'équipe »). Cible intérimaire : toujours **aucune adresse de contact publique** —
    mailto/formulaire à trancher en équipe.
- **Reste** : ajustements textuels de Caroline (12/07) ; positionner explicitement le
  rapport complet comme **prestation Polaria** dans la copie (mot « Polaria » absent de la
  landing aujourd'hui) ; cible définitive du bouton contact.

### [ ] R4 · Benchmark modèles pour la génération (deadline 14/07, décision le 15/07)
- **Contrat** : régénérer le rapport de référence avec **GPT-5.5, GPT-5.6 et Opus
  (Anthropic)** ; produire un comparatif coût / qualité par version pour arbitrage au point
  du 14/07 à 17h30.
- **Approche** : `scripts/generate-samples.ts` + `OPENAI_MODEL` pour les modèles OpenAI.
  **Opus nécessite une adaptation** : SDK Anthropic + équivalent de la sortie structurée
  (`json_schema` strict OpenAI → tool use / structured output Anthropic) — c'est le vrai
  travail de cet item. Vérifier les **IDs exacts** des modèles au moment de faire (les noms
  du CR sont approximatifs).
- **Critère** : 3 jeux d'artefacts dans `docs/samples/` (un par modèle), tableau coût
  (tokens × tarif) + observations qualité (respect de la grille de sources, ton, tirets).

### [ ] R5 · Alerte ops sur échec de génération (S1, avant la comm du 15/07)
- **Contrat** : quand la génération d'un pré-rapport échoue (lead `failed`), l'équipe reçoit
  un email d'alerte au lieu de découvrir le problème via un prospect qui relance.
- **État** : le mécanisme existe déjà (`notifyFailure` dans `netlify/functions/lib/email.ts:79`,
  loggé « repli ops non configuré » tant qu'il est inactif) — il ne manque que la variable
  d'environnement **`OPS_EMAIL`** sur Netlify (+ `.env.example` à compléter). Zéro code.
- **À trancher** : quelle boîte reçoit les alertes ? (adresse relevée pendant le West Web —
  pas d'adresse contact publique à ce jour, cf. R3.)
- **Critère** : provoquer un échec de génération en prod (ou staging) → email d'alerte reçu
  avec le `leadId` et l'erreur.

### Suivi équipe (pas d'action code, à surveiller comme dépendances)
- **Caroline** : feedbacks précis sur le rapport (12/07) → alimente R1 ; ajustements
  textuels landing (12/07) → alimente R3 ; plaquette de vente + processus de cartographie
  des compétences (24/07).
- **Cyril** : réunion avec Seb sur la répartition des parts + indicateurs de création de la
  structure ; intégration éventuelle d'un questionnaire conversationnel (type MyWay) dans la
  collecte de données.

---

## ⚠️ Note transverse — `ReportDocument.tsx` orphelin

Depuis le passage en **livraison email-only**, le rendu du rapport n'a plus qu'un seul
moteur : `src/data/reportHtml.ts` (PDF). `src/components/report/ReportDocument.tsx`
(ancien affichage web) n'est plus monté nulle part — seul son test le référence. **Ne pas
le maintenir en parallèle** : le supprimer (avec son test) ou le ressusciter si un affichage
en ligne revient. Les modifs R1 ne concernent donc que `reportHtml.ts`.

---

## 🔒 Durcissements identifiés par la review du 10/07 (S2, non bloquants)

- **Rate-limit multi-dimensions** : le plafond actuel (3/h) est keyé sur l'email fourni par
  l'appelant → contournable en tournant les adresses (chaque soumission acceptée = un appel
  OpenAI + un email PDF vers un tiers arbitraire). Piste : seconde dimension sur
  `x-nf-client-connection-ip` ou plafond global glissant. ⚠️ Stocker l'IP = nouvelle PII →
  passer par la case RGPD (minimisation, durée de rétention) avant d'implémenter.
  Le rate-limit est aussi **fail-open** (une erreur Supabase le désactive en silence).
- **Upload plaquette** : seule l'extension est validée, le `contentType` client est stocké
  tel quel. Forcer le `contentType` depuis l'extension validée (+ magic bytes `%PDF-`, `PK`)
  pour qu'un `x.pdf` servi en `text/html` ne devienne pas un vecteur si le bucket devenait
  public un jour. Préexistant, non introduit par la tranche du 10/07.
- **Export CRM futur** : `prenom`/`nom`/`fonction` sont nettoyés des caractères de contrôle
  mais gardent `=`, `+`, `@`… — penser à l'échappement anti « formula injection » au moment
  de construire l'export CSV/CRM (préfixer `'` sur les cellules commençant par `=+-@`).

---

## 📌 Dépendances externes à chasser (en parallèle)
- **Victor** : mention d'information juridique complète + DPA (la page de fin actuelle porte
  un texte factuel provisoire) + validation conformité du rapport.
- **Caroline** : feedbacks rapport + textes landing (12/07), plaquette (24/07).
- **Cyril / Seb** : cadre juridique des parts ; questionnaire conversationnel MyWay.

---

## ✅ Done

- **Tranche A (25/06) — quick wins UX & landing** : « carte bancaire » retirée partout,
  vocabulaire ajusté (« sources », « augmentation/hybridation »), attente gérée par le
  message email-only (commits `d80fc2c`, `cb38f5d`, `5988a7e`).
- **Tranche B (25/06) — refonte du rapport** : page de garde branding, carte d'identité en
  page 2, intro fixe (SLOGAN + VALUE_PROP), tableau « En un coup d'œil » §3, sources
  allégées, page de fin transparence IA + RGPD **avec texte factuel** — la version juridique
  Victor reste attendue (commits `163c9e0`, `d9f54ce`).
- **Tranche C (25/06) — témoignages** : section `Testimonials` intégrée à la landing
  (commit `d80fc2c`).
- **Tranche D (25/06) — email & domaine** : domaine d'envoi actif, variables Resend posées
  sur Netlify, écart `.env.example` corrigé, `RESEND_REPLY_TO` ajouté (réponses routées vers
  une boîte relevée), function `envcheck` de diagnostic (temporaire, à supprimer), script
  `resend-report.ts` pour renvoyer un rapport (commits `5d8d03a`, `948795c`, `47c6f37`,
  `80c0aff`).
- **Fix génération de rapport en prod** — la background function crashait à l'init
  (`ERR_REQUIRE_ESM` sur `@sparticuz/chromium` ESM bundlé en CJS), les leads restaient
  figés à `received`. Corrigé par import dynamique dans `htmlToPdf()` (commit `0341a51`),
  vérifié de bout en bout en prod (lead réel `received → generating → sent`, PDF + ligne
  `reports`). Cf. mémoire `netlify-deploy-gotchas-mira`.
- **Doc resynchronisée** avec tout ce qui précède (commit `1ea0fd1`, 10/07).
