# Gérer les sources du pré-diagnostic depuis l'admin

Guide pratique de l'interface `/admin` (stat-bank). Public : Caroline et l'équipe MIRA
pour l'usage, Moetez pour la mise en service.

## Ce que l'admin pilote

Le pré-rapport ne cite **que** des statistiques de la stat-bank. L'admin en gère deux niveaux :

- **Les documents sources** (`S01`…, `FR1`…) : titre, organisation, année, nature de
  l'éditeur (recherche ou commerciale) et **les sections du rapport autorisées à les citer**.
  Le préfixe du code dit l'appartenance au socle : `S` = socle, `FR` = couche France.
- **Les statistiques** : valeur, unité, formulation citable (*claim*), citation d'origine
  (*verbatim*), thème, périmètre, provenance, projection, page, et les familles de métiers
  (ISCO) qu'elles éclairent directement.

Une modification vaut pour **les pré-rapports générés ensuite** : la génération recharge la
banque au début de chaque rapport. Les rapports déjà envoyés ne changent pas.

## Les règles que l'interface fait respecter

Ce sont les mêmes que les tests de la stat-bank du code (`src/data/statbankSchema.ts`) :

- *claim* : phrase française autonome, 10 à 600 caractères, **sans tiret cadratin, ni
  demi-cadratin, ni point-virgule** (elle est reprise telle quelle dans le rapport) ;
- identifiant en minuscules et tirets, qui **ne change plus** après création (il est cité
  dans les rapports envoyés) ; même règle pour le code d'un document ;
- codes ISCO pris dans la liste des familles du formulaire ;
- une statistique se rattache à un document actif.

Avertissements non bloquants : donnée secondaire sans source d'origine, *claim* qui ne
reprend pas la valeur telle quelle.

Ce que l'interface ne peut pas vérifier : que le chiffre est **exact dans le document
d'origine**. Une statistique n'est saisie qu'après vérification à la source primaire, comme
pour la banque du code.

## Supprimer = archiver

« Supprimer » retire la statistique (ou le document et toutes ses statistiques) de la banque
active sans effacer la ligne : les rapports déjà envoyés citent son identifiant. Cocher
« Afficher les archivées » pour la retrouver et la **restaurer**. La liste indique aussi dans
combien de rapports envoyés chaque statistique a été citée.

## La grille « section → sources »

Chaque document liste les sections qui peuvent le citer (§2 à §7). La synthèse §1 ne cite
que ce que les sections §2 à §7 ont déjà cité. Un document sans section cochée n'est **jamais
cité** : l'interface le signale par le badge « Citée nulle part ».

## Sécurité

- Accès par email + mot de passe (comptes Supabase Auth) **et** liste blanche `ADMIN_EMAILS`
  côté serveur : il faut les deux.
- Le navigateur ne parle jamais à Supabase : il passe par les functions `admin-auth` et
  `admin-sources`, qui revalident chaque saisie. La session est oubliée à la fermeture de
  l'onglet.
- Chaque écriture enregistre l'auteur (`updated_by`) et la date (`updated_at`), et laisse une
  ligne dans les logs des functions.

## Mise en service (une fois)

1. Appliquer `supabase/migrations/0006_statbank_admin.sql` puis `0007_seed_statbank.sql` dans
   le SQL editor de Supabase. Le seed est rejouable : il n'écrase jamais une ligne éditée.
2. Netlify → variables d'environnement : `ADMIN_EMAILS` (adresses séparées par des virgules).
3. Supabase → Authentication → Users → *Add user* → *Create new user*, case *Auto confirm*
   cochée, pour chaque admin. Transmettre le mot de passe provisoire hors email ; l'admin le
   change avec le bouton « Mot de passe » de `/admin` (12 caractères minimum).
4. Vérifier : se connecter sur `/admin`, compter 102 statistiques et 19 documents.

Tant que la migration n'est pas appliquée, la génération continue avec la banque du code
(repli automatique, signalé dans les logs « repli sur la graine du code »).

## Régénérer le seed

Uniquement si la banque du code a changé **avant** la mise en service :

```bash
npx tsx scripts/generate-statbank-seed.ts
```

Après la mise en service, la base fait foi : on n'édite plus `statbankSeed` pour du contenu.
