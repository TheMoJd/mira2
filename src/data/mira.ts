import type { MiraData } from './types';

const mira: MiraData = {
  brand: {
    name: "MIRA",
    full: "Mapping des Impacts et des Risques IA",
    tagline: "L'IA redessine la carte des compétences. MIRA donne la boussole.",
    cta: "Démarrer mon pré-rapport gratuit",
    ctaSub: "Profilage en 10 minutes · sans engagement",
  },

  nav: [
    { label: "Le produit", href: "#produit" },
    { label: "Méthode", href: "#methode" },
    { label: "Les 3 lectures", href: "#lectures" },
    { label: "Tarifs", href: "#tarifs" },
    { label: "Conformité", href: "#conformite" },
  ],

  hero: {
    eyebrow: "Diagnostic RH-IA · v1.0",
    h1a: "L'IA redessine la carte des compétences,",
    h1b: "MIRA donne la boussole.",
    sub: "Le protocole de diagnostic qui permet aux organisations d'anticiper, mesurer et piloter l'impact de l'IA sur leurs ressources humaines — du score d'exposition par métier au plan de transformation actionnable.",
  },

  refs: ["OCDE", "McKinsey Global Institute", "World Economic Forum", "France Stratégie", "MIT Work of the Future"],
  refsLead: "Socle de connaissance croisé en continu avec les meilleurs rapports sectoriels",

  stats: [
    { value: 72, suffix: " %", label: "des DRH n'ont aucun outil pour mesurer l'impact de l'IA", tone: "risk", source: "Source à confirmer" },
    { value: 39, suffix: " %", label: "des compétences actuelles obsolètes ou transformées d'ici 3 ans", tone: "amber", source: "Source à confirmer" },
    { value: 85, suffix: " %", label: "des emplois de 2030 n'existent pas encore sous leur forme actuelle", tone: "violet", source: "World Economic Forum — Future of Jobs" },
    { value: 3.2, suffix: " M", decimals: 1, label: "entretiens professionnels obligatoires réalisés chaque année en France", tone: "cyan", source: "Source à confirmer" },
  ],

  phases: [
    {
      n: "01",
      tag: "Freemium",
      title: "Pré-rapport contextuel automatisé",
      role: "Lead generation + éducation du marché",
      body: "Un formulaire de profilage (secteur, taille, métiers, maturité IA) croisé avec les rapports de référence génère un pré-rapport sectoriel personnalisé : grandes vulnérabilités et opportunités IA de votre périmètre RH.",
      points: ["Cartographie macro des métiers de votre secteur", "1 rapport de référence intégré", "Synthèse des risques sectoriels"],
    },
    {
      n: "02",
      tag: "Abonnement",
      title: "Entretiens individuels augmentés",
      role: "Cœur du modèle — collecte de données terrain",
      body: "MIRA enrichit l'entretien annuel et professionnel d'un module de questions calibré par profil de poste, adapté à la trajectoire individuelle et contextualisé par les dynamiques IA du secteur.",
      points: ["Calibré sur le profil de poste", "Co-construit avec experts RH & GPEC", "Analyse fine, agrégée, anonymisée"],
    },
    {
      n: "03",
      tag: "Inclus",
      title: "Rapport final de transformation",
      role: "Le livrable stratégique visible",
      body: "Une synthèse analytique multicouche : scores d'exposition par métier, matrices de risques et d'opportunités, plan de transformation RH priorisé et actions opérationnelles avec indicateurs de suivi.",
      points: ["Scoring d'exposition par métier", "Matrice risques / opportunités", "Plan d'action priorisé & suivi"],
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
    { t: "Ancrage méthodologique", d: "Questions d'entretien co-construites avec des experts RH, GPEC et IA — pas un questionnaire générique." },
    { t: "Veille continue", d: "Mise à jour automatisée des rapports de référence (OCDE, McKinsey, WEF, France Stratégie, MIT)." },
    { t: "Restitution tricouche", d: "Stratégique, managériale et individuelle réunies dans un seul outil." },
    { t: "Conformité native", d: "S'inscrit dans le cadre des entretiens professionnels obligatoires — preuve de bilan à 6 ans." },
    { t: "Indépendance totale", d: "Adossé à aucun prestataire de formation ni éditeur SIRH. Aucune recommandation intéressée." },
    { t: "Effet de lock-in", d: "Historique comparé dans le temps + données terrain accumulées, vague après vague." },
  ],

  pricing: [
    {
      name: "MIRA Discover",
      price: "Gratuit",
      sub: "Éduquer le marché, générer des leads qualifiés",
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
    { t: "Éthique IA", d: "MIRA produit des diagnostics, jamais des décisions. Garde-fous anti-discrimination et transparence méthodologique." },
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
