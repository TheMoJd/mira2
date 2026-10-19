/**
 * admin-sources — Netlify Function (gestion de la stat-bank depuis /admin)
 * ========================================================================
 * Réservée aux admins (`requireAdmin` : jeton Supabase + liste `ADMIN_EMAILS`).
 *
 *  - GET  → documents, statistiques (archivées comprises), sections de la grille,
 *           et nombre de rapports envoyés qui citent chaque statistique.
 *  - POST { action, … } → écriture :
 *      createSource / updateSource { data }          archiveSource / restoreSource { code }
 *      createStat   / updateStat   { data }          archiveStat   / restoreStat   { id }
 *
 * Toute saisie repasse le contrat de `statbankSchema.ts` (les mêmes règles que le
 * formulaire). « Supprimer » archive : l'id d'une statistique est cité dans les
 * rapports déjà envoyés, on garde la ligne et on peut la restaurer. Le code d'un
 * document et l'id d'une statistique ne changent jamais après création.
 *
 * Les modifications valent pour les pré-rapports générés ENSUITE : la génération
 * recharge la banque au début de chaque rapport (`loadActiveStatbank`).
 */
import type { Handler } from '@netlify/functions';
import {
  firstIssue,
  sourceInputSchema,
  sourceInputToRow,
  statInputSchema,
  statInputToRow,
} from '../../src/data/statbankSchema';
import { gridSections } from '../../src/data/rapportStructure';
import { fail, json, readJson, requireAdmin, serviceClient, type AdminClient } from './lib/admin';
import { fetchStatbankRows } from './lib/statbankStore';

/** Code Postgres d'une violation d'unicité (clé primaire déjà prise). */
const UNIQUE_VIOLATION = '23505';

/** Nombre de rapports envoyés citant chaque statistique (`reports.sources`). */
async function citationCounts(supabase: AdminClient): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('reports').select('sources').range(0, 9999);
  if (error) {
    console.warn('[admin-sources] comptage des citations impossible', error.message);
    return {};
  }
  const counts: Record<string, number> = {};
  for (const r of data) {
    if (!Array.isArray(r.sources)) continue;
    for (const id of new Set(r.sources)) if (typeof id === 'string') counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

export const handler: Handler = async (event) => {
  const supabase = serviceClient();
  if (!supabase || !process.env.ADMIN_EMAILS) return fail(500, 'Configuration serveur manquante.');

  const auth = await requireAdmin(event, supabase);
  if (!auth.ok) return auth.response;
  const by = auth.email;
  const sections = gridSections();

  if (event.httpMethod === 'GET') {
    try {
      const [{ sources, stats }, citations] = await Promise.all([fetchStatbankRows(supabase), citationCounts(supabase)]);
      return json(200, { ok: true, sources, stats, gridSections: sections, citations, email: by });
    } catch (err) {
      console.error('[admin-sources] lecture impossible', err);
      return fail(500, 'Lecture de la banque impossible. La migration 0006 est-elle appliquée ?');
    }
  }
  if (event.httpMethod !== 'POST') return fail(405, 'Méthode non autorisée.');

  const body = readJson(event);
  if (!body) return fail(400, 'Requête JSON invalide.');
  const action = String(body.action ?? '');
  const now = new Date().toISOString();

  switch (action) {
    case 'createSource':
    case 'updateSource': {
      const parsed = sourceInputSchema(sections.map((s) => s.id)).safeParse(body.data);
      if (!parsed.success) return fail(400, firstIssue(parsed.error));
      const row = { ...sourceInputToRow(parsed.data), updated_by: by };
      if (action === 'createSource') {
        const { error } = await supabase.from('stat_sources').insert(row);
        if (error?.code === UNIQUE_VIOLATION) return fail(409, `Le code ${row.code} existe déjà.`);
        if (error) return dbError(action, error);
      } else {
        const { code, ...rest } = row;
        const { data, error } = await supabase.from('stat_sources').update(rest).eq('code', code).select('code');
        if (error) return dbError(action, error);
        if (!data?.length) return fail(404, `Document ${code} introuvable.`);
      }
      console.log(`[admin-sources] ${action} ${row.code} par ${by}`);
      return json(200, { ok: true });
    }

    case 'createStat':
    case 'updateStat': {
      const parsed = statInputSchema.safeParse(body.data);
      if (!parsed.success) return fail(400, firstIssue(parsed.error));
      const row = { ...statInputToRow(parsed.data), updated_by: by };
      const { data: src, error: srcError } = await supabase
        .from('stat_sources')
        .select('code, archived_at')
        .eq('code', row.source_code)
        .maybeSingle();
      if (srcError) return dbError(action, srcError);
      if (!src) return fail(400, `Document ${row.source_code} introuvable.`);
      if (src.archived_at) return fail(400, `Le document ${row.source_code} est archivé : le restaurer d’abord.`);
      if (action === 'createStat') {
        const { error } = await supabase.from('stats').insert(row);
        if (error?.code === UNIQUE_VIOLATION) return fail(409, `L’identifiant ${row.id} existe déjà (éventuellement archivé).`);
        if (error) return dbError(action, error);
      } else {
        const { id, ...rest } = row;
        const { data, error } = await supabase.from('stats').update(rest).eq('id', id).select('id');
        if (error) return dbError(action, error);
        if (!data?.length) return fail(404, `Statistique ${id} introuvable.`);
      }
      console.log(`[admin-sources] ${action} ${row.id} par ${by}`);
      return json(200, { ok: true });
    }

    case 'archiveSource':
    case 'restoreSource': {
      const code = String(body.code ?? '');
      const { data, error } = await supabase
        .from('stat_sources')
        .update({ archived_at: action === 'archiveSource' ? now : null, updated_by: by })
        .eq('code', code)
        .select('code');
      if (error) return dbError(action, error);
      if (!data?.length) return fail(404, `Document ${code} introuvable.`);
      console.log(`[admin-sources] ${action} ${code} par ${by}`);
      return json(200, { ok: true });
    }

    case 'archiveStat':
    case 'restoreStat': {
      const id = String(body.id ?? '');
      const { data, error } = await supabase
        .from('stats')
        .update({ archived_at: action === 'archiveStat' ? now : null, updated_by: by })
        .eq('id', id)
        .select('id');
      if (error) return dbError(action, error);
      if (!data?.length) return fail(404, `Statistique ${id} introuvable.`);
      console.log(`[admin-sources] ${action} ${id} par ${by}`);
      return json(200, { ok: true });
    }

    default:
      return fail(400, 'Action inconnue.');
  }
};

function dbError(action: string, error: { message: string; code?: string }) {
  console.error(`[admin-sources] ${action} échoué`, error);
  return fail(500, 'L’enregistrement a échoué côté base. Réessayer, ou prévenir l’équipe technique.');
}
