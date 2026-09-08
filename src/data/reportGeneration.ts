/**
 * GÉNÉRATION D'UN PRÉ-RAPPORT — les deux appels et la boucle de contrôle
 * ======================================================================
 *
 * Source unique de l'orchestration, partagée par la function de production
 * (`netlify/functions/generate-prerapport-background.ts`) et par le script
 * d'échantillons (`scripts/generate-samples.ts`). Ces deux chemins doivent
 * produire le MÊME rapport pour le même lead : un échantillon qui ne passerait
 * pas par les rejeux ne montrerait pas ce que reçoit un client, et servirait de
 * référence à côté de la plaque.
 *
 * Le transport est injecté (`ask`) plutôt qu'importé : ce module ne connaît ni
 * OpenAI, ni le modèle, ni les clés. Il enchaîne
 *
 *   1. le corps du rapport (§0, §2 → §8) ;
 *   2. la synthèse exécutive §1, à partir de la liste héritée du corps (union des
 *      `sources_citees` de §2 à §7) — aucun chiffre neuf en première page ;
 *   3. l'assemblage (textes figés du code compris) puis les contrôles V1 → V12 ;
 *   4. le rejeu des seules sections porteuses d'un échec bloquant, avec le détail
 *      des contrôles échoués, `MAX_REPLAYS_PER_SECTION` fois au plus.
 *
 * Passé le plafond, la génération rend le rapport tel quel avec ses `findings` :
 * il reste lisible et sourcé, et c'est à l'appelant de le marquer pour relecture
 * humaine plutôt que de le publier en silence.
 */

import {
  SYSTEM_PROMPT,
  buildUserMessage,
  buildSyntheseMessage,
  buildSectionRetryMessage,
  buildSyntheseRetryMessage,
} from './reportPrompt';
import type { GenerationContext } from './reportPrompt';
import {
  RESPONSE_FORMAT_CORPS,
  RESPONSE_FORMAT_SYNTHESE,
  parseCorps,
  parseSynthese,
  assembleReport,
} from './reportSchema';
import type { CorpsOutput, PreRapportOutput, SyntheseOutput } from './reportSchema';
import { enforceSectionGrid, SYNTHESE_SECTION_ID } from './rapportStructure';
import {
  validateReport,
  blockingFindings,
  sectionsToReplay,
  findingsBrief,
  syncSourcesCitees,
} from './reportValidation';
import type { ValidationFinding } from './reportValidation';

/** Plafond de rejeux par section avant de rendre le rapport pour relecture. */
export const MAX_REPLAYS_PER_SECTION = 2;

/** Les deux `response_format` que `ask` doit savoir honorer. */
export type ReportResponseFormat = typeof RESPONSE_FORMAT_CORPS | typeof RESPONSE_FORMAT_SYNTHESE;

/**
 * Transport injecté : envoie le prompt système et le message utilisateur, et rend
 * le texte JSON brut de la réponse. À charge de l'appelant de lever si la réponse
 * est vide.
 */
export type AskModel = (
  system: string,
  user: string,
  format: ReportResponseFormat,
) => Promise<string>;

/** Journalisation optionnelle des rejeux (console de la function, sortie du script). */
export interface GenerationHooks {
  onReplay?: (sectionId: string, attempt: number, brief: string) => void;
  onReplayError?: (sectionId: string, error: unknown) => void;
}

export interface GenerationResult {
  report: PreRapportOutput;
  /** Contrôles encore en échec au moment de rendre. Vide = rapport propre. */
  findings: ValidationFinding[];
  /** Nombre de rejeux consommés par section (diagnostic). */
  replays: Record<string, number>;
}

/**
 * Génère le rapport complet d'un lead : deux appels, puis la boucle de contrôle.
 *
 * La boucle est le pendant code de la consigne : la liste autorisée est une
 * consigne, et une consigne peut être mal suivie. À chaque tour, on assemble, on
 * valide, et on ne rejoue QUE les sections porteuses d'un échec bloquant.
 */
export async function generateReport(
  ask: AskModel,
  ctx: GenerationContext,
  hooks: GenerationHooks = {},
): Promise<GenerationResult> {
  const call = (user: string, format: ReportResponseFormat) => ask(SYSTEM_PROMPT, user, format);

  // (a) le corps, (b) la synthèse exécutive à partir de la liste héritée.
  let corps: CorpsOutput = parseCorps(await call(buildUserMessage(ctx), RESPONSE_FORMAT_CORPS));
  let synthese: SyntheseOutput = parseSynthese(
    await call(buildSyntheseMessage(ctx, corps), RESPONSE_FORMAT_SYNTHESE),
  );

  let report = assembleReport(corps, synthese);
  let findings = validateReport(report);
  const replays = new Map<string, number>();

  while (blockingFindings(findings).length > 0) {
    // La synthèse §1 est rejouée EN DERNIER du tour : elle s'adosse à la liste
    // héritée du corps, donc elle doit voir les sections déjà corrigées.
    const todo = sectionsToReplay(findings)
      .filter((id) => (replays.get(id) ?? 0) < MAX_REPLAYS_PER_SECTION)
      .sort((a, b) => Number(a === SYNTHESE_SECTION_ID) - Number(b === SYNTHESE_SECTION_ID));
    if (todo.length === 0) break;

    for (const sectionId of todo) {
      const attempt = (replays.get(sectionId) ?? 0) + 1;
      replays.set(sectionId, attempt);
      const brief = findingsBrief(blockingFindings(findings), sectionId);
      hooks.onReplay?.(sectionId, attempt, brief);
      try {
        if (sectionId === SYNTHESE_SECTION_ID) {
          synthese = parseSynthese(
            await call(buildSyntheseRetryMessage(ctx, corps, brief), RESPONSE_FORMAT_SYNTHESE),
          );
        } else {
          const retry = parseCorps(
            await call(buildSectionRetryMessage(ctx, sectionId, brief), RESPONSE_FORMAT_CORPS),
          );
          const fresh = retry.sections.find((s) => s.id === sectionId);
          if (!fresh) throw new Error(`le rejeu n'a pas renvoyé la section ${sectionId}`);
          corps = { sections: corps.sections.map((s) => (s.id === sectionId ? fresh : s)) };
        }
      } catch (err) {
        // Un rejeu qui échoue (JSON invalide, section absente) ne fait pas tomber la
        // génération : on garde la version précédente et on consomme un essai.
        hooks.onReplayError?.(sectionId, err);
      }
    }

    report = assembleReport(corps, synthese);
    findings = validateReport(report);
  }

  // `syncSourcesCitees` APRÈS la validation (sinon V7 ne verrait plus rien) :
  // l'audit des sources décrit alors exactement ce que le lecteur voit en note.
  // `enforceSectionGrid` reste le dernier filet sur la grille section → sources.
  return {
    report: enforceSectionGrid(syncSourcesCitees(report)),
    findings,
    replays: Object.fromEntries(replays),
  };
}
