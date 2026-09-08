/**
 * RAPPORT DE RÉFÉRENCE CONFORME — fixture de test
 * ===============================================
 *
 * ⚠️ Ce n'est PAS un échantillon généré : la prose est **écrite à la main** pour
 * servir de cible de conformité. Les échantillons issus de vrais appels OpenAI
 * vivent dans `docs/samples/` (voir `scripts/generate-samples.ts`).
 *
 * À quoi ça sert. Les contrôles V1 → V12 de `reportValidation.ts` sont sévères :
 * budgets de mots, un marqueur par phrase chiffrée, un chiffre une seule fois,
 * liste fermée par section, vocabulaire proscrit. Un jeu de règles sévère peut être
 * *impossible* à satisfaire, et le code ne le dirait pas : il marquerait chaque
 * rapport pour relecture, indéfiniment. Cette fixture est la preuve que le contrat
 * est satisfaisable : un rapport bien formé doit passer les douze contrôles avec
 * **zéro échec bloquant**.
 *
 * Elle sert aussi de cible lisible pour l'équipe : c'est à ça que doit ressembler
 * la sortie du modèle après la refonte des prompts.
 *
 * Cas retenu, sur données réelles (INSEE Sirene) : un réseau coopératif de
 * distribution de produits biologiques, trois familles de métiers déclarées, dont
 * deux que le socle public ne documente pas directement. C'est le cas honnête, pas
 * le cas facile.
 */

import type { CorpsOutput, SyntheseOutput } from '../reportSchema';
import type { ReportRenderContext } from '../reportHtml';

/** Contexte de rendu, aligné sur l'enrichissement réel du SIRET 38289175200299. */
export const CONTEXTE_CONFORME: ReportRenderContext = {
  nomEntreprise: 'Biocoop',
  secteurDeclare:
    'Réseau coopératif de distribution de produits biologiques : centrale d’achat et magasins spécialisés en alimentation bio en France.',
  nafLibelle: 'Commerce de gros de fruits et légumes',
  nafCode: '46.17A',
  effectifTranche: '1 000 à 1 999 salariés',
  categorieEntreprise: 'ETI (entreprise de taille intermédiaire)',
  localisation: 'PARIS (75)',
  famillesLabels: [
    'Vente & commerce',
    'Transport & logistique',
    'Comptabilité, paie & gestion des données',
  ],
  dateRapport: '8 septembre 2026',
};

/** Le corps du rapport, tel que le premier appel doit le renvoyer. */
export const CORPS_CONFORME: CorpsOutput = {
  sections: [
    {
      id: 'perimetre',
      titre: 'Périmètre',
      contenu: [
        {
          intertitre: null,
          paragraphes: [
            'Entreprise analysée : Biocoop, réseau coopératif de distribution de produits biologiques.',
            'Secteur normalisé : commerce de gros de fruits et légumes, code 46.17A.',
            'Catégorie et effectif : entreprise de taille intermédiaire, tranche de 1 000 à 1 999 salariés, siège à Paris.',
            'Familles de métiers analysées : vente et commerce, transport et logistique, comptabilité et paie et gestion des données.',
            'Socle mobilisé : socle public de rapports de référence internationaux et français, daté 2023-2026.',
            'Ce rapport porte sur ces trois familles de métiers. Il ne porte ni sur vos données internes, ni sur un salarié en particulier.',
            'Date du rapport : 8 septembre 2026.',
          ],
        },
      ],
      sources_citees: [],
      familles: null,
    },
    {
      id: 'contexte',
      titre: 'Le contexte en bref',
      contenu: [
        {
          intertitre: 'Les capacités des systèmes actuels restent mesurées',
          paragraphes: [
            'Les systèmes d’intelligence artificielle les plus avancés se situent entre les niveaux 2 et 3 sur cinq des échelles de capacités de l’organisation qui les évalue [[ocde-2025-capability-levels-2-3]].',
            'Autrement dit, ces systèmes traitent bien le langage et les tâches formalisées, beaucoup moins le raisonnement long ou la manipulation physique. Dans ce rapport, l’exposition d’un métier désigne la part de ses tâches qui présente des caractéristiques que l’IA sait aujourd’hui traiter, sans rien dire du nombre de postes concernés.',
          ],
        },
        {
          intertitre: 'L’usage est déjà installé chez les actifs français',
          paragraphes: [
            'En France, 53 % des actifs déclarent avoir déjà utilisé l’IA au travail [[centreinffo-2025-actifs-ia-travail-53]].',
            'L’outil entre donc dans le travail réel par les personnes elles-mêmes, souvent avant tout projet d’équipe. Cela déplace la question de la décision d’équipement vers celle des pratiques déjà en cours.',
          ],
        },
        {
          intertitre: 'Le cadre collectif suit plus lentement que la pratique',
          paragraphes: [
            'En France, seules 34 % des organisations disposent d’une politique encadrant l’IA [[parlonsrh-2026-politique-encadrant-ia-34]].',
            'L’écart entre une pratique individuelle largement répandue et un cadre écrit encore minoritaire est le fait marquant de la période. Il concerne la traçabilité des données manipulées autant que l’homogénéité des méthodes de travail entre équipes. Une même tâche peut ainsi être traitée de trois façons différentes dans trois services, sans que personne ne l’ait décidé. C’est cet écart que les trois sections suivantes déclinent famille par famille.',
          ],
        },
      ],
      sources_citees: [
        'ocde-2025-capability-levels-2-3',
        'centreinffo-2025-actifs-ia-travail-53',
        'parlonsrh-2026-politique-encadrant-ia-34',
      ],
      familles: null,
    },
    {
      id: 'familles-metiers',
      titre: 'Vos familles de métiers face à l’IA',
      contenu: [
        {
          intertitre: null,
          paragraphes: [
            'Trois familles ont été déclarées : vente et commerce, transport et logistique, comptabilité et paie et gestion des données. D’après le socle public, c’est la famille comptable et administrative qui est la plus exposée des trois, et de loin.',
          ],
        },
      ],
      sources_citees: [
        'wef-2025-tasks-humans-alone-47',
        'mckinsey-2017-physique-previsible-90',
        'ilo-2023-clerical-exposure-82',
        'mit-2025-iceberg-hidden-5x',
      ],
      familles: [
        {
          famille: 'Vente & commerce',
          exposition: 'à confirmer',
          natures: ['augmentation'],
          part_taches: null,
          explication:
            'Le socle public ne documente pas précisément la vente en magasin spécialisé, et l’exposition de cette famille reste à confirmer. Le repère le plus proche porte sur la répartition du travail elle-même : à l’échelle mondiale, 47 % des tâches sont aujourd’hui réalisées par des humains seuls, 22 % par la technologie et 30 % en combinant les deux [[wef-2025-tasks-humans-alone-47]]. Ce qui bouge d’abord dans vos métiers de vente relève de cette part combinée, autour de la préparation du conseil client et de la connaissance produit. Le contact en rayon et la relation de confiance avec le client restent, eux, des tâches humaines.',
        },
        {
          famille: 'Transport & logistique',
          exposition: 'à confirmer',
          natures: ['automatisation', 'augmentation'],
          part_taches: null,
          explication:
            'Le socle public documente le travail physique par grandes catégories, pas la logistique alimentaire en tant que telle, et l’exposition de cette famille reste à confirmer. À l’échelle mondiale, les métiers à forte composante d’activités physiques répétitives en environnement prévisible présentent un potentiel technique d’automatisation pouvant atteindre 90 % [[mckinsey-2017-physique-previsible-90]]. Ce repère porte sur l’automatisation technique des gestes, robotique comprise, et non sur l’IA générative seule. Pour vos métiers de transport et de logistique, cela concerne surtout la planification des tournées et le suivi des flux, moins la conduite et la manutention en entrepôt.',
        },
        {
          famille: 'Comptabilité, paie & gestion des données',
          exposition: 'élevée',
          natures: ['automatisation', 'augmentation'],
          part_taches: 'jusqu’à 82 %',
          explication:
            'La famille comptable et administrative est la plus exposée des trois, et le socle public la documente directement. À l’échelle mondiale, le travail administratif est le plus exposé à l’IA générative, avec 82 % de ses tâches exposées à un niveau supérieur à la moyenne [[ilo-2023-clerical-exposure-82]]. Aux États-Unis, l’exposition réelle de ces métiers est cinq fois plus grande que l’adoption visible [[mit-2025-iceberg-hidden-5x]]. Pour vos équipes comptables, cela déplace le travail de la saisie et du rapprochement vers le contrôle, l’interprétation des écarts et la relation avec les magasins du réseau.',
        },
      ],
    },
    {
      id: 'competences',
      titre: 'Compétences : ce qui monte, ce qui décline',
      contenu: [
        {
          intertitre: 'Le contenu des métiers se transforme plus vite que les intitulés',
          paragraphes: [
            'À l’échelle mondiale, 39 % des compétences actuelles des travailleurs seront transformées ou deviendront obsolètes entre 2025 et 2030 [[wef-2025-skills-transformed-39]]. Sur le même horizon, 59 % des travailleurs auraient besoin d’une formation, et 11 % risqueraient de ne pas y avoir accès [[wef-2025-need-training-59]].',
            'Ces deux chiffres portent sur des populations mondiales, pas sur vos équipes. Ils décrivent un rythme de renouvellement du contenu du travail, pas une disparition de métiers.',
          ],
        },
        {
          intertitre: 'Ce qui se renforce dans vos trois familles',
          paragraphes: [
            'Lecture et contestation d’un résultat produit par un outil, sur une balance comptable comme sur une prévision de commande.',
            'Contrôle de cohérence des données produit et fournisseur, en amont plutôt qu’en correction.',
            'Conseil client appuyé sur la connaissance de la filière et de la traçabilité des produits.',
            'Formulation écrite d’une consigne à un outil, en vente comme en gestion.',
          ],
        },
        {
          intertitre: 'Ce qui recule dans vos trois familles',
          paragraphes: [
            'Saisie manuelle des factures fournisseurs et des écritures répétitives.',
            'Rapprochement ligne à ligne des livraisons et des commandes.',
            'Production de tableaux de suivi à la main, magasin par magasin.',
            'Recherche d’une information produit dans plusieurs fichiers séparés.',
          ],
        },
        {
          intertitre: 'Ce que cela change pour l’employabilité',
          paragraphes: [
            'Un salarié dont le poste reposait surtout sur la saisie voit la valeur de son travail se déplacer vers le contrôle et l’explication. C’est une recomposition du contenu de l’emploi, observable dès aujourd’hui dans les métiers administratifs.',
          ],
        },
      ],
      sources_citees: ['wef-2025-skills-transformed-39', 'wef-2025-need-training-59'],
      familles: null,
    },
    {
      id: 'reorganisation',
      titre: 'Comment le travail se réorganise',
      contenu: [
        {
          intertitre: 'Les gains mesurés viennent de conditions expérimentales',
          paragraphes: [
            'Aux États-Unis, dans une étude expérimentale, les équipes associant humains et IA ont produit 60 % de productivité en plus par travailleur [[s04-2025-productivite-equipe-60]].',
            'Ce résultat vaut pour le protocole observé, avec ses tâches et ses participants. Il ne décrit ni un gain acquis pour une entreprise, ni un rendement transposable à une organisation en place.',
          ],
        },
        {
          intertitre: 'La frontière entre exécution et contrôle se déplace',
          paragraphes: [
            'À l’échelle mondiale, peu de métiers sont entièrement automatisables, mais 60 % des métiers ont au moins 30 % de leurs activités techniquement automatisables [[mckinsey-2017-occupations-30pct-60]].',
            'Dans vos familles déclarées, cette part concerne surtout les tâches de saisie, de rapprochement et de reporting. Le travail qui subsiste sur ces mêmes postes est un travail de vérification, d’arbitrage sur les cas d’exception et de dialogue avec les magasins. La répartition des tâches entre gestion et logistique s’en trouve modifiée avant l’organigramme.',
          ],
        },
      ],
      sources_citees: ['s04-2025-productivite-equipe-60', 'mckinsey-2017-occupations-30pct-60'],
      familles: null,
    },
    {
      id: 'facteur-humain',
      titre: 'Le facteur humain',
      contenu: [
        {
          intertitre: 'Le risque d’automatisation se distribue selon le diplôme',
          paragraphes: [
            'Dans les pays de l’OCDE, 22 % des travailleurs peu diplômés occupent un métier à haut risque d’automatisation [[s14-2024-risque-auto-diplome-22]].',
            'Cette donnée porte sur des populations nationales, pas sur vos salariés. Elle situe une question d’équité interne plutôt qu’une fatalité, et elle ne désigne aucune personne.',
          ],
        },
        {
          intertitre: 'L’accès à la formation suit la même pente',
          paragraphes: [
            'Dans les pays de l’OCDE, les adultes peu qualifiés ont 23 points de probabilité de moins de se former que les autres [[s14-2024-formation-peu-qualifies-23]].',
            'Les deux constats se cumulent : les populations les plus exposées sont aussi celles qui accèdent le moins à la formation. La relation entre exposition et croissance de l’emploi, évoquée plus haut, ne se distribue donc pas uniformément dans un effectif.',
          ],
        },
        {
          intertitre: 'Le commerce reste un domaine créateur d’emplois en France',
          paragraphes: [
            'En France, le commerce fait partie des domaines créant le plus d’emplois nets d’ici 2030, entre 200 000 et 300 000 créations [[dares-2030-commerce-creations-200-300k]].',
            'Cette projection est antérieure à la diffusion de l’IA générative et décrit une dynamique d’emploi, pas une exposition. Elle éclaire le contexte de recrutement de vos métiers de vente.',
          ],
        },
      ],
      sources_citees: [
        's14-2024-risque-auto-diplome-22',
        's14-2024-formation-peu-qualifies-23',
        'dares-2030-commerce-creations-200-300k',
      ],
      familles: null,
    },
    {
      id: 'repere-sectoriel',
      titre: 'Votre secteur en repère',
      contenu: [
        {
          intertitre: 'Le socle public ne documente pas le bio spécialisé',
          paragraphes: [
            'Aucune donnée du socle ne porte sur la distribution alimentaire spécialisée en tant que telle. Le repère français le plus proche porte sur le tertiaire dans son ensemble : en France, près d’un tiers de l’activité professionnelle du secteur tertiaire est exposé à l’IA générative [[neobrain-2024-tertiaire-france-expose-33]].',
            'Vos fonctions de gestion et de commerce relèvent de ce périmètre tertiaire. Vos activités d’entrepôt et de transport en sortent, et ne sont pas décrites par ce chiffre.',
          ],
        },
        {
          intertitre: 'L’adoption réelle reste très en dessous du discours',
          paragraphes: [
            'Dans les pays de l’OCDE, seules 8 % des entreprises utilisaient l’IA en moyenne en 2023 [[ocde-2024-adoption-moyenne-8]].',
            'L’écart avec la pratique individuelle des actifs, déjà décrite plus haut, situe l’essentiel de la transformation à l’intérieur des organisations et non dans l’équipement.',
          ],
        },
        {
          intertitre: 'La taille de l’entreprise pèse sur l’adoption',
          paragraphes: [
            'Dans les pays de l’OCDE, les entreprises de plus de 250 salariés affichent souvent une part d’utilisateurs de l’IA presque deux fois supérieure à celle des petites structures [[ocde-2024-grandes-entreprises-2x]].',
            'Avec une tranche de 1 000 à 1 999 salariés, votre organisation se situe du côté des structures où l’adoption est la plus fréquente. Le fonctionnement en réseau coopératif ajoute une nuance que le socle ne décrit pas : les pratiques peuvent diverger d’un magasin sociétaire à l’autre.',
          ],
        },
      ],
      sources_citees: [
        'neobrain-2024-tertiaire-france-expose-33',
        'ocde-2024-adoption-moyenne-8',
        'ocde-2024-grandes-entreprises-2x',
      ],
      familles: null,
    },
    {
      id: 'lecture-strategique',
      titre: 'Lecture stratégique : les questions que cela pose',
      contenu: [
        {
          intertitre: null,
          paragraphes: [
            'Les constats du rapport se concentrent sur un point : dans vos trois familles déclarées, c’est la famille comptable et administrative que le socle public documente le mieux, et c’est aussi la plus exposée. Vos métiers de vente et de logistique sont moins documentés, ce qui est un constat sur les sources et non sur ces métiers. L’usage individuel de l’IA est installé chez les actifs français alors que le cadre écrit reste minoritaire, et cet écart traverse toute l’organisation.',
          ],
        },
        {
          intertitre: 'Questions pour la direction générale',
          paragraphes: [
            'Quelle part de la valeur produite par vos fonctions de gestion repose aujourd’hui sur des tâches de saisie et de rapprochement ?',
            'Comment les pratiques d’usage de l’IA se répartissent-elles entre la centrale et les magasins sociétaires du réseau ?',
          ],
        },
        {
          intertitre: 'Questions pour la direction des ressources humaines',
          paragraphes: [
            'Quelle part du temps de vos équipes comptables est aujourd’hui consacrée à des tâches de saisie et de contrôle ?',
            'Quelles compétences de conseil client vos vendeurs mobilisent-ils déjà, que le socle public ne documente pas ?',
            'Comment vos entretiens professionnels rendent-ils compte de cette recomposition du contenu des postes administratifs ?',
          ],
        },
      ],
      sources_citees: [],
      familles: null,
    },
  ],
};

/** La synthèse exécutive, telle que le second appel doit la renvoyer. */
export const SYNTHESE_CONFORME: SyntheseOutput = {
  section: {
    id: 'synthese-executive',
    titre: 'Synthèse exécutive',
    encart: {
      chapeau:
        'Biocoop a déclaré trois familles de métiers : vente et commerce, transport et logistique, comptabilité et paie et gestion des données. Ce rapport éclaire ce que l’état de l’art public dit de l’exposition de ces trois familles à l’intelligence artificielle.',
      chiffre_signal: {
        valeur: '82 %',
        phrase: 'des tâches administratives sont exposées à l’IA',
        source_id: 'ilo-2023-clerical-exposure-82',
      },
      points_cles: [
        {
          axe: 'exposition',
          titre: 'Le partage du travail entre humains et machines se déplace',
          texte:
            'À l’échelle mondiale, 47 % des tâches sont aujourd’hui réalisées par des humains seuls, 22 % par la technologie et 30 % en combinant les deux [[wef-2025-tasks-humans-alone-47]]. Ce qui bouge dans vos métiers relève de cette part combinée. Il s’agit d’un déplacement de tâches, pas d’une suppression de postes.',
          source_id: 'wef-2025-tasks-humans-alone-47',
        },
        {
          axe: 'concentration',
          titre: 'Vos fonctions comptables concentrent l’exposition',
          texte:
            'Des trois familles déclarées, la comptabilité et la paie et la gestion des données sont les plus exposées : à l’échelle mondiale, 82 % des tâches du travail administratif le sont à un niveau supérieur à la moyenne [[ilo-2023-clerical-exposure-82]]. La vente et la logistique sont, elles, peu documentées par le socle public.',
          source_id: 'ilo-2023-clerical-exposure-82',
        },
        {
          axe: 'competences',
          titre: 'Le contenu des postes se renouvelle plus vite que leur intitulé',
          texte:
            'À l’échelle mondiale, 39 % des compétences actuelles des travailleurs seront transformées ou deviendront obsolètes entre 2025 et 2030 [[wef-2025-skills-transformed-39]]. Dans vos fonctions de gestion, la valeur du travail se déplace de la saisie vers le contrôle et l’explication des écarts.',
          source_id: 'wef-2025-skills-transformed-39',
        },
        {
          axe: 'besoins',
          titre: 'Le besoin de formation apparaît inégalement réparti',
          texte:
            'À l’échelle mondiale, 59 % des travailleurs auraient besoin d’une formation d’ici 2030, et 11 % risqueraient de ne pas y avoir accès [[wef-2025-need-training-59]]. Ce besoin observable se concentre sur les postes les plus administratifs, qui sont aussi ceux dont le contenu bouge le plus.',
          source_id: 'wef-2025-need-training-59',
        },
      ],
    },
    contenu: [],
    sources_citees: [
      'ilo-2023-clerical-exposure-82',
      'wef-2025-tasks-humans-alone-47',
      'wef-2025-skills-transformed-39',
      'wef-2025-need-training-59',
    ],
  },
};
