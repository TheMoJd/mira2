# Pré-rapports d'exemple — entreprises réelles

> Générés par [`scripts/generate-samples.ts`](../../scripts/generate-samples.ts) sur de **vraies entreprises**, avec leurs **vraies données** d'enrichissement (INSEE Sirene) et un **vrai appel OpenAI** (modèle `gpt-5.4`). Régénérer : `npx tsx scripts/generate-samples.ts`.

Chaque rapport est rendu en HTML (ouvrir dans un navigateur, imprimable en PDF) + le JSON structuré brut.

## Récapitulatif

| Entreprise | Catégorie | NAF | Effectif | Localisation | Citations | Inventées | Hors-grille |
|---|---|---|---|---|---|---|---|
| **Doctolib** | ETI (entreprise de taille intermédiaire) | 62.01Z | 1 000 à 1 999 salariés | LEVALLOIS-PERRET (92) | 56 | 0 | 0 |
| **Biocoop** | — | — | — | — | 68 | 0 | 0 |
| **Norauto France** | Grande entreprise | 45.32Z | 5 000 à 9 999 salariés | VILLENEUVE-D'ASCQ (59) | 58 | 0 | 0 |
| **Onet Services** | Grande entreprise | 81.21Z | 10 000 salariés et plus | MARSEILLE (13) | 57 | 0 | 0 |

**Garde-fou « zéro chiffre inventé »** : "Inventées" = id de stat inexistant ; "Hors-grille" = stat citée hors de sa section autorisée. Objectif : **0 / 0** partout.

## Doctolib

- **Données réelles** : catégorie ETI (entreprise de taille intermédiaire), NAF 62.01Z, effectif « 1 000 à 1 999 salariés », LEVALLOIS-PERRET (92), créée en 2013, active : true.
- **Familles déclarées** : Tech, informatique & data, Relation client & accueil, Gestion, finance & administration.
- **§3 — verdict par famille** : Tech, informatique & data (ISCO 25) → **élevée** (confiance élevée) · Relation client & accueil (ISCO 42) → **modérée** (confiance élevée) · Gestion, finance & administration (ISCO 24) → **élevée** (confiance moyenne)
- **Audit citations** : 56 citées, 0 inventées, 0 hors-grille.
- **Message clé (extrait §1)** : Pour vos familles de métiers, l’IA relève d’abord d’une transformation du travail plus que d’une substitution directe des postes. Les effets attendus portent surtout sur l’automatisation de certaines tâches répétitives, l’assistance à la production et à la décision, et l’émergence de nouveaux besoins de coordination, d…
- 📄 [Rapport HTML](doctolib.html) · [JSON](doctolib.report.json)

## Biocoop

- **Données réelles** : catégorie —, NAF —, effectif « — », —, créée en —, active : —.
- **Familles déclarées** : Vente & commerce, Transport & logistique, Comptabilité, paie & gestion des données.
- **§3 — verdict par famille** : Vente & commerce (ISCO 52) → **à confirmer** (confiance faible) · Transport & logistique (ISCO 83) → **à confirmer** (confiance faible) · Comptabilité, paie & gestion des données (ISCO 43) → **élevée** (confiance moyenne)
- **Audit citations** : 68 citées, 0 inventées, 0 hors-grille.
- **Message clé (extrait §1)** : L’IA concerne déjà les métiers supports et les métiers de relation, mais son effet principal reste la transformation du travail plus que la disparition des postes. Pour Biocoop, l’enjeu est d’identifier où l’IA peut assister les équipes sans dégrader la qualité de service, la traçabilité ni la conformité.…
- 📄 [Rapport HTML](biocoop.html) · [JSON](biocoop.report.json)

## Norauto France

- **Données réelles** : catégorie Grande entreprise, NAF 45.32Z, effectif « 5 000 à 9 999 salariés », VILLENEUVE-D'ASCQ (59), créée en 2005, active : true.
- **Familles déclarées** : Industrie, maintenance & métiers qualifiés, Vente & commerce, Relation client & accueil.
- **§3 — verdict par famille** : Industrie, maintenance & métiers qualifiés (ISCO 72, 73, 75) → **à confirmer** (confiance faible) · Vente & commerce (ISCO 52) → **à confirmer** (confiance faible) · Relation client & accueil (ISCO 42) → **élevée** (confiance moyenne)
- **Audit citations** : 58 citées, 0 inventées, 0 hors-grille.
- **Message clé (extrait §1)** : Pour vos métiers, l’enjeu principal n’est pas la disparition rapide de postes entiers, mais la transformation progressive des tâches : assistance à la rédaction, appui au diagnostic, préparation d’informations, traitement de demandes récurrentes et meilleure coordination entre équipes et outils.…
- 📄 [Rapport HTML](norauto.html) · [JSON](norauto.report.json)

## Onet Services

- **Données réelles** : catégorie Grande entreprise, NAF 81.21Z, effectif « 10 000 salariés et plus », MARSEILLE (13), créée en 1967, active : true.
- **Familles déclarées** : Manutention, nettoyage & métiers élémentaires, Relation client & accueil, Gestion, finance & administration.
- **§3 — verdict par famille** : Manutention, nettoyage & métiers élémentaires (ISCO 91, 93, 94, 95, 96) → **modérée** (confiance moyenne) · Relation client & accueil (ISCO 42) → **modérée** (confiance moyenne) · Gestion, finance & administration (ISCO 24) → **élevée** (confiance élevée)
- **Audit citations** : 57 citées, 0 inventées, 0 hors-grille.
- **Message clé (extrait §1)** : Pour ONET SERVICES, l’impact de l’IA ne se lit pas de façon uniforme : les métiers administratifs et de relation client sont d’abord exposés via les tâches informationnelles et conversationnelles, tandis que les métiers de nettoyage, manutention et services de terrain restent davantage contraints par la réalité physiqu…
- 📄 [Rapport HTML](onet.html) · [JSON](onet.report.json)

