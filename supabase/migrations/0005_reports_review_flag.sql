-- =============================================================================
-- MIRA — marquage d'un rapport pour relecture humaine
-- =============================================================================
-- Refonte des prompts : après la génération, le code repasse derrière le modèle
-- (contrôles V1 → V12 de `src/data/reportValidation.ts`). Chaque échec bloquant
-- fait rejouer la section concernée, avec un plafond de deux rejeux par section.
-- Passé ce plafond, le rapport part quand même (le PDF reste lisible et sourcé)
-- mais il est MARQUÉ pour relecture humaine, avec le détail des contrôles en
-- échec, pour qu'on puisse mesurer la qualité de sortie lead après lead.

alter table public.reports
  add column if not exists needs_review boolean not null default false,
  add column if not exists validation_findings jsonb;

comment on column public.reports.needs_review is 'true = contrôles V1-V12 encore en échec après les rejeux, rapport à relire.';
comment on column public.reports.validation_findings is 'Contrôles V1-V12 en échec au moment de l''envoi (code, niveau, section, message).';

create index if not exists reports_needs_review_idx on public.reports (needs_review) where needs_review;
