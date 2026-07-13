/**
 * CONTRAT DE SORTIE DU PRÉ-RAPPORT (Tranche 4) — source unique
 * ============================================================
 *
 * Un seul schéma `zod` (`PreRapportSchema`) est la source de vérité du contrat de
 * sortie du LLM. On en **dérive** tout le reste, donc rien ne peut diverger :
 *
 *  - `RESPONSE_FORMAT` : le `response_format` strict d'OpenAI, généré par
 *    `zodResponseFormat` (force les 10 sections §0→§9, `additionalProperties:false`
 *    partout, toutes les propriétés `required`).
 *  - les types TS (`PreRapportOutput` & co.) via `z.infer`.
 *  - `parseReport(raw)` : **valide** le JSON renvoyé par le modèle avant de le
 *    persister/rendre — fini le `JSON.parse(raw) as PreRapportOutput` aveugle.
 *
 * Le mode strict OpenAI exprime un champ nullable en `anyOf: [<T>, {type:"null"}]`
 * (généré automatiquement par `.nullable()`).
 */

import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import type { ExpositionLevel, ImpactNature, ConfidenceLevel } from './rapportStructure';
import { reportSections } from './rapportStructure';
import { sanitizeReportProse } from './reportSanitize';

/** Ids de sections autorisés (dérivés de la structure → toujours synchrones). */
const SECTION_IDS = reportSections.map((s) => s.id) as [string, ...string[]];

// Le cast en tuple ci-dessus masque le cas `[]` : un `z.enum([])` n'accepte
// alors plus aucun id et tout rapport échouerait silencieusement à la validation.
// Garde au chargement pour transformer ce cas en erreur bruyante immédiate.
if (SECTION_IDS.length === 0) {
  throw new Error('reportSchema : reportSections est vide — impossible de dériver le contrat.');
}

/** Id de la section cœur §3 (seule autorisée à porter des caractérisations de familles). */
const FAMILLES_SECTION_ID = 'familles-metiers';

// Vocabulaire contrôlé §3. Les arrays sont la forme runtime (pour `z.enum`) ; les
// gardes `Exact<>` ci-dessous échouent au typecheck si elles divergent un jour des
// unions canoniques de `rapportStructure.ts`.
const EXPOSITION = ['faible', 'modérée', 'élevée', 'à confirmer'] as const;
const NATURES = ['automatisation', 'augmentation', 'création'] as const;
const CONFIANCE = ['élevée', 'moyenne', 'faible'] as const;

/** Égalité stricte de deux unions (true seulement si A et B se recouvrent dans les deux sens). */
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
// Garde-fous : la source unique du contrat ne peut pas dériver du vocabulaire métier.
const _expoExact: Exact<(typeof EXPOSITION)[number], ExpositionLevel> = true;
const _natExact: Exact<(typeof NATURES)[number], ImpactNature> = true;
const _confExact: Exact<(typeof CONFIANCE)[number], ConfidenceLevel> = true;
void _expoExact;
void _natExact;
void _confExact;

// --- Schéma zod : LA source unique ----------------------------------------

const ReportBlocSchema = z.object({
  /** Intertitre de bloc, ou null pour un simple paragraphe. */
  intertitre: z.string().nullable(),
  paragraphes: z.array(z.string()),
});

const ReportFamilleSchema = z.object({
  famille: z.string(),
  exposition: z.enum(EXPOSITION),
  natures: z.array(z.enum(NATURES)),
  /** Part de tâches concernée si une source la donne (ex. « jusqu'à 82 % »), sinon null. */
  part_taches: z.string().nullable(),
  confiance: z.enum(CONFIANCE),
  /** false → mention « non directement transposable à une PME française ». */
  transposable_france: z.boolean(),
  explication: z.string(),
});

const ReportSectionSchema = z.object({
  id: z.enum(SECTION_IDS),
  titre: z.string(),
  contenu: z.array(ReportBlocSchema),
  /** Identifiants (`id`) des statistiques de la stat-bank citées dans la section. */
  sources_citees: z.array(z.string()),
  /** Caractérisations par famille — uniquement pour §3, sinon null. */
  familles: z.array(ReportFamilleSchema).nullable(),
});

/** Contrat de sortie complet : exactement la structure imposée au modèle. */
export const PreRapportSchema = z.object({
  sections: z.array(ReportSectionSchema),
});

// --- Types dérivés (z.infer → impossible de diverger du schéma) ------------

export type ReportBloc = z.infer<typeof ReportBlocSchema>;
export type ReportFamille = z.infer<typeof ReportFamilleSchema>;
export type ReportSectionOutput = z.infer<typeof ReportSectionSchema>;
export type PreRapportOutput = z.infer<typeof PreRapportSchema>;

// --- `response_format` OpenAI dérivé (mode strict) -------------------------

export const RESPONSE_FORMAT = zodResponseFormat(PreRapportSchema, 'prerapport_mira');

// --- Validation runtime de la réponse du modèle ----------------------------

/**
 * Parse, **valide** et normalise la réponse texte du modèle contre le contrat.
 * Lève une erreur explicite si le JSON est illisible ou non conforme — au lieu
 * de laisser une structure invalide se propager jusqu'au rendu PDF (où elle
 * casserait sans message exploitable). La normalisation (`sanitizeReportProse`)
 * retire les signaux de style interdits (tirets cadratins, points-virgules) que
 * le prompt proscrit mais que le modèle peut laisser passer.
 */
export function parseReport(raw: string): PreRapportOutput {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error('Réponse du modèle illisible (JSON invalide).');
  }
  const result = PreRapportSchema.safeParse(json);
  if (!result.success) {
    throw new Error(`Réponse du modèle non conforme au schéma : ${result.error.message}`);
  }
  assertSectionInvariants(result.data);
  return sanitizeReportProse(result.data);
}

/**
 * Invariant que le mode strict OpenAI ne peut pas exprimer : seule la section §3
 * (`familles-metiers`) porte des caractérisations de familles, et elle en porte au
 * moins une. Sans ce verrou, un rapport « conforme au schéma » mais avec §3 à
 * `familles: null` passerait, et le rendu PDF dropperait silencieusement le cœur
 * du rapport. On le valide donc côté contrat, pas au rendu.
 */
function assertSectionInvariants(report: PreRapportOutput): void {
  for (const section of report.sections) {
    const isCore = section.id === FAMILLES_SECTION_ID;
    if (isCore && (!section.familles || section.familles.length === 0)) {
      throw new Error('Réponse du modèle non conforme : la section §3 doit porter au moins une caractérisation de famille.');
    }
    if (!isCore && section.familles !== null) {
      throw new Error(`Réponse du modèle non conforme : la section « ${section.id} » ne doit pas porter de caractérisations de familles (réservé à §3).`);
    }
  }
}
