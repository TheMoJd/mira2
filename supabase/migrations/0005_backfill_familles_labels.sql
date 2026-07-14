-- =============================================================================
-- MIRA — Backfill des libellés de familles (règle CTO anti-cadratins du 13/07)
-- =============================================================================
-- Deux libellés canoniques changent de séparateur (« — » → « · ») :
--   « Santé — praticiens »                                → « Santé · praticiens »
--   « Services aux personnes — hôtellerie, restauration » → « Services aux personnes · hôtellerie, restauration »
-- Les leads antérieurs stockent les ANCIENNES chaînes dans familles_metiers
-- (text[]). Le mapping ISCO est déjà protégé par une normalisation à la lecture
-- (netlify/functions/lib/context.ts, conservée en ceinture pour les soumissions
-- en vol de bundles front en cache), mais on fait converger les données pour
-- qu'aucun futur consommateur SQL (dashboard, export CRM, analytics) n'ait à
-- réimplémenter cette normalisation.
--
-- Idempotente : array_replace est un no-op quand l'ancien libellé est absent,
-- et le WHERE ne touche que les lignes concernées. Applicable via le SQL Editor
-- comme 0004 (l'historique prod diverge des fichiers locaux : jamais de
-- `supabase db push` sans `migration repair`).
--
-- Rollback : inverser les deux array_replace (transformation bijective, aucune
-- perte) — mais l'ancien code lit aussi les nouveaux libellés grâce au shim.

update public.leads
set familles_metiers = array_replace(
      array_replace(
        familles_metiers,
        'Santé — praticiens',
        'Santé · praticiens'
      ),
      'Services aux personnes — hôtellerie, restauration',
      'Services aux personnes · hôtellerie, restauration'
    )
where familles_metiers && array[
  'Santé — praticiens',
  'Services aux personnes — hôtellerie, restauration'
];
