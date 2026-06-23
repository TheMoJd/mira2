# Pré-rapports d'exemple — entreprises réelles

> Générés par [`scripts/generate-samples.ts`](../../scripts/generate-samples.ts) sur de **vraies entreprises**, avec leurs **vraies données** d'enrichissement (INSEE Sirene) et un **vrai appel OpenAI** (modèle `gpt-5.4`). Régénérer : `npx tsx scripts/generate-samples.ts`.

Chaque rapport est rendu en HTML (ouvrir dans un navigateur, imprimable en PDF) + le JSON structuré brut.

## Récapitulatif

| Entreprise | Catégorie | NAF | Effectif | Localisation | Citations | Inventées | Hors-grille |
|---|---|---|---|---|---|---|---|
| **Doctolib** | ETI (entreprise de taille intermédiaire) | 62.01Z | 1 000 à 1 999 salariés | LEVALLOIS-PERRET (92) | 22 | 0 | 0 |
| **Biocoop** | ETI (entreprise de taille intermédiaire) | 46.17A | 1 000 à 1 999 salariés | PARIS (75) | 61 | 0 | 0 |
| **Norauto France** | Grande entreprise | 45.32Z | 5 000 à 9 999 salariés | VILLENEUVE-D'ASCQ (59) | 59 | 0 | 0 |
| **Onet Services** | Grande entreprise | 81.21Z | 10 000 salariés et plus | MARSEILLE (13) | 58 | 0 | 0 |

**Garde-fou « zéro chiffre inventé »** : "Inventées" = id de stat inexistant ; "Hors-grille" = stat citée hors de sa section autorisée. Objectif : **0 / 0** partout.

## Doctolib

- **Données réelles** : catégorie ETI (entreprise de taille intermédiaire), NAF 62.01Z, effectif « 1 000 à 1 999 salariés », LEVALLOIS-PERRET (92), créée en 2013, active : true.
- **Familles déclarées** : Tech, informatique & data, Relation client & accueil, Gestion, finance & administration.
- **§3 — verdict par famille** : Tech, informatique & data (ISCO 25) → **élevée** (confiance élevée) · Relation client & accueil (ISCO 42) → **modérée** (confiance moyenne) · Gestion, finance & administration (ISCO 24) → **élevée** (confiance moyenne)
- **Audit citations** : 22 citées, 0 inventées, 0 hors-grille.
- **Message clé (extrait §1)** : Pour vos familles de métiers, l’IA doit d’abord être lue comme une transformation du travail plutôt que comme une substitution simple des emplois. Les effets les plus visibles portent sur l’automatisation de certaines tâches répétitives, l’assistance à la production de contenu, à l’analyse et au traitement des demandes…
- 📄 [Rapport HTML](doctolib.html) · [JSON](doctolib.report.json)

## Biocoop

- **Données réelles** : catégorie ETI (entreprise de taille intermédiaire), NAF 46.17A, effectif « 1 000 à 1 999 salariés », PARIS (75), créée en 1987, active : true.
- **Familles déclarées** : Vente & commerce, Transport & logistique, Comptabilité, paie & gestion des données.
- **§3 — verdict par famille** : Vente & commerce (ISCO 52) → **à confirmer** (confiance faible) · Transport & logistique (ISCO 83) → **à confirmer** (confiance faible) · Comptabilité, paie & gestion des données (ISCO 43) → **élevée** (confiance moyenne)
- **Audit citations** : 61 citées, 0 inventées, 0 hors-grille.
- **Message clé (extrait §1)** : Pour BIOCOOP, l’enjeu principal n’est pas de savoir si l’IA va toucher l’organisation, mais quelles tâches seront assistées en priorité dans les fonctions administratives, commerciales et logistiques. Le sujet porte d’abord sur la transformation du travail, plus que sur une suppression uniforme des postes.…
- 📄 [Rapport HTML](biocoop.html) · [JSON](biocoop.report.json)

## Norauto France

- **Données réelles** : catégorie Grande entreprise, NAF 45.32Z, effectif « 5 000 à 9 999 salariés », VILLENEUVE-D'ASCQ (59), créée en 2005, active : true.
- **Familles déclarées** : Industrie, maintenance & métiers qualifiés, Vente & commerce, Relation client & accueil.
- **§3 — verdict par famille** : Industrie, maintenance & métiers qualifiés (ISCO 72, 73, 75) → **modérée** (confiance moyenne) · Vente & commerce (ISCO 52) → **à confirmer** (confiance faible) · Relation client & accueil (ISCO 42) → **élevée** (confiance moyenne)
- **Audit citations** : 59 citées, 0 inventées, 0 hors-grille.
- **Message clé (extrait §1)** : L’IA concerne d’abord la transformation des tâches : dans votre périmètre, elle touche prioritairement les activités de relation client et, plus largement, les tâches d’information, de traitement et d’assistance, tandis que les gestes techniques en atelier restent plus dépendants du contexte réel, des contraintes physi…
- 📄 [Rapport HTML](norauto.html) · [JSON](norauto.report.json)

## Onet Services

- **Données réelles** : catégorie Grande entreprise, NAF 81.21Z, effectif « 10 000 salariés et plus », MARSEILLE (13), créée en 1967, active : true.
- **Familles déclarées** : Manutention, nettoyage & métiers élémentaires, Relation client & accueil, Gestion, finance & administration.
- **§3 — verdict par famille** : Manutention, nettoyage & métiers élémentaires (ISCO 91, 93, 94, 95, 96) → **modérée** (confiance moyenne) · Relation client & accueil (ISCO 42) → **élevée** (confiance moyenne) · Gestion, finance & administration (ISCO 24) → **élevée** (confiance moyenne)
- **Audit citations** : 58 citées, 0 inventées, 0 hors-grille.
- **Message clé (extrait §1)** : Pour vos métiers, l’impact de l’IA ne se lit pas de façon uniforme. Les fonctions administratives et de relation client apparaissent déjà directement concernées par l’automatisation partielle et l’assistance, tandis que les métiers de nettoyage, de manutention et plus largement de terrain restent davantage contraints p…
- 📄 [Rapport HTML](onet.html) · [JSON](onet.report.json)

