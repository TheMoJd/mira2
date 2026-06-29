/**
 * STRUCTURE DU PRÉ-RAPPORT FREEMIUM MIRA — alignée sur le blueprint CEO (22/06/2026)
 * ==================================================================================
 *
 * Source de vérité de la STRUCTURE du rapport freemium : les 10 blocs §0→§9 du
 * « Blueprint du moteur diagnostic → rapport » validé par Caroline, et pour
 * chaque section sa **grille de sources autorisées** + son contrat figé/LLM.
 *
 * Principe directeur du moteur : entrée minimale (6 questions) → enrichissement
 * automatique (INSEE Sirene, lecture site/plaquette, mapping ISCO/ESCO) → sortie
 * normalisée et **traçable** : chaque affirmation reste rattachée à sa source.
 *
 * Garde-fous (blueprint + décisions CEO) :
 *  - **Unité d'analyse = la famille de métiers (ISCO/ESCO)**, le secteur est une
 *    lentille de pondération (cf. `famillesMetiers.ts`).
 *  - Le freemium applique **l'état de l'art à vos métiers** ; il ne touche PAS aux
 *    données internes de l'entreprise (maturité IA, inventaire compétences) —
 *    c'est la frontière avec le payant.
 *  - **Aucun chiffre hors `statbank`**, et chaque section ne peut citer que les
 *    sources listées dans `allowedSources` (la « grille commune »).
 *  - Toujours distinguer **exposition** et **suppression** ; l'augmentation domine.
 *  - **Couche France** (FR1–FR4, hors socle) admise surtout en §2 et §7 (décision
 *    Caroline 22/06) pour compenser un socle quasi 100 % mondial/US/OCDE.
 */

import type { StatEntry, StatTheme } from './statbank';
import { statbank } from './statbank';

/** Origine du contenu d'une section. */
export type ContentSource =
  | 'fige' // texte gabarit constant (template), non rédigé par le LLM
  | 'llm' // entièrement rédigé par le LLM à partir des inputs entreprise
  | 'mixte'; // gabarit + narratif LLM + statistiques citées

/** Public visé par le message d'une section (double accroche CEO). */
export type Audience = 'rh' | 'dirigeant';

/** Statut commercial de la section. */
export type Offre = 'gratuit' | 'gratuit-amorce-payant';

/** Vocabulaire contrôlé — intensité d'exposition d'une famille de métiers (§3). */
export type ExpositionLevel = 'faible' | 'modérée' | 'élevée' | 'à confirmer';

/** Vocabulaire contrôlé — nature de l'impact (jamais « suppression d'emploi »). */
export type ImpactNature = 'automatisation' | 'augmentation' | 'création';

/** Niveau de confiance (mapping ISCO/ESCO, transposition géographique). */
export type ConfidenceLevel = 'élevée' | 'moyenne' | 'faible';

/**
 * Caractérisation normalisée d'une famille de métiers en §3 (produite à la
 * génération — Tranche 4). Si aucune source du socle ne couvre directement la
 * famille, `expositionLevel = 'à confirmer'`, `confiance = 'faible'` et
 * `transposableFrance = false` → afficher honnêtement la limite (garde-fou §7
 * de vigilance du blueprint), plutôt que de forcer un chiffre.
 */
export interface FamilleCharacterisation {
  expositionLevel: ExpositionLevel;
  /** Part de tâches concernées, citée depuis une source (ex. « jusqu'à 82 % »). */
  partTachesConcernees?: string;
  natures: ImpactNature[];
  confiance: ConfidenceLevel;
  /** false → mention « donnée non directement transposable à une PME française ». */
  transposableFrance: boolean;
}

/**
 * Valeur spéciale d'`allowedSources` :
 *  - `'*'` : toutes les sources (sections « transversales » ou « Sources & méthode »).
 */
export type SourceSelector = string; // 'S01'…'S14' | 'FR1'…'FR4' | '*'

export interface ReportSection {
  /** Numéro de bloc dans le déroulé fixe (0 → 9). */
  num: number;
  /** Identifiant stable (clé de la sortie structurée du LLM). */
  id: string;
  /** Titre type ; le LLM peut l'adapter au secteur si `titleEditable`. */
  title: string;
  titleEditable: boolean;
  /** À quoi sert la section. */
  intent: string;
  contentSource: ContentSource;
  /** La section peut-elle citer des statistiques ? */
  allowsStats: boolean;
  /**
   * Grille « section → sources autorisées » (codes du blueprint). `['*']` =
   * toutes. Le LLM ne peut citer que des stats dont `source.sourceId` y figure.
   */
  allowedSources: SourceSelector[];
  /** Thèmes de stat-bank pertinents (aide à la sélection). */
  statThemes?: StatTheme[];
  /** Public(s) visé(s) — double accroche RH / dirigeant. */
  audience?: Audience[];
  offre: Offre;
  /** Consigne de rédaction passée au LLM (si `llm` ou `mixte`). */
  llmBrief?: string;
  /** Texte figé / gabarit (si `fige`, ou socle d'une section `mixte`). */
  fixedText?: string;
}

export const reportSections: ReportSection[] = [
  {
    num: 0,
    id: 'perimetre',
    title: 'Périmètre',
    titleEditable: false,
    intent:
      'Carte d’identité du rapport : entreprise, secteur NAF, familles de métiers analysées, date, socle de sources mobilisé.',
    contentSource: 'mixte',
    allowsStats: false,
    allowedSources: [],
    offre: 'gratuit',
    llmBrief:
      'Restituer le périmètre à partir des inputs normalisés (NAF/effectif issus de l’INSEE, familles ISCO retenues). Aucune statistique.',
  },
  {
    num: 1,
    id: 'synthese-strategique',
    title: 'Synthèse stratégique',
    titleEditable: false,
    intent:
      '3-4 messages clés pour le dirigeant : ce que l’IA change concrètement pour ses familles de métiers. Ouverture qui encadre le diagnostic.',
    contentSource: 'mixte',
    allowsStats: false,
    allowedSources: ['*'], // transversal : synthétise le corps, ne cite pas de chiffre neuf
    audience: ['dirigeant', 'rh'],
    offre: 'gratuit',
    llmBrief:
      'Synthèse transversale en 3-4 messages. Peut reprendre des constats déjà établis et cités plus bas, sans introduire de chiffre nouveau. Double accroche : pérennité/performance (dirigeant) + employabilité/EPP (RH).',
  },
  {
    num: 2,
    id: 'contexte',
    title: 'Le contexte en bref',
    titleEditable: false,
    intent:
      'Où en est l’IA : capacités réelles, vague agentique, rythme de diffusion. Cadre la suite sans survendre.',
    contentSource: 'mixte',
    allowsStats: true,
    allowedSources: ['S02', 'S07', 'S08', 'S15', 'FR1', 'FR2'],
    statThemes: ['adoption', 'exposition', 'gouvernance'],
    audience: ['dirigeant', 'rh'],
    offre: 'gratuit',
    llmBrief:
      'Cadrage « état de l’IA » (capacités OCDE niveaux 2-3, vague agentique CIANum, adoption Stanford). La couche France (Parlons RH) peut situer l’adoption RH française. Chaque chiffre cité depuis la stat-bank, avec sa source.',
  },
  {
    num: 3,
    id: 'familles-metiers',
    title: 'Vos familles de métiers face à l’IA',
    titleEditable: false,
    intent:
      'Cœur du rapport : pour chaque famille déclarée (ISCO/ESCO), intensité d’exposition + nature de l’impact (automatisation / augmentation / création) + part de tâches concernées.',
    contentSource: 'mixte',
    allowsStats: true,
    // Socle métier + couche France RH (Parlons RH FR1/FR2) : citer les métiers
    // transformés en France (informatique, relation client…) enrichit le §3.
    // DARES (FR5) volontairement EXCLU ici : c'est de la dynamique d'emploi (tension,
    // créations), pas une mesure d'exposition à l'IA — et le rapport est antérieur au
    // boom GenAI (mars 2022). Il reste en §6/§7 (contexte). L'exposition terrain passe
    // par McKinsey (S15, automatisation des activités physiques).
    allowedSources: ['S01', 'S06', 'S10', 'S12', 'S13', 'S14', 'S15', 'FR1', 'FR2'],
    statThemes: ['exposition', 'emploi', 'competences'],
    audience: ['rh', 'dirigeant'],
    offre: 'gratuit',
    llmBrief:
      'Pour chaque famille de métiers : produire une FamilleCharacterisation (exposition faible/modérée/élevée, natures, part de tâches). N’utiliser QUE les sources autorisées. Si aucune ne couvre directement la famille → expositionLevel « à confirmer », confiance « faible », transposableFrance=false, et le signaler. Jamais de score propriétaire ni de chiffre par métier hors stat-bank. Toujours distinguer exposition ≠ suppression. Pour la couche France (Parlons RH), privilégier les données sur les métiers transformés (informatique, relation client…) afin d’ancrer la lecture au contexte français.',
  },
  {
    num: 4,
    id: 'competences',
    title: 'Compétences : ce qui monte, ce qui décline',
    titleEditable: false,
    intent:
      'Pour les métiers déclarés : compétences à renforcer (montantes) et compétences en recul (déclinantes).',
    contentSource: 'mixte',
    allowsStats: true,
    allowedSources: ['S06', 'S08', 'S10', 'S12'],
    statThemes: ['competences', 'formation'],
    audience: ['rh'],
    offre: 'gratuit',
    llmBrief:
      'Lister compétences montantes/déclinantes en s’appuyant sur WEF/OCDE/Indeed/PwC. Étiqueter le biais commercial pour Indeed (S10) et PwC (S12). Chiffres cités depuis la stat-bank.',
  },
  {
    num: 5,
    id: 'reorganisation',
    title: 'Comment le travail se réorganise',
    titleEditable: false,
    intent:
      'Collaboration humain-IA, montée des agents, effets de productivité. Replace l’IA comme transformation de l’organisation du travail.',
    contentSource: 'mixte',
    allowsStats: true,
    allowedSources: ['S04', 'S07', 'S15'],
    statThemes: ['productivite', 'adoption'],
    audience: ['dirigeant', 'rh'],
    offre: 'gratuit',
    llmBrief:
      'Décrire la réorganisation du travail (MIT Collaborating with AI Agents, CIANum vague agentique). Chiffres de productivité cités avec prudence et source.',
  },
  {
    num: 6,
    id: 'facteur-humain',
    title: 'Le facteur humain',
    titleEditable: false,
    intent:
      'Profils les plus exposés, enjeux d’équité et d’accompagnement. Ancre la dimension humaine et la conduite du changement.',
    contentSource: 'mixte',
    allowsStats: true,
    allowedSources: ['S01', 'S14', 'FR5'],
    statThemes: ['emploi', 'exposition', 'gouvernance'],
    audience: ['rh', 'dirigeant'],
    offre: 'gratuit',
    llmBrief:
      'Qui est le plus exposé (genre, âge, niveau d’éducation, type d’emploi) selon ILO et OCDE. Cadrer comme enjeu d’équité et d’accompagnement, pas de fatalité. Chiffres cités depuis la stat-bank.',
  },
  {
    num: 7,
    id: 'repere-sectoriel',
    title: 'Votre secteur en repère',
    titleEditable: true,
    intent:
      'Position du secteur sur l’adoption de l’IA (benchmark issu des sources, jamais auto-évaluation de l’entreprise).',
    contentSource: 'mixte',
    allowsStats: true,
    allowedSources: ['S02', 'S05', 'S06', 'FR1', 'FR2', 'FR3', 'FR4', 'FR5'],
    statThemes: ['adoption', 'exposition'],
    audience: ['dirigeant', 'rh'],
    offre: 'gratuit',
    llmBrief:
      'Situer le secteur (NAF → cluster WEF/OCDE) sur l’adoption. La couche France (Parlons RH, CEGOS, Neobrain) sert ici à ancrer le repère côté France. Benchmark sourcé, pas d’auto-évaluation. Signaler quand une donnée mondiale n’est pas directement transposable à une PME française.',
  },
  {
    num: 8,
    id: 'lecture-strategique',
    title: 'Lecture stratégique & questions à se poser',
    titleEditable: false,
    intent:
      'Leviers, angles morts, ce qu’il faut creuser. Clôture stratégique qui fait le pont vers l’offre approfondie (payant).',
    contentSource: 'mixte',
    allowsStats: false,
    allowedSources: ['*'],
    audience: ['dirigeant', 'rh'],
    offre: 'gratuit-amorce-payant',
    fixedText:
      'Pour aller plus loin, le diagnostic MIRA approfondi part de vos données internes (maturité IA, inventaire des compétences, organisation), produit une analyse d’écart « où vous êtes vs où va votre secteur » et une feuille de route priorisée, en s’appuyant sur les kits d’entretien MIRA (DRH, manager, dirigeant).',
    llmBrief:
      'Proposer des leviers et 3-5 questions à se poser, adaptés aux familles et au secteur (sans données internes ni chiffrage propriétaire), puis enchaîner sur l’amorce payante figée.',
  },
  {
    num: 9,
    id: 'sources-methode',
    title: 'Sources & méthode',
    titleEditable: false,
    intent:
      'Le socle des 11 sources (+ couche France), les limites et le mode de lecture du rapport. Crédibilité et traçabilité.',
    contentSource: 'fige',
    allowsStats: false,
    allowedSources: ['*'],
    offre: 'gratuit',
    fixedText:
      'Ce pré-rapport applique l’état de l’art à vos familles de métiers à partir d’un socle de sources de référence (ILO, Stanford AI Index, MIT, OCDE, WEF, CIANum, Indeed, PwC, McKinsey), complété d’une couche France (Parlons RH, CEGOS, Neobrain × Sopra Steria, France Stratégie/DARES). Points de méthode. Chaque affirmation porte sa source, son type (recherche ou commercial) et son horizon. On distingue exposition et suppression, l’augmentation domine. Le mapping des métiers vers la classification ISCO affiche un niveau de confiance corrigeable. Certaines données mondiales ou américaines ne sont pas directement transposables à une PME française et sont signalées comme telles. Socle daté 2023-2026, versionné. Ce document est indicatif et ne constitue pas un diagnostic individuel.',
  },
];

// ---------------------------------------------------------------------------
// Aides de génération (Tranche 4).
// ---------------------------------------------------------------------------

/** Sections autorisées à citer des statistiques. */
export const statBearingSections = (): ReportSection[] =>
  reportSections.filter((s) => s.allowsStats);

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
 * Le respect de la grille n'est imposé qu'au LLM (par le prompt) ; un modèle peut
 * occasionnellement citer une statistique hors de sa section autorisée. Ce filtre
 * la retire côté code : pour chaque section, `sources_citees` est réduit aux stats
 * réellement autorisées (`statsForSection`). Mute le rapport en place et le renvoie.
 */
export const enforceSectionGrid = <T extends CitingReport>(report: T): T => {
  const allowedById = new Map(
    reportSections.map((s) => [s.id, new Set(statsForSection(s).map((x) => x.id))]),
  );
  for (const sec of report.sections) {
    const allowed = allowedById.get(sec.id) ?? new Set<string>();
    sec.sources_citees = sec.sources_citees.filter((id) => allowed.has(id));
  }
  return report;
};
