-- =============================================================================
-- MIRA — stat-bank éditable depuis l'interface admin (/admin)
-- =============================================================================
-- Jusqu'ici la stat-bank (les seuls chiffres citables du pré-rapport) vivait dans
-- `src/data/statbank.ts`. Pour que Caroline puisse ajouter, corriger ou retirer
-- des sources sans passer par le code, elle passe en base :
--
--   stat_sources  un document de référence (S01…, FR1…) et les sections du
--                 rapport autorisées à le citer (grille « section → sources »)
--   stats         une statistique citable, rattachée à un document
--
-- Le seed (migration 0007) reprend la banque du code à l'identique. Ensuite la
-- base fait foi : la génération la charge au début de chaque pré-rapport, et ne
-- retombe sur la banque du code que si la base est injoignable.
--
-- Suppression = archivage (`archived_at`) : un id de stat est cité dans les
-- `report_json` déjà envoyés, on garde donc la ligne pour pouvoir les relire, et
-- l'admin peut restaurer.
--
-- Même modèle « coffre » que les autres tables : RLS activée, AUCUNE policy →
-- seul le `service_role` (functions Netlify) lit et écrit.
-- =============================================================================

create table if not exists public.stat_sources (
  code         text primary key check (code ~ '^(S[0-9]{2}|FR[0-9]{1,2})$'),
  -- Le préfixe porte l'appartenance au socle : S = socle, FR = couche France.
  in_socle     boolean generated always as (code like 'S%') stored,
  nature       text not null check (nature in ('recherche', 'commerciale')),
  report       text not null,
  org          text not null,
  year         integer not null check (year between 1950 and 2100),
  -- Sections du rapport autorisées à citer ce document (ids de `rapportStructure.ts`).
  sections     text[] not null default '{}',
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  updated_by   text,
  archived_at  timestamptz
);

create table if not exists public.stats (
  id               text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  source_code      text not null references public.stat_sources (code) on update cascade,
  value            double precision not null,
  unit             text not null default '',
  claim            text not null,
  verbatim         text not null,
  theme            text not null check (theme in ('exposition', 'competences', 'emploi', 'adoption', 'productivite', 'formation', 'gouvernance', 'rh')),
  scope            text not null check (scope in ('monde', 'france', 'europe', 'ocde', 'usa', 'secteur')),
  provenance       text not null check (provenance in ('primaire', 'secondaire')),
  projection       boolean not null default false,
  -- Sous-grands-groupes ISCO-08 éclairés directement ({} = donnée macro).
  isco             text[] not null default '{}',
  page             text,
  original_source  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  updated_by       text,
  archived_at      timestamptz
);

comment on table public.stat_sources is 'Documents de référence de la stat-bank (éditables dans /admin).';
comment on table public.stats is 'Statistiques citables du pré-rapport (éditables dans /admin). Seuls chiffres que le modèle peut citer.';
comment on column public.stat_sources.sections is 'Sections du rapport autorisées à citer ce document (grille section → sources).';
comment on column public.stats.archived_at is 'Non nul = retirée de la banque active (les rapports déjà envoyés gardent leur id).';

create index if not exists stats_source_code_idx on public.stats (source_code);

-- updated_at tenu par la base (l'admin n'a pas à l'envoyer).
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists stat_sources_touch on public.stat_sources;
create trigger stat_sources_touch before update on public.stat_sources
  for each row execute function public.touch_updated_at();
drop trigger if exists stats_touch on public.stats;
create trigger stats_touch before update on public.stats
  for each row execute function public.touch_updated_at();

alter table public.stat_sources enable row level security;
alter table public.stats enable row level security;
-- (Aucune policy créée volontairement : anon/authenticated = 0 accès.)
