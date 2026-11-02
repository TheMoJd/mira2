-- =============================================================================
-- MIRA — lien vers le document d'une source de la stat-bank (/admin)
-- =============================================================================
-- Caroline veut retrouver le document d'origine depuis sa fiche dans l'admin.
-- Un simple lien suffit : la banque est faite de publications publiques (OCDE,
-- INSEE, OIT…), et rien dans le pipeline ne lit le document (le modèle ne cite
-- que `stats.claim`, contrôlé par V6/V7). Le lien ne sert qu'à l'humain pour
-- revérifier la source, il n'apparaît jamais dans le rapport.
--
-- Additive et rejouable. À appliquer AVANT de déployer le code qui écrit `url`
-- (sinon l'enregistrement d'un document échoue côté base).
-- =============================================================================

alter table public.stat_sources add column if not exists url text;

alter table public.stat_sources drop constraint if exists stat_sources_url_check;
alter table public.stat_sources add constraint stat_sources_url_check
  check (url is null or (url ~ '^https?://' and char_length(url) <= 2000));

comment on column public.stat_sources.url is 'Lien vers le document (PDF ou page de la source primaire). Réservé à l''admin, jamais montré dans le rapport.';
