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
 *    rencontre donc les premiers numéros et le corps les réutilise). L'ordre de
 *    lecture d'une section, son titre d'affichage et son numéro viennent de la
 *    lecture (`reportLecture.ts`, `lireSection`) : ce module n'énumère pas la forme.
 *  - `tokenizeCitations(text)` : découpe une chaîne en segments de texte et
 *    marqueurs, pour que chaque rendu (HTML du PDF, React) insère l'appel de note
 *    en exposant à sa façon.
 *  - `renderNoteText(entry)` : la ligne de référence, au format
 *    « Organisation, année, page. Formulation. Périmètre X. [Projection.]
 *    [Source commerciale.] [Cité par Y, année, page.] »
 *  - `stripMarkers(text)` : le texte sans marqueurs (comptage de mots, contrôles).
 *
 * Les primitives de marqueur (`MARKER_RE`, `tokenizeCitations`, `markersIn`,
 * `stripMarkers`) vivent dans la lecture, qui en a besoin sans pouvoir importer ce
 * module (dépendance à sens unique). Elles sont ré-exportées ici pour que la surface
 * publique de `reportCitations` ne change pas.
 */

import type { StatEntry, StatScope } from './statbank';
import { statbank } from './statbank';
import type { PreRapportOutput } from './reportSchema';
import { lireSection } from './reportLecture';

const STAT_BY_ID: Map<string, StatEntry> = new Map(statbank.map((s) => [s.id, s]));

export { MARKER_RE, tokenizeCitations, markersIn, stripMarkers } from './reportLecture';
export type { CitationToken } from './reportLecture';

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
  /**
   * Notes regroupées par section, dans l'ordre d'apparition du document.
   * `sectionTitle` est le titre d'affichage canonique de la lecture (jamais préfixé
   * d'un numéro), `numero` le numéro du déroulé (« 8bis » compris), `null` hors déroulé.
   */
  groups: { sectionId: string; sectionTitle: string; numero: string | null; notes: CitationNote[] }[];
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
    const lecture = lireSection(section);
    const notes: CitationNote[] = [];
    for (const id of lecture.notes) {
      if (numberById.has(id)) continue;
      const entry = STAT_BY_ID.get(id);
      if (!entry) continue;
      const n = next++;
      numberById.set(id, n);
      notes.push({ n, id, sectionId: lecture.id, entry });
    }
    if (notes.length > 0) {
      groups.push({ sectionId: lecture.id, sectionTitle: lecture.titre, numero: lecture.numero, notes });
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
