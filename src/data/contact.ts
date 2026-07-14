/** Contenu (copie) de la fiche contact « analyse complète / parcours MIRA ».
 *  Même principe que `mira.ts` et `prerapport.ts` : le texte et les listes de
 *  choix vivent dans les données, pas dans le JSX. Copie validée par la CEO
 *  (retours du 13/07/2026). Les listes exportées sont la source de vérité
 *  partagée entre le rendu (`ContactForm`) et la validation (client + serveur).
 */

/** Valeur sentinelle de « Fonction » qui déclenche le champ de précision libre. */
export const FONCTION_AUTRE = 'Autre (préciser)';

/** Fonctions proposées (bloc identité). */
export const FONCTIONS = [
  'DRH',
  'Dirigeant·e / DG',
  'Responsable développement des compétences / GEPP',
  FONCTION_AUTRE,
] as const;

/** Secteurs d'activité, alignés sur les grandes sections NAF (INSEE), libellés
 *  simplifiés pour un formulaire. Catch-all en fin de liste. */
export const SECTEURS = [
  'Agriculture, sylviculture et pêche',
  'Industries extractives',
  'Industrie manufacturière',
  'Énergie (électricité, gaz)',
  'Eau, assainissement, gestion des déchets',
  'Construction',
  'Commerce, réparation automobile',
  'Transports et entreposage',
  'Hébergement et restauration',
  'Information et communication',
  'Activités financières et d’assurance',
  'Activités immobilières',
  'Activités spécialisées, scientifiques et techniques',
  'Services administratifs et de soutien',
  'Administration publique',
  'Enseignement',
  'Santé humaine et action sociale',
  'Arts, spectacles et loisirs',
  'Autres activités de services',
] as const;

/** Tranches d'effectif, seuils alignés sur les statistiques INSEE du socle. */
export const EFFECTIFS = [
  'Moins de 50',
  '50 à 249',
  '250 à 999',
  '1 000 et plus',
] as const;

/** Échelle de maturité IA 1 à 10, ancrée aux extrémités et au milieu. */
export const MATURITE_ANCRES: Record<string, string> = {
  '1': 'aucun usage structuré',
  '5': 'expérimentations en cours',
  '10': 'IA intégrée à nos processus',
};
export const MATURITES = Array.from({ length: 10 }, (_, i) => String(i + 1));

/** Avez-vous déjà réalisé le pré-diagnostic offert ? */
export const PRE_DIAGNOSTICS = ['Oui', 'Non', 'En cours'] as const;

/** Priorité principale du demandeur (bloc besoin). */
export const PRIORITES = [
  'Cartographie des compétences',
  'Feuille de route de transformation',
  'Les deux',
  'Je souhaite d’abord échanger',
] as const;

/** Horizon envisagé (bloc besoin). */
export const HORIZONS = [
  'Dès que possible',
  'Dans 3 à 6 mois',
  'Simple veille pour l’instant',
] as const;

/** Longueur max du texte libre « contexte » (garde anti-abus, cf. wizard). */
export const MAX_MESSAGE_LEN = 2000;

export const contact = {
  intro: {
    eyebrow: 'Parcours MIRA',
    title: 'Passons du pré-diagnostic à votre trajectoire.',
    sub: 'Décrivez votre contexte en deux minutes. Nous revenons vers vous pour un premier échange, sans engagement, afin de cadrer la cartographie de vos compétences et la feuille de route de transformation adaptées à votre organisation.',
  },

  blocs: {
    identite: {
      title: 'Vous',
      subtitle: 'Pour savoir à qui nous adresser et personnaliser l’échange.',
    },
    contexte: {
      title: 'Votre organisation',
      subtitle: 'Quelques repères pour préparer un échange utile dès le premier contact.',
    },
    besoin: {
      title: 'Votre besoin',
      subtitle: 'Ce que vous cherchez à obtenir, et à quel horizon.',
    },
  },

  fields: {
    prenom: { label: 'Prénom', placeholder: 'Camille' },
    nom: { label: 'Nom', placeholder: 'Durand' },
    email: {
      label: 'Email professionnel',
      placeholder: 'prenom.nom@entreprise.fr',
      hint: 'Nous y répondrons pour organiser notre échange.',
    },
    fonction: { label: 'Votre fonction' },
    fonctionAutre: {
      label: 'Précisez votre fonction',
      placeholder: 'Ex. : responsable transformation',
    },
    entreprise: { label: 'Entreprise', placeholder: 'Nom de votre organisation' },
    telephone: {
      label: 'Téléphone',
      placeholder: '06 12 34 56 78',
      hint: 'Optionnel. Uniquement pour faciliter la prise de contact.',
    },
    secteur: { label: 'Secteur d’activité' },
    effectif: { label: 'Effectif' },
    maturiteIa: {
      label: 'Votre maturité IA',
      hint: '1 : aucun usage structuré · 5 : expérimentations en cours · 10 : IA intégrée à vos processus.',
    },
    preDiagnostic: { label: 'Avez-vous réalisé le pré-diagnostic offert ?' },
    priorite: { label: 'Votre priorité' },
    horizon: { label: 'Horizon envisagé' },
    message: {
      label: 'Votre contexte en quelques mots',
      placeholder: 'Ce qui motive votre démarche, vos enjeux, vos échéances…',
    },
  },

  /** Valeur affichée en tête des listes déroulantes tant qu’aucun choix n’est fait. */
  selectPlaceholder: 'Sélectionnez…',

  /** Mention d’information sous le formulaire (RGPD). Factuelle, à valider juridiquement. */
  rgpdNotice:
    'Les informations recueillies servent uniquement à traiter votre demande de contact. Elles ne sont ni cédées ni utilisées à d’autres fins. Vous disposez d’un droit d’accès, de rectification et de suppression : contact@mira-audit.fr.',

  /** Case opt-in newsletter, séparée et non pré-cochée (RGPD). */
  newsletterOptIn:
    'Je souhaite recevoir la veille MIRA sur l’impact de l’IA sur les métiers (un email par mois, désinscription en un clic).',

  submitLabel: 'Être recontacté·e',
  submitting: 'Envoi…',
  /** Engagement de suite affiché sous le bouton. */
  engagement:
    'Nous revenons vers vous sous 48 h ouvrées pour un premier échange de 30 minutes, sans engagement.',

  success: {
    title: 'Votre demande est bien reçue',
    body: 'Merci. Nous revenons vers vous sous 48 h ouvrées. En attendant notre échange, le pré-diagnostic offert vous donne une première lecture de l’exposition de vos métiers.',
    cta: 'Commencer le pré-diagnostic offert',
  },
} as const;
