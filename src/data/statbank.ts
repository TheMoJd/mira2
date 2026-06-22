/**
 * STAT-BANK — Pré-rapport freemium MIRA (Tranche 3)
 * ==================================================
 *
 * Source de vérité des STATISTIQUES CITABLES du pré-rapport freemium.
 *
 * Règle d'or (décision CEO D4) : en V1, le rapport n'affiche **aucun chiffre
 * propriétaire ni scoring par métier**. Toutes les statistiques sont des
 * données macro **réelles, publiques et sourcées**, extraites du corpus de
 * rapports de référence (cf. `examples of reports/`). Le LLM (Tranche 4)
 * **contextualise** ces chiffres à l'activité décrite par l'entreprise mais
 * **n'en fabrique aucun** : il ne peut citer QUE des entrées de cette banque.
 *
 * Chaque entrée porte :
 *  - sa formulation FR autoportante (`claim`, citable telle quelle) ;
 *  - le `verbatim` d'origine (pour vérification / audit) ;
 *  - sa `source` complète (rapport du corpus + organisation émettrice + année) ;
 *  - sa `provenance` : `primaire` (donnée propre au rapport) ou `secondaire`
 *    (chiffre repris d'un tiers DANS le rapport — à recréditer à `originalSource`).
 *
 * ⚠️ Les entrées `provenance: 'secondaire'` et `projection: true` doivent être
 * présentées avec prudence (recréditer la source d'origine ; formuler les
 * projections au conditionnel). Tant qu'une source n'est pas vérifiée à la
 * source primaire, ne pas la mettre en avant comme un fait établi.
 */

/** Grands thèmes de classification d'une statistique. */
export type StatTheme =
  | 'exposition' // exposition des métiers / compétences à l'IA
  | 'competences' // évolution / obsolescence des compétences
  | 'emploi' // création, destruction, transformation d'emplois
  | 'adoption' // diffusion de l'IA dans les organisations
  | 'productivite' // gains (ou pertes) de productivité
  | 'formation' // reskilling / upskilling
  | 'gouvernance' // risques, conformité (AI Act, RGPD), IA responsable
  | 'rh'; // pratiques RH, salaires, effectifs

/** Périmètre géographique de la donnée. */
export type StatScope =
  | 'monde'
  | 'france'
  | 'europe'
  | 'ocde'
  | 'usa'
  | 'secteur'; // donnée propre à un secteur d'activité (illustrative)

/** Donnée propre au rapport (`primaire`) ou reprise d'un tiers (`secondaire`). */
export type StatProvenance = 'primaire' | 'secondaire';

export interface StatSource {
  /**
   * Code de source du blueprint moteur (CEO, 22/06/2026).
   * - Socle des 11 sources validé : `S01`…`S14`.
   * - Couche France complémentaire (hors socle, conservée sur décision Caroline) : `FR1`…`FR4`.
   * Sert à la « grille section → sources autorisées » de `rapportStructure.ts`.
   */
  sourceId: string;
  /** `true` = source du socle des 11 ; `false` = couche France complémentaire. */
  inSocle: boolean;
  /** Document du corpus MIRA d'où provient la citation. */
  report: string;
  /** Organisation émettrice de la donnée d'origine. */
  org: string;
  /** Année de la donnée / publication. */
  year: number;
  /** Repère de localisation (page) si identifié, sinon undefined. */
  page?: string;
  /** Si `provenance === 'secondaire'` : la source d'origine à recréditer. */
  originalSource?: string;
}

export interface StatEntry {
  /** Identifiant stable (kebab-case). */
  id: string;
  /** Valeur numérique (cohérente avec `verbatim`). */
  value: number;
  /** Unité : '%', 'M', 'Md', 'Md$', 'pts', 'x', '' (effectif/volume), … */
  unit: string;
  /** Formulation FR courte et autoportante, citable telle quelle. */
  claim: string;
  /** Citation d'origine exacte (audit / vérification). */
  verbatim: string;
  theme: StatTheme;
  scope: StatScope;
  source: StatSource;
  provenance: StatProvenance;
  /** true = projection / prospective (à formuler au conditionnel). */
  projection?: boolean;
}

// ---------------------------------------------------------------------------
// Raccourcis de sources (évite la répétition).
// ---------------------------------------------------------------------------

// --- Socle des 11 sources validé (blueprint CEO) ---
const ILO: StatSource = {
  sourceId: 'S01',
  inSocle: true,
  report: 'OIT (ILO) — Generative AI and jobs 2023',
  org: 'Organisation internationale du travail (OIT)',
  year: 2023,
};
const STANFORD: StatSource = {
  sourceId: 'S02',
  inSocle: true,
  report: 'Stanford HAI — AI Index Report 2026',
  org: 'Stanford HAI',
  year: 2026,
};
const MIT_COLLAB: StatSource = {
  sourceId: 'S04',
  inSocle: true,
  report: 'MIT — Collaborating with AI Agents 2025',
  org: 'MIT',
  year: 2025,
};
const OCDE_INCLUSIVE: StatSource = {
  sourceId: 'S05',
  inSocle: true,
  report: 'OCDE — Fostering an inclusive digital transformation 2024',
  org: 'OCDE',
  year: 2024,
};
const WEF: StatSource = {
  sourceId: 'S06',
  inSocle: true,
  report: 'WEF — Future of Jobs Report 2025',
  org: 'World Economic Forum',
  year: 2025,
};
const CIANUM: StatSource = {
  sourceId: 'S07',
  inSocle: true,
  report: 'CIANum — IA agentique',
  org: 'CIANum',
  year: 2025,
};
const OCDE_CAP: StatSource = {
  sourceId: 'S08',
  inSocle: true,
  report: 'OCDE — Introducing the OECD AI Capability Indicators 2025',
  org: 'OCDE',
  year: 2025,
};
const INDEED: StatSource = {
  sourceId: 'S10',
  inSocle: true,
  report: 'Indeed Hiring Lab — AI at Work Report 2025',
  org: 'Indeed Hiring Lab',
  year: 2025,
};
const PWC: StatSource = {
  sourceId: 'S12',
  inSocle: true,
  report: 'PwC — Global AI Jobs Barometer 2025',
  org: 'PwC',
  year: 2025,
};
const MIT_ICEBERG: StatSource = {
  sourceId: 'S13',
  inSocle: true,
  report: 'MIT — The Iceberg Index 2025',
  org: 'MIT',
  year: 2025,
};
const OCDE_WORKERS: StatSource = {
  sourceId: 'S14',
  inSocle: true,
  report: 'OCDE — Who will be the workers most affected by AI? 2024',
  org: 'OCDE',
  year: 2024,
};

// --- Couche France complémentaire (hors socle, conservée sur décision Caroline 22/06) ---
const PARLONS_RH: StatSource = {
  sourceId: 'FR1',
  inSocle: false,
  report: 'Parlons RH — Baromètre IA & RH 2025',
  org: 'Parlons RH',
  year: 2025,
};
const PARLONS_RH_2026: StatSource = {
  // Fichier nommé « Talenco » mais édité par Parlons RH (Talenco = partenaire).
  // 2e édition (n=343, collecte déc. 2025 – fév. 2026) ; suite longitudinale de PARLONS_RH 2025.
  sourceId: 'FR2',
  inSocle: false,
  report: 'Parlons RH — 2ᵉ Baromètre national de l’IA dans les RH 2026',
  org: 'Parlons RH',
  year: 2026,
};
const CEGOS: StatSource = {
  sourceId: 'FR3',
  inSocle: false,
  report:
    'CEGOS — Baromètre 2025 : enjeux & perspectives du développement des compétences',
  org: 'CEGOS',
  year: 2025,
};
const NEOBRAIN: StatSource = {
  sourceId: 'FR4',
  inSocle: false,
  report: 'Neobrain × Sopra Steria — L’IA et les métiers',
  org: 'Neobrain × Sopra Steria',
  year: 2024,
};

// ---------------------------------------------------------------------------
// La banque de statistiques.
// ---------------------------------------------------------------------------

export const statbank: StatEntry[] = [
  // === WEF — Future of Jobs 2025 (macro monde, socle déjà présent sur la landing) ===
  {
    id: 'wef-2025-skill-gaps-barrier',
    value: 63,
    unit: '%',
    claim:
      'Le déficit de compétences est le principal frein à la transformation des entreprises : 63 % des employeurs le citent comme obstacle majeur d’ici 2030.',
    verbatim:
      'Skill gaps are categorically considered the biggest barrier to business transformation … with 63% of employers identifying them as a major barrier over the 2025-2030 period.',
    theme: 'competences',
    scope: 'monde',
    source: { ...WEF, page: 'p.6' },
    provenance: 'primaire',
  },
  {
    id: 'wef-2025-skills-transformed-39',
    value: 39,
    unit: '%',
    claim:
      'En moyenne, 39 % des compétences actuelles des travailleurs seront transformées ou deviendront obsolètes entre 2025 et 2030.',
    verbatim:
      'workers can expect that two-fifths (39%) of their existing skill sets will be transformed or become outdated over the 2025-2030 period.',
    theme: 'competences',
    scope: 'monde',
    source: { ...WEF, page: 'p.6' },
    provenance: 'primaire',
  },
  {
    id: 'wef-2025-skill-instability-trend',
    value: 44,
    unit: '%',
    claim:
      'L’instabilité des compétences ralentit : 39 % en 2025, contre 44 % en 2023 et un pic de 57 % en 2020.',
    verbatim:
      'this measure of "skill instability" has slowed compared to previous editions of the report, from 44% in 2023 … and a high point of 57% in 2020.',
    theme: 'competences',
    scope: 'monde',
    source: { ...WEF, page: 'p.6' },
    provenance: 'primaire',
  },
  {
    id: 'wef-2025-ai-transforms-business-86',
    value: 86,
    unit: '%',
    claim:
      '86 % des employeurs s’attendent à ce que l’IA et les technologies de traitement de l’information transforment leur activité d’ici 2030.',
    verbatim:
      '86% of respondents expecting these technologies to transform their business by 2030',
    theme: 'adoption',
    scope: 'monde',
    source: { ...WEF, page: 'p.10' },
    provenance: 'primaire',
  },
  {
    id: 'wef-2025-jobs-churn-22',
    value: 22,
    unit: '%',
    claim:
      'D’ici 2030, la rotation structurelle du marché du travail (emplois créés + détruits) équivaudra à 22 % des emplois actuels.',
    verbatim:
      'job creation and destruction due to structural labour-market transformation will amount to 22% of today’s total jobs.',
    theme: 'emploi',
    scope: 'monde',
    source: { ...WEF, page: 'p.5' },
    provenance: 'primaire',
    projection: true,
  },
  {
    id: 'wef-2025-jobs-created-170m',
    value: 170,
    unit: 'M',
    claim:
      '170 millions de nouveaux emplois pourraient être créés d’ici 2030 (soit 14 % de l’emploi actuel).',
    verbatim:
      'the creation of new jobs equivalent to 14% of today’s total employment, amounting to 170 million jobs.',
    theme: 'emploi',
    scope: 'monde',
    source: { ...WEF, page: 'p.5' },
    provenance: 'primaire',
    projection: true,
  },
  {
    id: 'wef-2025-jobs-displaced-92m',
    value: 92,
    unit: 'M',
    claim:
      '92 millions d’emplois pourraient être détruits d’ici 2030 (soit 8 % de l’emploi actuel).',
    verbatim:
      'the displacement of the equivalent of 8% (or 92 million) of current jobs',
    theme: 'emploi',
    scope: 'monde',
    source: { ...WEF, page: 'p.5' },
    provenance: 'primaire',
    projection: true,
  },
  {
    id: 'wef-2025-jobs-net-78m',
    value: 78,
    unit: 'M',
    claim:
      'Le solde net attendu est de +78 millions d’emplois d’ici 2030 (croissance nette de 7 % de l’emploi total).',
    verbatim: 'resulting in net growth of 7% of total employment, or 78 million jobs.',
    theme: 'emploi',
    scope: 'monde',
    source: { ...WEF, page: 'p.5' },
    provenance: 'primaire',
    projection: true,
  },
  {
    id: 'wef-2025-upskilling-priority-85',
    value: 85,
    unit: '%',
    claim:
      '85 % des employeurs prévoient de prioriser la montée en compétences (upskilling) de leurs effectifs.',
    verbatim: '85% of employers surveyed plan to prioritize upskilling their workforce',
    theme: 'formation',
    scope: 'monde',
    source: { ...WEF, page: 'p.6' },
    provenance: 'primaire',
  },
  {
    id: 'wef-2025-need-training-59',
    value: 59,
    unit: '%',
    claim:
      '59 % des travailleurs auront besoin d’une formation d’ici 2030 ; 11 % risquent de ne pas y avoir accès.',
    verbatim:
      'if the world’s workforce was made up of 100 people, 59 would need training by 2030 … 11 would be unlikely to receive the reskilling or upskilling needed',
    theme: 'formation',
    scope: 'monde',
    source: { ...WEF, page: 'p.6' },
    provenance: 'primaire',
    projection: true,
  },
  {
    id: 'wef-2025-hire-new-skills-70',
    value: 70,
    unit: '%',
    claim: '70 % des employeurs prévoient de recruter des profils dotés de nouvelles compétences.',
    verbatim: '70% of employers expecting to hire staff with new skills',
    theme: 'rh',
    scope: 'monde',
    source: { ...WEF, page: 'p.6' },
    provenance: 'primaire',
  },
  {
    id: 'wef-2025-reduce-workforce-ai-40',
    value: 40,
    unit: '%',
    claim:
      '40 % des employeurs prévoient de réduire leurs effectifs là où l’IA peut automatiser des tâches.',
    verbatim: '40% anticipate reducing their workforce where AI can automate tasks.',
    theme: 'rh',
    scope: 'monde',
    source: { ...WEF, page: 'p.6' },
    provenance: 'primaire',
  },
  {
    id: 'wef-2025-tasks-humans-alone-47',
    value: 47,
    unit: '%',
    claim:
      'Aujourd’hui 47 % des tâches sont réalisées par des humains seuls, 22 % par la technologie et 30 % en combinaison des deux.',
    verbatim:
      'today, 47% of work tasks are performed mainly by humans alone, with 22% performed mainly by technology … and 30% completed by a combination of both.',
    theme: 'productivite',
    scope: 'monde',
    source: { ...WEF, page: 'p.25' },
    provenance: 'primaire',
  },
  {
    id: 'wef-2025-ai-jobs-created-displaced',
    value: 11,
    unit: 'M',
    claim:
      'Les technologies d’IA créeraient 11 millions d’emplois tout en en détruisant 9 millions d’ici 2030.',
    verbatim:
      'trends in AI and information processing technology are expected to create 11 million jobs, while simultaneously displacing 9 million others',
    theme: 'emploi',
    scope: 'monde',
    source: { ...WEF, page: 'p.25' },
    provenance: 'primaire',
    projection: true,
  },

  // === PARLONS RH — Baromètre IA & RH 2025 (France, RH — cœur du ton freemium) ===
  {
    id: 'parlonsrh-2025-metier-transforme-87',
    value: 87,
    unit: '%',
    claim: '87 % des professionnels RH jugent que leur métier va être transformé par l’IA.',
    verbatim: '87 % des professionnels RH jugent que leur métier va être transformé par l’IA',
    theme: 'emploi',
    scope: 'france',
    source: { ...PARLONS_RH, page: 'p.4' },
    provenance: 'primaire',
  },
  {
    id: 'parlonsrh-2025-usage-individuel-83',
    value: 83,
    unit: '%',
    claim: '83 % des professionnels RH utilisent déjà l’IA à titre individuel.',
    verbatim: '83 % des professionnels RH utilisent l’IA à titre individuel',
    theme: 'adoption',
    scope: 'france',
    source: { ...PARLONS_RH, page: 'p.4' },
    provenance: 'primaire',
  },
  {
    id: 'parlonsrh-2025-opportunite-82',
    value: 82,
    unit: '%',
    claim: '82 % des professionnels RH perçoivent l’IA comme une opportunité pour la fonction RH.',
    verbatim: '82 % des professionnels RH perçoivent l’IA comme une opportunité pour la fonction RH',
    theme: 'adoption',
    scope: 'france',
    source: { ...PARLONS_RH, page: 'p.4' },
    provenance: 'primaire',
  },
  {
    id: 'parlonsrh-2025-risque-confidentialite-80',
    value: 80,
    unit: '%',
    claim:
      '80 % des professionnels RH redoutent les conséquences de l’IA sur la confidentialité et la vie privée (84 % chez les RH en entreprise).',
    verbatim:
      'la confidentialité et la sécurité des données (80 % des répondants, et même 84 % chez les professionnels RH en entreprise).',
    theme: 'gouvernance',
    scope: 'france',
    source: { ...PARLONS_RH, page: 'p.30' },
    provenance: 'primaire',
  },
  {
    id: 'parlonsrh-2025-service-rh-deploye-37',
    value: 37,
    unit: '%',
    claim:
      'Seuls 37 % des professionnels RH évoluent dans un service où au moins un outil intégrant l’IA a été déployé — l’usage individuel (83 %) devance largement l’intégration collective.',
    verbatim:
      '37 % d’entre eux évoluent dans un service RH où l’un de ces outils a été déployé',
    theme: 'adoption',
    scope: 'france',
    source: { ...PARLONS_RH, page: 'p.11' },
    provenance: 'primaire',
  },
  {
    id: 'parlonsrh-2025-formation-ia-47',
    value: 47,
    unit: '%',
    claim:
      '47 % des entreprises ont déployé des formations à l’IA dans le service RH au cours des 3 dernières années.',
    verbatim:
      '47 % des entreprises interrogées ont déployé des formations à l’IA au sein du service RH au cours des 3 dernières années',
    theme: 'formation',
    scope: 'france',
    source: { ...PARLONS_RH, page: 'p.11' },
    provenance: 'primaire',
  },
  {
    id: 'parlonsrh-2025-frein-strategie-52',
    value: 52,
    unit: '%',
    claim:
      'L’absence de stratégie claire est le premier frein au déploiement de l’IA dans les RH, cité par 52 % des professionnels.',
    verbatim: 'L’absence de stratégie claire (52 %)',
    theme: 'gouvernance',
    scope: 'france',
    source: { ...PARLONS_RH, page: 'p.29' },
    provenance: 'primaire',
  },
  {
    id: 'parlonsrh-2025-frein-competences-49',
    value: 49,
    unit: '%',
    claim:
      'Le manque de compétences en interne est le 2ᵉ frein au déploiement de l’IA dans les RH, cité par 49 % des professionnels.',
    verbatim: 'le manque de compétences internes (49 %)',
    theme: 'competences',
    scope: 'france',
    source: { ...PARLONS_RH, page: 'p.29' },
    provenance: 'primaire',
  },
  {
    id: 'parlonsrh-2025-transition-difficile-61',
    value: 61,
    unit: '%',
    claim:
      '61 % des professionnels RH anticipent une transition difficile vers des RH assistés par l’IA.',
    verbatim:
      'Les professionnels RH anticipent majoritairement une transition difficile vers les RH assistés par l’IA (61 %).',
    theme: 'adoption',
    scope: 'france',
    source: { ...PARLONS_RH, page: 'p.34' },
    provenance: 'primaire',
  },
  {
    id: 'parlonsrh-2025-confiance-avenir-69',
    value: 69,
    unit: '%',
    claim:
      'Près de 7 professionnels RH sur 10 (69 %) se déclarent confiants dans l’avenir de leur organisation à l’ère de l’IA.',
    verbatim:
      '7 répondants sur 10 affichent leur confiance dans l’avenir de leur organisation à l’ère de l’IA.',
    theme: 'adoption',
    scope: 'france',
    source: { ...PARLONS_RH, page: 'p.34' },
    provenance: 'primaire',
  },
  {
    id: 'parlonsrh-2025-marketing-transforme-96',
    value: 96,
    unit: '%',
    claim:
      'Pour les professionnels RH, le marketing et la communication (96 %), l’informatique (93 %) et la relation client (79 %) sont les métiers les plus transformés par l’IA.',
    verbatim:
      'l’impact de l’IA sur les métiers du marketing et de la communication (96 %) … de l’informatique (93 %) … la relation client (79 %)',
    theme: 'emploi',
    scope: 'france',
    source: { ...PARLONS_RH, page: 'p.38' },
    provenance: 'primaire',
  },
  // -- PARLONS RH : chiffres tiers cités (à recréditer) --
  {
    id: 'centreinffo-2025-actifs-ia-travail-53',
    value: 53,
    unit: '%',
    claim:
      '53 % des actifs français ont déjà utilisé l’IA au travail (71 % chez les cadres et professions intellectuelles supérieures).',
    verbatim:
      '53 % des actifs ont ainsi déjà utilisé l’IA au travail. … On monte à 71 % … « cadres et professions intellectuelles supérieures ».',
    theme: 'adoption',
    scope: 'france',
    source: {
      ...PARLONS_RH,
      page: 'p.12',
      originalSource: 'Baromètre Centre Inffo 2025',
    },
    provenance: 'secondaire',
  },
  {
    id: 'credoc-2025-francais-ia-pro-22',
    value: 22,
    unit: '%',
    claim:
      'Seuls 22 % des Français ont déjà utilisé des outils d’IA dans un cadre professionnel.',
    verbatim:
      'seuls 22 % des Français ont déjà utilisé des outils d’intelligence artificielle dans le cadre professionnel.',
    theme: 'adoption',
    scope: 'france',
    source: {
      ...PARLONS_RH,
      page: 'p.11',
      originalSource: 'Crédoc — Baromètre du Numérique 2025',
    },
    provenance: 'secondaire',
  },
  {
    id: 'idc-2025-services-rh-sans-ia-53',
    value: 53,
    unit: '%',
    claim:
      '53 % des services RH (Europe et Amériques) n’utilisent pas l’IA, et seuls 10 % ont déployé des fonctionnalités IA dans leur SIRH.',
    verbatim:
      '53 % des services RH n’utilisent pas l’IA … Seuls 10 % ont déployé des fonctionnalités IA dans leur SIRH',
    theme: 'adoption',
    scope: 'monde',
    source: {
      ...PARLONS_RH,
      page: 'p.27',
      originalSource: 'IDC pour Cegid (840 responsables RH)',
    },
    provenance: 'secondaire',
  },

  // === OCDE — AI Capability Indicators 2025 (cadrage « où en est l'IA ») ===
  {
    id: 'ocde-2025-capability-levels-2-3',
    value: 3,
    unit: '',
    claim:
      'Les systèmes d’IA les plus avancés se situent entre les niveaux 2 et 3 (sur 5) des échelles de capacités de l’OCDE : ils restent loin d’une équivalence humaine.',
    verbatim:
      'les capacités des systèmes d’IA actuels … se situent entre les niveaux 2 et 3 des différentes échelles.',
    theme: 'exposition',
    scope: 'ocde',
    source: { ...OCDE_CAP, page: 'p.9' },
    provenance: 'primaire',
  },
  {
    id: 'ocde-2025-langage-niveau-3',
    value: 3,
    unit: '',
    claim:
      'Les grands modèles de langage (type GPT-4o) atteignent le seuil inférieur du niveau 3 sur l’échelle du langage, mais ne sont qu’au niveau 2 pour l’interaction sociale.',
    verbatim:
      'les grands modèles de langage les plus avancés … sont classés au seuil inférieur du niveau 3 … classés au niveau 2 sur l’échelle de l’interaction sociale',
    theme: 'exposition',
    scope: 'ocde',
    source: { ...OCDE_CAP, page: 'p.14' },
    provenance: 'primaire',
  },

  // === OCDE — Fostering an inclusive digital transformation 2024 (adoption) ===
  {
    id: 'ocde-2024-adoption-moyenne-8',
    value: 8,
    unit: '%',
    claim:
      'En 2023, seules 8 % des entreprises utilisaient l’IA en moyenne dans les pays de l’OCDE — l’adoption reste très inégale.',
    verbatim:
      'compared to an overall adoption rate of 8% in the same year on average across OECD countries',
    theme: 'adoption',
    scope: 'ocde',
    source: { ...OCDE_INCLUSIVE, page: 'p.3' },
    provenance: 'primaire',
  },
  {
    id: 'ocde-2024-grandes-entreprises-2x',
    value: 2,
    unit: 'x',
    claim:
      'Les entreprises de plus de 250 salariés affichent souvent une part d’utilisateurs de l’IA presque deux fois supérieure à celle des plus petites entreprises.',
    verbatim:
      'firms with more than 250 employees … often have nearly double the share of AI users compared to smaller firms.',
    theme: 'adoption',
    scope: 'ocde',
    source: { ...OCDE_INCLUSIVE, page: 'p.3' },
    provenance: 'primaire',
  },

  // === OIT (ILO) — Generative AI and jobs 2023 (augmentation > automatisation) ===
  {
    id: 'ilo-2023-clerical-exposure-82',
    value: 82,
    unit: '%',
    claim:
      'Le travail administratif est le plus exposé à l’IA générative : 82 % de ses tâches le sont à un niveau supérieur à la moyenne (dont 24 % fortement).',
    verbatim:
      'a full 82 per cent of clerical job tasks are exposed at an above-average level.',
    theme: 'exposition',
    scope: 'monde',
    source: { ...ILO, page: 'p.24' },
    provenance: 'primaire',
  },
  {
    id: 'ilo-2023-augmentation-dominante-13',
    value: 13.4,
    unit: '%',
    claim:
      'L’effet dominant de l’IA générative est l’augmentation (assistance), pas le remplacement : elle pourrait toucher 13,4 % de l’emploi dans les pays à haut revenu.',
    verbatim:
      'The greater impact is from augmentation, which has the potential to affect … 13.4 percent of employment in high-income countries.',
    theme: 'emploi',
    scope: 'ocde',
    source: { ...ILO, page: 'p.1' },
    provenance: 'primaire',
  },
  {
    id: 'ilo-2023-femmes-plus-exposees',
    value: 7.8,
    unit: '%',
    claim:
      'Dans les pays à haut revenu, 7,8 % de l’emploi féminin est potentiellement automatisable par l’IA générative, contre 2,9 % de l’emploi masculin.',
    verbatim:
      'the share of potentially affected female jobs is 7.8 per cent, more than double the 2.9 per cent of male jobs for that income group.',
    theme: 'emploi',
    scope: 'ocde',
    source: { ...ILO, page: 'p.35' },
    provenance: 'primaire',
  },

  // === Indeed Hiring Lab — AI at Work 2025 (exposition des compétences, US) ===
  {
    id: 'indeed-2025-jobs-highly-transformed-26',
    value: 26,
    unit: '%',
    claim:
      '26 % des offres d’emploi pourraient être « fortement » transformées par l’IA générative, et 54 % « modérément ».',
    verbatim:
      'More than a quarter (26%) of jobs … could be "highly" transformed by GenAI. But the majority (54%) are likely to be "moderately" transformed',
    theme: 'exposition',
    scope: 'usa',
    source: { ...INDEED, page: 'p.3' },
    provenance: 'primaire',
  },
  {
    id: 'indeed-2025-skills-exposed-41',
    value: 41,
    unit: '%',
    claim:
      '41 % des ~2 900 compétences professionnelles analysées sont exposées au plus haut niveau de transformation potentielle par l’IA générative.',
    verbatim:
      '41% of almost 2,900 common work skills assessed are exposed to the highest potential levels of GenAI-driven transformation',
    theme: 'competences',
    scope: 'usa',
    source: { ...INDEED, page: 'p.4' },
    provenance: 'primaire',
  },
  {
    id: 'indeed-2025-skills-fully-replaceable-1',
    value: 1,
    unit: '%',
    claim:
      'Aujourd’hui, seulement 1 % des compétences relèvent de la catégorie « totalement remplaçable » par l’IA générative : l’assistance domine, pas le remplacement.',
    verbatim:
      'only 1% of skills fall into the "fully transformable" category today',
    theme: 'competences',
    scope: 'usa',
    source: { ...INDEED, page: 'p.11' },
    provenance: 'primaire',
  },

  // === Neobrain × Sopra Steria (France / Europe — surtout reprises tierces) ===
  {
    id: 'neobrain-2024-tertiaire-france-expose-33',
    value: 33,
    unit: '%',
    claim:
      'En France, près d’un tiers de l’activité professionnelle du secteur tertiaire est exposé à l’IA générative.',
    verbatim:
      'un tiers de l’activité professionnelle est exposé à cette technologie',
    theme: 'exposition',
    scope: 'france',
    source: { ...NEOBRAIN, page: 'p.8', originalSource: 'Sopra Steria Next' },
    provenance: 'secondaire',
  },
  {
    id: 'neobrain-2024-entreprises-fr-genai-60',
    value: 60,
    unit: '%',
    claim:
      'En France, 60 % des entreprises utilisent ou adoptent l’IA générative.',
    verbatim:
      'En France, 60 % des entreprises utilisent ou adoptent l’IA générative',
    theme: 'adoption',
    scope: 'france',
    source: { ...NEOBRAIN, page: 'p.8' },
    provenance: 'secondaire',
  },
  {
    id: 'neobrain-2024-heures-europe-automatisables-27',
    value: 27,
    unit: '%',
    claim:
      'D’ici 2030, 27 % des heures travaillées en Europe pourraient être automatisées.',
    verbatim:
      'D’ici 2030, 27 % des heures travaillées en Europe pourraient être automatisées',
    theme: 'emploi',
    scope: 'europe',
    source: { ...NEOBRAIN, page: 'p.8', originalSource: 'McKinsey Global Institute' },
    provenance: 'secondaire',
    projection: true,
  },
  {
    id: 'neobrain-2024-competences-evoluent-25',
    value: 25,
    unit: '%',
    claim:
      'Les compétences des métiers exposés à l’IA évoluent 25 % plus vite, exigeant une adaptation constante.',
    verbatim:
      'Les compétences des métiers exposés à l’IA évoluent 25 % plus vite, exigeant une adaptation constante',
    theme: 'competences',
    scope: 'france',
    source: { ...NEOBRAIN, page: 'p.8' },
    provenance: 'secondaire',
  },

  // === CIANum — IA agentique (rythme techno + conformité AI Act) ===
  {
    id: 'cianum-2025-cout-inference-90x',
    value: 90,
    unit: 'x',
    claim:
      'Le coût moyen de l’inférence IA (par jeton) a été divisé par 90 en 18 mois : la barrière économique à l’adoption s’effondre.',
    verbatim:
      'le coût moyen de l’inférence, mesuré par jeton (token), a été divisé par 90 en 18 mois',
    theme: 'adoption',
    scope: 'monde',
    source: { ...CIANUM, page: 'p.6', originalSource: 'Epoch AI' },
    provenance: 'secondaire',
  },
  {
    id: 'cianum-2025-ai-act-sanctions',
    value: 7,
    unit: '%',
    claim:
      'En cas de non-conformité à l’AI Act, les sanctions peuvent atteindre 30 millions d’euros ou 7 % du chiffre d’affaires annuel mondial.',
    verbatim:
      'les sanctions peuvent aller jusqu’à 30 millions d’euros ou 7 % du chiffre d’affaires annuel.',
    theme: 'gouvernance',
    scope: 'europe',
    source: { ...CIANUM, page: 'p.8' },
    provenance: 'primaire',
  },

  // === Stanford HAI — AI Index 2026 (adoption record + productivité + gouvernance) ===
  {
    id: 'stanford-2026-genai-adoption-53',
    value: 53,
    unit: '%',
    claim:
      'L’IA générative a atteint ~53 % d’adoption en trois ans, plus vite que l’ordinateur personnel ou internet.',
    verbatim:
      'Generative AI reached 53% adoption in three years, faster than the personal computer or the internet.',
    theme: 'adoption',
    scope: 'monde',
    source: { ...STANFORD, page: 'ch.4' },
    provenance: 'primaire',
  },
  {
    id: 'stanford-2026-orgs-adoption-88',
    value: 88,
    unit: '%',
    claim:
      'En 2025, 88 % des organisations interrogées déclarent utiliser l’IA, et 70 % dans au moins une fonction métier.',
    verbatim:
      'up to 88% of surveyed organizations … Generative AI is now used in at least one business function at 70% of organizations',
    theme: 'adoption',
    scope: 'monde',
    source: { ...STANFORD, page: 'ch.4' },
    provenance: 'primaire',
  },
  {
    id: 'stanford-2026-productivite-europe-4',
    value: 4,
    unit: '%',
    claim:
      'Une étude de 12 000 entreprises européennes montre que l’adoption de l’IA a augmenté la productivité du travail de 4 %, la formation renforçant l’effet.',
    verbatim:
      'A study of 12,000 European firms found that AI adoption boosted labor productivity by 4%, with training strengthening the outcome',
    theme: 'productivite',
    scope: 'europe',
    source: { ...STANFORD, page: 'p.220', originalSource: 'Aldasoro et al., 2026' },
    provenance: 'secondaire',
  },
  {
    id: 'stanford-2026-responsible-ai-policy',
    value: 11,
    unit: '%',
    claim:
      'Les rôles de gouvernance dédiés à l’IA ont crû de 17 % en 2025, et la part d’entreprises sans politique d’IA responsable est tombée de 24 % à 11 %.',
    verbatim:
      'AI-specific governance roles grew 17% in 2025, and the share of businesses with no responsible AI policies in place fell sharply from 24% to 11%.',
    theme: 'gouvernance',
    scope: 'monde',
    source: { ...STANFORD, page: 'ch.3' },
    provenance: 'primaire',
  },

  // === PwC — Global AI Jobs Barometer 2025 (prime aux compétences IA) ===
  {
    id: 'pwc-2025-revenue-per-employee-3x',
    value: 3,
    unit: 'x',
    claim:
      'Les secteurs les plus exposés à l’IA affichent une croissance du revenu par employé 3 fois supérieure à celle des secteurs les moins exposés.',
    verbatim:
      'Industries most able to use AI have 3x higher growth in revenue generated by each employee',
    theme: 'productivite',
    scope: 'monde',
    source: { ...PWC, page: 'p.2' },
    provenance: 'primaire',
  },
  {
    id: 'pwc-2025-wage-premium-56',
    value: 56,
    unit: '%',
    claim:
      'Les travailleurs dotés de compétences IA (ex. prompt engineering) bénéficient d’une prime salariale moyenne de 56 % (contre 25 % un an plus tôt).',
    verbatim:
      'Workers with AI skills like prompt engineering command a 56% wage premium (up from 25% last year)',
    theme: 'competences',
    scope: 'monde',
    source: { ...PWC, page: 'p.2' },
    provenance: 'primaire',
  },
  {
    id: 'pwc-2025-skills-changing-faster-66',
    value: 66,
    unit: '%',
    claim:
      'Les compétences recherchées évoluent 66 % plus vite dans les métiers les plus exposés à l’IA (contre 25 % un an plus tôt).',
    verbatim:
      'Skills sought by employers are changing 66% faster in occupations most exposed to AI … up from 25% last year',
    theme: 'competences',
    scope: 'monde',
    source: { ...PWC, page: 'p.2' },
    provenance: 'primaire',
  },
  {
    id: 'pwc-2025-headcount-82',
    value: 82,
    unit: '%',
    claim:
      '82 % des dirigeants déclarent que l’IA a augmenté leurs effectifs ou n’a entraîné aucun changement — l’IA reconfigure les emplois plus qu’elle ne les supprime massivement.',
    verbatim: '82% say that AI has increased or caused no change in headcount',
    theme: 'rh',
    scope: 'monde',
    source: { ...PWC, page: 'p.25' },
    provenance: 'primaire',
  },
  {
    id: 'pwc-2025-job-growth-exposed-38',
    value: 38,
    unit: '%',
    claim:
      'L’emploi continue de croître dans presque tous les métiers exposés à l’IA, mais plus lentement (+38 % sur 5 ans) que dans les métiers peu exposés (+65 %).',
    verbatim:
      'job numbers are growing more slowly in occupations more exposed to AI (38% growth in the past five years) versus occupations less exposed to AI (65% growth …)',
    theme: 'emploi',
    scope: 'monde',
    source: { ...PWC, page: 'p.11' },
    provenance: 'primaire',
  },

  // === MIT — The Iceberg Index 2025 (exposition « cachée », US) ===
  {
    id: 'mit-2025-iceberg-hidden-5x',
    value: 5,
    unit: 'x',
    claim:
      'L’exposition réelle des métiers à l’IA est cinq fois plus grande que l’adoption visible : elle touche surtout l’administratif, la finance et les services professionnels.',
    verbatim: 'The hidden mass beyond visible tech sectors is five times larger.',
    theme: 'exposition',
    scope: 'usa',
    source: { ...MIT_ICEBERG, page: 'p.9' },
    provenance: 'primaire',
  },
  {
    id: 'mit-2025-tasks-ai-can-do-16',
    value: 16,
    unit: '%',
    claim:
      'Les systèmes d’IA actuels peuvent techniquement réaliser environ 16 % des tâches de travail recensées.',
    verbatim:
      'current AI systems can technically perform approximately 16 percent of classified labor tasks',
    theme: 'exposition',
    scope: 'usa',
    source: { ...MIT_ICEBERG, page: 'p.2' },
    provenance: 'primaire',
  },

  // === Parlons RH — 2ᵉ Baromètre IA & RH 2026 (France, RH — données les plus récentes) ===
  {
    id: 'parlonsrh-2026-remplacement-effectifs-64-16',
    value: 64,
    unit: '%',
    claim:
      '64 % des professionnels RH pensent que les entreprises vont remplacer des effectifs RH par l’IA, mais seuls 16 % l’anticipent dans leur propre entreprise.',
    verbatim:
      '64 % des professionnels RH pensent que les entreprises vont remplacer des effectifs RH par l’IA… mais seuls 16 % estiment que cela aura lieu dans leur propre entreprise',
    theme: 'emploi',
    scope: 'france',
    source: { ...PARLONS_RH_2026, page: 'p.4' },
    provenance: 'primaire',
  },
  {
    id: 'parlonsrh-2026-agent-conversationnel-80',
    value: 80,
    unit: '%',
    claim:
      '80 % des professionnels RH utilisent un agent conversationnel dans leur pratique quotidienne (+13 points en un an).',
    verbatim:
      '80 % des professionnels RH utilisent un agent conversationnel dans leur pratique quotidienne — +13 points',
    theme: 'adoption',
    scope: 'france',
    source: { ...PARLONS_RH_2026, page: 'p.15' },
    provenance: 'primaire',
  },
  {
    id: 'parlonsrh-2026-formations-ia-drh-65',
    value: 65,
    unit: '%',
    claim:
      '65 % des entreprises ont déployé des formations à l’IA dans le département RH (+18 points en un an).',
    verbatim:
      '65 % des entreprises ont déployé des formations à l’IA dans le département RH — +18 points',
    theme: 'formation',
    scope: 'france',
    source: { ...PARLONS_RH_2026, page: 'p.15' },
    provenance: 'primaire',
  },
  {
    id: 'parlonsrh-2026-connaissance-ia-47',
    value: 47,
    unit: '%',
    claim:
      'L’acculturation progresse : 47 % des professionnels RH déclarent connaître « assez bien » l’IA en 2026, contre 39 % en 2025.',
    verbatim:
      'Comment évaluez-vous votre connaissance de l’IA ? Je connais assez bien : 47 % (2026) / 39 % (2025)',
    theme: 'competences',
    scope: 'france',
    source: { ...PARLONS_RH_2026, page: 'p.16' },
    provenance: 'primaire',
  },
  {
    id: 'parlonsrh-2026-politique-encadrant-ia-34',
    value: 34,
    unit: '%',
    claim:
      'Seules 34 % des organisations disposent d’une politique encadrant l’IA — 63 % au-delà de 5 000 salariés, mais 10 % en deçà de 10 salariés.',
    verbatim:
      'Votre organisation dispose-t-elle d’une politique encadrant l’IA ? Oui 34 % … Plus de 5000 salariés : 63 % … Moins de 10 salariés : 10 %',
    theme: 'gouvernance',
    scope: 'france',
    source: { ...PARLONS_RH_2026, page: 'p.34' },
    provenance: 'primaire',
  },
  {
    id: 'parlonsrh-2026-opportunite-81',
    value: 81,
    unit: '%',
    claim:
      '81 % des professionnels RH voient l’IA comme une opportunité pour la fonction RH en 2026 (stable vs 82 % en 2025).',
    verbatim:
      'Pour la fonction RH, l’IA est-elle plutôt UNE OPPORTUNITÉ : 81 % (2026) / 82 % (2025)',
    theme: 'rh',
    scope: 'france',
    source: { ...PARLONS_RH_2026, page: 'p.41' },
    provenance: 'primaire',
  },
  {
    id: 'parlonsrh-2026-taches-supprimees-25',
    value: 25,
    unit: '%',
    claim:
      'Seules 25 % des entreprises déclarent avoir déjà supprimé des tâches ou étapes RH grâce à l’IA : l’effet sur l’organisation reste émergent.',
    verbatim:
      'Avez-vous supprimé des tâches/étapes RH grâce à l’IA ? Oui 25 % / Non 55 % / Je ne sais pas 20 %',
    theme: 'emploi',
    scope: 'france',
    source: { ...PARLONS_RH_2026, page: 'p.23' },
    provenance: 'primaire',
  },
  {
    id: 'parlonsrh-2026-emploi-jeunes-51',
    value: 51,
    unit: '%',
    claim:
      'Dans 51 % des entreprises, l’IA a un impact positif sur l’emploi des jeunes.',
    verbatim: 'Dans 51 % des entreprises, l’IA a un impact positif sur l’emploi des jeunes',
    theme: 'emploi',
    scope: 'france',
    source: { ...PARLONS_RH_2026, page: 'p.6' },
    provenance: 'primaire',
  },

  // === CEGOS — Baromètre 2025 développement des compétences (France) ===
  {
    id: 'cegos-2025-ia-enjeu-competences-63',
    value: 63,
    unit: '%',
    claim:
      'Pour 63 % des RH, l’IA est le premier enjeu de compétences des deux prochaines années, devant l’évolution des systèmes d’information (38 %) et la cybersécurité (35 %).',
    verbatim:
      'les enjeux compétences des 2 ans à venir … boom de l’intelligence artificielle … Intelligence artificielle (IA) 63 %',
    theme: 'competences',
    scope: 'france',
    source: { ...CEGOS, page: 'p.1' },
    provenance: 'primaire',
  },
  {
    id: 'cegos-2025-obsolescence-emplois-19',
    value: 19,
    unit: '%',
    claim:
      'Pour les RH, en moyenne 1 emploi sur 5 (19 %) court un risque d’obsolescence des compétences à horizon 3 ans.',
    verbatim:
      'Pour les RH, 1 emploi sur 5 court un risque d’obsolescence des compétences, à horizon 3 ans … En moyenne 19 %',
    theme: 'competences',
    scope: 'france',
    source: { ...CEGOS, page: 'p.1' },
    provenance: 'primaire',
  },
  {
    id: 'cegos-2025-competences-digitales-43',
    value: 43,
    unit: '%',
    claim:
      'Pour 43 % des RH, ce sont les compétences digitales des collaborateurs qui doivent impérativement être renforcées, devant les compétences transversales (38 %).',
    verbatim:
      'Pour 43 % des RH, ce sont les compétences digitales des collaborateurs qui doivent impérativement être renforcées',
    theme: 'competences',
    scope: 'france',
    source: { ...CEGOS, page: 'p.2' },
    provenance: 'primaire',
  },
  {
    id: 'cegos-2025-developpement-levier-strategique-90',
    value: 90,
    unit: '%',
    claim:
      'Le développement des compétences est jugé stratégique par 90 % des DRH (et 78 % des salariés).',
    verbatim:
      'Le développement des compétences est très largement considéré comme un levier stratégique … RH Total Oui 90% … Salariés Total Oui 78%',
    theme: 'formation',
    scope: 'france',
    source: { ...CEGOS, page: 'p.3' },
    provenance: 'primaire',
  },
  {
    id: 'cegos-2025-reconversions-90',
    value: 90,
    unit: '%',
    claim:
      '9 RH sur 10 (90 %) déclarent désormais accompagner les reconversions professionnelles, en particulier les mobilités internes.',
    verbatim:
      'Reconversions professionnelles : 9 RH sur 10 déclarent désormais les accompagner … Oui 90 %',
    theme: 'formation',
    scope: 'france',
    source: { ...CEGOS, page: 'p.10' },
    provenance: 'primaire',
  },

  // === S04 — MIT, Collaborating with AI Agents 2025 (réorganisation §5) ===
  {
    id: 's04-2025-productivite-equipe-60',
    value: 60,
    unit: '%',
    claim:
      'Dans une étude expérimentale, les équipes humain-IA ont produit 60 % de productivité en plus par travailleur, avec une qualité supérieure.',
    verbatim: 'creating 60% greater productivity per worker and higher-quality ad copy',
    theme: 'productivite',
    scope: 'usa',
    source: { ...MIT_COLLAB, page: 'Abstract' },
    provenance: 'primaire',
  },
  {
    id: 's04-2025-groupes-humain-ia-85',
    value: 85,
    unit: '%',
    claim:
      'Une revue de plus de 5 000 études montre que les groupes humain-IA surpassent les humains seuls dans 85 % des cas.',
    verbatim:
      'Vaccaro et al. (2024) shows that human-AI groups outperform humans alone in 85% of the studies.',
    theme: 'productivite',
    scope: 'monde',
    source: { ...MIT_COLLAB, page: 'Introduction', originalSource: 'Vaccaro et al., 2024' },
    provenance: 'secondaire',
  },
  {
    id: 's04-2025-ecriture-llm-40',
    value: 40,
    unit: '%',
    claim:
      'Les grands modèles de langage réduisent de 40 % le temps des tâches d’écriture professionnelle intermédiaire et en augmentent la qualité de 18 %.',
    verbatim:
      'large language models (LLMs) decreased the average time taken for mid-level professional writing tasks by 40% and increased quality by 18% (Noy and Zhang, 2023)',
    theme: 'productivite',
    scope: 'usa',
    source: { ...MIT_COLLAB, page: 'Introduction', originalSource: 'Noy & Zhang, 2023' },
    provenance: 'secondaire',
  },

  // === S14 — OCDE, Who will be the workers most affected by AI? 2024 (facteur humain §6) ===
  {
    id: 's14-2024-exposition-emploi-positif',
    value: 11.3,
    unit: 'pts',
    claim:
      'Entre 2012 et 2022, une plus forte exposition à l’IA est allée de pair avec une croissance de l’emploi plus élevée (+11,3 points) : exposition ne signifie pas destruction.',
    verbatim:
      'a one standard deviation increase in AI exposure was associated with 11.3 percentage points higher employment growth',
    theme: 'emploi',
    scope: 'ocde',
    source: { ...OCDE_WORKERS, page: 'p.28' },
    provenance: 'primaire',
  },
  {
    id: 's14-2024-risque-auto-diplome-22',
    value: 22,
    unit: '%',
    claim:
      'Le risque d’automatisation est très inégal selon le diplôme : 22 % des travailleurs peu diplômés occupent un métier à haut risque, contre 2 % des diplômés du supérieur.',
    verbatim:
      '2% of university-educated workers are in occupations at high risk of automation … and 22% of those with lower levels.',
    theme: 'exposition',
    scope: 'ocde',
    source: { ...OCDE_WORKERS, page: 'p.24' },
    provenance: 'primaire',
  },
  {
    id: 's14-2024-risque-auto-genre-12-6',
    value: 12,
    unit: '%',
    claim:
      '12 % des hommes occupent un métier à haut risque d’automatisation, contre 6 % des femmes.',
    verbatim:
      '12% of male workers are in occupations at high risk of automation vs. 6% of female workers.',
    theme: 'exposition',
    scope: 'ocde',
    source: { ...OCDE_WORKERS, page: 'p.24' },
    provenance: 'primaire',
  },
  {
    id: 's14-2024-exposition-diplomes-70',
    value: 70,
    unit: '%',
    claim:
      'Les diplômés du supérieur représentent 70 % des effectifs des métiers les plus exposés à l’IA, contre 9 % des moins exposés.',
    verbatim:
      'Tertiary-educated workers make up on average 70% of the workforce of the fifth quintile … compared to just 9% in the first quintile',
    theme: 'exposition',
    scope: 'ocde',
    source: { ...OCDE_WORKERS, page: 'p.20' },
    provenance: 'primaire',
  },
  {
    id: 's14-2024-formation-peu-qualifies-23',
    value: 23,
    unit: 'pts',
    claim:
      'Les adultes peu qualifiés ont 23 points de probabilité de moins de se former que les autres : l’accès à la formation est un enjeu d’équité face à l’IA.',
    verbatim:
      'Adults with low skills … are 23 percentage points less likely to train than those with medium/higher skills (OECD, 2019)',
    theme: 'formation',
    scope: 'ocde',
    source: { ...OCDE_WORKERS, page: 'p.39', originalSource: 'OCDE, 2019' },
    provenance: 'secondaire',
  },
];

// ---------------------------------------------------------------------------
// Aides de sélection (utilisées par la génération — Tranche 4).
// ---------------------------------------------------------------------------

/** Toutes les statistiques d'un thème donné. */
export const statsByTheme = (theme: StatTheme): StatEntry[] =>
  statbank.filter((s) => s.theme === theme);

/** Toutes les statistiques d'un périmètre donné. */
export const statsByScope = (scope: StatScope): StatEntry[] =>
  statbank.filter((s) => s.scope === scope);

/** Statistiques « France » + « monde » primaires : socle sûr pour le freemium. */
export const coreFrenchAndGlobalStats = (): StatEntry[] =>
  statbank.filter(
    (s) =>
      s.provenance === 'primaire' &&
      (s.scope === 'france' || s.scope === 'monde'),
  );

/** Statistiques du socle des 11 sources validé (S01…S14). */
export const socleStats = (): StatEntry[] =>
  statbank.filter((s) => s.source.inSocle);

/** Statistiques de la couche France complémentaire (FR1…FR4, hors socle). */
export const franceLayerStats = (): StatEntry[] =>
  statbank.filter((s) => !s.source.inSocle);

/** Statistiques d'une source donnée, par son code (`'S06'`, `'FR2'`…). */
export const statsBySource = (sourceId: string): StatEntry[] =>
  statbank.filter((s) => s.source.sourceId === sourceId);

/** Index par id pour citation/vérification rapide. */
export const statById: Record<string, StatEntry> = Object.fromEntries(
  statbank.map((s) => [s.id, s]),
);
