/** Modèle de données de la fiche contact (« analyse complète / parcours MIRA »).
 *
 *  Comme `PreRapportForm`, cette forme est le contrat d'entrée partagé avec le
 *  backend : la function `submit-contact` reçoit ce même objet (en JSON). Garder
 *  ce type comme source de vérité.
 */
export interface ContactForm {
  // --- Bloc identité ---
  /** Prénom — requis. */
  prenom: string;
  /** Nom — requis. */
  nom: string;
  /** Email professionnel — requis (canal de réponse). */
  email: string;
  /** Fonction — requise (une valeur de `FONCTIONS`). */
  fonction: string;
  /** Précision libre quand `fonction === FONCTION_AUTRE` (sinon vide). */
  fonctionAutre: string;
  /** Entreprise — requise. */
  entreprise: string;
  /** Téléphone — optionnel. */
  telephone: string;

  // --- Bloc contexte ---
  /** Secteur d'activité — requis (une valeur de `SECTEURS`). */
  secteur: string;
  /** Tranche d'effectif — requise (une valeur de `EFFECTIFS`). */
  effectif: string;
  /** Maturité IA 1 à 10 — requise (stockée en chaîne côté formulaire). */
  maturiteIa: string;

  // --- Bloc besoin ---
  /** Pré-diagnostic déjà réalisé ? — requis (une valeur de `PRE_DIAGNOSTICS`). */
  preDiagnostic: string;
  /** Priorité — requise (une valeur de `PRIORITES`). */
  priorite: string;
  /** Horizon — requis (une valeur de `HORIZONS`). */
  horizon: string;
  /** Contexte en quelques mots — optionnel. */
  message: string;

  // --- Opt-in ---
  /** Abonnement veille MIRA — optionnel, non pré-coché. */
  newsletter: boolean;
}

/** Erreurs de validation, indexées par champ. */
export type ContactErrors = Partial<Record<keyof ContactForm, string>>;

export const emptyContactForm: ContactForm = {
  prenom: '',
  nom: '',
  email: '',
  fonction: '',
  fonctionAutre: '',
  entreprise: '',
  telephone: '',
  secteur: '',
  effectif: '',
  maturiteIa: '',
  preDiagnostic: '',
  priorite: '',
  horizon: '',
  message: '',
  newsletter: false,
};
