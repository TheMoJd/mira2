# MIRA — Landing & pré-rapport freemium

> **MIRA** — *Mapping des Impacts et des Risques IA.*
> L'IA redessine la carte des compétences. MIRA donne la boussole.

Landing page marketing de MIRA, le dispositif d'intelligence RH augmentée qui mesure et pilote
l'impact de l'IA sur les ressources humaines, métier par métier — plus le **pré-rapport
freemium** : un wizard (`/pre-rapport`) qui capture un lead, génère un rapport PDF sourcé
(OpenAI + Chromium) et l'envoie par email.

Application **React + TypeScript + Vite** (SPA multi-routes), responsive, animée avec
Framer Motion, adossée à des **Netlify Functions** (génération) et **Supabase** (données).

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
├── App.tsx               # routing : / (landing), /pre-rapport (wizard), /rapport/:leadId (page héritée)
├── pages/                # Landing, PreRapport, ReportView
├── styles/globals.css    # design tokens (couleurs, typo, rayons…) + styles globaux
├── data/
│   ├── mira.ts           # ★ TOUT le contenu de la landing (textes, chiffres, offres)
│   ├── prerapport.ts     # ★ tous les textes du wizard
│   ├── statbank.ts       # banque de statistiques sourcées (seuls chiffres citables du rapport)
│   ├── rapportStructure.ts / reportPrompt.ts / reportSchema.ts / reportHtml.ts / rgpd.ts
│   │                     # structure §0→§9, prompt, schéma de sortie, gabarit PDF, mentions RGPD
│   └── types.ts          # types du contenu landing
├── hooks/                # useCountTo, useInViewOnce, useActiveSection, useMotionPrefs
└── components/
    ├── ui/               # primitives réutilisables (Button, Head, Logo, Reveal, StatCounter…)
    ├── charts/           # visualisations SVG (DashboardMock, RadialGauge, ExposureBars, ScatterMatrix)
    ├── fx/               # effets visuels (Aurora, Grain, HeroField, ScrollProgress…)
    ├── prerapport/       # wizard du pré-rapport (étapes, champs, validation, submit)
    └── sections/         # sections de la landing (Nav, Hero, Stats, Methode, Testimonials, Matrix,
                          #   Diff, Pricing, Conformite, FinalCTA, Footer…)

netlify/functions/        # submit-prerapport, generate-prerapport-background, envcheck + lib/
scripts/                  # scripts ops : generate-samples, resend-report, investigate-leads
```

**Le contenu vit dans [`src/data/mira.ts`](src/data/mira.ts).** Pour modifier un texte, un chiffre ou une
offre, on édite ce fichier — les composants ne font que le rendre. Voir [CLAUDE.md](CLAUDE.md) pour les
conventions détaillées.

## Déploiement

Push sur `main` → build automatique sur Netlify (`npm run build`, publication de `dist/`).
`netlify.toml` configure le fallback SPA, les en-têtes de sécurité et le cache des assets.

## Documentation

La doc technique vit dans [`docs/`](docs/) (point d'entrée : [docs/README.md](docs/README.md)) —
notamment le **pipeline du pré-rapport freemium** (référence, architecture, how-to, tutoriel).

Dans `docs/`, les fichiers `.md` sont **versionnés** ; les binaires business (pitch
investisseurs, kits, notes : `.pptx`, `.pages`, `.pdf`, `.docx`) restent **confidentiels et
ignorés par git** — ne jamais les committer.
