# MIRA — Pré-rapport freemium : décisions Tranche 4b + 5 (PDF, email, enrichissement, robustesse)

> Decision Record technique, issu d'une session `/grill-me` (Moetez, 22/06/2026).
> Suite directe du [plan technique](freemium-plan-technique.md) (Tranches 4b et 5) et de la
> [structure du rapport](freemium-rapport-structure.md). Fige le **comment** des morceaux restants
> de `generate-prerapport-background.ts`. Garde-fou repo : **build TypeScript strict** (`npm run build`).

---

## Context

La chaîne s'arrêtait à la persistance de `report_json` : `submit-prerapport` capture le lead et
déclenche `generate-prerapport-background`, qui appelle OpenAI (sortie structurée) et stocke le
rapport. Restaient ouverts, marqués TODO dans la function : l'**enrichissement** (INSEE Sirene +
lecture site/plaquette) et le **rendu PDF → email → statut `sent`** (le canal de livraison = la
conversion, décision produit D3). Cette session conçoit ces morceaux + la **robustesse** (Tranche 5).

---

## Décisions

### LLM — fournisseur
**Choisi :** OpenAI (`OPENAI_API_KEY` / `OPENAI_MODEL`), déjà câblé dans la function.
**Pourquoi :** le code en place et la décision Moetez (22/06) priment.
**Rejeté :** Claude Sonnet 4.6 (mentionné dans le plan technique d'origine) — divergence assumée.

### PDF-1 — Identité visuelle du rapport
**Choisi :** palette **violet de la marque MIRA** (tokens dérivés de `globals.css`), exposée en
constante locale en tête de `reportHtml.ts` (re-skinnable).
**Pourquoi :** cohérence avec la landing / l'identité MIRA existante.
**Rejeté :** palette verte « freemium » validée par Caroline pour l'UI du wizard — réservée à l'UI,
pas au document ; à reconsidérer si l'on veut aligner PDF et wizard plus tard.

### PDF-2 — Moteur de rendu HTML
**Choisi :** fonction **string pure** `renderReportHtml(report, ctx): string` dans `src/data/reportHtml.ts`.
**Pourquoi :** le rapport est un document d'impression sans interactivité ; `report_json` est déjà
plat ; 0 dépendance ; testable au vitest.
**Rejeté :** React SSR (`react-dom/server`) — ajoute une dépendance SSR et complexifie le bundle
esbuild pour aucun gain.

### PDF-3 — Polices
**Choisi :** `<link>` **Google Fonts** (Newsreader + Hanken Grotesk, comme la landing) dans le HTML
du rapport, avec attente `networkidle0` avant `page.pdf()`. Fallback CSS `Georgia` / `system-ui`.
**Pourquoi :** `@sparticuz/chromium` n'embarque quasiment aucune police → un fallback système rendrait
mal sur Netlify. Le `<link>` est fidèle à la marque, 0 asset à maintenir, réseau dispo en background.
**Rejeté :** embarquer les `.woff2` en base64 — plus robuste hors-ligne mais lourd (centaines de Ko)
et fichiers à sourcer/maintenir.

### PDF-4 — Test local (Windows)
**Choisi :** `htmlToPdf` utilise `process.env.CHROME_EXECUTABLE_PATH` si présent, sinon
`@sparticuz/chromium`. + script scratchpad : `report_json` exemple → PDF local à inspecter.
**Pourquoi :** le binaire `@sparticuz/chromium` est Linux et ne tourne pas sous Windows ; il faut un
repli vers le Chrome/Edge local pour itérer sans déployer.

### ENR — Enrichissement
**Choisi :** SIRET via l'**API REST publique** `recherche-entreprises.api.gouv.fr` (sans clé) +
lecture du **site** (fetch + strip + résumé tronqué). Plaquette : présence notée, **parsing reporté**.
**Pourquoi :** le MCP « données gouv » n'existe pas au runtime de la function déployée → API REST. Le
parsing plaquette (PDF/docx/pptx) impose des libs lourdes dans le bundle, hors V1.
**Rejeté :** parsing plaquette en V1 ; scraping LinkedIn (CGU, déjà tranché produit).
**Invariant :** l'enrichissement est **best-effort** — il ne doit jamais faire échouer la génération.

### EMAIL — Resend (état d'infra)
**Choisi :** envoi Resend codé complet, mais **dégradation propre** : si `RESEND_API_KEY` absente →
log + statut `sent` quand même (le PDF est stocké). Activation ultérieure sans changement de code.
**Pourquoi :** clé + domaine vérifié pas encore en place ; on ne bloque pas la chaîne.

### EMAIL-2 — Livraison du PDF
**Choisi :** PDF en **pièce jointe** (base64). Bucket `reports` privé, pas de lien public.
**Pourquoi :** se forwarde DRH→DG sans expiration ni ré-authentification — c'est le canal d'acquisition (D3).
**Rejeté :** lien signé (signed URL) — surface de fuite par forward, bénéfice marginal V1.

### ABUS — Anti-abus formulaire
**Choisi :** champ **honeypot** caché + **rate-limit par email** (count `leads.created_at` sur 1 h).
**Pourquoi :** aucune nouvelle PII, aucune migration, propre RGPD. Suffisant pour V1.
**Rejeté :** stockage de l'IP + rate-limit IP — IP = donnée personnelle (surface RGPD en plus) pour un
gain marginal sur une V1.

### RGPD — Wording
**Choisi :** `src/data/rgpd.ts` (NEW), placeholders Victor / Jean-Marie, consommé par le pied de PDF
et l'email. Le `fixedText` §9 de `rapportStructure.ts` est **laissé intact**.
**Pourquoi :** éviter tout conflit avec `rapportStructure.test.ts` écrit en parallèle par une autre
session CC. À fusionner en source unique plus tard si souhaité.

---

## Constraints & invariants
- **Zéro chiffre inventé** : le PDF n'affiche que ce qui est dans `report_json` ; les citations §9 sont
  résolues depuis `statbank` par `id` (`sources_citees`). Aucune fabrication côté rendu.
- **Enrichissement non bloquant** : `enrichSiret` / `fetchSiteResume` retournent vide en cas d'échec.
- **Fetch site sécurisé** : http/https uniquement, hôtes privés/loopback/link-local exclus, timeout +
  cap de taille + contrôle du content-type (anti-SSRF best-effort).
- **Statuts** : `received → generating → sent` ; `sent` = rapport généré + stocké (email best-effort).
  Toute exception du bloc PDF/email → `failed` + `notifyFailure`.
- **Build strict** obligatoire avant livraison (app + functions + vite).
- **Versions** puppeteer-core ↔ @sparticuz/chromium pinnées compatibles ; `external_node_modules`
  pour ne pas bundler le binaire Chromium.

## Open questions
- `RESEND_API_KEY`, `RESEND_FROM`, `OPS_EMAIL` à poser côté Netlify + domaine d'envoi vérifié.
- Mention d'information RGPD + DPA définitifs (Victor / Jean-Marie) — placeholders en attendant.
- Aligner (ou non) le PDF sur la palette verte freemium une fois l'UI wizard arbitrée.
- Parsing plaquette (PDF/docx/pptx) : à rouvrir post-V1 si la valeur le justifie.
