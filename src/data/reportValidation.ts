/**
 * VALIDATIONS DU RAPPORT GÉNÉRÉ (V1 → V12)
 * ========================================
 *
 * La liste autorisée est une consigne, et une consigne peut être mal suivie. Après
 * la génération, le code repasse derrière : `validateReport` renvoie la liste des
 * contrôles en échec, section par section. Chaque échec **bloquant** fait rejouer la
 * section concernée (plafond de deux rejeux par section, puis marquage du rapport
 * pour relecture humaine). Les **avertissements** sont journalisés, pas rejoués.
 *
 * | #   | Contrôle                                                        | Niveau |
 * |-----|-----------------------------------------------------------------|--------|
 * | V1  | sources_citees de §1 ⊆ liste héritée (§2 → §7)                  | bloquant |
 * | V2  | source_id du chiffre-signal et des points clés ∈ sources_citees §1 | bloquant |
 * | V3  | 3 à 5 marqueurs dans l'encart, chiffre-signal compris            | bloquant |
 * | V4  | motif de citation dans le texte (org + année, ou année seule)    | bloquant |
 * | V5  | nom d'organisation du socle n'importe où dans le texte           | avertissement |
 * | V6  | toute phrase chiffrée porte au moins un marqueur                 | bloquant |
 * | V7  | marqueurs ⇔ liste autorisée de la section ⇔ sources_citees        | bloquant |
 * | V8  | un id cité dans une seule section parmi §2 → §8                  | avertissement |
 * | V9  | budget de mots dans les bornes, tolérance 10 %                   | bloquant |
 * | V10 | caractères interdits : cadratin, demi-cadratin, point-virgule, ! | bloquant |
 * | V11 | mots creux interdits et vocabulaire de décision                  | bloquant |
 * | V12 | intertitres et titres de points clés à douze mots maximum        | avertissement |
 *
 * Les sections figées injectées par le code (§8bis, §9) ne sont jamais validées :
 * elles ne viennent pas du modèle.
 */

import type { PreRapportOutput, ReportSectionOutput } from './reportSchema';
import type { ReportSection } from './rapportStructure';
import {
  reportSections,
  statsForSection,
  inheritedStatIds,
  HERITAGE_SECTION_IDS,
  SYNTHESE_SECTION_ID,
} from './rapportStructure';
import { statbank } from './statbank';
import { markersIn, stripMarkers, encartMarkers } from './reportCitations';

const KNOWN_STAT_IDS = new Set(statbank.map((s) => s.id));
const SECTION_BY_ID = new Map(reportSections.map((s) => [s.id, s]));

export type ValidationLevel = 'bloquant' | 'avertissement';

export interface ValidationFinding {
  /** Code du contrôle (`V1` … `V12`). */
  code: string;
  level: ValidationLevel;
  /** Section concernée. */
  sectionId: string;
  /** Ce qui a échoué, en clair (journalisé, et renvoyé au modèle au rejeu). */
  message: string;
}

/** Tolérance appliquée aux bornes de budget de mots (V9). */
const WORD_BUDGET_TOLERANCE = 0.1;

/** Bornes du nombre de marqueurs dans l'encart §1 (V3). */
const ENCART_MARKERS_MIN = 3;
const ENCART_MARKERS_MAX = 5;

/** Nombre de mots maximum d'un intertitre ou d'un titre de point clé (V12). */
const HEADING_MAX_WORDS = 12;

// ---------------------------------------------------------------------------
// Listes fermées.
// ---------------------------------------------------------------------------

/** Organisations du socle : leur nom n'a rien à faire dans le corps du texte (V5). */
export const SOCLE_ORG_NAMES = [
  'OIT',
  'Organisation internationale du travail',
  'World Economic Forum',
  'WEF',
  'Stanford',
  'MIT',
  'OCDE',
  'CIANum',
  'Indeed',
  'PwC',
  'McKinsey',
  'Parlons RH',
  'CEGOS',
  'Neobrain',
  'Sopra Steria',
  'France Stratégie',
  'DARES',
  'Centre Inffo',
  'Crédoc',
  'IDC',
  'Cegid',
  'Epoch AI',
] as const;

/** Mots creux interdits par le registre du prompt système (V11). */
export const MOTS_CREUX = [
  'révolution',
  'bouleversement',
  'tsunami',
  'disruption',
  'game changer',
  'incontournable',
  "à l'ère de",
  'plus que jamais',
  'dans un monde en constante évolution',
  'il est important de noter',
  'force est de constater',
  'enjeu majeur',
  'au cœur de',
  'levier',
  'agilité',
  'mindset',
] as const;

/** Vocabulaire de décision interdit par la règle 4 (V11). */
export const VOCABULAIRE_DECISION = [
  'vous devez',
  'il faut',
  'il convient de',
  'nous recommandons',
  'prioriser',
  "plan d'action",
  'feuille de route',
  'mettre en place',
  'dès maintenant',
  'sans attendre',
  'urgent',
] as const;

/** Caractères proscrits dans toute prose du rapport (V10). */
const CARACTERES_INTERDITS: { char: string; label: string }[] = [
  { char: '—', label: 'tiret cadratin' },
  { char: '–', label: 'tiret demi-cadratin' },
  { char: ';', label: 'point-virgule' },
  { char: '!', label: "point d'exclamation" },
];

/** Rend un motif tolérant aux deux apostrophes (droite et typographique). */
function toPattern(needle: string): RegExp {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/['’]/g, "['’]");
  return new RegExp(`(^|[^\\p{L}])${escaped}([^\\p{L}]|$)`, 'iu');
}

const MOTS_CREUX_RE = MOTS_CREUX.map((m) => ({ needle: m, re: toPattern(m) }));
const DECISION_RE = VOCABULAIRE_DECISION.map((m) => ({ needle: m, re: toPattern(m) }));
/**
 * « clé » en adjectif (« un facteur clé », « les points clés ») est interdit, « clé »
 * en nom (« une clé de lecture », « disposer des clés ») reste permis. On distingue
 * les deux par le mot qui précède : un déterminant annonce le nom, un nom annonce
 * l'emploi adjectival.
 */
const CLE_RE = /(\p{L}+)['’\s]+clés?(?![\p{L}])/giu;
const DETERMINANT_RE =
  /^(?:le|la|les|l|un|une|des|de|du|d|cette|ces|mon|ma|mes|ton|ta|tes|son|sa|ses|notre|nos|votre|vos|leur|leurs|quelque|quelques|plusieurs|aucun|aucune|toute|toutes|tout|tous)$/i;

function usesCleAsAdjective(text: string): boolean {
  for (const m of text.matchAll(CLE_RE)) {
    if (!DETERMINANT_RE.test(m[1])) return true;
  }
  return false;
}
const ORG_RE = SOCLE_ORG_NAMES.map((o) => ({
  needle: o,
  re: new RegExp(`(^|[^\\p{L}])${o.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}]|$)`, 'u'),
}));

/**
 * « OCDE » est le seul nom de la liste fermée qui désigne aussi un **périmètre
 * géographique**, et la règle 3 exige justement de nommer le périmètre dans la
 * phrase (« Dans les pays de l'OCDE, 22 % … »). Sans cette exemption, V5 crierait
 * sur chaque rapport conforme, et une alerte qui crie toujours n'alerte plus.
 * Reste interdit l'emploi en crédit de source (« selon l'OCDE »), que V4 attrape
 * dès qu'une année l'accompagne.
 */
const OCDE_PERIMETRE_RE =
  /(?:pays|États|Etats|zone|moyenne|entreprises)\s+(?:membres\s+)?(?:de\s+l['’]|d['’]|)OCDE|dans\s+l['’]OCDE/iu;

/** L'occurrence d'un nom d'organisation est-elle un périmètre légitime ? */
function isPerimetre(needle: string, text: string): boolean {
  return needle === 'OCDE' && OCDE_PERIMETRE_RE.test(text);
}

/**
 * Motif de citation dans le texte (V4) : une parenthèse qui se referme sur une
 * année, éventuellement précédée d'un nom propre suivi d'une virgule.
 * Attrape « (2025) » et « (World Economic Forum, 2025, p.5) », pas « (d'ici 2030) ».
 */
const CITATION_RE = /\(\s*(?:\p{Lu}[^()]{0,80},\s*)?(?:19|20)\d{2}(?:\s*,\s*[^()]{0,20})?\s*\)/u;

/** Pourcentage explicite. */
const PERCENT_RE = /\d+(?:[,.]\d+)?\s?%/;
/** Nombre statistique : un nombre suivi d'une unité de la liste fermée. */
const STAT_NUMBER_RE =
  /\d[\d\u202f\u00a0\s.,]*\s?(?:millions?|milliers?|milliards?|points?|fois|postes?|emplois?|heures?|euros?)\b/i;

// ---------------------------------------------------------------------------
// Aides.
// ---------------------------------------------------------------------------

/** Toutes les chaînes de prose d'une section rédigées par le modèle. */
function proseOf(section: ReportSectionOutput): string[] {
  const out: string[] = [];
  for (const bloc of section.contenu) {
    if (bloc.intertitre) out.push(bloc.intertitre);
    out.push(...bloc.paragraphes);
  }
  for (const fam of section.familles ?? []) out.push(fam.explication);
  const e = section.encart;
  if (e) {
    // `calibrage_court` et `perimetre` sont des textes du code : hors contrôle.
    out.push(e.chapeau, e.chiffre_signal.phrase);
    for (const pt of e.points_cles) out.push(pt.titre, pt.texte);
  }
  return out.filter((s) => s.trim() !== '');
}

/** Intertitres et titres de points clés d'une section (V12). */
function headingsOf(section: ReportSectionOutput): string[] {
  const out = section.contenu.map((b) => b.intertitre).filter((t): t is string => Boolean(t));
  for (const pt of section.encart?.points_cles ?? []) out.push(pt.titre);
  return out;
}

function wordCount(text: string): number {
  const clean = stripMarkers(text);
  return clean === '' ? 0 : clean.split(/\s+/).length;
}

/** Nombre de mots facturés à une section (V9). */
function sectionWordCount(section: ReportSectionOutput): number {
  return proseOf(section).reduce((n, t) => n + wordCount(t), 0);
}

/** Bornes de budget d'une section, tolérance comprise. §3 dépend du nombre de familles. */
function budgetOf(
  spec: ReportSection,
  section: ReportSectionOutput,
): { min: number; max: number } | null {
  if (!spec.wordBudget) return null;
  let { min, max } = spec.wordBudget;
  if (spec.wordBudgetPerFamille) {
    const n = section.familles?.length ?? 0;
    min += n * spec.wordBudgetPerFamille.min;
    max += n * spec.wordBudgetPerFamille.max;
  }
  return {
    min: Math.floor(min * (1 - WORD_BUDGET_TOLERANCE)),
    max: Math.ceil(max * (1 + WORD_BUDGET_TOLERANCE)),
  };
}

/**
 * Découpe grossière en phrases, pour V6. Suffisant sur la prose du rapport :
 * pas d'abréviation numérotée, les références de page vivent dans les sources.
 */
function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Retire de la phrase ce qui ressemble à un nombre sans être une statistique :
 * années, codes ISCO, codes NAF, numéros de section (exclusions de V6).
 */
function stripNonStatNumbers(text: string): string {
  return text
    .replace(/§\s*\d+(?:bis)?/gi, ' ')
    .replace(/ISCO[-\s]?(?:08)?[\s:]*[\d,\s]*/gi, ' ')
    .replace(/NAF/gi, ' ')
    .replace(/\b\d{2}\.\d{2}[A-Z]?\b/g, ' ')
    .replace(/\b(?:19|20)\d{2}\b/g, ' ');
}

// ---------------------------------------------------------------------------
// Les contrôles.
// ---------------------------------------------------------------------------

/**
 * Repasse derrière le modèle. Renvoie tous les contrôles en échec, dans l'ordre
 * V1 → V12, sections dans l'ordre du rapport. Les sections figées (§8bis, §9) sont
 * ignorées : elles ne viennent pas du modèle.
 */
export function validateReport(report: PreRapportOutput): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const heritage = inheritedStatIds(report);
  const modelSections = report.sections.filter(
    (s) => (SECTION_BY_ID.get(s.id)?.call ?? 'code') !== 'code',
  );

  for (const section of modelSections) {
    const spec = SECTION_BY_ID.get(section.id)!;
    const add = (code: string, level: ValidationLevel, message: string) =>
      findings.push({ code, level, sectionId: section.id, message });

    // --- V1 / V2 / V3 : la synthèse exécutive §1 ---
    if (section.id === SYNTHESE_SECTION_ID) {
      const horsHeritage = section.sources_citees.filter((id) => !heritage.has(id));
      if (horsHeritage.length > 0) {
        add(
          'V1',
          'bloquant',
          `chiffre absent du corps du rapport, donc hors liste héritée : ${horsHeritage.join(', ')}. La première page ne cite que des chiffres déjà exposés en §2 à §7.`,
        );
      }
      const encart = section.encart;
      if (!encart) {
        add('V2', 'bloquant', 'la synthèse exécutive §1 doit porter un encart.');
      } else {
        const citees = new Set(section.sources_citees);
        const manquants = [
          encart.chiffre_signal.source_id,
          ...encart.points_cles.map((p) => p.source_id),
        ].filter((id) => id && !citees.has(id));
        if (manquants.length > 0) {
          add(
            'V2',
            'bloquant',
            `source_id de l'encart absent de sources_citees : ${[...new Set(manquants)].join(', ')}.`,
          );
        }
        const nbMarqueurs = new Set(encartMarkers(encart)).size;
        if (nbMarqueurs < ENCART_MARKERS_MIN || nbMarqueurs > ENCART_MARKERS_MAX) {
          add(
            'V3',
            'bloquant',
            `${nbMarqueurs} chiffre(s) dans l'encart, chiffre-signal compris. Il en faut entre ${ENCART_MARKERS_MIN} et ${ENCART_MARKERS_MAX}.`,
          );
        }
      }
    }

    const prose = proseOf(section);

    for (const text of prose) {
      // --- V4 : motif de citation dans le texte ---
      const cite = text.match(CITATION_RE);
      if (cite) {
        add(
          'V4',
          'bloquant',
          `référence de source écrite dans le texte : « ${cite[0]} ». La traçabilité passe par les marqueurs [[id]].`,
        );
      }

      // --- V5 : nom d'organisation du socle (avertissement, §0 exclu) ---
      if (section.id !== 'perimetre') {
        for (const { needle, re } of ORG_RE) {
          if (re.test(text) && !isPerimetre(needle, text)) {
            add('V5', 'avertissement', `nom d'organisation dans le texte : « ${needle} ».`);
          }
        }
      }

      // --- V6 : toute phrase chiffrée porte un marqueur (§0 exclu) ---
      if (section.id !== 'perimetre') {
        for (const phrase of sentencesOf(text)) {
          const brut = stripNonStatNumbers(phrase);
          const chiffree = PERCENT_RE.test(brut) || STAT_NUMBER_RE.test(brut);
          if (chiffree && markersIn(phrase).length === 0) {
            add('V6', 'bloquant', `phrase chiffrée sans marqueur : « ${phrase.slice(0, 120)} ».`);
          }
        }
      }

      // --- V10 : caractères interdits ---
      for (const { char, label } of CARACTERES_INTERDITS) {
        if (text.includes(char)) {
          add('V10', 'bloquant', `caractère interdit (${label}) dans « ${text.slice(0, 80)} ».`);
        }
      }

      // --- V11 : mots creux et vocabulaire de décision ---
      for (const { needle, re } of MOTS_CREUX_RE) {
        if (re.test(text)) add('V11', 'bloquant', `mot creux interdit : « ${needle} ».`);
      }
      if (usesCleAsAdjective(text)) {
        add('V11', 'bloquant', 'mot creux interdit : « clé » employé comme adjectif.');
      }
      for (const { needle, re } of DECISION_RE) {
        if (re.test(text)) {
          add('V11', 'bloquant', `vocabulaire de décision interdit : « ${needle} ».`);
        }
      }
    }

    // --- V7 : marqueurs ⇔ liste autorisée ⇔ sources_citees ---
    const allowed =
      section.id === SYNTHESE_SECTION_ID
        ? heritage
        : new Set(statsForSection(spec).map((s) => s.id));
    const marques = new Set(prose.flatMap(markersIn));
    if (section.encart) for (const id of encartMarkers(section.encart)) marques.add(id);

    for (const id of marques) {
      if (!KNOWN_STAT_IDS.has(id)) {
        add('V7', 'bloquant', `marqueur inconnu de la stat-bank : [[${id}]].`);
        continue;
      }
      if (!allowed.has(id)) {
        add('V7', 'bloquant', `statistique citée hors de la liste autorisée de la section : [[${id}]].`);
      }
      if (!section.sources_citees.includes(id)) {
        add('V7', 'bloquant', `marqueur [[${id}]] absent de sources_citees.`);
      }
    }
    for (const id of section.sources_citees) {
      if (!marques.has(id)) {
        add('V7', 'bloquant', `id ${id} déclaré dans sources_citees mais non marqué dans le texte.`);
      }
    }

    // --- V9 : budget de mots ---
    const budget = budgetOf(spec, section);
    if (budget) {
      const mots = sectionWordCount(section);
      if (mots < budget.min || mots > budget.max) {
        add(
          'V9',
          'bloquant',
          `${mots} mots, hors budget toléré de ${budget.min} à ${budget.max} mots.`,
        );
      }
    }

    // --- V12 : longueur des intertitres et des titres de points clés ---
    for (const heading of headingsOf(section)) {
      const n = wordCount(heading);
      if (n > HEADING_MAX_WORDS) {
        add('V12', 'avertissement', `intertitre de ${n} mots (maximum ${HEADING_MAX_WORDS}) : « ${heading} ».`);
      }
    }
  }

  // --- V8 : un id cité dans une seule section parmi §2 à §8 ---
  const corpsIds = new Set([...HERITAGE_SECTION_IDS, 'lecture-strategique']);
  const sectionsById = new Map<string, string[]>();
  for (const section of report.sections) {
    if (!corpsIds.has(section.id)) continue;
    for (const id of section.sources_citees) {
      sectionsById.set(id, [...(sectionsById.get(id) ?? []), section.id]);
    }
  }
  for (const [id, where] of sectionsById) {
    if (where.length > 1) {
      findings.push({
        code: 'V8',
        level: 'avertissement',
        sectionId: where[1],
        message: `statistique ${id} citée dans plusieurs sections du corps (${where.join(', ')}). Un chiffre ne se donne qu'une fois.`,
      });
    }
  }

  return findings;
}

/** Les seuls échecs qui font rejouer une section. */
export const blockingFindings = (findings: ValidationFinding[]): ValidationFinding[] =>
  findings.filter((f) => f.level === 'bloquant');

/** Ids des sections à rejouer, dans l'ordre du rapport. */
export function sectionsToReplay(findings: ValidationFinding[]): string[] {
  const ids = new Set(blockingFindings(findings).map((f) => f.sectionId));
  return reportSections.filter((s) => ids.has(s.id)).map((s) => s.id);
}

/** Résumé lisible des échecs d'une section, renvoyé au modèle au rejeu. */
export function findingsBrief(findings: ValidationFinding[], sectionId: string): string {
  return findings
    .filter((f) => f.sectionId === sectionId)
    .map((f) => `- [${f.code}] ${f.message}`)
    .join('\n');
}

/**
 * Aligne `sources_citees` sur ce qui est réellement marqué dans le texte, en ne
 * gardant que les statistiques connues de la stat-bank. À appliquer APRÈS
 * `validateReport` (sinon V7 ne verrait plus rien) : la liste persistée dans
 * `reports.sources` décrit alors exactement ce que le lecteur voit en note.
 */
export function syncSourcesCitees<T extends PreRapportOutput>(report: T): T {
  for (const section of report.sections) {
    const marques = new Set(proseOf(section).flatMap(markersIn));
    if (section.encart) for (const id of encartMarkers(section.encart)) marques.add(id);
    section.sources_citees = [...marques].filter((id) => KNOWN_STAT_IDS.has(id));
  }
  return report;
}
