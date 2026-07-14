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
import { RESPONSE_FORMAT, parseReport } from '../../src/data/reportSchema';
import type { PreRapportOutput } from '../../src/data/reportSchema';
import { enforceSectionGrid } from '../../src/data/rapportStructure';
import { statbank } from '../../src/data/statbank';
import { renderReportHtml, reportFooterText } from '../../src/data/reportHtml';
import type { ReportRenderContext } from '../../src/data/reportHtml';
import { htmlToPdf } from './lib/pdf';
import { sendReportEmail, sendLeadNotification, notifyFailure } from './lib/email';
import { enrichSiret, fetchSiteResume } from './lib/enrichment';
import { buildGenerationContext } from './lib/context';

/** Ids connus de la stat-bank — filtre les ids cités par le LLM pour un audit propre. */
const KNOWN_STAT_IDS = new Set(statbank.map((s) => s.id));

/** Format UUID des ids `leads` (Supabase). L'endpoint est public : un `leadId`
 *  forgé est rejeté en amont, sans requête base ni alerte ops (anti-spam). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  if (!leadId || !UUID_RE.test(leadId)) {
    // Pas de notifyFailure : l'endpoint est public, un leadId forgé ne doit
    // pas pouvoir spammer l'ops.
    console.warn('[generate] leadId absent ou non conforme (UUID attendu) — requête rejetée.');
    return { statusCode: 400 };
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    const { data: lead, error } = await supabase.from('leads').select('*').eq('id', leadId).single();
    if (error || !lead) {
      // Même logique anti-spam que le contrôle UUID : un UUID valide mais
      // inconnu en base ne déclenche NI notifyFailure NI passage en `failed`.
      console.warn(`[generate] lead introuvable : ${leadId} — 404 sans alerte ops.`);
      return { statusCode: 404 };
    }

    // Idempotence : on ne passe en `generating` QUE si le lead est encore `received`
    // (compare-and-set atomique). Un second déclenchement concurrent matchera 0 ligne
    // et abandonnera → pas de doublon `reports` ni de double email.
    const { data: claimed } = await supabase
      .from('leads')
      .update({ status: 'generating' })
      .eq('id', leadId)
      .eq('status', 'received')
      .select('id');
    if (!claimed || claimed.length === 0) {
      console.log(`[generate] lead ${leadId} déjà pris en charge — abandon (idempotence).`);
      return { statusCode: 200 };
    }

    // --- (2) Enrichissement best-effort (n'échoue jamais la génération) ---
    const siretInfo = lead.siret ? await enrichSiret(lead.siret) : {};
    const sourceResume = lead.site_url ? await fetchSiteResume(lead.site_url) : undefined;

    // Contrôle qualité : un SIRET pointant un établissement cessé est un signal
    // de lead douteux + un enrichissement (NAF/effectif/catégorie) potentiellement
    // périmé. On ne bloque pas (best-effort), on alerte l'ops.
    if (siretInfo.actif === false) {
      console.warn(
        `[generate] lead ${leadId} : SIRET ${lead.siret} = établissement cessé (etat_administratif ≠ A) — enrichissement potentiellement périmé.`,
      );
    }

    // Assemblage du contexte = fonction pure (testée isolément dans lib/context).
    // `now` sert aussi au pied de page du PDF (mois + année de génération).
    const now = new Date();
    const ctx = buildGenerationContext(lead, { siret: siretInfo, sourceResume }, now);

    // On persiste ce qu'on a découvert (qualification du lead) sans écraser l'existant.
    if ((!lead.naf_code && ctx.nafCode) || (!lead.effectif_tranche && ctx.effectifTranche)) {
      await supabase
        .from('leads')
        .update({ naf_code: ctx.nafCode ?? null, effectif_tranche: ctx.effectifTranche ?? null })
        .eq('id', leadId);
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL ?? 'gpt-4.1';
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserMessage(ctx) },
      ],
      // Schéma strict dérivé de la source unique `PreRapportSchema` (force les 10 sections §0→§9).
      response_format: RESPONSE_FORMAT,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error('Réponse OpenAI vide');
    // Garde-fou grille : retire toute citation hors de la section autorisée (le LLM
    // peut déraper ; la grille n'est sinon imposée que par le prompt).
    const report = enforceSectionGrid(parseReport(raw));

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
      categorieEntreprise: ctx.categorieEntreprise,
      localisation: ctx.localisation,
      famillesLabels: ctx.famillesDeclarees.map((f) => f.label),
      dateRapport: ctx.dateRapport,
      dateGeneration: now.toISOString(),
    };
    // Bas de page CEO 13/07 : « Mira audit · … · <mois année> », répété sur chaque page.
    const pdf = await htmlToPdf(renderReportHtml(report, renderCtx), { footer: reportFooterText(now) });

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

    // Statut d'abord, notification ensuite : l'email prospect est déjà parti,
    // on fige `sent` au plus tôt pour réduire la fenêtre où une relance ops
    // renverrait le PDF. Un échec de cet update est signalé à l'ops SANS
    // rethrow : re-passer le lead en `failed` déclencherait précisément la
    // relance qu'on veut éviter.
    const { error: statusError } = await supabase.from('leads').update({ status: 'sent' }).eq('id', leadId);
    if (statusError) {
      console.error(`[generate] lead ${leadId} livré mais passage à 'sent' échoué`, statusError);
      await notifyFailure({
        leadId,
        error: new Error(
          `Email livré mais statut resté 'generating' (NE PAS relancer sans vérifier) : ${statusError.message}`,
        ),
      });
    }

    // Notification interne (décision CTO 13/07) : uniquement après livraison
    // effective au prospect. `sendLeadNotification` ne throw jamais (skip/log),
    // le try/catch est une ceinture supplémentaire : un échec de notification
    // ne doit JAMAIS faire échouer le pipeline du lead.
    if (emailResult === 'sent') {
      try {
        const notifResult = await sendLeadNotification({
          leadId,
          prenom: lead.prenom,
          nom: lead.nom,
          fonction: lead.fonction,
          entreprise: lead.entreprise,
          email: lead.email,
          secteur: lead.secteur_activite,
        });
        console.log(`[generate] notification interne lead ${leadId} : ${notifResult}`);
      } catch (notifError) {
        console.error(`[generate] notification interne lead ${leadId} échouée (non bloquant)`, notifError);
      }
    }

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
