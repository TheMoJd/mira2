/**
 * LA LECTURE D'UNE SECTION : le rapport tel qu'il se lit
 * ======================================================
 *
 * Une section sort du modèle sous une forme (`ReportSectionOutput`, contrat zod de
 * `reportSchema.ts`) que quatre lecteurs relisaient chacun à leur façon : les contrôles
 * V1 à V14, les appels de note, le gabarit HTML du PDF, le rappel du corps au second
 * appel. Chacun décidait seul quel texte compte, dans quel ordre, sous quel titre, avec
 * quel suffixe. Ce module est le seul endroit où ces décisions se prennent.
 *
 * `lireSection` rend la section telle que le rapport la présente au lecteur : chaque
 * chaîne devient un `Texte` qui sait qui l'a écrit (`origine`), ce qu'il est pour les
 * contrôles (`controle`), ce qu'il cite (`notes`), et s'il faut poser un appel de note
 * en fin de texte (`appelAjoute`). Les vues dérivées (`textes`, `prose`, `titres`,
 * `notes`, `mots`) évitent aux appelants toute énumération de la forme.
 *
 * Pure, totale (ne lève jamais), sans mutation de l'entrée, sans cache : deux lectures
 * du même objet sont égales (`toEqual`). Ordre de lecture garanti (invariant I1).
 *
 * Les primitives de marqueur (`MARKER_RE`, `tokenizeCitations`, `markersIn`,
 * `stripMarkers`) vivent ici et sont RÉ-EXPORTÉES par `reportCitations.ts`, dont la
 * surface publique ne change pas. La dépendance est à sens unique :
 * reportLecture ← reportCitations ← reportValidation / reportHtml / reportPrompt.
 */

import type { ReportBloc, ReportFamille, ReportEncart } from './reportSchema';
import type { ReportSection, ExpositionLevel, ImpactNature, PointCleAxe } from './rapportStructure';
import { reportSections } from './rapportStructure';

// --- Primitives de marqueur ------------------------------------------------

/** Un marqueur de citation : `[[identifiant]]`. */
export const MARKER_RE = /\[\[([^[\]\s]+)\]\]/g;

/** Segment de texte, ou appel de note à insérer. */
export type CitationToken = { type: 'text'; value: string } | { type: 'note'; id: string };

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

/** Le texte sans ses marqueurs, espaces repliés, bords rognés (comptage de mots, contrôles). */
export function stripMarkers(text: string): string {
  return text.replace(MARKER_RE, '').replace(/\s{2,}/g, ' ').trim();
}

/** Identifiants marqués dans une chaîne, dans l'ordre d'apparition (doublons compris). */
export function markersIn(text: string): string[] {
  return [...text.matchAll(MARKER_RE)].map((m) => m[1]);
}

// --- Entrée -----------------------------------------------------------------

/**
 * Ce que la lecture accepte : la forme minimale d'une section. `CorpsSectionOutput`
 * (premier appel, sans `encart`) et `ReportSectionOutput` (document assemblé ou
 * `report_json` persisté) y sont assignables sans conversion. `sources_citees` n'est
 * pas lu : les contrôles le confrontent eux-mêmes à `notes`.
 */
export interface SectionLisible {
  id: string;
  titre: string;
  contenu: readonly ReportBloc[];
  familles?: readonly ReportFamille[] | null;
  encart?: ReportEncart | null;
}

// --- Sortie -----------------------------------------------------------------

/** Qui a écrit le texte. Les contrôles ne portent que sur `modele`. */
export type Origine = 'modele' | 'code';

/** Où le texte vit dans la section. Sert aux messages de contrôle et aux rendus. */
export type RoleTexte =
  | 'chapeau'
  | 'signal-valeur'
  | 'signal-phrase'
  | 'point-titre'
  | 'point-texte'
  | 'calibrage-court'
  | 'ligne-perimetre'
  | 'intertitre'
  | 'paragraphe'
  | 'famille-nom'
  | 'famille-explication';

/**
 * Nature du texte pour les contrôles :
 *  - `prose`   : prose courante du modèle (V4 à V11, V13, budget V9)
 *  - `titre`   : intertitre ou titre de point clé (prose + douze mots maximum, V12)
 *  - `libelle` : étiquette courte (valeur du chiffre-signal, nom de famille) : rendue,
 *                numérotée si elle porte un marqueur, mais hors budget et hors contrôles de prose
 */
export type ControleTexte = 'prose' | 'titre' | 'libelle';

/** Une chaîne telle que le lecteur la lit, avec tout ce qu'un appelant doit en savoir. */
export interface Texte {
  readonly role: RoleTexte;
  /** Le texte tel qu'écrit, marqueurs `[[id]]` compris (le rendu les transforme, les contrôles les retirent). */
  readonly texte: string;
  readonly origine: Origine;
  readonly controle: ControleTexte;
  /** Nombre de mots, marqueurs retirés : `stripMarkers(texte)` vide donne 0, sinon `split(/\s+/).length`. */
  readonly mots: number;
  /**
   * Ids à numéroter pour ce texte, dans l'ordre de lecture : les marqueurs du texte,
   * puis le `source_id` rattaché s'il n'y figure pas (chiffre-signal et points clés
   * seulement). Doublons conservés, chaînes vides exclues.
   */
  readonly notes: readonly string[];
  /**
   * `source_id` rattaché dont le marqueur manque dans le texte : le rendu pose alors
   * l'appel de note en fin de texte. `null` partout ailleurs.
   */
  readonly appelAjoute: string | null;
}

/** La part de tâches d'une famille (§3), lue et déjà mise en forme (Q4). */
export interface PartTaches {
  /** La valeur telle que le modèle l'a écrite, bords rognés. */
  readonly brut: string;
  /** Format court reconnu par `PART_COURTE_RE` : un pourcentage, précédé au plus d'un des `PART_TACHES_PREFIXES`. */
  readonly court: boolean;
  /** Le nombre du pourcentage tel qu'écrit (« 82 », « 82,5 ») si `court`, sinon `null`. Sert à V14. */
  readonly nombre: string | null;
  /** Ce que le lecteur lit : `${brut} ${PART_TACHES_SUFFIXE}` si `court`, `brut` tel quel sinon. */
  readonly affichage: string;
}

/** Un bloc de contenu : intertitre-constat optionnel, puis ses paragraphes non vides. */
export interface BlocLu {
  readonly intertitre: Texte | null;
  readonly paragraphes: readonly Texte[];
}

export interface ChiffreSignalLu {
  /** Contrôle `libelle`. */
  readonly valeur: Texte;
  /** Contrôle `prose`, notes = marqueurs puis `source_id` à défaut. */
  readonly phrase: Texte;
  /** `source_id` déclaré par le modèle (V2). */
  readonly sourceId: string;
  // Q6 (décision en attente) : `readonly perimetre: Texte` s'ajoute ICI. Il entre
  // alors dans `textes`, `notes`, `mots` sans qu'aucun contrôle change.
}

export interface PointCleLu {
  readonly axe: PointCleAxe;
  /** Contrôle `titre`. */
  readonly titre: Texte;
  /** Contrôle `prose`, notes = marqueurs puis `source_id` à défaut. */
  readonly texte: Texte;
  readonly sourceId: string;
}

/** L'encart de synthèse §1 : une seule unité visuelle. */
export interface EncartLu {
  readonly chapeau: Texte;
  readonly signal: ChiffreSignalLu;
  readonly points: readonly PointCleLu[];
  /** Ligne figée du code (`origine: 'code'`, aucune note). */
  readonly calibrageCourt: Texte;
  /** Ligne figée du code (`origine: 'code'`, aucune note). */
  readonly lignePerimetre: Texte;
  /** Les notes de l'encart seul, ordre de lecture, doublons conservés (V3). */
  readonly notes: readonly string[];
}

/** La fiche d'une famille de métiers (§3). */
export interface FamilleLue {
  /** Contrôle `libelle`. */
  readonly nom: Texte;
  readonly exposition: ExpositionLevel;
  readonly natures: readonly ImpactNature[];
  readonly part: PartTaches | null;
  /** Contrôle `prose`. */
  readonly explication: Texte;
}

/**
 * La lecture d'une section. Tout dérive d'une seule traversée : `encart`, `blocs` et
 * `familles` sont l'arbre, `textes` ses feuilles dans l'ordre, `prose`, `titres`,
 * `notes` et `mots` des vues de `textes`.
 *
 * INVARIANTS (tous testés à travers `lireSection`) :
 *  I1. ORDRE DE LECTURE, qui fixe la numérotation des notes : encart (chapeau, valeur du
 *      chiffre-signal, phrase du chiffre-signal, puis chaque point clé : titre puis texte,
 *      puis les deux lignes figées), puis blocs (intertitre puis paragraphes), puis
 *      familles (nom puis explication). `textes` et `notes` suivent cet ordre.
 *  I2. Q1 : quand `encart` existe, `contenu` n'est pas lu. `blocs` est vide, aucun texte,
 *      aucune note, aucun mot n'en provient, `contenuIgnore` vaut `contenu.length > 0`.
 *      Vaut pour les `report_json` déjà persistés (défense en profondeur).
 *  I3. Tout texte qu'un rendu affiche est dans `textes`, une fois : tout marqueur visible
 *      reçoit un numéro, et « contrôlé » compte exactement ce qui est « imprimé ».
 *  I4. `prose` = les `textes` d'origine `modele`, de contrôle `prose` ou `titre`, non
 *      vides. `titres` = la partie de `prose` de contrôle `titre`.
 *  I5. `notes` = concaténation des `notes` de chaque texte, dans l'ordre de `textes`.
 *      `encart.notes` = la même chose restreinte aux textes de l'encart.
 *  I6. `mots` = somme des `mots` de `prose`.
 *  I7. Q3 : `titre` ne commence jamais par un numéro de section. Il vaut `spec.title`
 *      pour toute section `titleEditable: false` (toutes sauf §7), et pour §7 le titre du
 *      modèle débarrassé d'un préfixe reconnu par `PREFIXE_NUMERO_RE`, `spec.title` si ce
 *      qui reste est vide. Hors déroulé (`spec: null`) : le titre du modèle débarrassé du
 *      préfixe. `titreModele` garde toujours ce que le modèle avait écrit (diagnostic).
 *  I8. Q4 : `part` est `null` si `part_taches` est `null`, blanc, ou une valeur nulle
 *      écrite en texte (« null », « None », « n/a », casse ignorée). Sinon
 *      `part.court` équivaut à `part.nombre !== null` et à « `part.affichage` se termine
 *      par `PART_TACHES_SUFFIXE` ». « jusqu’à 82 % des tâches » écrit par le modèle n'est
 *      PAS court : affiché tel quel, jamais de double suffixe.
 *  I9. Totale et pure : ne lève jamais, ne mute pas l'entrée. Une section d'id inconnu du
 *      déroulé se lit avec `spec: null`, `numero: null`, `origine: 'modele'`.
 *  I10. Nettoyage des blocs : paragraphes blancs retirés, intertitre blanc ramené à
 *      `null`, bloc sans intertitre ni paragraphe retiré.
 *  I11. `origine` de la section vaut `'code'` si `spec.call === 'code'` (§8bis, §9) : tous
 *      ses textes sont d'origine `code`, `prose` est vide, `mots` vaut 0. Dans une section
 *      du modèle, seules `calibrageCourt` et `lignePerimetre` sont d'origine `code`.
 */
export interface LectureSection {
  readonly id: string;
  /** Numéro affiché (« 0 », « 8bis »), `null` si l'id est inconnu du déroulé. */
  readonly numero: string | null;
  /** Titre d'affichage (I7). Sert au corps, aux groupes de « Sources de référence » et au rappel du corps. */
  readonly titre: string;
  /** Ce que le modèle avait écrit (diagnostic). */
  readonly titreModele: string;
  /** La section du déroulé (`rapportStructure.reportSections`), `null` hors déroulé. */
  readonly spec: ReportSection | null;
  readonly origine: Origine;
  /** Q1 : vrai quand un `contenu` non vide a été ignoré parce que la section porte un encart. */
  readonly contenuIgnore: boolean;
  readonly encart: EncartLu | null;
  /** Vide dès que `encart` existe (I2). Nettoyés (I10). */
  readonly blocs: readonly BlocLu[];
  /** Vide hors §3 (jamais `null`). */
  readonly familles: readonly FamilleLue[];
  readonly textes: readonly Texte[];
  readonly prose: readonly Texte[];
  readonly titres: readonly Texte[];
  readonly notes: readonly string[];
  readonly mots: number;
}

// --- Configuration exposée (lue par les tests et par les messages de contrôle) ---

/** Préfixes admis devant le pourcentage de `part_taches` (apostrophe droite ou typographique, casse ignorée). */
export const PART_TACHES_PREFIXES = ['jusqu’à', 'environ', 'près de'] as const;

/** Ce que le rendu accole à une part de tâches au format court. */
export const PART_TACHES_SUFFIXE = 'des tâches' as const;

// --- Règles cachées (le métier du module) -----------------------------------

const SPEC_BY_ID: ReadonlyMap<string, ReportSection> = new Map(reportSections.map((s) => [s.id, s]));

/**
 * Préfixe de numéro de section écrit par le modèle dans son titre (« §7. », « §7 · »,
 * « §7 », « §7, », « 7 · », « 7 - », « 7. », « 7) »). La virgule n'est admise qu'après
 * « § » : elle couvre « §7 – Titre » que `reportSanitize` (appliqué AVANT la lecture)
 * a déjà converti en « §7, Titre », sans tronquer un titre qui commence par un nombre
 * (« 2030, l’horizon du cloud », « 3 constats sur le cloud » restent intacts : sans
 * « § », un séparateur est exigé et la virgule n'en fait pas partie).
 */
const PREFIXE_NUMERO_RE = /^\s*(?:§\s*\d{1,2}(?:bis)?\s*[.·:,)\-]?|\d{1,2}(?:bis)?\s*[.·:)\-])\s*/u;

/**
 * Format court d'une part de tâches : un pourcentage, précédé au plus d'un des
 * `PART_TACHES_PREFIXES`. « 82% » sans espace est admis. « de 30 à 40 % » et toute
 * phrase ne le sont pas. Le groupe 1 est le nombre tel qu'écrit.
 */
const PART_COURTE_RE = /^(?:jusqu['’]à|environ|près de)?\s*(\d{1,3}(?:[,.]\d{1,2})?)[\s\u00a0\u202f]?%$/iu;

/** Comptage de mots, marqueurs retirés (parité stricte avec l'historique de V9). */
function wordCount(text: string): number {
  const clean = stripMarkers(text);
  return clean === '' ? 0 : clean.split(/\s+/).length;
}

/** Rôles dont le `source_id` rattaché est compté à défaut de marqueur dans le texte. */
const ROLES_AVEC_SOURCE_ID: ReadonlySet<RoleTexte> = new Set<RoleTexte>(['signal-phrase', 'point-texte']);

function controleDe(role: RoleTexte): ControleTexte {
  switch (role) {
    case 'intertitre':
    case 'point-titre':
      return 'titre';
    case 'signal-valeur':
    case 'famille-nom':
      return 'libelle';
    default:
      return 'prose';
  }
}

/** Construit un `Texte` : notes dans l'ordre de lecture, appel de note ajouté à défaut de marqueur. */
function texte(role: RoleTexte, valeur: string, origine: Origine, sourceId?: string): Texte {
  const marqueurs = markersIn(valeur).filter(Boolean);
  let notes: string[] = marqueurs;
  let appelAjoute: string | null = null;
  if (ROLES_AVEC_SOURCE_ID.has(role) && sourceId && !marqueurs.includes(sourceId)) {
    notes = [...marqueurs, sourceId];
    appelAjoute = sourceId;
  }
  return {
    role,
    texte: valeur,
    origine,
    controle: controleDe(role),
    mots: wordCount(valeur),
    notes,
    appelAjoute,
  };
}

/** Titre d'affichage (I7). */
function titreAffiche(titreModele: string, spec: ReportSection | null): string {
  if (spec && !spec.titleEditable) return spec.title;
  const sansPrefixe = titreModele.replace(PREFIXE_NUMERO_RE, '').trim();
  if (sansPrefixe === '' && spec) return spec.title;
  return sansPrefixe;
}

/**
 * Valeur nulle écrite en toutes lettres par le modèle (« null », « None », « n/a ») au lieu
 * du `null` JSON. Vu le 07/10/2026 avec gpt-5.4 : le PDF affichait « Exposition élevée · null ».
 */
const PART_NULLE_TEXTE_RE = /^(?:null|none|n\/a)$/i;

/** La part de tâches d'une famille, lue et mise en forme (I8). */
function lirePart(brutOuNull: string | null | undefined): PartTaches | null {
  if (brutOuNull === null || brutOuNull === undefined) return null;
  const brut = brutOuNull.trim();
  if (brut === '' || PART_NULLE_TEXTE_RE.test(brut)) return null;
  const m = PART_COURTE_RE.exec(brut);
  if (!m) return { brut, court: false, nombre: null, affichage: brut };
  return { brut, court: true, nombre: m[1], affichage: `${brut} ${PART_TACHES_SUFFIXE}` };
}

// --- La lecture ---------------------------------------------------------------

/** Lit une section. Pure, totale, sans effet (I9). Seule entrée du module. */
export function lireSection(section: SectionLisible): LectureSection {
  const spec = SPEC_BY_ID.get(section.id) ?? null;
  const origine: Origine = spec?.call === 'code' ? 'code' : 'modele';
  const textes: Texte[] = [];
  const lu = (role: RoleTexte, valeur: string, sourceId?: string, forceCode = false): Texte => {
    const t = texte(role, valeur, forceCode ? 'code' : origine, sourceId);
    textes.push(t);
    return t;
  };

  // --- L'encart (§1) : une seule unité visuelle, lue en premier ---
  let encart: EncartLu | null = null;
  const e = section.encart;
  if (e) {
    const chapeau = lu('chapeau', e.chapeau);
    const valeur = lu('signal-valeur', e.chiffre_signal.valeur);
    const phrase = lu('signal-phrase', e.chiffre_signal.phrase, e.chiffre_signal.source_id);
    const points: PointCleLu[] = e.points_cles.map((pt) => ({
      axe: pt.axe,
      titre: lu('point-titre', pt.titre),
      texte: lu('point-texte', pt.texte, pt.source_id),
      sourceId: pt.source_id,
    }));
    const calibrageCourt = lu('calibrage-court', e.calibrage_court, undefined, true);
    const lignePerimetre = lu('ligne-perimetre', e.perimetre, undefined, true);
    const textesEncart = [chapeau, valeur, phrase, ...points.flatMap((p) => [p.titre, p.texte]), calibrageCourt, lignePerimetre];
    encart = {
      chapeau,
      signal: { valeur, phrase, sourceId: e.chiffre_signal.source_id },
      points,
      calibrageCourt,
      lignePerimetre,
      notes: textesEncart.flatMap((t) => t.notes),
    };
  }

  // --- Les blocs de contenu : ignorés sous un encart (I2), nettoyés (I10) ---
  const blocs: BlocLu[] = [];
  if (!e) {
    for (const bloc of section.contenu) {
      const intertitreBrut = bloc.intertitre ?? '';
      const aIntertitre = intertitreBrut.trim() !== '';
      const paragraphesBruts = bloc.paragraphes.filter((p) => p.trim() !== '');
      if (!aIntertitre && paragraphesBruts.length === 0) continue;
      const intertitre = aIntertitre ? lu('intertitre', intertitreBrut) : null;
      const paragraphes = paragraphesBruts.map((p) => lu('paragraphe', p));
      blocs.push({ intertitre, paragraphes });
    }
  }
  const contenuIgnore = Boolean(e) && section.contenu.length > 0;

  // --- Les familles (§3) ---
  const familles: FamilleLue[] = (section.familles ?? []).map((fam) => ({
    nom: lu('famille-nom', fam.famille),
    exposition: fam.exposition,
    natures: fam.natures,
    part: lirePart(fam.part_taches),
    explication: lu('famille-explication', fam.explication),
  }));

  // --- Les vues (I4, I5, I6) ---
  const prose = textes.filter(
    (t) => t.origine === 'modele' && (t.controle === 'prose' || t.controle === 'titre') && t.texte.trim() !== '',
  );
  const titres = prose.filter((t) => t.controle === 'titre');

  return {
    id: section.id,
    numero: spec?.numLabel ?? null,
    titre: titreAffiche(section.titre, spec),
    titreModele: section.titre,
    spec,
    origine,
    contenuIgnore,
    encart,
    blocs,
    familles,
    textes,
    prose,
    titres,
    notes: textes.flatMap((t) => t.notes),
    mots: prose.reduce((n, t) => n + t.mots, 0),
  };
}
