# Pré-rapports d'exemple — entreprises réelles

> Générés par [`scripts/generate-samples.ts`](../../scripts/generate-samples.ts) sur de **vraies entreprises**, avec leurs **vraies données** d'enrichissement (INSEE Sirene) et un **vrai appel OpenAI** (modèle `gpt-5.4`). Régénérer : `npx tsx scripts/generate-samples.ts`.

Chaque rapport est rendu en HTML (ouvrir dans un navigateur, imprimable en PDF) + le JSON structuré brut.

## Récapitulatif

| Entreprise | Catégorie | NAF | Effectif | Localisation | Citations | Inventées | Hors-grille |
|---|---|---|---|---|---|---|---|
| **Doctolib** | ETI (entreprise de taille intermédiaire) | 62.01Z | 1 000 à 1 999 salariés | LEVALLOIS-PERRET (92) | 45 | 0 | 0 |
| **Biocoop** | ETI (entreprise de taille intermédiaire) | 46.17A | 1 000 à 1 999 salariés | PARIS (75) | 57 | 0 | 0 |
| **Norauto France** | Grande entreprise | 45.32Z | 5 000 à 9 999 salariés | VILLENEUVE-D'ASCQ (59) | 54 | 0 | 0 |
| **Onet Services** | Grande entreprise | 81.21Z | 10 000 salariés et plus | MARSEILLE (13) | 49 | 0 | 0 |

**Garde-fou « zéro chiffre inventé »** : "Inventées" = id de stat inexistant ; "Hors-grille" = stat citée hors de sa section autorisée. Objectif : **0 / 0** partout.

## Doctolib

- **Données réelles** : catégorie ETI (entreprise de taille intermédiaire), NAF 62.01Z, effectif « 1 000 à 1 999 salariés », LEVALLOIS-PERRET (92), créée en 2013, active : true.
- **Familles déclarées** : Tech, informatique & data, Relation client & accueil, Gestion, finance & administration.
- **§3 — verdict par famille** : Tech, informatique & data (ISCO 25) → **élevée** (confiance élevée) · Relation client & accueil (ISCO 42) → **élevée** (confiance moyenne) · Gestion, finance & administration (ISCO 24) → **élevée** (confiance moyenne)
- **Audit citations** : 45 citées, 0 inventées, 0 hors-grille.
- **Message clé (extrait §1)** : Dans une entreprise de logiciel de santé, l’IA concerne d’abord la transformation du travail de bureau, du traitement de l’information, de la relation client et des activités techniques. Le sujet n’est pas seulement technologique : il touche à la qualité de service, à la conformité et à la vitesse d’exécution.…
- 📄 [Rapport HTML](doctolib.html) · [JSON](doctolib.report.json)

## Biocoop

- **Données réelles** : catégorie ETI (entreprise de taille intermédiaire), NAF 46.17A, effectif « 1 000 à 1 999 salariés », PARIS (75), créée en 1987, active : true.
- **Familles déclarées** : Vente & commerce, Transport & logistique, Comptabilité, paie & gestion des données.
- **§3 — verdict par famille** : Vente & commerce (ISCO 52) → **modérée** (confiance moyenne) · Transport & logistique (ISCO 83) → **à confirmer** (confiance faible) · Comptabilité, paie & gestion des données (ISCO 43) → **élevée** (confiance élevée)
- **Audit citations** : 57 citées, 0 inventées, 0 hors-grille.
- **Message clé (extrait §1)** : Pour BIOCOOP, le signal principal porte sur la transformation des tâches plus que sur la disparition des métiers. Les familles les plus administratives et informationnelles sont les plus directement exposées, tandis que les métiers de vente et de terrain restent davantage dans une logique d’assistance, de réorganisatio…
- 📄 [Rapport HTML](biocoop.html) · [JSON](biocoop.report.json)

## Norauto France

- **Données réelles** : catégorie Grande entreprise, NAF 45.32Z, effectif « 5 000 à 9 999 salariés », VILLENEUVE-D'ASCQ (59), créée en 2005, active : true.
- **Familles déclarées** : Industrie, maintenance & métiers qualifiés, Vente & commerce, Relation client & accueil.
- **§3 — verdict par famille** : Industrie, maintenance & métiers qualifiés (ISCO 72, 73, 75) → **à confirmer** (confiance faible) · Vente & commerce (ISCO 52) → **modérée** (confiance moyenne) · Relation client & accueil (ISCO 42) → **élevée** (confiance moyenne)
- **Audit citations** : 54 citées, 0 inventées, 0 hors-grille.
- **Message clé (extrait §1)** : Pour votre activité, l’IA se lit d’abord comme une transformation du travail plus que comme une substitution uniforme des emplois. Les effets les plus visibles concernent les tâches d’information, de conseil, de rédaction, de qualification des demandes et d’appui à la décision, avec une intensité variable selon les fam…
- 📄 [Rapport HTML](norauto.html) · [JSON](norauto.report.json)

## Onet Services

- **Données réelles** : catégorie Grande entreprise, NAF 81.21Z, effectif « 10 000 salariés et plus », MARSEILLE (13), créée en 1967, active : true.
- **Familles déclarées** : Manutention, nettoyage & métiers élémentaires, Relation client & accueil, Gestion, finance & administration.
- **§3 — verdict par famille** : Manutention, nettoyage & métiers élémentaires (ISCO 91, 93, 94, 95, 96) → **modérée** (confiance moyenne) · Relation client & accueil (ISCO 42) → **élevée** (confiance moyenne) · Gestion, finance & administration (ISCO 24) → **élevée** (confiance moyenne)
- **Audit citations** : 49 citées, 0 inventées, 0 hors-grille.
- **Message clé (extrait §1)** : L’impact de l’IA sur vos métiers ne se lit pas d’abord comme une suppression d’emplois, mais comme une transformation des tâches. Dans votre périmètre, cette transformation devrait rester très contrastée selon les familles : plus directe sur les fonctions administratives et de relation client, plus indirecte et d’appui…
- 📄 [Rapport HTML](onet.html) · [JSON](onet.report.json)

