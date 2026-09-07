/**
 * APPELS DE NOTE ET SECTION « SOURCES DE RÉFÉRENCE » — construits par le code
 * ===========================================================================
 *
 * Le modèle n'écrit aucune source dans le corps du texte : il pose un marqueur
 * `[[identifiant]]` à la fin de la proposition qui porte le chiffre (règle 3 et
 * « Format de citation » du `SYSTEM_PROMPT`). Ce module fait le reste, hors du
 * modèle donc sans risque de dérive :
 *
 *  - `buildCitationIndex(report)` : numérote les marqueurs dans l'ordre
 *    d'apparition du document, **numérotation continue** sur tout le rapport, et
 *    regroupe les notes **par section** dans cet ordre. Un même identifiant garde
 *    le numéro de sa première apparition (la synthèse §1, en première page,
 *    rencontre donc les premiers numéros et le corps les réutilise).
 *  - `tokenizeCitations(text)` : découpe une chaîne en segments de texte et
 *    marqueurs, pour que chaque rendu (HTML du PDF, React) insère l'appel de note
 *    en exposant à sa façon.
 *  - `renderNoteText(entry)` : la ligne de référence, au format
 *    « Organisation, année, page. Formulation. Périmètre X. [Projection.]
 *    [Source commerciale.] [Cité par Y, année, page.] »
 *  - `stripMarkers(text)` : le texte sans marqueurs (comptage de mots, contrôles).
 */

import type { StatEntry, StatScope } from './statbank';
import { statbank } from './statbank';
import type { PreRapportOutput, ReportSectionOutput, ReportEncart } from './reportSchema';

const STAT_BY_ID: Map<string, StatEntry> = new Map(statbank.map((s) => [s.id, s]));

/** Un marqueur de citation : `[[identifiant]]`. */
export const MARKER_RE = /\[\[([^[\]\s]+)\]\]/g;

/** Segment de texte, ou appel de note à insérer. */
export type CitationToken =
  | { type: 'text'; value: string }
  | { type: 'note'; id: string };

/** Découpe une chaîne en segments de texte et marqueurs, dans l'ordre. */
export function tokenizeCitations(text: string): CitationToken[] {
  const tokens: CitationToken[] = [];
  let last = 0;
  for (const m of text.matchAll(MARKER_RE)) {
    const at = m.index ?? 0;
    if (at > last) tokens.push({ type: 'text', value: text.slice(last, at) });
    tokens.push({ type: 'note', id: m[1] });
    last = at + m[0].length;
  }
  if (last < text.length) tokens.push({ type: 'text', value: text.slice(last) });
  return tokens;
}

/** Le texte sans ses marqueurs (comptage de mots, contrôles de style). */
export function stripMarkers(text: string): string {
  return text.replace(MARKER_RE, '').replace(/\s{2,}/g, ' ').trim();
}

/** Identifiants marqués dans une chaîne, dans l'ordre d'apparition (doublons compris). */
export function markersIn(text: string): string[] {
  return [...text.matchAll(MARKER_RE)].map((m) => m[1]);
}

// --- Ordre d'apparition ----------------------------------------------------

/**
 * Identifiants cités par l'encart §1, dans l'ordre de lecture : le chiffre-signal
 * d'abord, puis chaque point clé. Le `source_id` est compté même si le modèle a
 * oublié le marqueur dans le texte (le rendu place alors l'appel de note à la fin).
 */
export function encartMarkers(encart: ReportEncart): string[] {
  // Le format du chiffre-signal place le marqueur après la phrase : il peut donc
  // arriver dans `phrase` plutôt que d'être seulement déclaré en `source_id`.
  const signal = markersIn(encart.chiffre_signal.phrase);
  const ids = [...signal];
  if (!signal.includes(encart.chiffre_signal.source_id)) ids.push(encart.chiffre_signal.source_id);
  for (const pt of encart.points_cles) {
    const inline = markersIn(pt.texte);
    ids.push(...inline);
    if (!inline.includes(pt.source_id)) ids.push(pt.source_id);
  }
  return ids.filter(Boolean);
}

/** Identifiants marqués dans une section, dans l'ordre de lecture. */
export function sectionMarkers(section: ReportSectionOutput): string[] {
  const ids: string[] = [];
  if (section.encart) ids.push(...encartMarkers(section.encart));
  for (const bloc of section.contenu) {
    if (bloc.intertitre) ids.push(...markersIn(bloc.intertitre));
    for (const p of bloc.paragraphes) ids.push(...markersIn(p));
  }
  for (const fam of section.familles ?? []) ids.push(...markersIn(fam.explication));
  return ids;
}

// --- Index des notes -------------------------------------------------------

export interface CitationNote {
  /** Numéro d'appel de note, continu sur tout le rapport. */
  n: number;
  /** Identifiant de la statistique. */
  id: string;
  /** Section où la note apparaît pour la première fois. */
  sectionId: string;
  /** Entrée de stat-bank correspondante. */
  entry: StatEntry;
}

export interface CitationIndex {
  /** Numéro d'appel de note par identifiant (première apparition). */
  numberById: Map<string, number>;
  /** Notes regroupées par section, dans l'ordre d'apparition du document. */
  groups: { sectionId: string; sectionTitle: string; notes: CitationNote[] }[];
}

/**
 * Numérote les marqueurs du rapport et regroupe les notes par section. Les
 * identifiants inconnus de la stat-bank sont ignorés : ils ne reçoivent pas de
 * numéro, et le rendu efface alors le marqueur plutôt que d'afficher un appel de
 * note qui ne renvoie à rien (le garde-fou « zéro chiffre inventé » côté données ;
 * la validation `V7` signale le cas en amont).
 */
export function buildCitationIndex(report: PreRapportOutput): CitationIndex {
  const numberById = new Map<string, number>();
  const groups: CitationIndex['groups'] = [];
  let next = 1;

  for (const section of report.sections) {
    const notes: CitationNote[] = [];
    for (const id of sectionMarkers(section)) {
      if (numberById.has(id)) continue;
      const entry = STAT_BY_ID.get(id);
      if (!entry) continue;
      const n = next++;
      numberById.set(id, n);
      notes.push({ n, id, sectionId: section.id, entry });
    }
    if (notes.length > 0) {
      groups.push({ sectionId: section.id, sectionTitle: section.titre, notes });
    }
  }

  return { numberById, groups };
}

// --- Rendu d'une ligne de référence ----------------------------------------

/** Libellé lisible d'un périmètre géographique. */
const SCOPE_LABEL: Record<StatScope, string> = {
  monde: 'monde',
  france: 'France',
  europe: 'Europe',
  ocde: 'OCDE',
  usa: 'États-Unis',
  secteur: 'sectoriel',
};

/** Référence « Organisation, année, page » d'une entrée. */
function refOf(org: string, year: number, page?: string): string {
  return `${org}, ${year}${page ? `, ${page}` : ''}`;
}

/**
 * Ligne de référence complète d'une note. Une donnée secondaire est recréditée à
 * sa source d'origine, le rapport qui la cite étant reporté en fin de ligne.
 */
export function renderNoteText(entry: StatEntry): string {
  const secondaire = entry.provenance === 'secondaire' && Boolean(entry.source.originalSource);
  const tete = secondaire
    ? `${entry.source.originalSource}.`
    : `${refOf(entry.source.org, entry.source.year, entry.source.page)}.`;
  return [
    tete,
    entry.claim,
    `Périmètre ${SCOPE_LABEL[entry.scope]}.`,
    entry.projection ? 'Projection.' : null,
    entry.source.nature === 'commerciale' ? 'Source commerciale.' : null,
    secondaire
      ? `Cité par ${refOf(entry.source.org, entry.source.year, entry.source.page)}.`
      : null,
  ]
    .filter(Boolean)
    .join(' ');
}
