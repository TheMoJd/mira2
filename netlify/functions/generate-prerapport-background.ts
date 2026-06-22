/**
 * generate-prerapport-background — Netlify Background Function (Tranche 4)
 * =======================================================================
 * Déclenchée par `submit-prerapport`. Tourne en asynchrone (jusqu'à 15 min).
 *
 * Étapes :
 *   1. Charge le lead, passe le statut à `generating`.
 *   2. (TODO) Enrichissement INSEE Sirene + lecture site/plaquette.
 *   3. Construit le contexte + appelle OpenAI (sortie structurée json_schema).
 *   4. Persiste le rapport structuré dans `leads.report_json`.
 *   5. (TODO 4b) Rendu HTML → PDF (Chromium) → upload `reports` → email Resend → statut `sent`.
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

/** Mappe les familles déclarées (texte/champ guidé) vers leurs codes ISCO si on les reconnaît. */
function mapFamilles(declarees: string[]): GenerationContext['famillesDeclarees'] {
  return declarees.map((label) => {
    const match = famillesMetiers.find(
      (f) => f.label.toLowerCase() === label.toLowerCase() || f.id === label,
    );
    return match ? { label: match.label, isco: match.isco } : { label };
  });
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

    // TODO (2) : enrichissement INSEE Sirene (siret/siren → naf/effectif) + lecture site/plaquette.
    const dateRapport = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const ctx: GenerationContext = {
      secteurDeclare: lead.secteur_activite,
      nafCode: lead.naf_code ?? undefined,
      effectifTranche: lead.effectif_tranche ?? undefined,
      produitsServices: lead.produits_services,
      clients: lead.clients,
      famillesDeclarees: mapFamilles(lead.familles_metiers),
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

    // TODO (4b) : report_json → template HTML → Chromium PDF → upload bucket `reports`
    //   → insert `reports` → email Resend (PDF joint) → status 'sent'.

    return { statusCode: 200 };
  } catch (err) {
    console.error('[generate] échec', err);
    if (leadId) await supabase.from('leads').update({ status: 'failed' }).eq('id', leadId);
    return { statusCode: 500 };
  }
};
