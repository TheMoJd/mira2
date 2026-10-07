/**
 * generate-prerapport-background — Netlify Background Function
 * ============================================================
 * Déclenchée par `submit-prerapport`. Tourne en asynchrone (jusqu'à 15 min).
 *
 * Étapes :
 *   1. Charge le lead, passe le statut à `generating`.
 *   2. Enrichissement INSEE Sirene (SIRET → NAF/effectif/raison sociale) + lecture du site.
 *   3. Génération en DEUX appels (sortie structurée json_schema) :
 *      a. le corps du rapport (§0, §2 → §8) ;
 *      b. la synthèse exécutive §1, à partir de la liste héritée du corps (union des
 *         `sources_citees` de §2 à §7) — aucun chiffre neuf en première page.
 *   4. Assemblage (+ textes figés du code), contrôles V1 → V14, rejeu des sections
 *      en échec (plafond de deux par section), puis marquage pour relecture humaine
 *      s'il reste des échecs bloquants.
 *   5. Persistance dans `leads.report_json`.
 *   6. Rendu HTML → PDF (Chromium) → upload `reports` → ligne `reports` → email Resend → `sent`.
 *
 * Le verrou « zéro chiffre inventé » est garanti en amont : `buildUserMessage`
 * n'injecte, par section, que les stats autorisées par la grille `allowedSources`.
 */
import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type { Database } from '../../src/types/supabase';
import { generateReport } from '../../src/data/reportGeneration';
import type { AskModel } from '../../src/data/reportGeneration';
import type { PreRapportOutput } from '../../src/data/reportSchema';
import { blockingFindings } from '../../src/data/reportValidation';
import { statbank } from '../../src/data/statbank';
import { renderReportHtml, REPORT_PAGE_FOOTER_PREFIX } from '../../src/data/reportHtml';
import type { ReportRenderContext } from '../../src/data/reportHtml';
import { htmlToPdf } from './lib/pdf';
import { sendReportEmail, notifyFailure, notifyReview } from './lib/email';
import { enrichSiret, fetchSiteResume } from './lib/enrichment';
import { buildGenerationContext } from './lib/context';

/** Ids connus de la stat-bank — filtre les ids cités par le modèle pour un audit propre. */
const KNOWN_STAT_IDS = new Set(statbank.map((s) => s.id));

/**
 * Ids (dédupliqués) des statistiques effectivement citées dans le rapport,
 * restreints à ceux qui existent réellement dans la stat-bank (le modèle pourrait
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

/**
 * Transport OpenAI de la génération. L'orchestration (deux appels, contrôles
 * V1 → V14, rejeu des sections en échec) vit dans `src/data/reportGeneration.ts`,
 * partagée avec le script d'échantillons pour que les deux chemins produisent le
 * même rapport.
 */
function openaiAsk(openai: OpenAI, model: string): AskModel {
  return async (system, user, format) => {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: format,
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error('Réponse OpenAI vide');
    return raw;
  };
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
    const ctx = buildGenerationContext(lead, { siret: siretInfo, sourceResume }, new Date());

    // On persiste ce qu'on a découvert (qualification du lead) sans écraser l'existant.
    if ((!lead.naf_code && ctx.nafCode) || (!lead.effectif_tranche && ctx.effectifTranche)) {
      await supabase
        .from('leads')
        .update({ naf_code: ctx.nafCode ?? null, effectif_tranche: ctx.effectifTranche ?? null })
        .eq('id', leadId);
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL ?? 'gpt-6.1-sol';
    const { report, findings } = await generateReport(openaiAsk(openai, model), ctx, {
      onReplay: (sectionId, attempt, brief) =>
        console.warn(`[generate] lead ${leadId} : rejeu §${sectionId} (essai ${attempt})\n${brief}`),
      onReplayError: (sectionId, err) =>
        console.warn(`[generate] lead ${leadId} : rejeu §${sectionId} échoué`, err),
    });

    const bloquants = blockingFindings(findings);
    if (bloquants.length > 0) {
      console.warn(
        `[generate] lead ${leadId} : ${bloquants.length} contrôle(s) bloquant(s) encore en échec après rejeux, rapport marqué pour relecture.`,
      );
    }

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
    };
    // Bas de page (demande CEO) : « MIRA Audit · … · mois année ». Le mois/année
    // vient de la date déjà formatée (« 22 juin 2026 ») dont on retire le jour.
    const moisAnnee = ctx.dateRapport.replace(/^\d+\s+/, '');
    const pdf = await htmlToPdf(renderReportHtml(report, renderCtx), {
      footer: `${REPORT_PAGE_FOOTER_PREFIX} · ${moisAnnee}`,
    });

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
      // Contrôles V1-V14 encore en échec après les rejeux : le rapport part, mais il
      // est marqué pour relecture humaine (et les échecs sont conservés pour l'ops).
      needs_review: bloquants.length > 0,
      validation_findings: (findings.length > 0
        ? findings
        : null) as unknown as Database['public']['Tables']['reports']['Insert']['validation_findings'],
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
    // TODO Q9 : le rapport part même avec des contrôles bloquants en échec (volume faible),
    // mais l'équipe est prévenue pour le relire. Sans alerte, needs_review n'était lu par personne.
    if (bloquants.length > 0) await notifyReview({ leadId, findings: bloquants });

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
