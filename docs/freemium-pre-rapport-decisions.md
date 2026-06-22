# MIRA — Pré-rapport freemium : décisions (v2, intègre les retours CEO)

> **But de ce document** : récapituler les décisions de cadrage sur le **livrable n°1 : le
> pré-rapport freemium**. Cette **v2 intègre les retours de la CEO (19/06)**.
>
> Légende : ✅ = validé · 🔄 = révisé par la CEO · 🟡 = point encore ouvert.
> Rien n'est codé à ce stade — c'est du cadrage produit.

---

## Rappel du contexte

MIRA = diagnostic RH-IA pour DRH de PME/ETI. Trois livrables :
1. **Pré-rapport freemium** → lead gen + éducation du marché *(c'est l'objet de ce doc)*
2. Entretiens augmentés → cœur produit, capteur de données terrain *(payant)*
3. Rapport final de transformation → livrable stratégique *(payant)*

**Tension de fond** : un rapport auto-généré doit être assez spécifique/crédible pour convertir,
**sans cannibaliser le payant** ni ressembler à « du ChatGPT déguisé ». Les retours CEO renforcent
cette ligne : freemium volontairement **macro (tendances secteur)**, profondeur réservée au payant.

---

## Synthèse des décisions (v2)

| # | Question | Décision (v2) |
|---|----------|---------------|
| D1 | D'où vient la valeur ? | 🔄 **5 questions qualitatives structurées** + sources optionnelles (site / plaquette). **SIRET rétrogradé** (trop pauvre seul). |
| D2 | Profondeur sur les métiers ? | 🔄 **Volontairement macro** : tendances secteur + métiers majeurs. Positionnement « découvrir les tendances de votre secteur ». |
| D3 | Sortie + capture du lead ? | ✅ **PDF par email**, email obligatoire avant génération *(validé CEO)*. |
| D4 | D'où viennent les chiffres ? | 🔄 **Référentiel propriétaire = prématuré en V1.** V1 = **stats publiques citées** des rapports de référence + LLM pour le texte. |
| D5 / P5 | RGPD & IA Act | 🔄 **Coffre par entreprise**, **pas d'entraînement**, **accord CSE + collaborateurs**. (Victor + Jean-Marie.) |
| — | Accroche conformité | 🔄 **Double message** : RH = EPP 2026 ; dirigeant = pérennité activité & performance. |
| D6 | Approche technique de build | 🟡 Périmètre CTO. La direction CEO **simplifie** la V1. |

---

## D1 — D'où vient la valeur du pré-rapport ? 🔄 *révisé CEO*

**Décision de session (initiale)** : valeur = enrichissement **SIRET** (option A).

**Révision CEO** : SIRET (information juridique) + code APE (classification administrative) sont
**trop génériques et trop pauvres** pour un contenu densifié. La valeur vient plutôt de **5 questions
qualitatives** remplies par l'entreprise (≈ option C, mais structurée) :

1. Dans quel secteur opérez-vous, et que fait concrètement votre entreprise ?
2. Quels produits ou services proposez-vous principalement, et quelle valeur apportent-ils à vos clients ?
3. Qui sont vos clients ou bénéficiaires principaux, et comment interagissez-vous avec eux ?
4. Quelles sont les 3 à 6 grandes familles de métiers indispensables à votre activité aujourd'hui ?
5. Avez-vous un site internet, une page LinkedIn, une plaquette ou un support de présentation à nous partager ?

**Faisabilité technique (réponse à « est-ce possible ? »)** :
- Q1→Q4 = champs texte → **oui, trivial**.
- Q5 : **site web (URL)** et **plaquette (upload PDF/PPT)** = lisibles/parseables côté serveur → **oui**.
  **LinkedIn** = scraping bloqué + interdit par leurs CGU → **non en automatique** ; reco : proposer de
  coller le texte ou d'uploader la plaquette plutôt que de scraper LinkedIn.

**Décision retenue (v2)** : **formulaire de 5 questions qualitatives** + ingestion optionnelle
(URL site / upload plaquette). SIRET conservé en option (qualification du lead), **pas** comme moteur
de valeur. 🟡 *À confirmer : garde-t-on quand même le SIRET en champ optionnel ?*

**Complément CEO — accroche conformité** : OK de garder l'angle EPP 2026 **pour les RH**, et préciser
un message **« pérennité de l'activité et performance de l'entreprise » pour les dirigeants** (DG).

---

## D2 — Quelle profondeur sur les métiers ? 🔄 *révisé CEO*

**Décision de session (initiale)** : semi-auto (métiers pré-remplis depuis le NAF, ajustés par le DRH).

**Révision CEO** : crainte d'un **risque de cannibalisation du payant**. On se **limite** à donner la
**tendance du secteur d'activité et les métiers majeurs**, en positionnant clairement le freemium
comme **« découvrir les tendances de votre secteur »** (pas un diagnostic métier par métier).

**Décision retenue (v2)** : les familles de métiers viennent directement de la **question 4** du
formulaire (le DRH les nomme). Le rapport reste **macro** : tendances sectorielles + lecture sur les
métiers majeurs cités. La profondeur (scoring fin par métier) est **réservée au payant**.

---

## D3 — Forme de livraison + capture du lead ✅ *validé CEO*

**Décision retenue** : **PDF envoyé par email**, email obligatoire avant génération. Aperçu web court,
rapport complet par mail.
**Pourquoi** : un PDF envoyé par mail = lead capturé + objet qui **circule en interne** (DRH → DG).
Le forward EST le canal d'acquisition. **Validé tel quel par la CEO.**

---

## D4 — Sur quoi reposent les chiffres ? 🔄 *révisé CEO*

**Décision de session (initiale)** : hybride — référentiel propriétaire (ESCO/ROME × rapports) pour
les chiffres + LLM pour le texte.

**Révision CEO** : la construction du **référentiel propriétaire est prématurée pour cette V1**.

**Décision retenue (v2)** : en V1, **aucun scoring propriétaire par métier**. Les chiffres affichés sont
des **statistiques macro RÉELLES et citées** issues des rapports de référence (WEF, OCDE, France
Stratégie… — comme celles déjà présentes dans la landing). Le LLM **contextualise** ces stats à
l'activité décrite mais **ne fabrique aucun chiffre** → le garde-fou « ne jamais inventer de stats »
est préservé. Le **référentiel propriétaire** (scoring fin par métier) devient un **actif du payant / V2**.

---

## D5 — Prémisses de cadrage (mises à jour v2)

- **P1 — Faible risque de cannibalisation.** Renforcé par les choix CEO : freemium volontairement
  macro, profondeur réservée au payant.
- **P2 — Référentiel métier→score = actif clé, mais 🔄 reporté en V2** (jugé prématuré par la CEO).
  Ce n'est plus un prérequis bloquant de la V1.
- **P3 — Il faut un backend** (le repo n'a que la landing). Reste vrai, mais **allégé** : appel LLM +
  ingestion site/plaquette + génération PDF + email. Plus de pipeline SIRET lourd ni de référentiel.
- **P4 — API publiques SIRET** : désormais **optionnel** (SIRET rétrogradé). À garder sous le coude
  pour la qualification du lead seulement.
- **P5 — RGPD / IA Act 🔄 chemin défini** : **coffre par entreprise** (isolation des données),
  **pas d'entraînement** sur ces données (→ exposition CNIL réduite à ce niveau), **accord préalable
  du CSE et des collaborateurs**. À sécuriser avec **Victor** (présent le 19/06) et **Jean-Marie**.

---

## Champs du formulaire — V1 (proposition consolidée)

| Champ | Type | Statut |
|-------|------|--------|
| Secteur + ce que fait l'entreprise | Texte | Obligatoire |
| Produits/services + valeur client | Texte | Obligatoire |
| Clients/bénéficiaires + interactions | Texte | Obligatoire |
| 3 à 6 familles de métiers indispensables | Texte / liste | Obligatoire (alimente la lecture métiers) |
| Site web (URL) / plaquette (upload) | URL + upload | Optionnel (enrichit le rapport) |
| LinkedIn | — | ⚠️ pas d'auto ; coller le texte si souhaité |
| Email professionnel | Email | Obligatoire (gate de génération) |
| SIRET | Texte | 🟡 optionnel — à confirmer |

---

## Points encore ouverts 🟡

1. **SIRET** : on le garde en champ optionnel (qualification du lead) ou on le retire totalement ?
2. **LinkedIn** : acceptable de ne PAS l'ingérer automatiquement (URL best-effort / coller le texte) ?
3. **RGPD** : valider avec Victor + Jean-Marie le montage « coffre par entreprise + accord CSE/collaborateurs » ; qui rédige la mention d'information et le DPA ?
4. **Build technique (D6)** : périmètre CTO — arbitrage à venir (approche serverless allégée recommandée).

---

*Document de cadrage produit — v2 intégrant les retours CEO (19/06). Aucune ligne de code à ce stade.*
