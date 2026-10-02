/**
 * VALIDATIONS DU RAPPORT GÉNÉRÉ (V1 → V14)
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
 * | V13 | lettre hors alphabet latin ou pictogramme dans toute prose       | bloquant |
 * | V14 | part_taches hors format court, ou nombre absent des statistiques citées par l'explication | avertissement |
 *
 * Les contrôles lisent la section à travers `lireSection` (`reportLecture.ts`) : c'est
 * la lecture qui décide quel texte est de la prose du modèle, quel texte vient du
 * code (les deux lignes figées de l'encart, les sections §8bis et §9, jamais
 * validées), et quel `contenu` est ignoré parce que la section porte un encart.
 */

import type { PreRapportOutput } from './reportSchema';
import type { ReportSection } from './rapportStructure';
import {
  reportSections,
  statsForSection,
  inheritedStatIds,
  HERITAGE_SECTION_IDS,
  SYNTHESE_SECTION_ID,
} from './rapportStructure';
import type { StatEntry } from './statbank';
import { statbank, statById } from './statbank';
import { markersIn } from './reportCitations';
import { lireSection } from './reportLecture';

const KNOWN_STAT_IDS = new Set(statbank.map((s) => s.id));

export type ValidationLevel = 'bloquant' | 'avertissement';

export interface ValidationFinding {
  /** Code du contrôle (`V1` … `V14`). */
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

/**
 * Lettre hors alphabet latin, ou pictogramme (V13). Un rapport en français ne
 * contient que des lettres latines et la ponctuation courante. Tout le reste est un
 * accident de tokenisation du modèle (« la formulation des խնդիրmes », vu en
 * production) que la police du PDF rend en trou, et qu'aucune règle de prompt ne
 * peut attraper. Les lettres latines accentuées ou ligaturées (é, ç, œ) matchent
 * `\p{Script=Latin}`. Guillemets, apostrophe typographique, points de suspension,
 * €, ×, % et espaces fines ne sont pas des lettres : tous passent.
 */
const HORS_LATIN_RE = /(?!\p{Script=Latin})\p{L}|\p{Extended_Pictographic}/gu;

/** Caractères de contexte gardés de part et d'autre du passage fautif (V13). */
const HORS_LATIN_CONTEXTE = 20;

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

/**
 * Bornes de budget d'une section, tolérance comprise. §3 dépend du nombre de familles.
 * Exporté pour que le rejeu hors ligne (`scripts/replay-report.ts`) affiche le budget
 * réellement appliqué par V9, au lieu de recopier la règle et de mentir sur §3.
 */
export function budgetOf(spec: ReportSection, nbFamilles: number): { min: number; max: number } | null {
  if (!spec.wordBudget) return null;
  let { min, max } = spec.wordBudget;
  if (spec.wordBudgetPerFamille) {
    min += nbFamilles * spec.wordBudgetPerFamille.min;
    max += nbFamilles * spec.wordBudgetPerFamille.max;
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

/** Un passage hors alphabet latin : des caractères fautifs contigus (V13). */
interface PassageHorsLatin {
  passage: string;
  index: number;
}

/**
 * Passages hors alphabet latin d'un texte, caractères contigus groupés : un mot
 * arménien de cinq lettres est un seul passage, pas cinq défauts.
 */
function passagesHorsLatin(text: string): PassageHorsLatin[] {
  const out: PassageHorsLatin[] = [];
  for (const m of text.matchAll(HORS_LATIN_RE)) {
    const dernier = out[out.length - 1];
    if (dernier && dernier.index + dernier.passage.length === m.index) {
      dernier.passage += m[0];
    } else {
      out.push({ passage: m[0], index: m.index });
    }
  }
  return out;
}

/**
 * Extrait d'une quarantaine de caractères autour d'un passage : le rejeu doit voir
 * le mot fautif, pas seulement le caractère. Ne coupe jamais une paire de
 * substitution (emoji) au bord de l'extrait, sinon la chaîne persistée en base
 * serait invalide.
 */
function extraitAutour(text: string, index: number, longueur: number): string {
  let debut = Math.max(0, index - HORS_LATIN_CONTEXTE);
  let fin = Math.min(text.length, index + longueur + HORS_LATIN_CONTEXTE);
  if (debut > 0 && /[\uDC00-\uDFFF]/.test(text[debut])) debut -= 1;
  if (fin < text.length && /[\uD800-\uDBFF]/.test(text[fin - 1])) fin += 1;
  return `${debut > 0 ? '…' : ''}${text.slice(debut, fin)}${fin < text.length ? '…' : ''}`;
}

/**
 * Le claim (ou la valeur) d'une statistique porte-t-il ce pourcentage ? (V14)
 * « 82 » est porté par une entrée de `value: 82`, ou dont le `claim` contient « 82 % »
 * (« 82,5 » tolère « 82.5 »). « 2 % » ne matche pas « 82 % » : le chiffre doit être
 * précédé d'autre chose qu'un chiffre ou un séparateur décimal.
 */
function claimPorte(entry: StatEntry | undefined, nombre: string): boolean {
  if (!entry) return false;
  if (entry.value === Number(nombre.replace(',', '.'))) return true;
  const n = nombre.replace(/[,.]/, '[,.]');
  return new RegExp(`(^|[^\\d,.])${n}[\\s\\u00a0\\u202f]?%`).test(entry.claim);
}

// ---------------------------------------------------------------------------
// Les contrôles.
// ---------------------------------------------------------------------------

/**
 * Repasse derrière le modèle. Renvoie tous les contrôles en échec, dans l'ordre
 * V1 → V14, sections dans l'ordre du rapport. Les sections figées (§8bis, §9) et les
 * sections inconnues du déroulé sont ignorées : la lecture les dit d'origine `code`
 * ou sans `spec`, elles ne viennent pas du modèle.
 */
export function validateReport(report: PreRapportOutput): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const heritage = inheritedStatIds(report);

  for (const section of report.sections) {
    const lecture = lireSection(section);
    if (lecture.origine === 'code' || !lecture.spec) continue; // §8bis, §9, id inconnu
    const spec = lecture.spec;
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
      const encart = lecture.encart;
      if (!encart) {
        add('V2', 'bloquant', 'la synthèse exécutive §1 doit porter un encart.');
      } else {
        const citees = new Set(section.sources_citees);
        const manquants = [encart.signal.sourceId, ...encart.points.map((p) => p.sourceId)].filter(
          (id) => id && !citees.has(id),
        );
        if (manquants.length > 0) {
          add(
            'V2',
            'bloquant',
            `source_id de l'encart absent de sources_citees : ${[...new Set(manquants)].join(', ')}.`,
          );
        }
        const nbMarqueurs = new Set(encart.notes).size;
        if (nbMarqueurs < ENCART_MARKERS_MIN || nbMarqueurs > ENCART_MARKERS_MAX) {
          add(
            'V3',
            'bloquant',
            `${nbMarqueurs} chiffre(s) dans l'encart, chiffre-signal compris. Il en faut entre ${ENCART_MARKERS_MIN} et ${ENCART_MARKERS_MAX}.`,
          );
        }
      }
    }

    for (const t of lecture.prose) {
      const text = t.texte;
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

      // --- V13 : lettre hors alphabet latin ou pictogramme ---
      const horsLatin = passagesHorsLatin(text);
      if (horsLatin.length > 0) {
        const [premier] = horsLatin;
        const codePoint = premier.passage.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0');
        const autres = horsLatin.length - 1;
        const suite =
          autres > 0 ? `, et ${autres} autre${autres > 1 ? 's' : ''} passage${autres > 1 ? 's' : ''} dans ce texte` : '';
        add(
          'V13',
          'bloquant',
          `caractère hors alphabet latin « ${premier.passage} » (U+${codePoint}) dans « ${extraitAutour(text, premier.index, premier.passage.length)} »${suite}. Le rapport s'écrit en lettres latines, sans pictogramme.`,
        );
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
    const marques = new Set(lecture.notes);

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

    // --- V9 : budget de mots (la lecture compte la prose du modèle seule) ---
    const budget = budgetOf(spec, lecture.familles.length);
    if (budget && (lecture.mots < budget.min || lecture.mots > budget.max)) {
      add(
        'V9',
        'bloquant',
        `${lecture.mots} mots, hors budget toléré de ${budget.min} à ${budget.max} mots.`,
      );
    }

    // --- V12 : longueur des intertitres et des titres de points clés ---
    for (const t of lecture.titres) {
      if (t.mots > HEADING_MAX_WORDS) {
        add('V12', 'avertissement', `intertitre de ${t.mots} mots (maximum ${HEADING_MAX_WORDS}) : « ${t.texte} ».`);
      }
    }

    // --- V14 : la part de tâches d'une famille est un nombre court, porté par une statistique citée ---
    for (const fam of lecture.familles) {
      if (!fam.part) continue;
      if (!fam.part.court) {
        add(
          'V14',
          'avertissement',
          `part_taches hors format court : « ${fam.part.brut} ». Attendu « 82 % » ou « jusqu'à 82 % », quinze caractères maximum, sans phrase, sinon null.`,
        );
      } else if (!fam.explication.notes.some((id) => claimPorte(statById[id], fam.part!.nombre!))) {
        add(
          'V14',
          'avertissement',
          `part_taches « ${fam.part.brut} » : le nombre ${fam.part.nombre} ne figure dans aucune statistique citée par l'explication de « ${fam.nom.texte} ».`,
        );
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
    section.sources_citees = [...new Set(lireSection(section).notes)].filter((id) => KNOWN_STAT_IDS.has(id));
  }
  return report;
}
