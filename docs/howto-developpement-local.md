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
RESEND_FROM=rapport@votre-domaine-verifie     # ⚠ le code lit RESEND_FROM, pas RESEND_FROM_EMAIL
OPS_EMAIL=ops@votre-domaine                    # destinataire des alertes d'échec
```

> ⚠ **Piège connu.** `.env.example` nomme la variable `RESEND_FROM_EMAIL`, mais le code lit
> `RESEND_FROM`. Utilisez `RESEND_FROM` tant que ce n'est pas aligné, sinon l'email reste
> silencieusement `skipped`.

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
2. L'écran de succès « Votre pré-rapport est en route ».

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
| Email jamais reçu, logs `skipped` | Resend non configuré, **ou** `RESEND_FROM_EMAIL` utilisé au lieu de `RESEND_FROM` | Utiliser `RESEND_FROM`. |
| `429 Trop de demandes` | Rate-limit 3/email/h atteint | Changer d'email de test, ou attendre 1 h. |
| `413` / `415` sur la plaquette | > 4 Mo, ou extension non `.pdf/.ppt(x)/.doc(x)` | Réduire le fichier (plafond réel = 4 Mo, pas 10). |
| Statut `failed` immédiat | Lead introuvable, ou parse JSON OpenAI vide | Vérifier `OPENAI_API_KEY` et le modèle dans `OPENAI_MODEL`. |

## Itérer sur le PDF sans soumettre

Pour travailler le gabarit ([`reportHtml.ts`](../src/data/reportHtml.ts)) sans dérouler tout
le wizard, écrivez un petit script scratchpad qui passe un `report_json` d'exemple à
`renderReportHtml` puis `htmlToPdf`, et ouvrez le PDF produit. (`htmlToPdf` utilise déjà
`CHROME_EXECUTABLE_PATH` en local.)
