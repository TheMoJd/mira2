# MIRA — Pré-rapport freemium : plan technique V1

> ⚠️ **Document historique (plan d'origine, partiellement dépassé).** La vérité « vivante »
> est dans la [référence du pipeline](reference-pipeline-prerapport.md) et
> l'[explication architecture](explanation-architecture-et-garde-fous.md). Écart notable :
> ce plan annonce « Claude Sonnet 4.6 / `@anthropic-ai/sdk` » alors que l'implémentation
> utilise **OpenAI** (`OPENAI_API_KEY`, `gpt-4.1`) — divergence assumée, cf.
> [freemium-tranche4b-decisions.md](freemium-tranche4b-decisions.md).

> Suite du cadrage produit ([freemium-pre-rapport-decisions.md](freemium-pre-rapport-decisions.md)).
> Ici on planifie le **comment**. Découpé en tranches livrables et vérifiables une par une.
> Garde-fou qualité du repo : **build TypeScript strict** (`npm run build`) — chaque tranche doit passer.

---

## Décisions techniques arrêtées

| Sujet | Choix | Pourquoi |
|-------|-------|----------|
| Frontend | React 18 + Vite (existant) + **react-router-dom** | Le fallback SPA Netlify est déjà prêt ; on ajoute juste le routing. |
| Compute backend | **Netlify Functions** (+ Background Functions) | Reste sur l'infra actuelle ; les background functions encaissent Chromium et l'async (jusqu'à 15 min). |
| Données / fichiers / auth | **Supabase** (Postgres + Storage + Auth) | Fondation du produit complet ; le « coffre par entreprise » = RLS. Pas de migration plus tard. |
| Génération PDF | **Chromium headless** (`puppeteer-core` + `@sparticuz/chromium`) | Rend ton HTML/CSS → PDF fidèles aux rapports d'exemple. |
| LLM | **Claude API — Sonnet 4.6**, sortie structurée (JSON) | Bon rapport qualité/coût/latence pour de la rédaction ; sortie typée = contrôle des sections. |
| Email | **Resend** (PDF en pièce jointe) | Simple, bonne délivrabilité — l'email EST la conversion. |
| Enrichissement SIRET | API **recherche-entreprises.api.gouv.fr** (gratuit, sans clé) | SIRET optionnel ; qualifie le lead (NAF, effectifs). |

**Architecture (rappel) :** Wizard SPA → `submit` function (rapide, stocke le lead, renvoie 202) →
`generate` background function (enrichissement + ingestion site/plaquette + LLM + PDF + email) →
statut mis à jour. Le DRH reçoit le PDF par mail.

---

## Dépendances à ajouter

- Front : `react-router-dom`
- Functions : `@supabase/supabase-js`, `@anthropic-ai/sdk`, `resend`, `puppeteer-core`, `@sparticuz/chromium`
- Build du contenu (dev) : `pdf-parse` (extraction texte des PDF de référence pour la stat-bank)

**Secrets (env Netlify + `.env` local, jamais commités)** :
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`.

---

## Schéma de données (Supabase)

```
leads
  id (uuid, pk)         created_at (timestamptz)
  email (text)          siret (text, null)
  secteur_activite (text)        produits_services (text)
  clients (text)        familles_metiers (text[])
  site_url (text, null) plaquette_path (text, null)
  consent_rgpd (bool)   status (enum: received | generating | sent | failed)

reports
  id (uuid, pk)         lead_id (fk → leads)
  pdf_path (text)       generated_at (timestamptz)
  model (text)          sources (jsonb)   -- stats citées + leur provenance

Storage buckets : `uploads` (plaquettes), `reports` (PDF générés) — privés.
```
*RGPD : RLS activé, buckets privés, pas d'entraînement sur ces données (cf. décision CEO). Mention
d'info + DPA à finaliser avec Victor/Jean-Marie (hors V1 technique, placeholders prévus).*

---

## Tranches

### Tranche 0 — Fondations routing *(S)*
- Ajouter `react-router-dom`, transformer `App.tsx` en routeur : `/` = landing actuelle, `/pre-rapport` = wizard.
- **Vérif** : la landing fonctionne à l'identique, `/pre-rapport` affiche une page vide, `npm run build` passe.

### Tranche 1 — Le wizard (front, sans backend) *(M)*
- Composant formulaire multi-étapes (réutilise tokens CSS, `Button`, `Reveal`) :
  1. Accroche (double message **RH** / **dirigeant** — cf. décision CEO)
  2. SIRET (optionnel)
  3. Les 4 questions qualitatives (secteur/activité · produits & valeur · clients & interactions · 3-6 familles de métiers)
  4. Site web (URL, optionnel) + upload plaquette (optionnel)
  5. Email pro + case de consentement RGPD
  6. Écran de confirmation « votre rapport arrive par email »
- Validation côté client ; types ajoutés dans `src/data/types.ts` ; submit *mocké* (console) pour QA visuelle.
- **Vérif** : on peut dérouler tout le wizard dans le navigateur ; build strict passe.

### Tranche 2 — Capture du lead (Supabase + function `submit`) *(M)*
- Créer le projet Supabase + tables + buckets (via MCP Supabase ou console).
- `netlify/functions/submit-prerapport.ts` : valide, upload plaquette, insère le lead, déclenche la background function, renvoie 202.
- Brancher le wizard sur la vraie function. Config `netlify.toml` pour les functions.
- **Vérif** : une soumission crée une ligne `leads` (status `received`) + le fichier atterrit dans Storage.

### Tranche 3 — Contenu : stat-bank + structure du rapport *(M, mi-produit mi-tech)*
- **Reverse-engineer le corpus** (voir section « Corpus de connaissance » ci-dessous) via `pdftotext`
  (dispo) → figer les **sections** du rapport freemium et extraire un **jeu de statistiques sourcées**
  (`src/data/statbank.ts`).
- Modèle de structure le plus exploitable : **PARLONS_RH Baromètre IA & RH 2025** (plan FR clair, ton RH).
- Définir précisément : ce qui est **figé/cité** (chiffres + sources) vs ce que **le LLM rédige** (narratif contextualisé). Garde-fou : aucun chiffre hors stat-bank.
- ⚠️ 2 PDF non extractibles en texte (Baromètre RH 2026, CEGOS) → OCR requis ou versions texte à demander.
- **Vérif** : un document de structure + un `statbank` typé, chaque stat avec sa source.

### Tranche 4 — Génération (background function complète) *(L)*
- `netlify/functions/generate-prerapport-background.ts` :
  1. Enrichissement SIRET (si fourni)
  2. Fetch + parse du site ; parse de la plaquette
  3. Assemblage contexte + stat-bank
  4. Appel Claude (Sonnet 4.6), sortie structurée, prompt verrouillé « n'utilise que les stats fournies »
  5. Template HTML du rapport (rendu React→string) → Chromium → PDF → upload bucket `reports`
  6. Email Resend avec PDF joint
  7. `status = sent` (+ ligne `reports`)
- **Vérif** : une soumission réelle aboutit à un PDF reçu par email, chiffres tous sourcés.

### Tranche 5 — Robustesse & garde-fous *(M)*
- Gestion d'erreur + email de repli si échec ; `status = failed`.
- Anti-abus sur le formulaire public (rate-limit / honeypot).
- Wording RGPD (mention d'info, consentement) — placeholders en attendant Victor/JM.
- QA bout-en-bout (`/qa`).

---

## Corpus de connaissance (`examples of reports/` + `RESSOURCES MIRA/`)

17 documents. Ils alimentent **deux** livrables différemment — à ne pas confondre.

**🔬 Méthodologie d'exposition** *(→ scoring du rapport final / référentiel V2)*
The Iceberg Index (MIT, 2025, *la référence pour le score d'exposition skills-centered*), ILO
Generative AI & jobs (2023), OCDE Capability AI (2025), Who will be the workers most affected (2024),
WEF Future of Jobs 2025, Stanford AI Index 2026.

**🇫🇷 Contexte RH-France** *(→ tendances sectorielles + ton + structure du freemium)*
PARLONS_RH Baromètre IA & RH 2025 *(meilleur modèle de plan/ton)*, Baromètre IA dans les RH 2026
(Talenco), CEGOS 2025 (compétences), Neobrain × Sopra Steria, Indeed Hiring Lab 2025.

**🤝 IA au travail / agents / adoption** *(→ narratif augmentation)*
Collaborating with AI Agents (2025), PwC Fearless Future — AI Jobs Barometer 2025, Fostering inclusive
digital transformation (2024), CIANum IA agentique, ai_report 2025.

**🔗 ARTICLES** : liste de sources web curées (HBR, Stanford, MIT Sloan, Josh Bersin, Talenco…).

| | **Freemium (V1)** | **Rapport final (premium, V2+)** |
|---|---|---|
| Sources | Baromètres RH-FR + macro WEF/OCDE | + Iceberg/ILO/OCDE pour la **méthodo de scoring** |
| Contenu | tendances secteur citées | diagnostic chiffré par métier, défendable, longitudinal |
| Quand | maintenant | référentiel reporté (cf. décision CEO) |

---

## Prérequis avant de coder
- [ ] Projet **Supabase** créé (peut se faire via le MCP Supabase connecté).
- [ ] Clé **Anthropic** (`ANTHROPIC_API_KEY`).
- [ ] Compte **Resend** + domaine d'envoi vérifié (délivrabilité).
- [ ] `netlify-cli` pour le dev local (`netlify dev` sert front + functions).

---

## Ordre conseillé
Commencer par **Tranches 0 → 1** : visibles, sans secret ni service externe, et tu vois vite le
wizard tourner. En parallèle, lancer **Tranche 3** (le contenu) qui ne dépend pas du code. Les
Tranches 2 et 4 (backend) viennent une fois Supabase + clés en place.

---

*Plan technique V1 — périmètre CTO. À ajuster au fil de l'eau.*
