-- =============================================================================
-- MIRA — Champ entreprise sur les leads (retours CEO/CTO du 13/07/2026)
-- =============================================================================
-- Le wizard collecte désormais le nom de l'entreprise (texte libre, obligatoire
-- côté formulaire) à l'étape identité, aux côtés de prénom/nom/fonction/email.
-- La fonction, déjà présente en base (migration 0003), devient elle aussi
-- obligatoire côté formulaire : AUCUNE colonne à ajouter pour elle.
--
-- Colonne nullable en base : les leads antérieurs à cette migration n'ont pas
-- cette information. L'obligation est portée par la validation serveur de
-- `submit-prerapport` (422), comme pour prénom/nom, pas par le schéma.
--
-- Rollback : expand-only. Ne PAS dropper la colonne (le code déployé insère
-- `entreprise` inconditionnellement, et elle contient des données collectées) ;
-- pour revenir en arrière, reverter d'abord le code applicatif.
-- =============================================================================

-- `if not exists` : l'historique migrations de la prod diverge des fichiers
-- locaux (versions distantes horodatées) — tout rattrapage doit être idempotent
-- et applicable via le SQL Editor. Ne pas lancer `supabase db push` sans
-- `supabase migration repair`.
alter table public.leads
  add column if not exists entreprise text;

comment on column public.leads.entreprise is
  'Nom de l''entreprise déclaré (texte libre, requis côté formulaire depuis le 13/07/2026).';
comment on column public.leads.fonction is
  'Fonction déclarée (texte libre, requise côté formulaire depuis le 13/07/2026) — ciblage RH / dirigeant.';
