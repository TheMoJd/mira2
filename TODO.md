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

### [ ] R1 · Rapport : filigrane + chasse aux signaux « IA » (P0, deadline 10/07)
- **Contrat** : (a) filigrane « Mira Audit » en fond de chaque page du PDF ; (b) plus aucun
  tiret long dans les rapports générés ; (c) suppression de la mention « rapports croisés /
  5 sources ».
- **Fichiers** :
  - (a) `src/data/reportHtml.ts` — ⚠️ un filigrane multi-page en impression Chromium ne se
    fait pas avec un simple `position:fixed` fiable : préférer un fond répété via CSS
    `@page` / background, et **retester le PDF** (`npx tsx scripts/generate-samples.ts`).
  - (b) la règle existe déjà (règle n°8 du `SYSTEM_PROMPT` + textes en dur nettoyés). Si des
    résidus sont observés dans les rapports générés (le modèle peut désobéir), ajouter un
    **post-processing** sur la sortie LLM (remplacement `—`/`–`/`;` avant rendu) — c'est le
    seul verrou garanti.
  - (c) la mention est sur la **landing**, pas dans le rapport : ticker du hero,
    `src/components/sections/Hero.tsx:16` (`{ k: 'Rapports croisés', v: '5', s: 'sources' }`)
    → retirer ou remplacer par une stat défendable.
- **Critère** : PDF regénéré avec filigrane sur toutes les pages ; `grep` sans tiret long
  dans un rapport fraîchement généré ; le ticker ne mentionne plus « 5 sources ».

### [ ] R2 · Formulaire : qualification des leads (P0, deadline 10/07)
- **Contrat** : le wizard collecte **nom, prénom, fonction, téléphone (optionnel)** en plus
  de l'email, et ces champs arrivent en base pour permettre le suivi commercial.
- **À trancher avant de coder** : quels champs sont obligatoires ? (le CR ne le précise que
  pour le téléphone : optionnel. Proposition : nom + prénom obligatoires, fonction
  recommandée, téléphone optionnel — plus on rend obligatoire, plus on perd de conversions.)
- **Fichiers** : `src/types/prerapport.ts`, `src/data/prerapport.ts` (copie), étape 4
  « Réception » de `Wizard.tsx`, `validation.ts`, `submit.ts`,
  `netlify/functions/submit-prerapport.ts` (parsing + validation serveur), **migration
  Supabase** (colonnes `leads`) + regen `src/types/supabase.ts`, `TESTS-MANUELS.md`.
- **⚠️ RGPD** : nouvelles PII (dont téléphone) → adapter le libellé de consentement et la
  mention d'information ; garde-fou CLAUDE.md : validation métier/juridique avant mise en
  avant. Minimisation : savoir justifier le téléphone.
- **Critère** : lead créé avec les nouveaux champs visibles dans Supabase ; validation
  client + serveur alignées ; `npm test` et build verts.

### [ ] R3 · Landing : clarifier les deux offres (P0, deadline 10/07)
- **Contrat** : deux parcours lisibles — pré-rapport gratuit automatisé **vs** rapport
  complet personnalisé (prestation **Polaria**). Renommer « Explorer un rapport » en
  « Générer mon pré-rapport » ; ajouter un bouton « Nous contacter pour une analyse
  complète ».
- **Fichiers** : `src/components/sections/Hero.tsx:68` (bouton à renommer, href `#lectures`
  → `/pre-rapport`) ; copie dans `src/data/mira.ts`.
- **⚠️ À trancher** : (1) le hero aura alors **deux CTA vers `/pre-rapport`** (« Démarrer mon
  pré-rapport gratuit » + « Générer mon pré-rapport ») → harmoniser les libellés ou
  repositionner ; (2) **cible du bouton contact** : il n'existe aucune adresse de contact
  publique (`contact@mira.ai` retirée car inexistante) → mailto vers qui ? formulaire ?
  section Pricing (`Parler à l'équipe` existe déjà dans l'offre payante) ?
- **Dépendance** : ajustements textuels de Caroline (12/07) — ne pas figer la copie avant.
- **Critère** : les deux offres sont distinguables en un scroll ; les deux boutons mènent à
  des actions différentes ; build vert.

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
