/**
 * get-report — Netlify Function (phase 1, test interne)
 * =====================================================
 * Lecture d'un rapport pour la page de résultat `/rapport/:leadId`. Le front ne
 * touche jamais Supabase : tout passe par ici (clé `service_role`, serveur only).
 *
 * Réponse selon le statut du lead :
 *   - introuvable                  → 404 { status: 'not_found' }
 *   - received / generating        → 200 { status }                  (le front poll)
 *   - failed (ou report corrompu)  → 200 { status: 'failed' }
 *   - sent                         → 200 { status, report, context, pdfUrl }
 *
 * Le `context` (page de garde) est **recalculé** depuis le lead + un
 * enrichissement SIRET best-effort (réutilise `buildGenerationContext`) — pas de
 * persistance dédiée en phase 1 (cf. spec, optimisation phase 2). `pdfUrl` est une
 * URL signée courte (~5 min) vers le PDF du bucket privé `reports`.
 *
 * ⚠️ Phase 1 : accès par `leadId` (UUID) sans token. Dette de sécurité assumée
 * pour le test interne ; phase 2 = token non devinable (cible RH sensible).
 */
import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/supabase';
import { PreRapportSchema } from '../../src/data/reportSchema';
import type { PreRapportOutput } from '../../src/data/reportSchema';
import type { ReportRenderContext } from '../../src/data/reportHtml';
import { buildGenerationContext } from './lib/context';
import { enrichSiret } from './lib/enrichment';

const PDF_SIGNED_URL_TTL_S = 300;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type GetReportResponse =
  | { status: 'received' | 'generating' | 'failed' | 'not_found' }
  | { status: 'sent'; report: PreRapportOutput; context: ReportRenderContext; pdfUrl: string | null };

const json = (statusCode: number, payload: GetReportResponse) => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(payload),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { status: 'not_found' });

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[get-report] configuration serveur manquante');
    return { statusCode: 500, body: JSON.stringify({ status: 'failed' }) };
  }

  const leadId = event.queryStringParameters?.leadId ?? '';
  if (!UUID_RE.test(leadId)) return json(404, { status: 'not_found' });

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: lead, error } = await supabase.from('leads').select('*').eq('id', leadId).single();
  if (error || !lead) return json(404, { status: 'not_found' });

  if (lead.status !== 'sent') {
    // received | generating → le front continue de poller ; failed → état erreur.
    const status = lead.status === 'failed' ? 'failed' : (lead.status as 'received' | 'generating');
    return json(200, { status });
  }

  // Rapport prêt : valide la structure persistée (défense : un report_json corrompu
  // ne doit pas casser le rendu côté client).
  const parsed = PreRapportSchema.safeParse(lead.report_json);
  if (!parsed.success) {
    console.error(`[get-report] report_json invalide pour lead ${leadId} : ${parsed.error.message}`);
    return json(200, { status: 'failed' });
  }

  // Contexte de la page de garde recalculé (best-effort, ne fait jamais échouer).
  let context: ReportRenderContext;
  try {
    const siret = lead.siret ? await enrichSiret(lead.siret) : {};
    const ctx = buildGenerationContext(lead, { siret }, new Date(lead.created_at));
    context = {
      nomEntreprise: ctx.nomEntreprise,
      secteurDeclare: ctx.secteurDeclare,
      nafLibelle: ctx.nafLibelle,
      nafCode: ctx.nafCode,
      effectifTranche: ctx.effectifTranche,
      categorieEntreprise: ctx.categorieEntreprise,
      localisation: ctx.localisation,
      famillesLabels: ctx.famillesDeclarees.map((f) => f.label),
      dateRapport: ctx.dateRapport,
    };
  } catch (err) {
    // Repli minimal depuis le lead seul si l'enrichissement plante.
    console.warn(`[get-report] contexte recalculé indisponible pour ${leadId}`, err);
    context = {
      secteurDeclare: lead.secteur_activite,
      nafCode: lead.naf_code ?? undefined,
      effectifTranche: lead.effectif_tranche ?? undefined,
      famillesLabels: lead.familles_metiers,
      dateRapport: new Date(lead.created_at).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    };
  }

  // URL signée courte vers le PDF privé (best-effort : le rapport reste lisible à
  // l'écran même si la signature échoue → bouton download masqué côté front).
  let pdfUrl: string | null = null;
  const { data: signed } = await supabase.storage
    .from('reports')
    .createSignedUrl(`${leadId}/prerapport-mira.pdf`, PDF_SIGNED_URL_TTL_S);
  if (signed?.signedUrl) pdfUrl = signed.signedUrl;

  return json(200, { status: 'sent', report: parsed.data, context, pdfUrl });
};
