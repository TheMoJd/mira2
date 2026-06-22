/**
 * generate-prerapport-background — Netlify Background Function (Tranche 4)
 * =======================================================================
 * Déclenchée par `submit-prerapport`. Tourne en asynchrone (jusqu'à 15 min).
 *
 * Étapes :
 *   1. Charge le lead, passe le statut à `generating`.
 *   2. Enrichissement INSEE Sirene (SIRET → NAF/effectif/raison sociale) + lecture du site.
 *   3. Construit le contexte + appelle OpenAI (sortie structurée json_schema).
 *   4. Persiste le rapport structuré dans `leads.report_json`.
 *   4b. Rendu HTML → PDF (Chromium) → upload `reports` → ligne `reports` → email Resend → statut `sent`.
 *
 * Le verrou « zéro chiffre inventé » est garanti en amont : `buildUserMessage`
 * n'injecte, par section, que les stats autorisées par la grille `allowedSources`.
 */
import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type { Database } from '../../src/types/supabase';
import { SYSTEM_PROMPT, buildUserMessage } from '../../src/data/reportPrompt';
import type { GenerationContext } from '../../src/data/reportPrompt';
import { RESPONSE_FORMAT } from '../../src/data/reportSchema';
import type { PreRapportOutput } from '../../src/data/reportSchema';
import { famillesMetiers } from '../../src/data/famillesMetiers';
import { statbank } from '../../src/data/statbank';
import { renderReportHtml } from '../../src/data/reportHtml';
import type { ReportRenderContext } from '../../src/data/reportHtml';
import { htmlToPdf } from './lib/pdf';
import { sendReportEmail, notifyFailure } from './lib/email';
import { enrichSiret, fetchSiteResume } from './lib/enrichment';

/** Mappe les familles déclarées (texte/champ guidé) vers leurs codes ISCO si on les reconnaît. */
function mapFamilles(declarees: string[]): GenerationContext['famillesDeclarees'] {
  return declarees.map((label) => {
    const match = famillesMetiers.find(
      (f) => f.label.toLowerCase() === label.toLowerCase() || f.id === label,
    );
    return match ? { label: match.label, isco: match.isco } : { label };
  });
}

/** Ids connus de la stat-bank — filtre les ids cités par le LLM pour un audit propre. */
const KNOWN_STAT_IDS = new Set(statbank.map((s) => s.id));

/**
 * Ids (dédupliqués) des statistiques effectivement citées dans le rapport,
 * restreints à ceux qui existent réellement dans la stat-bank (le LLM pourrait
 * citer un id inexistant — on ne le persiste pas dans l'audit `reports.sources`).
 */
function citedStatIds(report: PreRapportOutput): string[] {
  const ids = new Set<string>();
  for (const section of report.sections) {
    for (const id of section.sources_citees) {
      if (KNOWN_STAT_IDS.has(id)) ids.add(id);
    }
  }
  return [...ids];
}

export const handler: Handler = async (event) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
    console.error('[generate] configuration serveur manquante');
    return { statusCode: 500 };
  }

  let leadId: string | undefined;
  try {
    leadId = JSON.parse(event.body ?? '{}').leadId;
  } catch {
    /* body invalide */
  }
  if (!leadId) return { statusCode: 400 };

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    const { data: lead, error } = await supabase.from('leads').select('*').eq('id', leadId).single();
    if (error || !lead) throw new Error(`Lead introuvable : ${leadId}`);

    await supabase.from('leads').update({ status: 'generating' }).eq('id', leadId);

    // --- (2) Enrichissement best-effort (n'échoue jamais la génération) ---
    const siretInfo = lead.siret ? await enrichSiret(lead.siret) : {};
    const sourceResume = lead.site_url ? await fetchSiteResume(lead.site_url) : undefined;

    const nafCode = lead.naf_code ?? siretInfo.nafCode;
    const effectifTranche = lead.effectif_tranche ?? siretInfo.effectifTranche;
    // On persiste ce qu'on a découvert (qualification du lead) sans écraser l'existant.
    if ((!lead.naf_code && nafCode) || (!lead.effectif_tranche && effectifTranche)) {
      await supabase
        .from('leads')
        .update({ naf_code: nafCode ?? null, effectif_tranche: effectifTranche ?? null })
        .eq('id', leadId);
    }

    const dateRapport = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const famillesDeclarees = mapFamilles(lead.familles_metiers);
    const ctx: GenerationContext = {
      nomEntreprise: siretInfo.nomEntreprise,
      secteurDeclare: lead.secteur_activite,
      nafCode: nafCode ?? undefined,
      nafLibelle: siretInfo.nafLibelle,
      effectifTranche: effectifTranche ?? undefined,
      produitsServices: lead.produits_services,
      clients: lead.clients,
      famillesDeclarees,
      sourceResume,
      dateRapport,
    };

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL ?? 'gpt-4.1';
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserMessage(ctx) },
      ],
      // Schéma strict dérivé de `reportSections` (force les 10 sections §0→§9).
      response_format: RESPONSE_FORMAT as never,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error('Réponse OpenAI vide');
    const report = JSON.parse(raw) as PreRapportOutput;

    await supabase
      .from('leads')
      .update({ report_json: report as unknown as Database['public']['Tables']['leads']['Update']['report_json'] })
      .eq('id', leadId);

    // --- (4b) report_json → HTML → PDF → Storage → ligne `reports` → email → `sent` ---
    const renderCtx: ReportRenderContext = {
      nomEntreprise: ctx.nomEntreprise,
      secteurDeclare: ctx.secteurDeclare,
      nafLibelle: ctx.nafLibelle,
      nafCode: ctx.nafCode,
      effectifTranche: ctx.effectifTranche,
      famillesLabels: famillesDeclarees.map((f) => f.label),
      dateRapport,
    };
    const pdf = await htmlToPdf(renderReportHtml(report, renderCtx));

    const pdfPath = `${leadId}/prerapport-mira.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('reports')
      .upload(pdfPath, pdf, { contentType: 'application/pdf', upsert: true });
    if (uploadError) throw new Error(`Upload PDF échoué : ${uploadError.message}`);

    await supabase.from('reports').insert({
      lead_id: leadId,
      pdf_path: pdfPath,
      model,
      sources: citedStatIds(report) as unknown as Database['public']['Tables']['reports']['Insert']['sources'],
    });

    const emailResult = await sendReportEmail({ to: lead.email, pdf, nomEntreprise: ctx.nomEntreprise });
    console.log(`[generate] email lead ${leadId} : ${emailResult}`);
    // Le rapport est généré et stocké → statut `sent`. Mais si l'envoi était
    // configuré et a échoué, le client n'a rien reçu : on alerte l'ops sans
    // repasser en `failed` (le PDF reste récupérable et renvoyable).
    if (emailResult === 'error') {
      await notifyFailure({
        leadId,
        error: new Error('Rapport généré et stocké, mais envoi email échoué.'),
      });
    }

    await supabase.from('leads').update({ status: 'sent' }).eq('id', leadId);
    return { statusCode: 200 };
  } catch (err) {
    console.error('[generate] échec', err);
    if (leadId) {
      await supabase.from('leads').update({ status: 'failed' }).eq('id', leadId);
      await notifyFailure({ leadId, error: err });
    }
    return { statusCode: 500 };
  }
};
