-- =============================================================================
-- MIRA — Fiche contact « parcours MIRA / analyse complète » (retours CEO 13/07)
-- =============================================================================
-- Le bouton secondaire de la landing mène désormais à une fiche contact
-- qualifiée (identité + contexte organisation + besoin). Une soumission = une
-- ligne. Le formulaire est public mais n'écrit JAMAIS en direct : tout passe
-- par la Netlify Function `submit-contact` (clé `service_role`, bypass RLS).
--
-- Même modèle « coffre » que `leads` (migration 0001) : RLS activée, AUCUNE
-- policy publique → anon/authenticated n'ont aucun accès. Voulu et sécurisé.
--
-- `if not exists` : idempotent pour rejouer sur un environnement déjà migré.
-- Contre la prod, l'historique distant utilise des versions horodatées ; cette
-- table est appliquée en prod via le MCP Supabase (pas `supabase db push`).
-- =============================================================================

create table if not exists public.contact_requests (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),

  -- Bloc identité
  prenom            text not null,
  nom               text not null,
  email             text not null,
  fonction          text not null,
  fonction_autre    text,                       -- précision si fonction = « Autre »
  entreprise        text not null,
  telephone         text,                       -- optionnel, normalisé (+33…)

  -- Bloc contexte
  secteur           text not null,              -- grande section NAF (libellé)
  effectif          text not null,              -- tranche INSEE (libellé)
  maturite_ia       smallint not null,          -- échelle 1 à 10

  -- Bloc besoin
  pre_diagnostic    text not null,              -- oui / non / en cours
  priorite          text not null,
  horizon           text not null,
  message           text,                       -- contexte libre (optionnel)

  -- Opt-in veille (séparé, non pré-coché)
  newsletter_opt_in boolean not null default false,

  -- Suivi commercial interne
  status            text not null default 'new'
);

comment on table public.contact_requests is 'Demandes de contact qualifiées (fiche parcours MIRA — retours CEO 13/07/2026).';
comment on column public.contact_requests.maturite_ia is 'Auto-évaluation de maturité IA, échelle 1 à 10.';
comment on column public.contact_requests.newsletter_opt_in is 'Consentement veille mensuelle (opt-in explicite, non pré-coché).';
comment on column public.contact_requests.status is 'Suivi commercial : new / contacted / qualified / closed…';

-- Index utiles (tri chronologique du back-office, relances par statut, rate-limit par email).
create index if not exists contact_requests_created_at_idx on public.contact_requests (created_at desc);
create index if not exists contact_requests_status_idx     on public.contact_requests (status);
create index if not exists contact_requests_email_idx      on public.contact_requests (email);

-- RLS : activée, sans policy publique → seul le `service_role` (serveur) accède.
alter table public.contact_requests enable row level security;
-- (Aucune policy créée volontairement : anon/authenticated = 0 accès.)
