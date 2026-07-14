import type { ContactForm, ContactErrors } from '../../types/contact';
import {
  FONCTION_AUTRE,
  FONCTIONS,
  SECTEURS,
  EFFECTIFS,
  MATURITES,
  PRE_DIAGNOSTICS,
  PRIORITES,
  HORIZONS,
  MAX_MESSAGE_LEN,
} from '../../data/contact';
// Réutilise les règles d'identité/contact du wizard pour éviter toute dérive :
// même regex email/téléphone, même normalisation, même plafond de longueur.
import { EMAIL_RE, PHONE_RE, MAX_IDENTITY_LEN, normalizePhone } from '../prerapport/validation';

/** Appartenance à une liste close (les `<select>` la garantissent côté client ;
 *  côté serveur on ne fait jamais confiance au payload, d'où ce contrôle). */
const oneOf = (value: string, allowed: readonly string[]): boolean => allowed.includes(value);

/**
 * Valide la fiche contact en entier. Renvoie un objet d'erreurs (vide = valide).
 * Comprehensive à dessein : required + format + appartenance + longueur, pour
 * servir à la fois de garde-fou UX (client) et de validation d'API (serveur).
 */
export function validateContact(f: ContactForm): ContactErrors {
  const e: ContactErrors = {};

  // --- Identité ---
  if (!f.prenom.trim()) e.prenom = 'Votre prénom est requis.';
  else if (f.prenom.length > MAX_IDENTITY_LEN) e.prenom = 'Prénom trop long.';

  if (!f.nom.trim()) e.nom = 'Votre nom est requis.';
  else if (f.nom.length > MAX_IDENTITY_LEN) e.nom = 'Nom trop long.';

  if (!f.email.trim()) e.email = 'Votre email est requis.';
  else if (!EMAIL_RE.test(f.email.trim())) e.email = 'Cet email semble invalide.';

  if (!f.fonction) e.fonction = 'Indiquez votre fonction.';
  else if (!oneOf(f.fonction, FONCTIONS)) e.fonction = 'Fonction invalide.';

  // Précision requise uniquement si « Autre (préciser) ».
  if (f.fonction === FONCTION_AUTRE) {
    if (!f.fonctionAutre.trim()) e.fonctionAutre = 'Précisez votre fonction.';
    else if (f.fonctionAutre.length > MAX_IDENTITY_LEN) e.fonctionAutre = 'Précision trop longue.';
  }

  if (!f.entreprise.trim()) e.entreprise = 'Le nom de votre entreprise est requis.';
  else if (f.entreprise.length > MAX_IDENTITY_LEN) e.entreprise = 'Nom d’entreprise trop long.';

  if (f.telephone.trim() && !PHONE_RE.test(normalizePhone(f.telephone))) {
    e.telephone = 'Ce numéro semble invalide (ex. 06 12 34 56 78).';
  }

  // --- Contexte ---
  if (!f.secteur) e.secteur = 'Sélectionnez votre secteur.';
  else if (!oneOf(f.secteur, SECTEURS)) e.secteur = 'Secteur invalide.';

  if (!f.effectif) e.effectif = 'Sélectionnez votre effectif.';
  else if (!oneOf(f.effectif, EFFECTIFS)) e.effectif = 'Effectif invalide.';

  if (!f.maturiteIa) e.maturiteIa = 'Situez votre maturité IA.';
  else if (!oneOf(f.maturiteIa, MATURITES)) e.maturiteIa = 'Valeur de maturité invalide.';

  // --- Besoin ---
  if (!f.preDiagnostic) e.preDiagnostic = 'Indiquez si le pré-diagnostic est fait.';
  else if (!oneOf(f.preDiagnostic, PRE_DIAGNOSTICS)) e.preDiagnostic = 'Réponse invalide.';

  if (!f.priorite) e.priorite = 'Sélectionnez votre priorité.';
  else if (!oneOf(f.priorite, PRIORITES)) e.priorite = 'Priorité invalide.';

  if (!f.horizon) e.horizon = 'Sélectionnez votre horizon.';
  else if (!oneOf(f.horizon, HORIZONS)) e.horizon = 'Horizon invalide.';

  if (f.message.length > MAX_MESSAGE_LEN) e.message = 'Message trop long, merci de résumer.';

  return e;
}
