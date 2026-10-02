# TODO — Pré-rapport freemium MIRA

Backlog issu des demandes CEO (réunions du 25/06 puis du 10/07/2026). **À valider en équipe
avant implémentation.** Sert de PRD léger + backlog : chaque item porte un *contrat* (ce que
« fait » veut dire), des *critères d'acceptation* et ses *dépendances*.

**Légende priorité** — `P0` = à faire maintenant · `S1` = sprint courant · `S2` = ensuite.
Statut : `[ ]` à faire · `[~]` en cours · `[x]` fait.

---

## 🔴 Recette du 08/09/2026 — rapport OVHcloud (gpt-5.4), pipeline refondu « Cyril + Caroline »

**Contexte.** Premier rapport généré en prod par le pipeline refondu (deux appels, contrôles
V1 → V12, `needs_review`). Lead `755692d1-bed0-4a10-9dd8-069b6367eb49`, rapport
`7671126d-50d7-4b8f-83b9-43d926b4e0fc`, `needs_review = true` (V9 §1 : 621 mots, budget toléré
252 à 397 ; deux V8 en avertissement). Six défauts constatés dans le PDF et vérifiés en base
(`leads.report_json`). Les garde-fous ont détecté le défaut le plus grave sans intervention :
la chaîne technique est solide. Mais le rapport n'est pas envoyable en l'état, et la priorité
n'est pas le prompt : quatre corrections de code mécaniques (Q1 à Q4), puis la couverture de
la stat-bank sur les familles techniques (Q8).

**Audit chiffré de la stat-bank** (`statsForFamille(isco)` ∩ grille `allowedSources` de §3) :
**7 familles sur 28** disposent d'au moins une source directe en §3 (ISCO 25, 24, 41/44, 42,
43, 81/82, 91/93). Les 21 autres ressortent « à confirmer » **par construction**, dont toutes
les familles de direction (11-14), d'ingénierie et de sciences (21, 31), de techniciens
informatique (35), de santé (22, 32), de vente (52), de production et de transport (71-75, 83).
La stat-bank compte 87 entrées, 11 seulement taguées `isco` ; la grille §3 en autorise 58,
presque toutes macro (monde 30, France 36, OCDE 11, USA 7, Europe 3).

**État des items de juillet** : R1, R2, R3 (code) faits ; R4 commencé mais **non committé
depuis juillet** (`scripts/benchmark-models.ts` untracked, `@anthropic-ai/sdk` dans
`package.json`, `docs/samples/benchmark.zip`) ; R5 toujours ouvert (`OPS_EMAIL` absent sur
Netlify) et devient une dépendance de Q9.

**Outil commun aux critères d'acceptation** : un script `scripts/replay-report.ts <leadId>` qui
lit `leads.report_json`, passe `parseReport` → `validateReport` → `renderReportHtml` et écrit
un HTML local. Il rejoue un rapport existant **sans appel OpenAI** : c'est ce qui permet de
vérifier Q1 à Q4 et Q6 sur le rapport OVHcloud lui-même, avant toute régénération.

### [ ] Q1 · §1 : l'encart de synthèse imprimé deux fois (P0)
- **Constat** : page 4, l'encart s'affiche, puis le même contenu réapparaît en paragraphes et
  déborde sur la page 5. Le lecteur lit deux fois les mêmes quatre points.
- **Cause** (défaut de conception, pas de prompt) : `SyntheseSectionSchema` exige `contenu`
  (mode strict OpenAI = toutes les propriétés requises) ; le modèle l'a rempli avec une
  version rédigée de l'encart ; `renderSection` rend l'encart **et** `contenu` ; `proseOf`
  compte les deux → V9 (621 mots) s'est déclenché sur un défaut que le code rendait
  inévitable. Deux rejeux, même résultat, envoi quand même.
- **Contrat** : le second appel ne demande plus de `contenu` ; rendu et contrôles ne
  connaissent que l'encart pour §1.
- **À faire** : (a) `reportSchema.ts` : retirer `contenu` de `SyntheseSectionSchema`,
  `assembleReport` pose `contenu: []` pour §1 ; (b) `reportHtml.ts` `renderSection` : ignorer
  `contenu` quand `encart` existe (défense en profondeur pour les `report_json` déjà
  persistés) ; (c) `reportValidation.ts` `proseOf` : idem ; (d) `SYSTEM_PROMPT` « Format de
  sortie » : dire que §1 ne porte pas de `contenu` → **reporter dans
  `docs/reference-prompts-mira.md`** (le test `reportDocs.test.ts` l'impose au caractère
  près) ; (e) fixture `rapportConforme.ts` + tests `reportHtml` / `reportValidation` (cas
  « encart + contenu non vide » → rendu et comptage identiques à « encart seul »).
- **Critère** : `replay-report` sur le lead OVHcloud → une seule occurrence du chapeau dans
  le HTML ; V9 §1 recalculé sur l'encart seul et dans les bornes ; `npm test` vert.

### [x] Q2 · Caractères hors alphabet latin au milieu d'un mot (P0) — nouveau contrôle V13 — fait le 08/09
- **Constat** : page 6, famille Ingénierie : « la formulation des խնդիրmes » (« խնդիր » =
  « problème » en arménien). Accident de tokenisation du modèle ; la police du PDF n'a pas
  les glyphes, le lecteur voit un trou. Aucune règle de prompt ne l'attrape : seul le code
  peut. Un rapport en français ne contient que du latin et de la ponctuation courante, tout
  le reste est un défaut par construction.
- **Contrat** : toute lettre hors script latin, tout pictogramme, dans une prose du modèle =
  défaut **bloquant** → rejeu de la section.
- **À faire** : `reportValidation.ts` V13 : sur `proseOf(section)`, toute lettre `\p{L}` qui
  ne matche pas `\p{Script=Latin}`, ou tout `\p{Extended_Pictographic}` → `add('V13',
  'bloquant', …)` avec l'extrait (le rejeu doit voir le mot fautif). Tests : arménien,
  cyrillique, grec, emoji ; **faux positifs à exclure** : « œ », « É », « ç », « ï »,
  guillemets « », apostrophe typographique, points de suspension, €, ×, %, espaces fines.
  Propager : tableau V1 → V13 dans l'en-tête de `reportValidation.ts` et dans
  `docs/reference-prompts-mira.md` ; `reportDocs.test.ts` (boucle `n <= 13`, le « V13
  fantôme » devient V14) ; commentaires des colonnes `reports.needs_review` /
  `validation_findings` (« V1-V12 ») via une migration de commentaire, ou laisser tel quel
  avec une note.
- **Critère** : `validateReport(report_json OVHcloud)` renvoie un V13 sur
  `familles-metiers` ; sur la fixture conforme, aucun.

- **Fait** : V13 bloquant dans `reportValidation.ts` (toute lettre `p{L}` hors `p{Script=Latin}`,
  tout `p{Extended_Pictographic}` ; les caractères fautifs contigus font un seul défaut, le message
  donne le passage, son code point et vingt caractères de contexte de chaque côté). Tests V13
  (arménien, cyrillique, grec, emoji refusés ; œ, É, ç, ï, guillemets, apostrophe, €, ×, %, espace
  fine acceptés), fixture conforme à zéro finding, ligne V13 du tableau dans le doc de référence,
  mentions « V1 → V12 » mises à jour partout hors migrations. Vérifié sur le `report_json` OVHcloud :
  un V13 sur `familles-metiers` avec l’extrait « խնդիրmes ». Faux positifs connus et assumés : ©, ®, ™
  (pictogrammes) et µ (script Common) déclencheraient V13. Commentaires SQL de la migration 0005
  laissés tels quels (« V1-V12 »).
### [ ] Q3 · Titre de section doublé « §6 · §6. Le facteur humain » (P0)
- **Constat** : le modèle a mis le numéro dans `titre`, le renderer préfixe déjà « §6 · ».
  Doublé dans le corps (p. 9) et dans « Sources de référence » (p. 12).
- **Contrat** : le rendu utilise le titre canonique de `rapportStructure.ts` pour toute
  section `titleEditable: false` (toutes sauf §7) ; §7 garde le titre du modèle.
- **À faire** : helper `displayTitle(section)` dans `rapportStructure.ts`
  (`spec.titleEditable ? section.titre : spec.title`), utilisé par `reportHtml.ts`
  `renderSection` **et** `reportCitations.ts` `buildCitationIndex` (`sectionTitle`). Pour §7,
  retirer par sécurité un préfixe de numéro (« §7. », « 7 · », « 7 - »). Tests.
- **Critère** : `replay-report` OVHcloud → « §6 · Le facteur humain » une seule fois, dans
  le corps et dans les sources.

### [ ] Q4 · `part_taches` détourné en phrase (P0)
- **Constat** : p. 7, « Exposition élevée · 82 % des tâches exposées à un niveau supérieur à
  la moyenne, dont 24 % fortement des tâches ». Le champ attend une valeur courte
  (« jusqu'à 82 % »), le modèle y a mis une phrase, le renderer accole « des tâches ».
- **Contrat** : le champ est contraint dans le prompt, le renderer est tolérant.
- **À faire** : (a) `SYSTEM_PROMPT` § « Caractérisation » + description zod :
  « `part_taches` : uniquement la part, au format « 82 % » ou « jusqu'à 82 % », quinze
  caractères maximum, sans phrase ; ce nombre figure dans une statistique citée par
  l'explication ; sinon `null` » → doc à aligner ; (b) `reportHtml.ts` `renderFamille` et
  `reportPrompt.ts` `renderCorpsRappel` : n'accoler « des tâches » que si la valeur est un
  pourcentage court (préfixe optionnel « jusqu'à », « environ », « près de »), sinon afficher
  la valeur telle quelle ; (c) V14 (avertissement) : `part_taches` hors format court, ou
  nombre absent des claims des stats citées dans l'explication.
- **Critère** : `replay-report` OVHcloud → plus de « … fortement des tâches » ; fixture
  conforme (« jusqu'à 82 % ») inchangée.

### [ ] Q5 · Règle 7 (« un chiffre, une seule fois ») vs V8 en avertissement — décision Cyril + Caroline (P1)
- **Constat** : quatre statistiques citées dans plusieurs sections du corps (notes 1 à 4
  reprises en §3, §4, §5 ou §7). Deux V8 en base, en **avertissement** (niveau choisi par
  Cyril dans son tableau), alors que la règle 7 du prompt système est absolue. Le prompt
  promet une chose, le code en tolère une autre.
- **Analyse** : les doublons sont **structurels**. La grille `allowedSources` autorise les
  mêmes sources dans plusieurs sections (S06 en §3, §4, §7 ; S15 en §3 et §5 ; S01 en §3 et
  §6 ; FR1/FR2 en §2, §3, §7) et le rattachement §3 pousse à citer en §3 des chiffres
  naturels ailleurs. Passer V8 en bloquant = rejeux en cascade (corriger §4 peut créer un
  doublon avec §7), coût et latence.
- **Options** : (A) V8 bloquant, règle 7 inchangée. (B) **recommandé** : V8 reste
  avertissement, règle 7 adoucie (« Une même statistique n'est citée qu'une fois **de
  préférence**. Si un constat déjà chiffré revient, rappelle-le en mots sans redonner le
  chiffre ; si le chiffre est indispensable, il garde son marqueur »), et les avertissements
  de la section rejouée sont joints au brief de rejeu (aujourd'hui `findingsBrief` reçoit
  `blockingFindings(findings)` : les V8 ne remontent jamais au modèle).
- **Critère** : le prompt et le tableau des contrôles disent la même chose ; `reportDocs.test`
  vert.

### [ ] Q6 · Chiffre-signal : le périmètre a disparu de la phrase (P1)
- **Constat** : « 93 % · L'informatique figure parmi les métiers les plus transformés »,
  sans « Chez les professionnels RH français ». C'est un chiffre de **perception** (ce que
  des professionnels RH pensent), sur une source commerciale, et c'est le seul chiffre que le
  dirigeant retiendra. La règle 3 l'interdit ; V6 ne peut pas l'attraper (le marqueur est
  là) ; la contrainte « dix mots maximum » pousse le modèle à sacrifier le périmètre.
- **Contrat** : le périmètre du chiffre-signal est un champ à part, rendu par le code,
  obligatoire.
- **À faire** : `ChiffreSignalSchema.perimetre` (ex. « Chez les professionnels RH
  français ») ; prompt § « La synthèse exécutive » : « le périmètre en six mots maximum, tel
  que la statistique le porte, puis la phrase de dix mots » ; `renderEncart` : périmètre en
  petites capitales au-dessus du nombre ; V15 bloquant : `perimetre` non vide et, pour une
  stat de `scope` autre que `france`, contenant le libellé attendu (« mondiale »,
  « États-Unis », « OCDE », « Europe ») ; fixture + doc.
- **Critère** : encart OVHcloud → « CHEZ LES PROFESSIONNELS RH FRANÇAIS » au-dessus de
  « 93 % ».

### [ ] Q7 · Stat-bank : découper `parlonsrh-2025-marketing-transforme-96` (P1, quick win)
- **Constat** : une seule entrée porte trois chiffres (marketing 96 %, informatique 93 %,
  relation client 79 %) et trois ISCO (24, 25, 42). Le chiffre-signal « 93 % » renvoie à une
  note dont l'id dit « 96 » ; le rattachement ISCO 24 hérite d'un chiffre marketing. Le
  modèle a cité 93 et 79, conformes au claim, mais la traçabilité ligne à ligne est brouillée.
- **À faire** : trois entrées, même source et page : `…-marketing-transforme-96` (isco 24),
  `parlonsrh-2025-informatique-transforme-93` (isco 25),
  `parlonsrh-2025-relation-client-transforme-79` (isco 42). Passer en revue les **29 autres
  claims multi-%** (`wef-2025-tasks-2030-humans-33`, `pwc-2025-*`, `parlonsrh-2026-*`,
  `cegos-2025-*`, `s14-2024-*`, `mckinsey-2017-*`, …) et découper ceux qui portent des
  **sous-populations distinctes** ; un « dont 24 % fortement » peut rester.
- **Critère** : `statbank.test.ts` vert (ids uniques) ; l'id n'est cité par aucune fixture
  (vérifié : seule `statbank.ts` le porte).

### [ ] Q8 · Couverture de la stat-bank sur les familles techniques — le vrai sujet (P1, Cyril + Caroline)
- **Constat** : 3 familles sur 5 « à confirmer » pour OVHcloud, dont « Ingénierie &
  sciences » (21) et « Techniciens informatique & télécoms » (35). Pour une entreprise dont
  le métier est la tech, un DRH le remarquera. Le modèle s'est rabattu honnêtement sur des
  chiffres mondiaux (comportement voulu), mais le rapport dit surtout « je ne sais pas » sur
  le cœur de métier du client. Voir l'audit chiffré en tête : **7 familles sur 28**.
- **Piste recommandée** : une **source d'exposition par grand groupe ISCO-08** couvre les
  28 familles d'un coup et se tague mécaniquement. Candidats à vérifier à la source
  primaire (règle « ne pas inventer de sources ») : OIT 2025 « Generative AI and Jobs: A
  Refined Global Index of Occupational Exposure » (exposition par groupe ISCO, quatre
  gradients ; suite de S01) ; OCDE Employment Outlook 2023 (exposition par occupation) ;
  WEF Future of Jobs 2025, déjà dans le corpus local, pour les rôles en croissance / déclin
  à mapper ISCO. Nature `recherche` ; `inSocle` à décider par Cyril.
- **À faire** : (a) sélection des sources (Cyril / Caroline) ; (b) extraction et saisie des
  entrées taguées `isco`, au moins une par grand groupe des 28 familles ; (c) un test qui
  **échoue si une famille de `famillesMetiers` n'a aucune source directe dans la grille §3**
  (aujourd'hui 21 échecs : l'objectif devient un verrou) ; (d) régénérer l'échantillon
  OVHcloud (`generate-samples.ts`) et vérifier que 21 et 35 passent en exposition qualifiée.
- **Dépendances** : Q7 ; décision « primaire vs secondaire » pour les chiffres tiers.

### [ ] Q9 · Alerte ops quand `needs_review = true` (P1, zéro risque)
- **Constat** : un rapport marqué pour relecture part au client sans que l'équipe soit
  prévenue (seul `notifyFailure` existe, sur `failed`). La relecture humaine promise par
  `needs_review` ne peut pas avoir lieu.
- **À faire** : `generate-prerapport-background.ts` : si `bloquants.length > 0`,
  `notifyReview({ leadId, findings })` vers `OPS_EMAIL` (dans `lib/email.ts`), avec les
  findings et l'identifiant du lead. R5 (`OPS_EMAIL` sur Netlify) devient bloquant.
- **Décision** : envoyer quand même (aujourd'hui) ou retenir le PDF jusqu'à relecture
  (nouveau statut `review` dans `lead_status`) ? Recommandation : envoyer + alerter tant que
  le volume est faible ; retenir dès que la relecture ne peut plus suivre.

### [x] Q10 · Suite de tests rouge sur Windows (P0 pour le poste de dev) — fait le 08/09
- **Constat** : `reportDocs.test.ts` échoue en local (« aucun bloc de prompt système trouvé
  dans le doc ») : `core.autocrlf=true` → checkout en CRLF, la regex du test attend un saut
  de ligne LF juste après la clôture de la fence ```text. Effet de bord : `SYSTEM_PROMPT`
  (template literal) contient 437 retours chariot sur ce checkout, envoyés à OpenAI depuis un
  poste Windows (`generate-samples`). Vert sur Netlify (Linux).
- **À faire** : `.gitattributes` avec `* text=auto eol=lf` + `git add --renormalize .` ; et
  rendre le test tolérant (`\r?\n`, normalisation des fins de ligne du doc avant comparaison).
- **Critère** : `npm test` vert sur Windows et sur Netlify.

- **Fait** : `.gitattributes` (`* text=auto eol=lf` + binaires), working tree converti en LF
  (99 fichiers), index renormalisé (`git add --renormalize .` puis `git restore --staged` des
  vraies modifications pour laisser la revue à Moetez), `reportDocs.test.ts` normalise les fins
  de ligne des deux côtés. `npm test` : 210/210 sur Windows. Piège rencontré : après le
  changement d’attributs, `git status` marque tous les fichiers modifiés sans diff textuel tant
  que l’index n’est pas renormalisé.
### [ ] Q11 · Hygiène (P2)
- `src/components/report/ReportDocument.tsx` toujours orphelin (seul son test l'importe) et
  pourtant refondu (258 lignes) : supprimer avec son test (cf. note transverse), ou le
  remonter si l'affichage web revient.
- `OPENAI_MODEL ?? 'gpt-4.1'` (function) et `.env.example` : la prod tourne en `gpt-5.4`
  (colonne `reports.model`) → aligner le défaut, ou lever une erreur explicite si absent.
- Travail R4 non committé depuis juillet : à committer sur une branche ou à retirer.
- `docs/samples/*` datent de juin (ancien pipeline, mentions « confiance ») : régénérer après
  Q1 à Q4 ; c'est aussi la recette de ce plan.
- `docs/README.md`, `reference-pipeline-prerapport.md`, `TESTS-MANUELS.md` disent
  `/pre-rapport` : l'URL canonique est `/pre-diagnostic` depuis le 13/07 (301 en place).

### Ordre proposé
1. **Q10** (cinq minutes, débloque le poste) → **Q1, Q3, Q4, Q2** en une PR « corrections
   mécaniques », avec `replay-report` comme banc d'essai sur le rapport OVHcloud → **Q9**.
2. **Q5 et Q6** : décisions Cyril / Caroline, puis prompt + doc + code dans la même PR (le
   test `reportDocs` l'impose).
3. **Q7 puis Q8** : la stat-bank ; régénération des échantillons ; test de couverture qui
   verrouille l'objectif.

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
