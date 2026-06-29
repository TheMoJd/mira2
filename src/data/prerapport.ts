/** Contenu (copie) du wizard de pré-rapport freemium.
 *  Même principe que `mira.ts` : le texte vit dans les données, pas dans le JSX.
 *  Les questions reprennent la formulation validée par la direction. */

export const preRapport = {
  intro: {
    eyebrow: 'Pré-rapport · gratuit',
    title: 'Cartographiez l’impact de l’IA sur les métiers de votre secteur.',
    sub: 'En une dizaine de minutes, MIRA croise ce que vous nous décrivez avec les grands rapports de référence (World Economic Forum, OCDE, baromètres RH) pour produire votre pré-rapport sectoriel. Sans engagement.',
    points: [
      { t: '≈ 10 minutes', d: 'Quelques questions ouvertes sur votre activité.' },
      { t: 'Tendances de votre secteur', d: 'Risques et opportunités IA sur vos grandes familles de métiers.' },
      { t: 'Confidentiel', d: 'Vos réponses ne servent qu’à générer votre rapport.' },
    ],
    // Double accroche validée par la direction (RH vs dirigeant).
    audiences: [
      { who: 'Pour les RH', msg: 'Anticipez la transformation des compétences et la réforme des entretiens professionnels (EPP 2026).' },
      { who: 'Pour les dirigeants', msg: 'Sécurisez la pérennité de votre activité et la performance de votre entreprise face à l’IA.' },
    ],
    cta: 'Commencer',
    legal: 'Gratuit, sans engagement.',
  },

  /** Métadonnées des 5 étapes du formulaire (ordre = progression). */
  steps: [
    { id: 'entreprise', label: 'Entreprise', kicker: 'Étape 1 sur 5', title: 'Votre entreprise', subtitle: 'On commence par le contexte général de votre activité.' },
    { id: 'activite', label: 'Activité', kicker: 'Étape 2 sur 5', title: 'Votre offre', subtitle: 'Ce que vous produisez et pour qui — c’est ce qui rend votre rapport pertinent.' },
    { id: 'metiers', label: 'Métiers', kicker: 'Étape 3 sur 5', title: 'Vos grandes familles de métiers', subtitle: 'Les métiers cœur de votre activité aujourd’hui. C’est sur eux que portera la lecture sectorielle.' },
    { id: 'sources', label: 'Compléments', kicker: 'Étape 4 sur 5', title: 'Compléments (optionnel)', subtitle: 'Quelques sources publiques nous aident à affiner. Tout est facultatif.' },
    { id: 'contact', label: 'Réception', kicker: 'Étape 5 sur 5', title: 'Recevoir votre pré-rapport', subtitle: 'Nous vous envoyons le rapport complet par email dès qu’il est prêt.' },
  ],

  fields: {
    siret: {
      label: 'SIRET',
      placeholder: '14 chiffres — ex. 552 100 554 00021',
      hint: 'Optionnel. Nous aide à pré-qualifier votre établissement.',
    },
    secteurActivite: {
      label: 'Dans quel secteur opérez-vous, et que fait concrètement votre entreprise ?',
      placeholder: 'Ex. : PME du transport routier de marchandises (120 salariés). Nous assurons la livraison du dernier kilomètre pour des e-commerçants en Île-de-France.',
    },
    produitsServices: {
      label: 'Quels produits ou services proposez-vous, et quelle valeur apportent-ils à vos clients ?',
      placeholder: 'Ex. : livraison express J+1 avec suivi en temps réel et gestion des retours. Nos clients gagnent en fiabilité et réduisent leurs litiges.',
    },
    clients: {
      label: 'Qui sont vos clients ou bénéficiaires, et comment interagissez-vous avec eux ?',
      placeholder: 'Ex. : e-commerçants B2B sous contrat annuel. Relation via une plateforme de suivi et une équipe de relation client dédiée.',
    },
    famillesMetiers: {
      label: 'Quelles sont les 3 à 6 grandes familles de métiers indispensables à votre activité aujourd’hui ?',
      placeholder: 'Ex. : Conduite / livraison',
      hint: 'Sélectionnez les familles concernées (3 à 6 idéalement). Vous pouvez en ajouter une qui manque.',
    },
    siteUrl: {
      label: 'Site internet',
      placeholder: 'https://votre-entreprise.fr',
      hint: 'Optionnel. Permet d’enrichir le rapport avec votre positionnement public.',
    },
    plaquette: {
      label: 'Plaquette ou support de présentation',
      hint: 'Optionnel. PDF, PowerPoint ou Word — 4 Mo maximum.',
    },
    email: {
      label: 'Votre email professionnel',
      placeholder: 'prenom.nom@entreprise.fr',
      hint: 'Nous y enverrons votre pré-rapport. Pas de spam.',
    },
  },

  consent: 'J’accepte que MIRA utilise ces informations pour générer mon pré-rapport et me recontacter à ce sujet.',

  success: {
    title: 'Votre pré-rapport est en route',
    body: 'Nous générons votre pré-rapport sectoriel et vous l’envoyons par email dans quelques minutes. Pensez à vérifier vos courriers indésirables.',
    note: 'Une question d’ici là ? Écrivez-nous à contact@mira.ai',
    cta: 'Retour à l’accueil',
  },
} as const;
