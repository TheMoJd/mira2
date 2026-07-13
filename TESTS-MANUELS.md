# Tests manuels — Pré-diagnostic freemium MIRA

Scénarios à dérouler à la main pour valider le flux bout-en-bout (wizard → capture → génération → PDF → email). Complète la suite automatique (`npm test`), elle ne la remplace pas.

## Prérequis

1. `.env` rempli : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY` (+ `OPENAI_MODEL`).
   Pour tester l'email : `RESEND_API_KEY`, `RESEND_FROM`. Sinon l'envoi est *skipped* (le PDF est quand même généré et stocké).
2. Lancer en local : `netlify dev` (sert le front **et** les functions, lit le `.env`).
   ⚠️ Relancer `netlify dev` après tout ajout/renommage de function, sinon elle n'est pas servie.
3. Ouvrir l'URL affichée (souvent `http://localhost:8888`) → page `/pre-diagnostic`.

**Vérifier en base** (Supabase → SQL Editor) :
```sql
select id, status, email, prenom, nom, entreprise, fonction, telephone, naf_code, effectif_tranche,
       (report_json is not null) as has_report,
       jsonb_array_length(report_json->'sections') as n_sections, created_at
from leads order by created_at desc limit 5;
```
Le PDF généré se trouve dans le bucket privé `reports` (chemin `<leadId>/prerapport-mira.pdf`).

---

## Test 1 — Parcours nominal (happy path)

**Objectif :** une soumission valide produit un rapport complet, un PDF stocké et (si Resend configuré) un email reçu.

**Données d'entrée** (entreprise réelle, données registre exactes) :
- SIRET : `42476141900045`
- Q1 secteur/activité : *Fournisseur français de cloud computing (hébergement et traitement de données) ; conçoit et exploite ses propres datacenters en Europe.*
- Q2 produits/valeur : *Serveurs dédiés, VPS, cloud public/privé, hébergement web, noms de domaine ; souveraineté des données et transparence tarifaire.*
- Q3 clients/interactions : *Développeurs, PME, grands comptes, secteur public ; self-service via espace client web + support + commerciaux grands comptes.*
- Q4 familles (une par une, **Entrée** entre chaque) : `Tech, informatique & data` · `Techniciens informatique & télécoms` · `Ingénierie & sciences` · `Relation client & accueil` · `Vente & commerce`
- Q5 site : `https://www.ovhcloud.com` (plaquette : vide)
- Étape 5 : Prénom `Camille` · Nom `Durand` · Entreprise `OVHcloud` · Fonction `DRH` · Téléphone `06 12 34 56 78` (optionnel)
- Email : **ta propre adresse** · Consentement : coché

**Étapes :** dérouler les 5 étapes du wizard, soumettre.

**Résultat attendu :**
- Écran de confirmation « votre pré-diagnostic arrive par email ».
- En base, le lead passe `received` → `generating` → **`sent`** (quelques secondes à 1-2 min).
- `has_report = true`, `n_sections = 10`.
- `naf_code` ≈ `63.11Z` et `effectif_tranche` renseignés (enrichissement INSEE via le SIRET).
- Un fichier `reports/<leadId>/prerapport-mira.pdf` existe.
- Si Resend configuré : email reçu avec le PDF en pièce jointe (vérifier aussi les spams).

**Vérifier le périmètre des sources** (aucune source hors grille par section) :
```sql
select s->>'id' as section, s->'sources_citees' as sources
from leads l, jsonb_array_elements(l.report_json->'sections') s
where l.id = '<leadId>' order by 1;
```

---

## Test 2 — Validations bloquantes (le formulaire refuse les entrées invalides)

**Objectif :** vérifier que les garde-fous côté client **et** serveur rejettent proprement, sans créer de lead.

**Cas à tester (un par un) :**

| # | Action | Attendu |
|---|--------|---------|
| 2a | Étape 1 : laisser le secteur **vide**, cliquer Continuer | Erreur sous le champ, blocage à l'étape 1 |
| 2b | SIRET = `123` (≠ 14 chiffres) | Erreur « SIRET doit comporter 14 chiffres » |
| 2c | Étape 3 (métiers) : **0 famille** | Erreur « Ajoutez au moins une famille » |
| 2d | Étape 5 : email = `pasunemail`, consentement **décoché** | Deux erreurs (email + consentement), pas de soumission |
| 2e | Email valide mais consentement décoché | Erreur consentement uniquement |
| 2f | Étape 5 : prénom, nom, **entreprise** ou **fonction** vide | Erreur sous le(s) champ(s), blocage à l'étape 5 |
| 2g | Téléphone = `123` (téléphone vide = OK) | Erreur « numéro invalide » ; vide → soumission acceptée |

**Résultat attendu :** aucune nouvelle ligne dans `leads` (la requête de vérification ne montre aucun nouveau lead). Les messages d'erreur s'affichent en rouge sous les champs concernés.

> Astuce : pour tester le rejet **serveur** (et pas seulement client), on peut rejouer la requête `POST /.netlify/functions/submit-prerapport` avec un champ manquant — réponse attendue **422** + `{ "ok": false, "error": "…" }`.

---

## Test 3 — Anti-abus (rate-limit + honeypot)

**Objectif :** vérifier les protections contre le spam/bots.

**3a — Rate-limit par email (3 / heure) :**
1. Soumettre **4 fois** un formulaire valide avec le **même email** en moins d'une heure.
2. Attendu : les 3 premières passent (202) ; la **4ᵉ est refusée avec un 429** et le message « Trop de demandes pour cette adresse. Réessayez dans une heure. »
3. Vérifier en base : 3 leads créés pour cet email, pas un 4ᵉ.
   ```sql
   select count(*) from leads where email = '<emailTest>'
     and created_at > now() - interval '1 hour';
   ```

**3b — Honeypot (piège à bots) :**
- Le champ `company_website_hp` est caché et **jamais rempli par un humain**. Un bot qui remplit tous les champs le remplira.
- Simuler un bot : rejouer la requête `POST` du formulaire **avec** `company_website_hp` non vide.
- Attendu : réponse **202 « ok » factice** (pour ne pas signaler la détection au bot), mais **aucun lead créé** en base et **aucune génération** déclenchée.

---

## Réinitialiser entre deux tests (optionnel, projet dev)

```sql
-- Supprime les leads de test (cascade sur reports). Adapter le filtre email.
delete from leads where email in ('<tonEmailTest>');
```
Le PDF reste dans le bucket `reports` ; le supprimer depuis Supabase → Storage si besoin.

---

*Ces tests couvrent : le chemin heureux (Test 1), la robustesse des entrées (Test 2) et la sécurité anti-abus (Test 3). Pour la régression automatique : `npm test`.*
