-- =============================================================================
-- MIRA — Pré-rapport freemium · schéma initial (Tranche 2)
-- =============================================================================
-- À coller dans Supabase → SQL Editor (ou appliqué via la Supabase CLI).
--
-- Modèle « coffre par entreprise » (RGPD) : RLS activée, AUCUNE policy publique.
-- Le formulaire est public mais n'écrit JAMAIS en direct : tout passe par la
-- Netlify Function `submit-prerapport` qui utilise la clé `service_role`
-- (laquelle bypass la RLS). Donc anon/authenticated n'ont aucun accès aux
-- données — c'est volontaire et sécurisé.
-- =============================================================================

-- Statut du traitement d'un lead.
create type public.lead_status as enum ('received', 'generating', 'sent', 'failed');

-- -----------------------------------------------------------------------------
-- Table `leads` : une soumission de formulaire = une ligne.
-- Colonnes alignées sur les 6 questions du blueprint moteur.
-- -----------------------------------------------------------------------------
create table public.leads (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),

  -- Q1 — secteur + activité réelle
  secteur_activite  text not null,
  -- Q2 — produits/services + valeur client
  produits_services text not null,
  -- Q3 — clients/bénéficiaires + interactions
  clients           text not null,
  -- Q4 — 3 à 6 familles de métiers (ids/libellés issus du champ guidé ISCO)
  familles_metiers  text[] not null,
  -- Q5 — sources d'enrichissement (optionnelles)
  site_url          text,
  plaquette_path    text,          -- chemin dans le bucket `uploads`
  -- Q6 — identifiant légal (optionnel) ; SIRET (14) ou SIREN (9)
  siret             text,

  -- Capture du lead
  email             text not null,
  consent_rgpd      boolean not null default false,

  -- Enrichissement INSEE Sirene (rempli par la background function — Tranche 4)
  naf_code          text,
  effectif_tranche  text,

  status            public.lead_status not null default 'received'
);

comment on table public.leads is 'Soumissions du formulaire de pré-rapport freemium (6 questions + capture).';

-- Index utiles (suivi / relances).
create index leads_status_idx     on public.leads (status);
create index leads_created_at_idx on public.leads (created_at desc);

-- -----------------------------------------------------------------------------
-- Table `reports` : un rapport généré = une ligne (lié à un lead).
-- -----------------------------------------------------------------------------
create table public.reports (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid not null references public.leads (id) on delete cascade,
  generated_at  timestamptz not null default now(),
  pdf_path      text not null,     -- chemin dans le bucket `reports`
  model         text,              -- modèle LLM utilisé (traçabilité)
  sources       jsonb              -- stats citées + provenance (sourceId, page…)
);

comment on table public.reports is 'PDF générés et traçabilité des sources citées.';

create index reports_lead_id_idx on public.reports (lead_id);

-- -----------------------------------------------------------------------------
-- RLS : activée, sans policy publique → seul le `service_role` (serveur) accède.
-- -----------------------------------------------------------------------------
alter table public.leads   enable row level security;
alter table public.reports enable row level security;
-- (Aucune policy créée volontairement : anon/authenticated = 0 accès.)

-- -----------------------------------------------------------------------------
-- Storage : buckets privés pour les plaquettes uploadées et les PDF générés.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false),
       ('reports', 'reports', false)
on conflict (id) do nothing;
-- Pas de policy storage publique → accès uniquement via `service_role`.
