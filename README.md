# MIRA — Landing page

> **MIRA** — *Mapping des Impacts et des Risques IA.*
> L'IA redessine la carte des compétences. MIRA donne la boussole.

Landing page marketing de MIRA, le dispositif d'intelligence RH augmentée qui mesure et pilote
l'impact de l'IA sur les ressources humaines, métier par métier.

Application **React + TypeScript + Vite**, mono-page, responsive, animée avec Framer Motion.

---

## Démarrer

```bash
npm install      # installer les dépendances
npm run dev      # serveur de dev (http://localhost:5173)
npm run build    # typecheck (tsc -b) + build de production dans dist/
npm run preview  # prévisualiser le build de production
```

Node 18+ recommandé.

## Stack

| Rôle | Choix |
|------|-------|
| Framework | React 18 |
| Langage | TypeScript 5 (mode strict) |
| Build | Vite 6 |
| Animations | Framer Motion 11 |
| Styles | Tokens CSS (`src/styles/globals.css`) + styles inline par composant |
| Déploiement | Netlify (`netlify.toml`) |

## Structure

```
src/
├── main.tsx              # point d'entrée React
├── App.tsx               # assemblage des sections de la page
├── styles/globals.css    # design tokens (couleurs, typo, rayons…) + styles globaux
├── data/
│   ├── mira.ts           # ★ TOUT le contenu de la landing (textes, chiffres, offres)
│   └── types.ts          # types du contenu
├── hooks/
│   ├── useCountTo.ts      # compteur animé
│   └── useInViewOnce.ts   # déclenche une animation au scroll (une fois)
└── components/
    ├── ui/               # primitives réutilisables (Button, Head, Logo, Reveal, StatCounter)
    ├── charts/           # visualisations SVG (DashboardMock, RadialGauge, ExposureBars, ScatterMatrix)
    └── sections/         # sections de la page (Nav, Hero, Stats, Methode, Lectures, Matrix, Diff,
                          #   Pricing, Conformite, FinalCTA, Footer…)
```

**Le contenu vit dans [`src/data/mira.ts`](src/data/mira.ts).** Pour modifier un texte, un chiffre ou une
offre, on édite ce fichier — les composants ne font que le rendre. Voir [CLAUDE.md](CLAUDE.md) pour les
conventions détaillées.

## Déploiement

Push sur `main` → build automatique sur Netlify (`npm run build`, publication de `dist/`).
`netlify.toml` configure le fallback SPA, les en-têtes de sécurité et le cache des assets.

## Note

Le dossier `docs/` (documents business confidentiels) est **ignoré par git** et ne doit jamais être committé.
