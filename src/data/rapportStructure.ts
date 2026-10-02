/**
 * STRUCTURE DU PRÉ-RAPPORT FREEMIUM MIRA
 * ======================================
 *
 * Source de vérité de la STRUCTURE du rapport freemium : le déroulé §0 → §9 (avec
 * l'encart §8bis), et pour chaque section son intention, sa consigne de rédaction,
 * sa **grille de sources autorisées**, son **budget de mots** et son origine
 * (rédigée par le modèle, ou texte figé injecté par le code).
 *
 * Refonte prompts (version Cyril + compléments Caroline) :
 *  - §1 devient la **synthèse exécutive** : un encart de format fixe, rédigé au
 *    SECOND appel, à partir des seules statistiques déjà citées en §2 à §7.
 *  - les **textes figés** (ligne de calibrage, ligne de périmètre, encart §8bis
 *    « Comment utiliser ce rapport », méthode §9) sont injectés par le code. Le
 *    modèle ne les voit pas, ne les rédige pas, ne les reformule pas.
 *  - la caractérisation d'une famille (§3) ne porte plus ni `confiance` ni
 *    `transposable_france` (décision Caroline) : les précautions de lecture sont
 *    prises une fois pour toutes en fin de rapport, dans l'encart §8bis.
 *
 * Garde-fous :
 *  - **Unité d'analyse = la famille de métiers (ISCO-08)**, le secteur (NAF) est une
 *    lentille de pondération (cf. `famillesMetiers.ts`).
 *  - Le freemium applique **l'état de l'art public aux métiers déclarés** ; il ne
 *    touche à AUCUNE donnée interne de l'entreprise (frontière avec le payant).
 *  - **Aucun chiffre hors `statbank`**, et chaque section ne peut citer que les
 *    sources listées dans `allowedSources` (la « grille commune »).
 *  - Toujours distinguer **exposition** et **suppression** : l'augmentation domine.
 *  - **Couche France** (FR1–FR5, hors socle) admise surtout en §2 et §7 (décision
 *    Caroline) pour compenser un socle quasi 100 % mondial/US/OCDE.
 */

import type { StatEntry, StatTheme } from './statbank';
import { statbank } from './statbank';

/** Origine du contenu d'une section. */
export type ContentSource =
  | 'fige' // texte figé injecté par le code, jamais soumis au modèle
  | 'llm' // entièrement rédigé par le modèle à partir des inputs entreprise
  | 'mixte'; // narratif du modèle + lignes figées ajoutées par le code

/** Appel de génération qui produit la section (le corps, puis la synthèse). */
export type GenerationCall =
  | 'corps' // premier appel : §0, §2 → §8
  | 'synthese' // second appel : §1, à partir de la liste héritée du corps
  | 'code'; // aucun appel : la section est un texte figé

/** Public visé par le message d'une section (double lecture RH / dirigeant). */
export type Audience = 'rh' | 'dirigeant';

/** Statut commercial de la section. */
export type Offre = 'gratuit' | 'gratuit-amorce-payant';

/** Vocabulaire contrôlé — intensité d'exposition d'une famille de métiers (§3). */
export type ExpositionLevel = 'faible' | 'modérée' | 'élevée' | 'à confirmer';

/** Vocabulaire contrôlé — nature de l'impact (jamais « suppression d'emploi »). */
export type ImpactNature = 'automatisation' | 'augmentation' | 'création';

/** Axes imposés des points clés de la synthèse exécutive (§1), dans cet ordre. */
export type PointCleAxe = 'exposition' | 'concentration' | 'competences' | 'besoins';

/** Ordre imposé des axes de points clés dans l'encart §1. */
export const POINT_CLE_AXES: readonly PointCleAxe[] = [
  'exposition',
  'concentration',
  'competences',
  'besoins',
] as const;

/**
 * Caractérisation normalisée d'une famille de métiers en §3. Si aucune source du
 * socle ne couvre directement la famille, `expositionLevel = 'à confirmer'` et le
 * rapport le dit en une phrase, plutôt que de forcer un chiffre.
 *
 * Ni `confiance` ni `transposable_france` : décision Caroline, les précautions de
 * lecture sont portées une fois pour toutes par l'encart §8bis en fin de rapport.
 */
export interface FamilleCharacterisation {
  expositionLevel: ExpositionLevel;
  /** Part de tâches concernées, citée depuis une source (ex. « jusqu'à 82 % »). */
  partTachesConcernees?: string;
  natures: ImpactNature[];
}

/** Budget de mots d'une section (bornes fermes, tolérance appliquée à la validation). */
export interface WordBudget {
  min: number;
  max: number;
}

/**
 * Valeur spéciale d'`allowedSources` :
 *  - `'*'` : toutes les sources (sections transversales).
 */
export type SourceSelector = string; // 'S01'…'S17' | 'FR1'…'FR5' | '*'

export interface ReportSection {
  /**
   * Rang dans le déroulé. Numérique pour garder l'ordre du rapport ; `8.5` est
   * l'encart §8bis, intercalé entre §8 et §9.
   */
  num: number;
  /** Numéro tel qu'il s'affiche (« 0 », « 8 », « 8bis », « 9 »). */
  numLabel: string;
  /** Identifiant stable (clé de la sortie structurée du modèle). */
  id: string;
  /** Titre de la section. */
  title: string;
  titleEditable: boolean;
  /** À quoi sert la section (repris tel quel dans le prompt utilisateur). */
  intent: string;
  contentSource: ContentSource;
  /** Appel qui produit la section. */
  call: GenerationCall;
  /** La section peut-elle citer des statistiques ? */
  allowsStats: boolean;
  /**
   * Grille « section → sources autorisées » (codes de source de la stat-bank).
   * `['*']` = toutes. Le modèle ne peut citer que des stats dont `source.sourceId`
   * y figure. Pour §1, la liste réelle est la **liste héritée** du corps (union des
   * `sources_citees` de §2 à §7), calculée à la génération.
   */
  allowedSources: SourceSelector[];
  /** Thèmes de stat-bank pertinents (aide à la sélection). */
  statThemes?: StatTheme[];
  /** Public(s) visé(s) — double lecture RH / dirigeant. */
  audience?: Audience[];
  offre: Offre;
  /** Budget de mots (bornes fermes du prompt système). */
  wordBudget?: WordBudget;
  /** §3 : budget de mots par famille déclarée, en plus de l'introduction. */
  wordBudgetPerFamille?: WordBudget;
  /** Consigne de rédaction passée au modèle (sections `llm` / `mixte`). */
  llmBrief?: string;
  /** Paragraphes figés injectés par le code (sections `fige`). */
  fixedParagraphs?: string[];
}

// ---------------------------------------------------------------------------
// Textes figés injectés par le code. Le modèle ne les voit jamais.
// ---------------------------------------------------------------------------

/** Ligne de calibrage courte, page 1, sous l'encart de synthèse. */
export const CALIBRAGE_COURT =
  'Ces chiffres décrivent des tendances de marché. Voir « Comment utiliser ce rapport » en fin de rapport.';

/** Ligne de périmètre, page 1, sous la ligne de calibrage. */
export const LIGNE_PERIMETRE =
  'Ce pré-rapport applique l’état de l’art public aux familles de métiers que vous avez déclarées. Il aide à comprendre une évolution et les besoins qu’elle fait naître. Il ne constitue pas un audit de votre organisation, ne porte sur aucun salarié en particulier et n’a pas vocation à fonder une décision individuelle.';

/** Lien du call-to-action de l'encart §8bis. */
export const CONTACT_URL = 'https://mira-audit.fr/contact';

/** Dernière phrase de §8bis : « contactez-nous ! » y est un lien vers `CONTACT_URL`. */
export const COMMENT_UTILISER_CTA = 'Pour disposer d’une cartographie fine, dynamique et actionnable, contactez-nous !';

/** Corps de l'encart §8bis « Comment utiliser ce rapport ». */
export const COMMENT_UTILISER_PARAGRAPHES: string[] = [
  'Les statistiques de ce rapport sont issues de plusieurs rapports de référence publics. Elles décrivent des tendances observées sur des populations larges : un pays, un secteur, une famille de métiers. Elles ne mesurent ni une entreprise en particulier ni la vôtre.',
  'Concrètement, cela se traduit par trois points d’attention.',
  'Un chiffre d’exposition ne dit pas combien de vos postes sont concernés. Il dit quelle part des tâches d’une famille de métiers, à l’échelle où la source l’a observée, présente des caractéristiques que l’IA sait aujourd’hui traiter.',
  'Un chiffre de transformation ne dit pas à quelle vitesse cela se produira chez vous. Le rythme réel dépend de votre organisation, de vos outils, de vos clients, de vos équipes et de la conduite du changement que vous opérez.',
  'Un chiffre national ne dit pas ce qui se passe dans votre bassin d’emploi, votre taille d’entreprise ou votre métier précis. Il donne un ordre de grandeur, une tendance.',
  'Passer de l’ordre de grandeur à la mesure suppose de croiser ces références publiques avec vos propres données : vos fiches de poste réelles, la répartition effective des tâches, vos projets, vos compétences disponibles. C’est le travail que réalise un MIRA-audit, et c’est ce qui permet de passer d’une tendance de marché à une cartographie de vos métiers, chiffrée et justifiée ligne à ligne.',
  COMMENT_UTILISER_CTA,
];

/** Corps de §9 « Méthode et socle de sources ». */
export const METHODE_PARAGRAPHES: string[] = [
  'Ce pré-rapport applique l’état de l’art public à vos familles de métiers à partir d’un socle de rapports de référence internationaux (OIT, Stanford AI Index, MIT, OCDE, WEF, CIANum, Indeed, PwC, McKinsey, ETF), complété d’une couche France (Parlons RH, CEGOS, Neobrain × Sopra Steria, France Stratégie / DARES).',
  'Points de méthode. Chaque chiffre du rapport renvoie par un appel de note à la section « Sources de référence », qui donne son organisation, son année, sa page, son périmètre, son horizon et la nature de la source (recherche ou commerciale). Le périmètre de chaque chiffre est nommé dans la phrase qui le porte. On distingue exposition et suppression : l’augmentation domine. Le rattachement des métiers déclarés à la classification ISCO affiche un niveau de confiance corrigeable. Socle daté 2023-2026, versionné.',
];

/** Titre de la section de références construite par le code, en fin de rapport. */
export const SOURCES_SECTION_TITLE = 'Sources de référence';

// ---------------------------------------------------------------------------
// Le déroulé du rapport.
// ---------------------------------------------------------------------------

export const reportSections: ReportSection[] = [
  {
    num: 0,
    numLabel: '0',
    id: 'perimetre',
    title: 'Périmètre',
    titleEditable: false,
    intent:
      'Carte d’identité du rapport. Le lecteur sait en dix secondes de quoi on parle et de quoi on ne parle pas.',
    contentSource: 'llm',
    call: 'corps',
    allowsStats: false,
    allowedSources: [],
    offre: 'gratuit',
    wordBudget: { min: 60, max: 100 },
    llmBrief:
      'Restituer le périmètre à partir des inputs normalisés : entreprise, secteur NAF, tranche d’effectif, familles de métiers analysées (ISCO), date du rapport. Le socle de sources est nommé en une ligne, sans chiffre : « socle public de rapports de référence internationaux et français, daté 2023-2026 ». Cinq à sept lignes courtes. Aucune statistique, aucun commentaire.',
  },
  {
    num: 1,
    numLabel: '1',
    id: 'synthese-executive',
    title: 'Synthèse exécutive',
    titleEditable: false,
    intent:
      'La vitrine. Un dirigeant qui ne lit que cette page repart avec trois ou quatre chiffres en tête, dont un qu’il retiendra vraiment.',
    contentSource: 'mixte', // encart rédigé par le modèle + 2 lignes figées du code
    call: 'synthese',
    allowsStats: true,
    // La liste réelle est la liste héritée (union des `sources_citees` de §2 à §7),
    // calculée à la génération : la grille reste ouverte, V1 fait le verrou.
    allowedSources: ['*'],
    audience: ['dirigeant', 'rh'],
    offre: 'gratuit',
    wordBudget: { min: 280, max: 360 },
    llmBrief:
      'Encart de format fixe (chapeau, chiffre-signal, trois à quatre points clés par axe, deux lignes injectées par le code), selon le prompt système. Uniquement des statistiques de la liste héritée ci-dessous, construite par le code à partir de ce que tu as effectivement cité en §2 à §7. Chiffre-signal : le plus proche des familles déclarées. Trois à cinq chiffres au total. 280 à 360 mots. Au moins un point clé pour le dirigeant, un pour les RH. Aucun vocabulaire de décision, aucun nom d’organisation, aucune année.',
  },
  {
    num: 2,
    numLabel: '2',
    id: 'contexte',
    title: 'Le contexte en bref',
    titleEditable: false,
    intent:
      'Où en est l’IA, sans survendre : capacités réelles, rythme de diffusion, usage déjà installé. Cadre la suite en trois constats.',
    contentSource: 'llm',
    call: 'corps',
    allowsStats: true,
    // S16 (usage de l'IA mesuré en Europe) et S17 (IA agentique : autonomie bornée)
    // cadrent « où en est l'IA » plus près du lecteur qu'une donnée monde/US.
    allowedSources: ['S02', 'S07', 'S08', 'S15', 'S16', 'S17', 'FR1', 'FR2'],
    statThemes: ['adoption', 'exposition', 'gouvernance'],
    audience: ['dirigeant', 'rh'],
    offre: 'gratuit',
    wordBudget: { min: 220, max: 300 },
    llmBrief:
      'Trois constats maximum, chacun sous un intertitre-constat, chacun porté par une statistique choisie selon la règle de proximité (la couche France d’abord quand elle existe). Angle : les capacités actuelles ont des limites mesurées, la diffusion est rapide, l’usage individuel précède le cadre collectif. Définir le mot « exposition » en une phrase dans cette section. Pas de panorama, pas d’historique de l’IA.',
  },
  {
    num: 3,
    numLabel: '3',
    id: 'familles-metiers',
    title: 'Vos familles de métiers face à l’IA',
    titleEditable: false,
    intent:
      'Le cœur du rapport. Pour chaque famille déclarée : intensité d’exposition, nature de l’impact, part de tâches concernée quand une source la donne, et ce que cela change dans les tâches.',
    contentSource: 'llm',
    call: 'corps',
    allowsStats: true,
    // Socle métier + couche France RH (Parlons RH FR1/FR2) : citer les métiers
    // transformés en France (informatique, relation client…) enrichit le §3.
    // DARES (FR5) volontairement EXCLU ici : c'est de la dynamique d'emploi (tension,
    // créations), pas une mesure d'exposition à l'IA, et le rapport est antérieur au
    // boom GenAI (mars 2022). Il reste en §6/§7 (contexte). L'exposition terrain passe
    // par McKinsey (S15, automatisation des activités physiques).
    allowedSources: ['S01', 'S06', 'S10', 'S12', 'S13', 'S14', 'S15', 'FR1', 'FR2'],
    statThemes: ['exposition', 'emploi', 'competences'],
    audience: ['rh', 'dirigeant'],
    offre: 'gratuit',
    wordBudget: { min: 40, max: 60 },
    wordBudgetPerFamille: { min: 80, max: 140 },
    llmBrief:
      'Une introduction de deux phrases qui nomme les familles et dit laquelle est la plus exposée d’après les sources. Puis, pour CHAQUE famille déclarée, une caractérisation (exposition, natures, part de tâches quand une source la donne) et une explication de deux à quatre phrases dont la première est le constat. Chaque explication porte au moins une statistique, choisie selon la règle de proximité, suivie de son marqueur. Quand la famille dispose d’une source directe (rattachement ci-dessous), tu la cites en priorité. Quand elle n’en a aucune, tu cites la statistique générale la plus proche en nommant son périmètre (« À l’échelle mondiale, … »), et tu écris en une phrase que le socle public ne documente pas précisément cette famille : exposition « à confirmer ». Toujours distinguer exposition et suppression. Jamais de score propriétaire ni de chiffre par métier hors liste autorisée.',
  },
  {
    num: 4,
    numLabel: '4',
    id: 'competences',
    title: 'Compétences : ce qui monte, ce qui décline',
    titleEditable: false,
    intent:
      'Pour les métiers déclarés, ce qui se renforce et ce qui recule côté compétences. Le lecteur RH y trouve la matière de ses entretiens professionnels.',
    contentSource: 'llm',
    call: 'corps',
    allowsStats: true,
    // S16 : littératie IA, formation et compétences humaines mesurées en Europe.
    // S17 : risque d'érosion de l'expertise par délégation aux agents (ce qui recule).
    allowedSources: ['S06', 'S08', 'S10', 'S12', 'S16', 'S17'],
    statThemes: ['competences', 'formation'],
    audience: ['rh'],
    offre: 'gratuit',
    wordBudget: { min: 200, max: 280 },
    llmBrief:
      'Un paragraphe d’ouverture sous intertitre-constat, porté par une ou deux statistiques (rythme de transformation des compétences, besoin de formation), périmètre nommé. Puis deux listes courtes de trois à cinq items : compétences qui montent, compétences qui reculent, rattachées aux familles déclarées, en termes concrets (une tâche, un savoir-faire), sans chiffre. Une phrase de traduction pour clore : ce que cela change dans l’employabilité, pas ce qu’il faudrait former. La nature commerciale de certaines sources ne s’écrit pas dans le texte : elle figure dans la section « Sources de référence ».',
  },
  {
    num: 5,
    numLabel: '5',
    id: 'reorganisation',
    title: 'Comment le travail se réorganise',
    titleEditable: false,
    intent:
      'L’IA comme réorganisation du travail : collaboration humain-IA, agents, productivité. Replace la question au niveau de l’organisation, pas de l’outil.',
    contentSource: 'llm',
    call: 'corps',
    allowsStats: true,
    // S16 : recomposition des tâches après adoption (Europe). S17 : pratiques des
    // organisations pionnières de l'IA agentique (autonomie bornée, tâches structurées).
    allowedSources: ['S04', 'S07', 'S15', 'S16', 'S17'],
    statThemes: ['productivite', 'adoption'],
    audience: ['dirigeant', 'rh'],
    offre: 'gratuit',
    wordBudget: { min: 150, max: 220 },
    llmBrief:
      'Deux constats sous intertitres. Le premier sur la collaboration humain-IA : gains mesurés, périmètre et cadre nommés (« dans une étude expérimentale, … »), jamais présentés comme acquis pour le lecteur. Le second sur ce que cela déplace dans l’organisation des familles déclarées : qui fait quoi, quelles tâches passent de l’exécution au contrôle. Aucune promesse de gain pour l’entreprise.',
  },
  {
    num: 6,
    numLabel: '6',
    id: 'facteur-humain',
    title: 'Le facteur humain',
    titleEditable: false,
    intent:
      'Qui est le plus exposé (diplôme, genre, âge, type d’emploi) et ce que cela pose comme question d’équité et d’accompagnement. Ancre la dimension humaine.',
    contentSource: 'llm',
    call: 'corps',
    allowsStats: true,
    allowedSources: ['S01', 'S14', 'FR5'],
    statThemes: ['emploi', 'exposition', 'gouvernance'],
    audience: ['rh', 'dirigeant'],
    offre: 'gratuit',
    wordBudget: { min: 150, max: 220 },
    llmBrief:
      'Deux à trois constats sous intertitres, chacun porté par une statistique de périmètre nommé. Cadrer comme une question d’équité et d’accompagnement, jamais comme une fatalité ni comme un tri à opérer. Relier à la population des familles déclarées quand une source le permet, sans rien affirmer sur les salariés de l’entreprise. Si la relation entre exposition et croissance de l’emploi a déjà été chiffrée plus haut, la rappeler en mots, sans redonner le chiffre.',
  },
  {
    num: 7,
    numLabel: '7',
    id: 'repere-sectoriel',
    title: 'Votre secteur en repère',
    titleEditable: true,
    intent:
      'La section où le lecteur se reconnaît. Où se situe son secteur sur l’adoption et la transformation, d’après les sources, jamais d’après une auto-évaluation.',
    contentSource: 'llm',
    call: 'corps',
    allowsStats: true,
    // S16 : repères européens (usage par pays, management algorithmique en France,
    // Allemagne, Italie, Espagne), plus proches du secteur français qu'une donnée monde.
    allowedSources: ['S02', 'S05', 'S06', 'S16', 'FR1', 'FR2', 'FR3', 'FR4', 'FR5'],
    statThemes: ['adoption', 'exposition'],
    audience: ['dirigeant', 'rh'],
    offre: 'gratuit',
    wordBudget: { min: 200, max: 280 },
    llmBrief:
      'Trois constats sous intertitres qui nomment le secteur déclaré. Tu privilégies systématiquement les statistiques de périmètre France et celles portant sur un type d’activité ou de clientèle proche du secteur déclaré. Quand aucune donnée ne porte sur le secteur du lecteur, tu cites la donnée française la plus proche en nommant son périmètre, et tu dis en une phrase que le socle public ne documente pas ce secteur en tant que tel. Tu ne présentes jamais une donnée mondiale ou américaine comme si elle décrivait son secteur. Un des constats porte sur la taille d’entreprise quand une source le permet. Repère sourcé, jamais auto-évaluation de l’entreprise.',
  },
  {
    num: 8,
    numLabel: '8',
    id: 'lecture-strategique',
    title: 'Lecture stratégique : les questions que cela pose',
    titleEditable: false,
    intent:
      'Clôture analytique. Ce que les constats du rapport posent comme questions au dirigeant et au DRH de cette entreprise. Ouvre la réflexion, ne la conclut pas.',
    contentSource: 'llm',
    call: 'corps',
    allowsStats: false,
    allowedSources: [],
    audience: ['dirigeant', 'rh'],
    offre: 'gratuit',
    wordBudget: { min: 180, max: 260 },
    llmBrief:
      'Un paragraphe de deux à trois phrases qui relie les constats du rapport aux familles et au secteur déclarés, sans chiffre nouveau (rappels en mots seulement). Puis trois à cinq questions à se poser, chacune rattachée à un constat du corps et formulée pour comprendre sa propre situation (« Quelle part du temps de vos équipes comptables est aujourd’hui consacrée à des tâches de saisie et de contrôle ? »), jamais pour prescrire (« Avez-vous prévu de former vos équipes ? »). Au moins une question pour le dirigeant, une pour les RH. Aucune donnée interne supposée, aucun chiffrage, aucune recommandation. Le pont vers l’offre approfondie n’est pas dans cette section : il est porté par l’encart §8bis, injecté par le code.',
  },
  {
    num: 8.5,
    numLabel: '8bis',
    id: 'comment-utiliser',
    title: 'Comment utiliser ce rapport',
    titleEditable: false,
    intent:
      'Les précautions de lecture, prises une fois pour toutes, et le pont vers l’offre approfondie. Prise de parole de MIRA, visuellement distincte du corps analytique.',
    contentSource: 'fige',
    call: 'code',
    allowsStats: false,
    allowedSources: [],
    audience: ['dirigeant', 'rh'],
    offre: 'gratuit-amorce-payant',
    fixedParagraphs: COMMENT_UTILISER_PARAGRAPHES,
  },
  {
    num: 9,
    numLabel: '9',
    id: 'sources-methode',
    title: 'Méthode et socle de sources',
    titleEditable: false,
    intent:
      'Le socle mobilisé et le mode de lecture du rapport. Crédibilité et traçabilité.',
    contentSource: 'fige',
    call: 'code',
    allowsStats: false,
    allowedSources: [],
    offre: 'gratuit',
    fixedParagraphs: METHODE_PARAGRAPHES,
  },
];

// ---------------------------------------------------------------------------
// Aides de génération.
// ---------------------------------------------------------------------------

/** Sections rédigées par le modèle au premier appel (le corps : §0, §2 → §8). */
export const corpsSections = (): ReportSection[] => reportSections.filter((s) => s.call === 'corps');

/** Section rédigée au second appel (la synthèse exécutive §1). */
export const syntheseSection = (): ReportSection =>
  reportSections.find((s) => s.call === 'synthese')!;

/** Sections dont le contenu est un texte figé injecté par le code (§8bis, §9). */
export const codeSections = (): ReportSection[] => reportSections.filter((s) => s.call === 'code');

/** Sections autorisées à citer des statistiques. */
export const statBearingSections = (): ReportSection[] =>
  reportSections.filter((s) => s.allowsStats);

/** Ids des sections du corps qui alimentent la liste héritée de §1 (§2 → §7). */
export const HERITAGE_SECTION_IDS: readonly string[] = [
  'contexte',
  'familles-metiers',
  'competences',
  'reorganisation',
  'facteur-humain',
  'repere-sectoriel',
] as const;

/** Id de la section cœur §3 (seule à porter des caractérisations de familles). */
export const FAMILLES_SECTION_ID = 'familles-metiers';

/** Id de la synthèse exécutive §1 (seule à porter l'encart). */
export const SYNTHESE_SECTION_ID = 'synthese-executive';

/**
 * Statistiques de la stat-bank effectivement citables dans une section, d'après
 * sa grille `allowedSources` (`'*'` = toutes). Verrou anti-hors-périmètre.
 */
export const statsForSection = (section: ReportSection): StatEntry[] => {
  if (!section.allowsStats) return [];
  if (section.allowedSources.includes('*')) return statbank;
  const allowed = new Set(section.allowedSources);
  return statbank.filter((s) => allowed.has(s.source.sourceId));
};

/** Forme minimale d'un rapport pour le filtrage des citations. */
export interface CitingReport {
  sections: { id: string; sources_citees: string[] }[];
}

/**
 * Garde-fou de **défense en profondeur** sur la grille « section → sources ».
 * Le respect de la grille n'est imposé qu'au modèle (par le prompt) ; un modèle peut
 * occasionnellement citer une statistique hors de sa section autorisée. Ce filtre
 * la retire côté code : pour chaque section, `sources_citees` est réduit aux stats
 * réellement autorisées (`statsForSection`). Mute le rapport en place et le renvoie.
 *
 * §1 est traitée à part : sa liste autorisée n'est pas une grille de sources mais la
 * **liste héritée** du corps, réduite aux stats citées en §2 à §7 (règle V1).
 */
export const enforceSectionGrid = <T extends CitingReport>(report: T): T => {
  const allowedById = new Map(
    reportSections.map((s) => [s.id, new Set(statsForSection(s).map((x) => x.id))]),
  );
  const heritage = inheritedStatIds(report);
  for (const sec of report.sections) {
    const allowed =
      sec.id === SYNTHESE_SECTION_ID ? heritage : allowedById.get(sec.id) ?? new Set<string>();
    sec.sources_citees = sec.sources_citees.filter((id) => allowed.has(id));
  }
  return report;
};

/**
 * Liste héritée : union des `sources_citees` des sections §2 à §7. C'est la seule
 * matière chiffrée autorisée dans la synthèse exécutive §1 (aucun chiffre neuf en
 * première page).
 */
export const inheritedStatIds = (report: CitingReport): Set<string> => {
  const ids = new Set<string>();
  const heritage = new Set(HERITAGE_SECTION_IDS);
  for (const sec of report.sections) {
    if (!heritage.has(sec.id)) continue;
    for (const id of sec.sources_citees) ids.add(id);
  }
  return ids;
};
