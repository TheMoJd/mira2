/**
 * CONTRAT DE SORTIE DU PRÉ-RAPPORT — source unique
 * ================================================
 *
 * Des schémas `zod` sont la source de vérité du contrat de sortie du modèle. On en
 * **dérive** tout le reste, donc rien ne peut diverger :
 *
 *  - `RESPONSE_FORMAT_CORPS` / `RESPONSE_FORMAT_SYNTHESE` : les `response_format`
 *    stricts d'OpenAI des deux appels, générés par `zodResponseFormat`
 *    (`additionalProperties:false` partout, toutes les propriétés `required`).
 *  - les types TS (`PreRapportOutput` & co.) via `z.infer`.
 *  - `parseCorps` / `parseSynthese` : **valident** le JSON renvoyé par le modèle
 *    avant assemblage, au lieu d'un `JSON.parse(raw) as …` aveugle.
 *  - `assembleReport(corps, synthese)` : recompose le document complet, y injecte
 *    les lignes et sections figées du code (calibrage, périmètre, §8bis, §9) et
 *    ordonne les sections selon le déroulé.
 *
 * Deux appels, parce que la synthèse exécutive §1 ne peut citer que des chiffres
 * **déjà** exposés et sourcés dans le corps (§2 à §7) : elle est donc rédigée en
 * second, à partir de la liste héritée construite par le code.
 *
 * Le mode strict OpenAI exprime un champ nullable en `anyOf: [<T>, {type:"null"}]`
 * (généré automatiquement par `.nullable()`).
 */

import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import type { ExpositionLevel, ImpactNature, PointCleAxe } from './rapportStructure';
import {
  reportSections,
  corpsSections,
  codeSections,
  CALIBRAGE_COURT,
  LIGNE_PERIMETRE,
  FAMILLES_SECTION_ID,
  SYNTHESE_SECTION_ID,
} from './rapportStructure';
import { sanitizeReportProse } from './reportSanitize';

/** Ids de sections du document complet (dérivés de la structure → toujours synchrones). */
const SECTION_IDS = reportSections.map((s) => s.id) as [string, ...string[]];
/** Ids des sections attendues au premier appel (le corps : §0, §2 → §8). */
const CORPS_SECTION_IDS = corpsSections().map((s) => s.id) as [string, ...string[]];

// Les casts en tuple ci-dessus masquent le cas `[]` : un `z.enum([])` n'accepte
// alors plus aucun id et tout rapport échouerait silencieusement à la validation.
// Garde au chargement pour transformer ce cas en erreur bruyante immédiate.
if (SECTION_IDS.length === 0 || CORPS_SECTION_IDS.length === 0) {
  throw new Error('reportSchema : reportSections est vide — impossible de dériver le contrat.');
}

// Vocabulaire contrôlé §3 et §1. Les arrays sont la forme runtime (pour `z.enum`) ; les
// gardes `Exact<>` ci-dessous échouent au typecheck si elles divergent un jour des
// unions canoniques de `rapportStructure.ts`.
const EXPOSITION = ['faible', 'modérée', 'élevée', 'à confirmer'] as const;
const NATURES = ['automatisation', 'augmentation', 'création'] as const;
const AXES = ['exposition', 'concentration', 'competences', 'besoins'] as const;

/** Égalité stricte de deux unions (true seulement si A et B se recouvrent dans les deux sens). */
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
// Garde-fous : la source unique du contrat ne peut pas dériver du vocabulaire métier.
const _expoExact: Exact<(typeof EXPOSITION)[number], ExpositionLevel> = true;
const _natExact: Exact<(typeof NATURES)[number], ImpactNature> = true;
const _axeExact: Exact<(typeof AXES)[number], PointCleAxe> = true;
void _expoExact;
void _natExact;
void _axeExact;

// --- Briques communes ------------------------------------------------------

const ReportBlocSchema = z.object({
  /** Intertitre-constat de bloc, ou null pour un simple paragraphe. */
  intertitre: z.string().nullable(),
  paragraphes: z.array(z.string()),
});

/**
 * Caractérisation d'une famille de métiers (§3). Ni `confiance` ni
 * `transposable_france` (décision Caroline) : les précautions de lecture sont
 * prises une fois pour toutes par l'encart §8bis en fin de rapport.
 */
const ReportFamilleSchema = z.object({
  famille: z.string(),
  exposition: z.enum(EXPOSITION),
  natures: z.array(z.enum(NATURES)),
  /**
   * Part de tâches concernée si une source la donne. La contrainte de format voyage
   * jusqu'au modèle : un `.describe()` entre dans `RESPONSE_FORMAT_CORPS`, un simple
   * commentaire non. Le rendu n'accole « des tâches » qu'à une part au format court
   * (voir `reportLecture.ts`), et V14 avertit sinon.
   */
  part_taches: z
    .string()
    .nullable()
    .describe(
      'Uniquement la part, au format « 82 % » ou « jusqu’à 82 % », quinze caractères maximum, sans phrase. Ce nombre figure dans une statistique citée par l’explication. Sinon null.',
    ),
  explication: z.string(),
});

// --- Premier appel : le corps (§0, §2 → §8) --------------------------------

const CorpsSectionSchema = z.object({
  id: z.enum(CORPS_SECTION_IDS),
  titre: z.string(),
  contenu: z.array(ReportBlocSchema),
  /** Identifiants (`id`) des statistiques de la stat-bank citées dans la section. */
  sources_citees: z.array(z.string()),
  /** Caractérisations par famille — uniquement pour §3, sinon null. */
  familles: z.array(ReportFamilleSchema).nullable(),
});

/** Contrat de sortie du premier appel. */
export const CorpsSchema = z.object({
  sections: z.array(CorpsSectionSchema),
});

// --- Second appel : la synthèse exécutive (§1) -----------------------------

const ChiffreSignalSchema = z.object({
  /** Le nombre, ex. « 82 % ». */
  valeur: z.string(),
  /** Dix mots maximum, sans nom d'organisation ni année. */
  phrase: z.string(),
  /** Doit figurer dans la liste héritée. */
  source_id: z.string(),
});

const PointCleSchema = z.object({
  axe: z.enum(AXES),
  /** Douze mots maximum. */
  titre: z.string(),
  /** Deux à trois phrases, dont une porte le chiffre et son marqueur `[[id]]`. */
  texte: z.string(),
  source_id: z.string(),
});

/** L'encart tel que le modèle le rédige (les deux lignes figées sont ajoutées par le code). */
const EncartModelSchema = z.object({
  /** Deux phrases maximum, aucun chiffre. */
  chapeau: z.string(),
  chiffre_signal: ChiffreSignalSchema,
  /** Trois à quatre points clés, un par axe, dans l'ordre imposé. */
  points_cles: z.array(PointCleSchema),
});

/**
 * La §1 ne porte pas de `contenu` : tout son texte vit dans l'encart. Le second appel
 * ne le demande donc pas, `assembleReport` le pose à `[]`, et la lecture
 * (`reportLecture.ts`) ignore de toute façon le `contenu` d'une section à encart.
 */
const SyntheseSectionSchema = z.object({
  id: z.literal(SYNTHESE_SECTION_ID),
  titre: z.string(),
  encart: EncartModelSchema,
  sources_citees: z.array(z.string()),
});

/** Contrat de sortie du second appel. */
export const SyntheseSchema = z.object({
  section: SyntheseSectionSchema,
});

// --- Document complet (ce qui est persisté et rendu) -----------------------

/** L'encart complet : rédaction du modèle + les deux lignes injectées par le code. */
const EncartSchema = EncartModelSchema.extend({
  /** Ligne de calibrage courte, remplie par le code. */
  calibrage_court: z.string(),
  /** Ligne de périmètre, remplie par le code. */
  perimetre: z.string(),
});

const ReportSectionSchema = z.object({
  id: z.enum(SECTION_IDS),
  titre: z.string(),
  contenu: z.array(ReportBlocSchema),
  sources_citees: z.array(z.string()),
  /** Caractérisations par famille — uniquement §3, sinon null. */
  familles: z.array(ReportFamilleSchema).nullable(),
  /** Encart de synthèse — uniquement §1, sinon null. */
  encart: EncartSchema.nullable(),
});

/** Contrat du document complet, tel qu'il est persisté dans `leads.report_json`. */
export const PreRapportSchema = z.object({
  sections: z.array(ReportSectionSchema),
});

// --- Types dérivés (z.infer → impossible de diverger des schémas) ----------

export type ReportBloc = z.infer<typeof ReportBlocSchema>;
export type ReportFamille = z.infer<typeof ReportFamilleSchema>;
export type ReportEncart = z.infer<typeof EncartSchema>;
export type ReportChiffreSignal = z.infer<typeof ChiffreSignalSchema>;
export type ReportPointCle = z.infer<typeof PointCleSchema>;
export type ReportSectionOutput = z.infer<typeof ReportSectionSchema>;
export type CorpsSectionOutput = z.infer<typeof CorpsSectionSchema>;
export type CorpsOutput = z.infer<typeof CorpsSchema>;
export type SyntheseOutput = z.infer<typeof SyntheseSchema>;
export type PreRapportOutput = z.infer<typeof PreRapportSchema>;

// --- `response_format` OpenAI dérivés (mode strict) ------------------------

export const RESPONSE_FORMAT_CORPS = zodResponseFormat(CorpsSchema, 'prerapport_mira_corps');
export const RESPONSE_FORMAT_SYNTHESE = zodResponseFormat(SyntheseSchema, 'prerapport_mira_synthese');

// --- Validation runtime des réponses du modèle -----------------------------

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Réponse du modèle illisible (JSON invalide).');
  }
}

/**
 * Parse, **valide** et normalise le corps renvoyé au premier appel. La normalisation
 * (`sanitizeReportProse`) retire les signaux de style interdits (tirets cadratins,
 * points-virgules) que le prompt proscrit mais que le modèle peut laisser passer.
 */
export function parseCorps(raw: string): CorpsOutput {
  const result = CorpsSchema.safeParse(parseJson(raw));
  if (!result.success) {
    throw new Error(`Corps du rapport non conforme au schéma : ${result.error.message}`);
  }
  assertCorpsInvariants(result.data);
  return sanitizeReportProse(result.data);
}

/** Parse, valide et normalise la synthèse exécutive renvoyée au second appel. */
export function parseSynthese(raw: string): SyntheseOutput {
  const result = SyntheseSchema.safeParse(parseJson(raw));
  if (!result.success) {
    throw new Error(`Synthèse exécutive non conforme au schéma : ${result.error.message}`);
  }
  return sanitizeReportProse(result.data);
}

/** Parse et valide un document complet (relecture d'un `report_json` déjà persisté). */
export function parseReport(raw: string): PreRapportOutput {
  const result = PreRapportSchema.safeParse(parseJson(raw));
  if (!result.success) {
    throw new Error(`Réponse du modèle non conforme au schéma : ${result.error.message}`);
  }
  return sanitizeReportProse(result.data);
}

/**
 * Invariant que le mode strict OpenAI ne peut pas exprimer : seule la section §3
 * (`familles-metiers`) porte des caractérisations de familles, et elle en porte au
 * moins une. Sans ce verrou, un corps « conforme au schéma » mais avec §3 à
 * `familles: null` passerait, et le rendu PDF dropperait silencieusement le cœur
 * du rapport. On le valide donc côté contrat, pas au rendu.
 */
function assertCorpsInvariants(corps: CorpsOutput): void {
  for (const section of corps.sections) {
    const isCore = section.id === FAMILLES_SECTION_ID;
    if (isCore && (!section.familles || section.familles.length === 0)) {
      throw new Error(
        'Réponse du modèle non conforme : la section §3 doit porter au moins une caractérisation de famille.',
      );
    }
    if (!isCore && section.familles !== null) {
      throw new Error(
        `Réponse du modèle non conforme : la section « ${section.id} » ne doit pas porter de caractérisations de familles (réservé à §3).`,
      );
    }
  }
}

// --- Assemblage du document complet ----------------------------------------

/** Rang d'affichage d'une section, dérivé du déroulé (§8bis entre §8 et §9). */
const SECTION_ORDER = new Map(reportSections.map((s) => [s.id, s.num]));

/**
 * Recompose le document complet à partir des deux appels : corps + synthèse, plus
 * les **textes figés injectés par le code** (les deux lignes de l'encart, l'encart
 * §8bis « Comment utiliser ce rapport », la méthode §9). Le modèle ne les rédige
 * pas : ils sont ajoutés ici, donc ils ne peuvent pas être reformulés.
 */
export function assembleReport(corps: CorpsOutput, synthese: SyntheseOutput): PreRapportOutput {
  const sections: PreRapportOutput['sections'] = [
    ...corps.sections.map((s) => ({
      id: s.id,
      titre: s.titre,
      contenu: s.contenu,
      sources_citees: s.sources_citees,
      familles: s.familles,
      encart: null,
    })),
    {
      id: synthese.section.id,
      titre: synthese.section.titre,
      // La §1 n'a pas de contenu : tout son texte est dans l'encart.
      contenu: [],
      sources_citees: synthese.section.sources_citees,
      familles: null,
      encart: {
        ...synthese.section.encart,
        calibrage_court: CALIBRAGE_COURT,
        perimetre: LIGNE_PERIMETRE,
      },
    },
    ...codeSections().map((s) => ({
      id: s.id,
      titre: s.title,
      contenu: [{ intertitre: null, paragraphes: s.fixedParagraphs ?? [] }],
      sources_citees: [],
      familles: null,
      encart: null,
    })),
  ];

  sections.sort((a, b) => (SECTION_ORDER.get(a.id) ?? 99) - (SECTION_ORDER.get(b.id) ?? 99));
  return { sections };
}
