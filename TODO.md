# TODO — Pré-rapport freemium MIRA

Backlog issu des demandes CEO (réunion du 25/06/2026). **À valider en équipe avant
implémentation.** Sert de PRD léger + backlog : chaque item porte un *contrat* (ce que
« fait » veut dire), des *critères d'acceptation* et ses *dépendances*.

**Légende priorité** — `P0` = à faire maintenant · `S1` = sprint courant · `S2` = ensuite.
Statut : `[ ]` à faire · `[~]` en cours · `[x]` fait.

---

## ⚠️ Note transverse — double moteur de rendu

Le rapport est rendu **deux fois** :
- `src/data/reportHtml.ts` → HTML autoportant → **PDF** (Chromium, fonction Netlify) ;
- `src/components/report/ReportDocument.tsx` → **affichage web** (React, page `/rapport/:leadId`).

Toute modif de contenu/structure du rapport (Tranche B) doit être **répliquée dans les deux**.
Dette à considérer : consolider les deux en une source unique (S2, hors scope CEO).

---

## 🟢 Tranche A — Quick wins UX & landing (P0, ~45 min, zéro dépendance)

### [ ] A1 · Retirer la mention « sans carte bancaire »
- **Contrat** : la mention n'apparaît plus nulle part sur le site (jugée non pertinente par la CEO).
- **Fichiers** : `src/pages/PreRapport.tsx:44`, `src/data/prerapport.ts:9` et `:21`, `src/components/sections/FinalCTA.tsx:23`.
- **Critère** : `grep -i "carte bancaire"` ne retourne plus rien dans `src/` ; build vert.

### [ ] A2 · Message d'attente renforcé pendant la génération
- **Contrat** : sur la page de résultat en état `received`/`generating`, message explicite invitant l'utilisateur à **rester sur la page et ne pas la fermer** (~1 à 2 min), pour éviter qu'il parte avant l'affichage.
- **Fichier** : `src/pages/ReportView.tsx` (états `loading`/`received`/`generating`).
- **Critère** : message visible + rassurant ; l'auto-refresh existant est conservé.

### [ ] A3 · Ajustement du vocabulaire
- **Contrat** : remplacer « banque de données » par « sources » ; sur l'axe « augmentation », afficher « augmentation/hybridation ».
- **À localiser** : terme « banque de données » absent du code source → vérifier `src/data/reportPrompt.ts`, le prompt système, et la copie landing. « augmentation » : labels d'axe (`Matrix.tsx`, structure du rapport, données).
- **Critère** : plus aucune occurrence de « banque de données » côté texte produit/affiché ; l'axe lit « augmentation/hybridation ».

---

## 🟠 Tranche B — Refonte du rapport (S1, gros morceau — CEO + Caroline)

> Tout dans `reportHtml.ts` **et** `ReportDocument.tsx` (cf. note transverse).

### [ ] B1 · Page de garde branding (nouvelle page 1)
- **Contrat** : 1ʳᵉ page esthétique avec : nom **« Mira · Votre pré-diagnostic »**, logo MIRA, slogan
  *« L'IA redessine la carte des compétences, MIRA donne la boussole »*, et l'encart proposition de valeur (texte CEO verbatim) :
  > « MIRA est votre pré-diagnostic d'exposition à l'IA de votre organisation. Ce pré-rapport offert applique l'état de l'art — recherche internationale de référence et données françaises — aux familles de métiers que vous avez déclarées, pour distinguer clairement ce qui s'automatise, ce qui s'augmente et ce qui se recompose. Chaque chiffre est sourcé ; c'est une lecture externe, non un audit de vos données internes. Voyez-le comme une invitation à un premier pas : la transformation commence par disposer des clés de lecture, de se poser les bonnes questions, pour enfin passer à l'action. »
- **Dépendance** : logo dispo (`src/components/ui/Logo.tsx` / `public/favicon.svg`) → à inliner en SVG dans le HTML PDF.
- **Critère** : page de garde rendue identiquement en web et PDF ; saut de page avant la page 2.

### [ ] B2 · Carte d'identité société en page 2
- **Contrat** : déplacer le tableau d'identité entreprise (déjà dans `renderCover`) en **page 2**, après la nouvelle page de garde.
- **Critère** : page 1 = branding, page 2 = carte d'identité.

### [ ] B3 · Texte d'introduction fixe
- **Contrat** : remplacer les 3 premières lignes actuelles de l'intro du rapport par un texte fixe, cohérent avec l'encart de la page de garde (B1).
- **Critère** : l'intro ne dépend plus du LLM pour ces lignes ; texte constant.

### [ ] B4 · Tableaux récapitulatifs (HTML + PDF)
- **Contrat** : ajouter des tableaux de synthèse pour casser l'aspect trop textuel et faciliter la lecture.
- **À décider** : quel(s) tableau(x) ? (proposition : 1 tableau « famille de métiers × exposition × nature automatisation/augmentation/recomposition »).
- **Critère** : tableau lisible web + PDF ; pas de débordement A4.

### [ ] B5 · Simplification des sources
- **Contrat** : alléger la bibliographie — ne conserver que **les titres** des documents/sources, supprimer le détail complet des références (qui prend plusieurs pages).
- **Fichier** : `renderBibliography`/`renderCitation` dans `reportHtml.ts` (+ équivalent web).
- **Critère** : section « Sources » tient en peu de place ; titres seuls (org + année max).

### [ ] B6 · Page de fin — transparence & mentions légales
- **Contrat** : dernière page avec les mentions de transparence (ex. « généré par IA ») + lien vers le site MIRA.
- **Dépendance** : ⚠️ **texte validé par Victor** (sollicité). Structure faisable maintenant, texte injecté après.
- **Critère** : page de fin présente ; texte = version validée Victor ; lien MIRA cliquable (PDF + web).

---

## 🔵 Tranche C — Landing : commentaires fictifs (S1, bloqué)
### [ ] C1 · Témoignages fictifs (suggestion Seb)
- **Contrat** : ajouter une section de commentaires/témoignages sur la landing.
- **Dépendance** : personas + textes (Seb). Possible : Claude propose un brouillon à valider.
- **Critère** : section témoignages intégrée, cohérente avec le design existant.

---

## 🟣 Tranche D — Email & domaine (S1, Cyril + Moetez)
### [ ] D1 · Décision domaine d'envoi
- **Contrat** : trancher entre (a) sous-domaine gratuit `send.polaria.ai` (DNS Cloudflare déjà en place) ou (b) achat d'un domaine MIRA dédié.
- **Note** : la CEO demande l'achat d'un domaine « dès aujourd'hui » pour activer l'email. Le fallback (« génération en direct + téléchargement du PDF ») **fonctionne déjà**.
- **Décideurs** : Cyril + Moetez.

### [ ] D2 · Vérification domaine Resend (DNS)
- **Contrat** : ajouter SPF/DKIM/(DMARC) du domaine d'envoi dans Cloudflare ; vérifier dans Resend.
- **Dépendance** : D1.

### [ ] D3 · Variables d'env Netlify + correction de nommage
- **Contrat** : poser `RESEND_API_KEY`, `RESEND_FROM` (`MIRA <…>`), `OPS_EMAIL` sur le site Netlify (scope functions) ; redéployer. **Corriger l'écart `.env.example` `RESEND_FROM_EMAIL` → `RESEND_FROM`** (le code lit `RESEND_FROM`).
- **Critère** : email réellement envoyé (statut Resend `sent`, plus `skipped`) sur un lead de test.

---

## 📌 Dépendances externes à chasser (en parallèle)
- **Logo** : ✅ disponible (pas de blocage B1).
- **Victor** : texte des mentions de transparence/légales (B6) + validation conformité du rapport.
- **Seb** : personas + textes des témoignages fictifs (C1).
- **Cyril** : décision domaine (D1).

---

## ✅ Done (récent)
- **Fix génération de rapport en prod** — la background function crashait à l'init
  (`ERR_REQUIRE_ESM` sur `@sparticuz/chromium` ESM bundlé en CJS), les leads restaient
  figés à `received`. Corrigé par import dynamique dans `htmlToPdf()` (commit `0341a51`),
  vérifié de bout en bout en prod (lead réel `received → generating → sent`, PDF + ligne
  `reports`). Cf. mémoire `netlify-deploy-gotchas-mira`.
