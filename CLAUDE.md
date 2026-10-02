# CLAUDE.md — Guide du projet MIRA

Instructions pour les agents travaillant sur ce repo. Lire en complément du README.

## Le projet

Landing page marketing de **MIRA** (*Mapping des Impacts et des Risques IA*), un dispositif
d'intelligence RH augmentée qui mesure et pilote l'impact de l'IA sur les métiers (cible : DRH /
organisations). Le repo contient la **landing**, le **pré-diagnostic freemium** (wizard
`/pre-diagnostic` → Netlify Functions → OpenAI en deux appels → contrôles V1 → V14 → PDF → email,
données dans Supabase — voir [`docs/README.md`](docs/README.md)) et la page `/contact` ;
**la suite du produit (entretiens augmentés, dashboard) sera construite ici à terme** — anticiper
que de l'auth et d'autres routes viendront s'ajouter.

**`TODO.md` est la source de vérité de l'état du projet** (PRD léger + backlog : items avec
contrat, critères d'acceptation, décisions à prendre, dépendances). Le consulter avant de
commencer, le mettre à jour en livrant. En tête : la recette du 08/09/2026 (items Q1 → Q11).

## Commandes

```bash
npm run dev                  # serveur de dev Vite (landing seule) ; `netlify dev` pour front + functions
npm run build                # tsc -b (app) + tsc functions + vite build → dist/
npm run typecheck:functions  # typecheck des Netlify Functions seules
npm test                     # Vitest (validation wizard, anti-SSRF, contrôles V1 → V14, rendu, verrou doc/code)
npx tsx scripts/generate-samples.ts   # vrais rapports d'exemple → docs/samples/ (appelle OpenAI, coûte)
```

Pas de linter : les garde-fous qualité sont le **typecheck TypeScript strict** lancé par
`npm run build` et la suite **Vitest**. Toujours faire passer les deux avant de livrer.

⚠️ **Poste Windows** : `core.autocrlf=true` produirait un checkout en CRLF, et un checkout CRLF
casse `reportDocs.test.ts` (« aucun bloc de prompt système trouvé ») en plus de glisser des
retours chariot dans `SYSTEM_PROMPT`. Le garde-fou est un `.gitattributes` `* text=auto eol=lf`
(item Q10 de `TODO.md`), qui ramène tout le texte en LF quel que soit le réglage du poste.
Vérifier avec `git ls-files --eol`, renormaliser au besoin, mais ne jamais « réparer » les tests
pour contourner un problème de fins de ligne.

## Architecture

- **`src/App.tsx`** porte le routing : `/` landing, `/pre-diagnostic` wizard (`/pre-rapport`
  redirige en 301, cf. `netlify.toml`), `/contact` formulaire qualifié, `/rapport/:leadId` page
  héritée, `*` → `/`. **`src/pages/Landing.tsx`** assemble la liste de sections (`<Nav/>`,
  `<Hero/>`, `<Stats/>`, … `<Footer/>`). Ajouter/retirer une section = éditer cet assemblage.
- **`src/data/mira.ts` est la source de vérité du contenu de la landing.** Tous les textes,
  chiffres et offres y vivent, typés par `src/data/types.ts`. **Pour changer une copie, éditer
  les données — pas le JSX.** Exception assumée : quelques `const` purement présentationnels
  restent locaux à leur composant (ex. `ticker` dans `Hero.tsx`, `legend`/`discernement` dans
  `Matrix.tsx`, `team`/`skills` dans `Lectures.tsx`, `footerLinks` dans `Footer.tsx`).
- **Le pipeline du pré-diagnostic** vit dans `src/data/` (logique pure, testée sans réseau) et
  `netlify/functions/` (IO). Référence détaillée : [`docs/reference-pipeline-prerapport.md`](docs/reference-pipeline-prerapport.md).
  - `rapportStructure.ts` — le déroulé §0 → §9 (+ §8bis), intention, consigne, **grille
    `allowedSources`** section → sources, budgets de mots, textes figés injectés par le code.
  - `statbank.ts` — les **seuls chiffres citables** (87 entrées sourcées, tag `isco` pour le
    rattachement stat → famille de métiers en §3) ; `famillesMetiers.ts` — les 28 familles
    ISCO-08 du champ guidé.
  - `reportPrompt.ts` — `SYSTEM_PROMPT` fixe + messages utilisateur (corps, synthèse, rejeux).
  - `reportSchema.ts` — schémas **zod, source unique** du contrat de sortie : les
    `response_format` OpenAI, les types TS et les parseurs en dérivent. Ne jamais redéclarer
    un type de rapport à la main.
  - `reportLecture.ts` — **la seule traversée de la forme d'une section** (`lireSection`) :
    ordre de lecture, titre canonique, `contenu` ignoré sous un encart, part de tâches mise en
    forme, appel de note ajouté. Contrôles, appels de note, gabarit HTML et rappel du corps la
    consomment : ne jamais ré-énumérer `contenu` / `encart` / `familles` ailleurs (hors
    `reportSchema.ts` qui définit la forme et `reportSanitize.ts`, aveugle par choix).
  - `reportGeneration.ts` — l'orchestration (deux appels, assemblage, contrôles, rejeu des
    sections en échec, plafond `MAX_REPLAYS_PER_SECTION`), partagée par la function de prod et
    `scripts/generate-samples.ts`. Le transport OpenAI est injecté (`AskModel`).
  - `reportValidation.ts` — les contrôles **V1 → V14** (bloquant = rejeu ; avertissement =
    journalisé). Passé le plafond, le rapport part quand même, marqué `reports.needs_review`.
  - `reportCitations.ts` + `reportHtml.ts` — marqueurs `[[id]]` → appels de note, section
    « Sources de référence » (titre et numéro de section venus de la lecture), gabarit HTML du
    PDF (`netlify/functions/lib/pdf.ts` → Chromium).
  - `netlify/functions/` : `submit-prerapport` (capture, rate-limit, upload),
    `generate-prerapport-background` (enrichissement INSEE + site, génération, PDF, email),
    `submit-contact`, `lib/` (context, enrichment, email, pdf).
- **`src/components/ui/`** : primitives réutilisables — `Button`, `Head`, `Logo`, `Reveal`,
  `StatCounter`. **`src/components/charts/`** : SVG maison (pas de lib). **`src/hooks/`**.
- `src/components/report/ReportDocument.tsx` est **orphelin** (plus monté, seul son test
  l'importe) : ne pas le maintenir en parallèle de `reportHtml.ts` (cf. `TODO.md`).

## Conventions de style

- **Pas de framework CSS.** Les couleurs/typo/rayons/ombres sont des **variables CSS** définies dans
  `src/styles/globals.css` (`:root`). Toujours réutiliser ces tokens (`var(--violet)`, `var(--ink-2)`,
  `var(--r-lg)`…) plutôt que des valeurs en dur.
- Le style des composants est **inline** (`style={{…}}`) — convention héritée du handoff design. Les
  pseudo-états (`:hover`) et le **responsive** passent par des classes dans `globals.css`
  (media queries à `1000px` et `640px`).
- **Pattern couleur sémantique** : les données portent un `tone` (`'risk' | 'amber' | 'violet' |
  'cyan'`) et le composant mappe `tone → var(--…)` (cf. `toneColor` dans `Stats.tsx`). Réutiliser ce
  pattern pour toute nouvelle donnée colorée.
- **Navigation** : l'affichage desktop/mobile est piloté par les classes `.nav-links` / `.nav-actions`
  / `.mobile-menu-btn` dans `globals.css` (et non en inline) pour que les media queries fonctionnent.
  Sous 1000px, un menu hamburger (`Nav.tsx`) remplace la barre.
- Animations : Framer Motion, easing récurrent `[0.22, 1, 0.36, 1]`.
- Langue : **français** (textes, commentaires). Dans les textes du rapport et de la landing :
  ni tiret cadratin ni demi-cadratin ni point-virgule (`reportSanitize.ts` et `mira.test.ts`
  le verrouillent).

## Garde-fous

- **Prompts et textes figés : le doc reproduit le code au caractère près.**
  [`docs/reference-prompts-mira.md`](docs/reference-prompts-mira.md) est ce que lisent Cyril et
  Caroline pour valider le fond ; `src/data/reportDocs.test.ts` échoue à la première divergence
  (apostrophes comprises). Toute retouche de `SYSTEM_PROMPT`, d'un `intent` / `llmBrief`, d'un
  texte figé (`CALIBRAGE_COURT`, `LIGNE_PERIMETRE`, §8bis, §9) ou du tableau des contrôles se
  fait **dans le code et dans le doc, dans la même PR**. Le dernier contrôle en place est `V14` :
  un nouveau contrôle `V15` implique aussi la boucle (`n <= 15`) et l'assertion « V15 fantôme »
  de `reportDocs.test.ts`, qui devient « V16 fantôme ».
- **Zéro chiffre inventé.** Le modèle ne cite que des entrées de `statbank.ts`, filtrées par
  section (`allowedSources`) ; le code vérifie (V6, V7) et rejoue. Une entrée de stat-bank =
  une source **vérifiée à la source primaire**, avec `claim`, `verbatim`, `source`, `scope`,
  `provenance`, et `isco` quand elle éclaire directement une famille. Ne jamais saisir un
  chiffre « de mémoire ».
- **`docs/` : la doc technique `.md` est versionnée ; les binaires business sont confidentiels.**
  Les `.md` sont committés. Les binaires (`.pptx`, `.pages`, `.pdf`, `.docx` — cap table,
  valorisation, pitch, kits, retours CEO) et le corpus `examples of reports/` restent **ignorés
  par git** : ne jamais les committer ni en exposer le contenu.
- **Ne pas inventer de statistiques ni de sources** sur la landing non plus : les chiffres de
  `mira.ts` portent un champ `source` ; certains valent `"Source à confirmer"` — les remplacer
  uniquement par des sources vérifiées.
- Conformité RGPD / IA Act : sujet sensible (cible RH). Toute affirmation de conformité doit être
  validée côté métier/juridique (Victor) avant mise en avant.

## Données (Supabase)

- Projet **`mira-dev`** (ref `saohfhieudjnwjgsotev`, eu-north-1), tables `leads`, `reports`,
  `contact_requests`, bucket privé `reports` (`<leadId>/prerapport-mira.pdf`). Le front ne
  touche jamais Supabase : tout passe par les functions (clé `service_role`).
- Les migrations `supabase/migrations/000N_*.sql` sont **appliquées à la main** (SQL editor ou
  MCP) puis versionnées ; vérifier l'état réel de la base avant d'en écrire une (`0005`
  `needs_review` / `validation_findings` est appliquée).
- Relire un rapport généré : `leads.report_json` (document complet), `reports.needs_review`,
  `reports.validation_findings` (contrôles en échec à l'envoi), `reports.model`. Requêtes
  types dans `TESTS-MANUELS.md`.

## Déploiement

Netlify : build `npm run build`, publication de `dist/`, functions en esbuild (Chromium et
puppeteer externes). `netlify.toml` gère le 301 `/pre-rapport` → `/pre-diagnostic`, le fallback
SPA, les en-têtes de sécurité et le cache long-terme des assets. Variables d'environnement :
voir `.env.example` et la référence du pipeline ; la prod génère avec `OPENAI_MODEL=gpt-5.4`
(le défaut codé `gpt-4.1` est périmé, cf. `TODO.md` Q11).

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
