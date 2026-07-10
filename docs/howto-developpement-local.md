# How-to — Faire tourner le pré-rapport en local

> **Quadrant Diataxis : How-to.** Tâche ciblée : lancer le front + les Netlify Functions
> ensemble, avec Supabase et la génération PDF, sur votre machine. Suppose que vous avez déjà
> cloné le repo et fait `npm install`. Pour une découverte pas à pas, voir plutôt le
> [tutoriel](tutorial-premier-prerapport.md).

À la fin, une soumission du wizard sur `http://localhost:8888/pre-rapport` crée un lead en
base, génère un PDF et (si Resend est configuré) l'envoie par email.

## Prérequis

- **Node 18+** et les dépendances installées (`npm install`).
- **Netlify CLI** : `npm i -g netlify-cli` (fournit `netlify dev`, qui sert le front Vite ET les functions, et injecte la variable `URL`).
- Un **projet Supabase** (tables `leads`/`reports`, enum `lead_status`, buckets `uploads`/`reports` privés) — voir [reference](reference-pipeline-prerapport.md#modèle-de-données-supabase) pour le schéma.
- Une **clé OpenAI**.
- **Chrome ou Edge** installé localement (pour la génération PDF — le binaire Chromium de prod est Linux uniquement).

## Étape 1 — Configurer `.env`

Copiez le modèle et remplissez-le :

```bash
cp .env.example .env
```

Renseignez au minimum, dans `.env` :

```bash
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...      # clé service_role, secrète
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1                          # optionnel (défaut gpt-4.1)
```

Pour générer le PDF en local, ajoutez le chemin de votre navigateur :

```bash
# Windows
CHROME_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
# macOS
# CHROME_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
```

Pour tester l'envoi d'email, ajoutez Resend (sinon l'étape email sera `skipped`, ce qui est
normal et ne bloque pas la génération) :

```bash
RESEND_API_KEY=re_...
RESEND_FROM=rapport@votre-domaine-verifie     # ou « MIRA <rapport@votre-domaine-verifie> »
RESEND_REPLY_TO=vous@votre-boite-relevee      # optionnel : où partent les réponses des prospects
OPS_EMAIL=ops@votre-domaine                   # optionnel : destinataire des alertes d'échec
```

## Étape 2 — Lancer le serveur de dev

```bash
netlify dev
```

Cela sert le front et les functions sur `http://localhost:8888`. Utilisez **ce** port (pas le
`5173` de Vite seul) : c'est lui qui expose `/.netlify/functions/*`.

Vérification : ouvrez `http://localhost:8888/pre-rapport` — le wizard s'affiche.

## Étape 3 — Soumettre une demande

Déroulez le wizard et validez la dernière étape. Au submit, vous devez observer :

1. Une réponse `202` côté réseau (onglet Network du navigateur).
2. L'écran de succès « Votre pré-rapport arrive par email ».

## Étape 4 — Vérifier la chaîne

Suivez le lead dans Supabase et les logs `netlify dev` :

- **Table `leads`** : une nouvelle ligne, `status` passant `received` → `generating` → `sent`.
- **Bucket `uploads`** : la plaquette si vous en avez joint une.
- **Logs** : `[generate] email lead <id> : sent | skipped | error`.
- **Table `reports`** : une ligne avec `pdf_path` et `sources` (les ids de stats citées).
- **Bucket `reports`** : le PDF à `{leadId}/prerapport-mira.pdf` — téléchargez-le pour l'inspecter.

## Étape 5 — Lancer les tests et le typecheck

Le garde-fou qualité du repo est le **build TypeScript strict** + Vitest :

```bash
npm test          # Vitest (validation, enrichment anti-SSRF, invariants contenu)
npm run build     # tsc app + tsc functions + vite build — doit passer avant toute livraison
```

## Dépannage

| Symptôme | Cause probable | Fix |
|----------|----------------|-----|
| `Configuration serveur manquante` (500) au submit | `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` absents | Renseigner `.env`, relancer `netlify dev`. |
| Le statut reste à `generating` | Exception dans la génération | Lire les logs `[generate] échec …`. Souvent : clé OpenAI invalide, ou Chromium introuvable. |
| Erreur Chromium / `Could not find browser` | Pas de Chrome local | Renseigner `CHROME_EXECUTABLE_PATH` vers chrome.exe / Edge. |
| Email jamais reçu, logs `skipped` | `RESEND_API_KEY` ou `RESEND_FROM` absent au runtime | Renseigner les deux. En prod, vérifier ce que le runtime voit via `/.netlify/functions/envcheck` (présence des variables, jamais les valeurs). |
| `429 Trop de demandes` | Rate-limit 3/email/h atteint | Changer d'email de test, ou attendre 1 h. |
| `413` / `415` sur la plaquette | > 4 Mo, ou extension non `.pdf/.ppt(x)/.doc(x)` | Réduire le fichier (plafond = 4 Mo). |
| Statut `failed` immédiat | Lead introuvable, ou parse JSON OpenAI vide | Vérifier `OPENAI_API_KEY` et le modèle dans `OPENAI_MODEL`. |

## Itérer sur le PDF sans soumettre

Le plus direct : le script d'exemples, qui déroule le vrai prompt + schéma + rendu HTML sur
3 entreprises réelles et écrit les artefacts (`.html`, `.json`, `.md`) dans
[`docs/samples/`](samples/) :

```bash
npx tsx scripts/generate-samples.ts    # nécessite OPENAI_API_KEY dans .env
```

Ouvrez le `.html` produit dans un navigateur : c'est exactement ce que Chromium imprime en
PDF. Pour itérer sur le gabarit ([`reportHtml.ts`](../src/data/reportHtml.ts)) sans payer un
appel OpenAI à chaque fois, repassez un `report_json` déjà généré (table `leads` ou
`docs/samples/*.json`) à `renderReportHtml` puis `htmlToPdf` dans un script scratchpad.

## Scripts d'exploitation

Trois scripts ponctuels (voir la [référence](reference-pipeline-prerapport.md#scripts-dexploitation-scripts)
pour leur surface exacte). Ils lisent `.env` et utilisent la clé `service_role` : usage interne.

**Renvoyer un rapport déjà généré** (email perdu, spam, nouvelle adresse) :

```bash
npx tsx scripts/investigate-leads.ts          # 1. retrouver le leadId (20 derniers leads)
npx tsx scripts/resend-report.ts <leadId>     # 2. re-télécharger le PDF et le renvoyer
```

Vérification : le script affiche `Email envoyé, id Resend : …`. S'il échoue sur
`Download PDF échoué`, le rapport n'a jamais été généré → regarder le `status` du lead
(un lead `failed` se rejoue en re-déclenchant la génération, pas avec ce script).

**Diagnostiquer « l'email n'est pas parti »** :

```bash
npx tsx scripts/investigate-leads.ts
```

Lecture : un lead `sent` avec `report:oui` mais sans email reçu → problème Resend
(vérifier `envcheck` en prod, puis les spams) ; un lead bloqué `generating`/`failed` →
problème de génération (logs Netlify).
