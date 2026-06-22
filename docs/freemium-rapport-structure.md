# MIRA — Pré-rapport freemium : structure du rapport & contenu (Tranche 3)

> Livrable de la **Tranche 3** du [plan technique](freemium-plan-technique.md), **réaligné sur le
> blueprint moteur validé par la CEO** (Caroline, 22/06/2026 — `docs/MIRA_FREEMIUM REPORT.docx`,
> confidentiel, hors git). Voir aussi le [cadrage produit](freemium-pre-rapport-decisions.md).

Ce document fige **quoi mettre dans le rapport** et **qui le rédige** (figé vs LLM), aligné sur la
structure §0→§9 du blueprint. Source de vérité côté code :

- [`src/data/statbank.ts`](../src/data/statbank.ts) — statistiques citables, chacune avec sa source et
  son **code de source** (`S01`…`S14` du socle, `FR1`…`FR4` de la couche France).
- [`src/data/rapportStructure.ts`](../src/data/rapportStructure.ts) — les 10 blocs §0→§9 + la **grille
  section → sources autorisées** + le vocabulaire contrôlé d'exposition.
- [`src/data/famillesMetiers.ts`](../src/data/famillesMetiers.ts) — les ~28 familles de métiers (ISCO)
  du champ guidé Q4.

---

## 1. Principe directeur du moteur (blueprint)

**Entrée minimale → enrichissement automatique → sortie normalisée et traçable.** 6 questions de
qualification → enrichissement (INSEE Sirene via SIRET/SIREN, lecture site/plaquette, mapping des
familles de métiers vers **ISCO-08/ESCO**) → croisement avec le **socle de sources** → rapport-type
identique d'une entreprise à l'autre, où **chaque affirmation reste rattachée à sa source**.

| Garde-fou | Conséquence |
|-----------|-------------|
| **Unité d'analyse = la famille de métiers (ISCO/ESCO)** | Le secteur n'est qu'une **lentille de pondération**. Lecture par famille = cœur du rapport (§3). |
| **Frontière gratuit/payant = données internes** | Gratuit : état de l'art appliqué à vos métiers. Payant : vos données internes (maturité IA, inventaire compétences) + analyse d'écart + feuille de route. Aucune des 6 questions ne porte sur la maturité IA interne. |
| **Aucun chiffre hors `statbank`** + **grille de sources** | Chaque section ne cite que les sources de sa liste `allowedSources`. Traçabilité totale. |
| **Exposition ≠ suppression** | L'augmentation domine dans les sources ; ne jamais confondre exposition et destruction d'emploi. |
| **Pas de score propriétaire par métier** | Caractérisation **qualitative** (faible/modérée/élevée + automatisation/augmentation/création), pas de scoring chiffré (réservé au payant/V2). |

---

## 2. Le modèle de ton : Parlons RH — Baromètre IA & RH

Plan FR clair, ton RH. Repris pour le **ton** et certains réflexes (page de chiffres-clés, encadrés
« à retenir », sourcer/benchmarker, page méthodo finale). La **structure**, elle, suit désormais le
blueprint (§0→§9 ci-dessous), pas le plan du baromètre.

---

## 3. Structure : 10 blocs §0→§9 (déroulé fixe)

La stratégie encadre le diagnostic : synthèse en ouverture, corps ancré sur les métiers, lecture
stratégique en clôture. Grille codée dans [`rapportStructure.ts`](../src/data/rapportStructure.ts).

| § | Section | Contrat | Sources autorisées | Offre |
|---|---------|---------|--------------------|-------|
| 0 | **Périmètre** (entreprise, NAF, familles, date, socle) | mixte | — | Gratuit |
| 1 | **Synthèse stratégique** (3-4 messages dirigeant) | mixte | transversal (`*`) | Gratuit |
| 2 | **Le contexte en bref** (capacités IA, vague agentique, rythme) | mixte | S02, S07, S08 + FR1, FR2 | Gratuit |
| 3 | **Vos familles de métiers face à l'IA** *(cœur)* | mixte | S01, S06, S10, S12, S13, S14 + FR1, FR2 | Gratuit |
| 4 | **Compétences : ce qui monte, ce qui décline** | mixte | S06, S08, S10, S12 | Gratuit |
| 5 | **Comment le travail se réorganise** | mixte | S04, S07 | Gratuit |
| 6 | **Le facteur humain** (profils exposés, équité) | mixte | S01, S14 | Gratuit |
| 7 | **Votre secteur en repère** (benchmark adoption) | mixte | S02, S05, S06 + FR1–FR4 | Gratuit |
| 8 | **Lecture stratégique & questions** (pont payant) | mixte | transversal (`*`) | Gratuit / amorce payant |
| 9 | **Sources & méthode** | **figé** | toutes (`*`) | Gratuit |

**Contrat figé / LLM** : §9 (et l'amorce payante de §8) sont **figés** ; §0 et §1 sont du gabarit +
narratif ; §2–§7 sont du narratif **avec stats citées strictement depuis `allowedSources`**. Le **§3**
produit, par famille déclarée, une `FamilleCharacterisation` (exposition + nature d'impact + part de
tâches + niveau de confiance). Si aucune source ne couvre directement une famille → `« à confirmer »`
+ confiance faible + mention « non directement transposable », plutôt que de forcer un chiffre.

---

## 4. La stat-bank ([`statbank.ts`](../src/data/statbank.ts))

**~76 statistiques** typées et sourcées (corpus intégral, 17/17 PDF — les 2 scans traités par OCR).
Chaque entrée : `value`, `unit`, `claim` (FR citable), `verbatim` (audit), `theme`, `scope`,
`source` (avec **`sourceId`** + **`inSocle`** + page), `provenance`, `projection?`.

**Socle des 11 sources validé (`inSocle: true`)** :
`S01` ILO · `S02` Stanford AI Index 2026 · `S04` MIT Collaborating with AI Agents · `S05` OCDE
Inclusive transformation · `S06` WEF Future of Jobs 2025 · `S07` CIANum · `S08` OCDE Capability ·
`S10` Indeed · `S12` PwC · `S13` MIT Iceberg · `S14` OCDE Workers most affected.

**Couche France complémentaire (`inSocle: false`, décision Caroline 22/06)** :
`FR1` Parlons RH 2025 · `FR2` Parlons RH 2026 · `FR3` CEGOS 2025 · `FR4` Neobrain × Sopra Steria.
Utilisée surtout en §2 (contexte) et §7 (repère sectoriel) pour compenser un socle quasi 100 %
mondial/US/OCDE.

**Distinctions de fiabilité** : `provenance: 'secondaire'` = chiffre repris d'un tiers (recréditer
`originalSource`) ; `projection: true` = prospective (au conditionnel) ; `scope: 'usa'` = donnée
US, illustrative (à ne pas présenter comme France). Helpers : `statsForSection`,
`socleStats`, `franceLayerStats`, `statsBySource`, `statsByTheme`, `coreFrenchAndGlobalStats`.

---

## 5. Limites connues & TODO

- ✅ **17/17 PDF exploités.** Les 2 scans image (CEGOS, Baromètre 2026) traités par OCR PyMuPDF+Read
  (cf. mémoire OCR). Le « Baromètre 2026 » est édité par **Parlons RH** (n=343), Talenco n'est qu'un
  partenaire.
- ⚠️ **Couverture inégale du §3 par famille de métiers** : le socle couvre directement certaines
  familles (administratif/clerical via ILO, dev/soin via Indeed, analyste financier via PwC, exposition
  par diplôme/genre via OCDE) mais **pas les 28**. Pour les familles non couvertes → caractérisation
  `« à confirmer »` assumée (garde-fou de vigilance). Principe validé.
- ⚠️ **Socle global/US/OCDE** : signaler systématiquement ce qui n'est pas transposable à une PME
  française ; la couche France (FR1–FR4) atténue, mais l'échantillon Parlons RH 2026 est modeste
  (n=343, orienté petites structures).
- 🔜 **Dépend de la suite** : le **prompt système (« super prompt »)** est rédigé par Caroline + Cyril
  (reverse-engineering du corpus), puis intégré côté tech (Tranche 4). Le mapping sémantique texte
  libre → ISCO et l'enrichissement INSEE Sirene (via MCP données gouv, « pour l'instant attendre »)
  sont des chantiers backend de la Tranche 4.

---

*Tranche 3 — livrée et réalignée sur le blueprint CEO. Vérif : structure §0→§9 + stat-bank typée
(sourceId/inSocle) + grille section→sources + champ guidé familles. Build TypeScript strict à valider.*
