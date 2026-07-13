-- =============================================================================
-- MIRA — Qualification des leads (réunion du 10/07/2026)
-- =============================================================================
-- Le formulaire collecte désormais l'identité du demandeur pour permettre un
-- suivi commercial personnalisé (décision CEO) : prénom + nom (obligatoires
-- côté formulaire), fonction et téléphone (optionnels).
--
-- Colonnes nullable en base : les leads antérieurs à cette migration n'ont pas
-- ces informations. L'obligation est portée par la validation serveur de
-- `submit-prerapport` (comme pour les autres champs), pas par le schéma.
--
-- Rollback : expand-only. Ne PAS dropper ces colonnes (le code déployé insère
-- prenom/nom inconditionnellement, et elles contiennent des PII collectées) ;
-- pour revenir en arrière, reverter d'abord le code applicatif.
-- =============================================================================

-- `if not exists` : les colonnes ont été appliquées en prod via le MCP Supabase
-- le 10/07/2026 (migration distante « 20260710075255 leads_qualification »).
-- Ce fichier vise la reconstruction d'un ENVIRONNEMENT NEUF ; contre la prod,
-- l'historique distant utilise des versions horodatées différentes des noms
-- locaux — ne pas lancer `supabase db push` sans `supabase migration repair`.
alter table public.leads
  add column if not exists prenom    text,
  add column if not exists nom       text,
  add column if not exists fonction  text,
  add column if not exists telephone text;

comment on column public.leads.prenom    is 'Prénom du demandeur (qualification lead, requis côté formulaire depuis le 10/07/2026).';
comment on column public.leads.nom       is 'Nom du demandeur (qualification lead, requis côté formulaire depuis le 10/07/2026).';
comment on column public.leads.fonction  is 'Fonction déclarée (optionnelle) — ciblage RH / dirigeant.';
comment on column public.leads.telephone is 'Téléphone normalisé (optionnel) — suivi commercial. PII : minimisation, jamais requis.';
