# Tutoriel — Votre premier pré-rapport, de zéro au PDF

> **Quadrant Diataxis : Tutorial.** Orienté apprentissage. Vous partez d'un repo cloné et,
> en quelques étapes, vous voyez un vrai pré-rapport PDF se générer. À la fin, vous aurez une
> carte mentale du pipeline complet et saurez où regarder pour la suite.

Vous allez : lancer l'app en local, soumettre une demande de pré-rapport pour une entreprise
fictive, et récupérer le PDF généré par le LLM. On vise un **premier résultat visible vite** ;
les détails viennent ensuite.

## Ce qu'il vous faut

- Node 18+, le repo cloné, `npm install` fait.
- Netlify CLI : `npm i -g netlify-cli`.
- Un projet Supabase et une clé OpenAI (voir le [how-to](howto-developpement-local.md#prérequis) si vous ne les avez pas encore).
- Chrome ou Edge installé.

## Étape 1 — Configurer en une minute

```bash
cp .env.example .env
```

Ouvrez `.env` et remplissez les 3 valeurs indispensables, plus le chemin de votre navigateur :

```bash
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
OPENAI_API_KEY=sk-...
CHROME_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

Pas de Resend pour l'instant : sans lui, l'email sera simplement `skipped` et le PDF restera
stocké dans Supabase — parfait pour un premier essai.

## Étape 2 — Démarrer (votre premier résultat visible)

```bash
netlify dev
```

Ouvrez **`http://localhost:8888/pre-rapport`**. Le wizard MIRA s'affiche : un écran d'intro
avec une double accroche RH / dirigeant. Vous venez de lancer le front *et* les Netlify
Functions d'une seule commande. 🎉

## Étape 3 — Remplir le wizard

Cliquez sur **Commencer**, puis déroulez les 5 étapes avec une entreprise fictive :

1. **Entreprise** — « PME du transport routier (120 salariés), livraison du dernier kilomètre en Île-de-France. » (SIRET : laissez vide.)
2. **Offre** — produits/services et clients (deux phrases suffisent).
3. **Métiers** — tapez 3 familles, par ex. `Conduite / livraison`, `Relation client`, `Comptabilité` (Entrée après chacune).
4. **Compléments** — laissez vide, ou collez l'URL d'un site public pour voir l'enrichissement.
5. **Réception** — votre email + cochez le consentement.

Validez **Recevoir mon pré-rapport**. Vous arrivez sur l'écran « Votre pré-rapport est en
route ». Côté coulisses, `submit-prerapport` vient de répondre `202` et a déclenché la
génération.

## Étape 4 — Regarder la machine tourner

Dans le tableau de bord Supabase, ouvrez la table `leads`. Rafraîchissez : le `status` de
votre ligne évolue **`received` → `generating` → `sent`** (la génération prend généralement
quelques dizaines de secondes — appel OpenAI + rendu PDF).

En parallèle, le terminal `netlify dev` affiche des logs `[generate] …`. Si quelque chose
coince, le statut passe à `failed` et le log dit pourquoi — voir le
[dépannage](howto-developpement-local.md#dépannage).

## Étape 5 — Récupérer votre PDF

Une fois en `status = sent` :

- Table `reports` : une nouvelle ligne pointe vers `pdf_path` = `{leadId}/prerapport-mira.pdf`, et `sources` liste les ids de statistiques citées.
- Bucket `reports` : téléchargez ce PDF.

Ouvrez-le. Vous obtenez un document de marque MIRA : page de garde, 10 sections (§0 périmètre
→ §9 sources & méthode), une caractérisation par famille de métiers en §3, et une
bibliographie des sources réellement citées. **Chaque chiffre du rapport vient de la
stat-bank** — le LLM n'en a inventé aucun.

## Ce que vous avez construit (et la suite)

Vous avez fait tourner le pipeline complet : wizard → `submit` → `generate` (enrichissement →
OpenAI → PDF → stockage). Vous savez maintenant où vit chaque morceau.

Pour aller plus loin :

- **Comprendre les garde-fous** (pourquoi « zéro chiffre inventé », l'idempotence, l'anti-SSRF) → [explanation-architecture-et-garde-fous.md](explanation-architecture-et-garde-fous.md).
- **La surface technique complète** (signatures, modèle de données, variables d'env) → [reference-pipeline-prerapport.md](reference-pipeline-prerapport.md).
- **Activer l'email** et itérer sur le PDF → [howto-developpement-local.md](howto-developpement-local.md).
- **Modifier le contenu du rapport** : ajoutez une statistique dans [`src/data/statbank.ts`](../src/data/statbank.ts) (avec sa source), autorisez-la dans la bonne section via `allowedSources` dans [`src/data/rapportStructure.ts`](../src/data/rapportStructure.ts), relancez une génération, et retrouvez-la citée dans le PDF.
