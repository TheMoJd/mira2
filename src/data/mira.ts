import type { MiraData } from './types';

const mira: MiraData = {
  brand: {
    name: "MIRA",
    full: "Mapping des Impacts et des Risques IA",
    tagline: "L'IA redessine la carte des compétences. MIRA donne la boussole.",
    cta: "Commencer le pré-diagnostic offert",
    ctaSub: "Profilage en 10 minutes · sans engagement",
    ctaContact: "Découvrir le parcours MIRA",
  },

  nav: [
    { label: "Le produit", href: "#produit" },
    { label: "Le parcours", href: "#methode" },
    { label: "Feuille de route", href: "#lectures" },
    { label: "Accompagnement", href: "#tarifs" },
    { label: "Conformité", href: "#conformite" },
  ],

  hero: {
    eyebrow: "Diagnostic RH-IA · v1.0",
    h1a: "L'IA redessine la carte des compétences,",
    h1b: "MIRA donne la boussole.",
    sub: "MIRA est la plateforme d'accompagnement qui aide les organisations à anticiper, mesurer et piloter l'impact de l'IA sur leurs métiers et leurs compétences, du premier diagnostic jusqu'à la transformation.",
  },

  refs: ["OCDE", "McKinsey Global Institute", "World Economic Forum", "France Stratégie", "MIT Work of the Future"],
  refsLead: "Socle de connaissance croisé en continu avec les meilleurs rapports sectoriels",

  stats: [
    { value: 63, suffix: " %", label: "des employeurs jugent le déficit de compétences comme leur principal frein à la transformation d'ici 2030", tone: "risk", source: "World Economic Forum · Future of Jobs Report 2025" },
    { value: 39, suffix: " %", label: "des compétences actuelles seront transformées ou obsolètes d'ici 2030", tone: "amber", source: "World Economic Forum · Future of Jobs Report 2025" },
    { value: 92, suffix: " M", label: "d'emplois menacés de disparition dans le monde d'ici 2030 (sur 170 M créés)", tone: "violet", source: "World Economic Forum · Future of Jobs Report 2025" },
    { value: 21, suffix: " M", label: "de salariés du privé en France, soumis à l'entretien professionnel obligatoire", tone: "cyan", source: "INSEE, 2024" },
  ],

  phases: [
    {
      n: "01",
      tag: "Disponible · Offert",
      title: "Étape 1 · Pré-diagnostic",
      role: "Situez votre exposition à l'IA.",
      body: "À partir de votre secteur, de votre taille et de vos familles de métiers, MIRA vous offre un pré-diagnostic structuré : intensité d'exposition à l'IA de chaque famille de métiers, nature de l'impact (automatisation, augmentation ou création) et compétences montantes et déclinantes. Chaque donnée du rapport est rattachée à une source identifiée : recherche internationale (OIT, OCDE, WEF) et données officielles françaises (INSEE, LaborIA). Aucune donnée interne n'est requise à ce stade.",
      points: ["Cartographie macro des métiers de votre secteur", "1 rapport de référence intégré", "Synthèse des risques sectoriels"],
      cta: { label: "Commencer le pré-diagnostic offert", href: "/pre-rapport", primary: true },
    },
    {
      n: "02",
      tag: "Parcours MIRA",
      title: "Étape 2 · Cartographie des compétences",
      role: "Construisez votre cartographie dynamique des compétences",
      body: "La cartographie MIRA densifie, affine et clarifie la lecture de vos métiers jusqu'à la compétence. À travers des questions calibrées par profil de poste, adaptées à la trajectoire individuelle et contextualisées par les dynamiques IA du secteur, la récolte des données s'inscrit dans vos temps RH existants (entretiens, GEPP, plan de développement des compétences). De cette matière, MIRA produit une cartographie de vos compétences au niveau systémique et individuel de votre organisation.",
      points: ["Calibré sur le profil de poste", "Co-construit avec experts RH & GPEC", "Analyse fine, agrégée, anonymisée"],
      cta: { label: "Découvrir le parcours MIRA", href: "#tarifs" },
    },
    {
      n: "03",
      tag: "Parcours MIRA",
      title: "Étape 3 · Transformation des métiers",
      role: "Pilotez la transformation avec une feuille de route opérationnelle.",
      body: "Vous passez du constat à la trajectoire. MIRA accompagne la traduction de la cartographie en plan d'action RH : scores d'exposition par métier, matrices de risques et d'opportunités, plan de transformation RH (évolution des fiches métiers, parcours de montée en compétences, redéploiement des expertises), dialogue social outillé et actions opérationnelles avec indicateurs de suivi.",
      points: ["Scoring d'exposition par métier", "Matrices risques/opportunités", "Plan d'actions priorisés & suivi"],
      cta: { label: "Découvrir le parcours MIRA", href: "#tarifs" },
    },
  ],

  readings: [
    {
      key: "direction",
      label: "Direction & DRH",
      lead: "Vision consolidée",
      desc: "Exposition IA par filière métier, score global de vulnérabilité, cartographie des compétences à développer, préserver ou reconvertir, et recommandations stratégiques GPEC.",
      bullets: ["Score global de vulnérabilité", "Cartographie des compétences critiques", "Feuille de route de transformation"],
    },
    {
      key: "manager",
      label: "Manager & Équipe",
      lead: "Vue agrégée",
      desc: "Une lecture par équipe ou département : profils à risque, compétences manquantes, dynamiques d'adaptation collectives et prévention des ruptures d'engagement.",
      bullets: ["Profils à risque identifiés", "Compétences manquantes par équipe", "Recommandations managériales"],
    },
    {
      key: "individu",
      label: "Fiche individuelle métier",
      lead: "Trajectoire personnelle",
      desc: "Score d'exposition du poste, compétences à renforcer, activités susceptibles d'être augmentées ou automatisées, et parcours de formation adaptés au profil et aux aspirations.",
      bullets: ["Score d'exposition du poste", "Activités augmentées / automatisées", "Parcours de formation suggérés"],
    },
  ],

  diff: [
    { t: "Ancrage méthodologique", d: "Questions d'entretien co-construites avec des experts RH, GPEC et IA, pas un questionnaire générique." },
    { t: "Veille continue", d: "Mise à jour automatisée des rapports de référence (OCDE, McKinsey, WEF, France Stratégie, MIT…)." },
    { t: "Restitution tricouche", d: "Stratégique, managériale et individuelle réunies dans un seul outil." },
    { t: "Conformité native", d: "S'inscrit dans le cadre des temps RH (entretiens, GEPP, plan de développement des compétences)." },
    { t: "Indépendance totale", d: "Adossé à aucun prestataire de formation ni éditeur SIRH. Aucune recommandation intéressée." },
    { t: "Effet de lock-in", d: "Historique comparé dans le temps + données terrain accumulées, vague après vague." },
  ],

  pricing: [
    {
      name: "MIRA Discover",
      price: "Gratuit",
      sub: "Éduquer le marché, générer des prospects qualifiés",
      cta: "Lancer mon pré-rapport",
      featured: false,
      features: ["Profilage entreprise en 10 minutes", "Synthèse des risques IA sectoriels", "Pré-rapport macro de vos métiers", "1 rapport de référence intégré"],
    },
    {
      name: "MIRA Pro",
      price: "Abonnement",
      sub: "Le dispositif complet, intégré à vos entretiens",
      cta: "Parler à l'équipe",
      featured: true,
      features: ["Intégration aux entretiens annuels & professionnels", "Les 3 niveaux de rapport (direction, manager, individu)", "Référentiels IA sectoriels mis à jour en continu", "Tableau de bord DRH & suivi des plans d'action"],
    },
  ],

  tiers: [
    { range: "1 – 49 salariés", price: "24 €" },
    { range: "50 – 249 salariés", price: "18 €" },
    { range: "250 – 999 salariés", price: "12 €" },
    { range: "1 000+ salariés", price: "Sur devis" },
  ],
  tiersNote: "Prix par salarié / an. Plus le périmètre couvert est large, plus le rapport gagne en robustesse statistique.",

  compliance: [
    { t: "Loi Avenir Professionnel", d: "Le module augmenté enrichit l'entretien obligatoire sans le remplacer. Le rapport sert de preuve de bilan à 6 ans." },
    { t: "RGPD natif & IA Act", d: "Pseudonymisation des données agrégées, droit d'accès individuel, consentement explicite et DPA signé avec chaque client. Conforme à l'AI Act : usages RH documentés, transparence méthodologique, traçabilité et supervision humaine." },
    { t: "Éthique", d: "MIRA analyse des familles de métiers, mappées sur les référentiels internationaux ISCO/ESCO. Aucun salarié n'est évalué, noté ou prédit. Le dispositif est conçu pour s'inscrire dans le cadre réglementaire (RGPD, IA Act, dialogue social) et pour le respecter par construction, pas par déclaration." },
  ],

  jobs: [
    { name: "Support client", exp: 78, opp: 64 },
    { name: "Comptabilité", exp: 71, opp: 48 },
    { name: "Marketing", exp: 58, opp: 82 },
    { name: "Juridique", exp: 44, opp: 71 },
    { name: "Data / IT", exp: 36, opp: 90 },
    { name: "Direction", exp: 22, opp: 58 },
    { name: "RH", exp: 49, opp: 76 },
    { name: "Logistique", exp: 67, opp: 41 },
  ],
};

export default mira;
