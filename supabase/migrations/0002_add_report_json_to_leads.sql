-- =============================================================================
-- MIRA — colonne `report_json` sur `leads` (rattrapage d'historique)
-- =============================================================================
-- Cette colonne a été ajoutée en prod le 22/06/2026 (migration distante
-- `20260622134757 add_report_json_to_leads`, appliquée via le SQL Editor /
-- MCP) mais n'avait jamais été versionnée ici. Sans elle, un environnement
-- reconstruit depuis ce dossier plante à la persistance du rapport
-- (`generate-prerapport-background` écrit `report_json` inconditionnellement).

alter table public.leads
  add column if not exists report_json jsonb;

comment on column public.leads.report_json is 'Sortie structurée du LLM (contrat PreRapportSchema) — persistée avant le rendu PDF.';
