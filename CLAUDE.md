# CLAUDE.md — Guide du projet MIRA

Instructions pour les agents travaillant sur ce repo. Lire en complément du README.

## Le projet

Landing page marketing de **MIRA** (*Mapping des Impacts et des Risques IA*), un dispositif
d'intelligence RH augmentée qui mesure et pilote l'impact de l'IA sur les métiers (cible : DRH /
organisations). Le repo contient la **landing** et le **pré-diagnostic freemium** (wizard
`/pre-diagnostic` → Netlify Functions → OpenAI → PDF → email, données dans Supabase — voir
[`docs/README.md`](docs/README.md)) ; **la suite du produit (entretiens augmentés, dashboard)
sera construite ici à terme** — anticiper que de l'auth et d'autres routes viendront s'ajouter.

## Commandes

```bash
npm run dev      # serveur de dev Vite (landing seule) ; `netlify dev` pour front + functions
npm run build    # tsc -b (typecheck strict, app + functions) + vite build → dist/
npm run preview  # sert le build de prod
npm test         # Vitest (validation wizard, anti-SSRF, invariants du contenu du rapport)
```

Pas de linter : les garde-fous qualité sont le **typecheck TypeScript strict** lancé par
`npm run build` et la suite **Vitest**. Toujours faire passer les deux avant de livrer.

## Architecture

- **`src/App.tsx`** porte le routing (`/` landing, `/pre-diagnostic` wizard avec redirection
  depuis l'ancienne URL `/pre-rapport`, `/rapport/:leadId` page héritée). **`src/pages/Landing.tsx`** assemble la liste de sections (`<Nav/>`, `<Hero/>`,
  `<Stats/>`, … `<Footer/>`). Ajouter/retirer une section = éditer cet assemblage.
- **Le pipeline du pré-diagnostic** (wizard, functions, prompt, PDF) est documenté dans
  [`docs/`](docs/README.md) — la référence y détaille chaque module de `src/data` et
  `netlify/functions`.
- **`src/data/mira.ts` est la source de vérité du contenu.** Tous les textes, chiffres et offres y
  vivent, typés par `src/data/types.ts`. **Pour changer une copie, éditer les données — pas le JSX.**
  Exception assumée : quelques `const` purement présentationnels restent locaux à leur composant
  (ex. `ticker` dans `Hero.tsx`, `legend`/`discernement` dans `Matrix.tsx`, `team`/`skills` dans
  `Lectures.tsx`, `footerLinks` dans `Footer.tsx`).
- **`src/components/ui/`** : primitives réutilisables — `Button`, `Head` (kicker + titre + sous-titre),
  `Logo`, `Reveal` (apparition au scroll), `StatCounter` (compteur animé).
- **`src/components/charts/`** : visualisations SVG maison (pas de lib de graphes).
- **`src/hooks/`** : `useCountTo`, `useInViewOnce`.

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
- Langue : **français** (textes, commentaires).

## Garde-fous

- **`docs/` : la doc technique `.md` est versionnée ; les binaires business sont confidentiels.**
  Les fichiers `.md` (documentation du code : pipeline, architecture, how-to… — point d'entrée
  [`docs/README.md`](docs/README.md)) sont committés. En revanche les binaires (`.pptx`, `.pages`,
  `.pdf`, `.docx` — cap table, valorisation, pitch investisseurs, kits) restent **ignorés par git** :
  ne jamais les committer ni en exposer le contenu.
- **Ne pas inventer de statistiques ni de sources.** Les chiffres affichés portent un champ `source`
  dans `mira.ts` ; certains valent `"Source à confirmer"` en attendant des références réelles — les
  remplacer uniquement par des sources vérifiées.
- Conformité RGPD / IA Act : sujet sensible (cible RH). Toute affirmation de conformité doit être
  validée côté métier/juridique avant mise en avant.

## Déploiement

Netlify : build `npm run build`, publication de `dist/`. `netlify.toml` gère le fallback SPA, les
en-têtes de sécurité et le cache long-terme des assets `/assets/*` (fingerprintés par Vite).
