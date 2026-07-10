# Documentation MIRA

Documentation technique du projet MIRA. Le repo contient aujourd'hui la **landing** et le
**pré-rapport freemium** (formulaire → génération LLM → PDF par email).

> Les fichiers `.md` de ce dossier sont versionnés. Les binaires business (pitch
> investisseurs, kits, notes — `.pptx`, `.pages`, `.pdf`, `.docx`) restent **confidentiels et
> ignorés par git** (voir [`.gitignore`](../.gitignore)).

## Par où commencer

Suivant ce que vous cherchez (cadre [Diataxis](https://diataxis.fr/)) :

| Vous voulez… | Lisez | Quadrant |
|--------------|-------|----------|
| Générer un premier pré-rapport pas à pas | [tutorial-premier-prerapport.md](tutorial-premier-prerapport.md) | Tutoriel |
| Faire tourner le pipeline en local (env, Supabase, PDF) | [howto-developpement-local.md](howto-developpement-local.md) | How-to |
| Renvoyer un rapport, diagnostiquer un lead (scripts ops) | [howto-developpement-local.md § Scripts d'exploitation](howto-developpement-local.md#scripts-dexploitation) | How-to |
| Connaître les functions, le modèle de données, les variables d'env | [reference-pipeline-prerapport.md](reference-pipeline-prerapport.md) | Référence |
| Comprendre l'architecture et les garde-fous (pourquoi) | [explanation-architecture-et-garde-fous.md](explanation-architecture-et-garde-fous.md) | Explication |

Le [README racine](../README.md) couvre la landing et la prise en main générale ;
[CLAUDE.md](../CLAUDE.md) porte les conventions du repo.

## Le pré-rapport freemium en une phrase

Un visiteur remplit un wizard (`/pre-rapport`) → `submit-prerapport` capture le lead dans
Supabase → `generate-prerapport-background` enrichit, appelle OpenAI (sortie structurée),
rend un PDF de marque (Chromium) et l'envoie par email. **Aucun chiffre n'est inventé** :
le LLM ne cite que des statistiques sourcées de la stat-bank.

## Notes de décision (historique)

Le *pourquoi* daté des arbitrages produit et technique. Conservées comme archive ; la vérité
« vivante » est dans les 4 documents ci-dessus.

- [freemium-pre-rapport-decisions.md](freemium-pre-rapport-decisions.md) — cadrage produit + retours CEO (19/06/2026).
- [freemium-rapport-structure.md](freemium-rapport-structure.md) — structure du rapport, stat-bank, grille de sources (Tranche 3).
- [freemium-tranche4b-decisions.md](freemium-tranche4b-decisions.md) — PDF, email, enrichissement, robustesse (`/grill-me`, 22/06/2026).
- [freemium-plan-technique.md](freemium-plan-technique.md) — plan technique d'origine (partiellement dépassé — voir le bandeau en tête du fichier).
