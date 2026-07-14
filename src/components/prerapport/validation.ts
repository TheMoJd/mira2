import type { PreRapportForm, PreRapportErrors } from '../../types/prerapport';

export const STEP_COUNT = 5;

/** Règles partagées client/serveur : `submit-prerapport` importe les MÊMES
 *  constantes pour éviter toute dérive de validation entre le wizard et l'API. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/.+\..+/i;
const SIRET_RE = /^\d{14}$/;
/** Téléphone FR (0X… ou +33X…) après normalisation. */
export const PHONE_RE = /^(?:\+33|0)[1-9]\d{8}$/;
/** Longueur max des champs d'identité (prénom, nom, entreprise, fonction) — garde
 *  anti-abus, appliquée en `maxLength` côté wizard et en 422 côté serveur. */
export const MAX_IDENTITY_LEN = 120;

/** Normalise un téléphone saisi : retire espaces, points, tirets et parenthèses,
 *  puis replie les conventions internationales « +33 (0)6… » et « 0033… » sur « +336… ». */
export function normalizePhone(raw: string): string {
  return raw
    .replace(/[\s.\-()]/g, '')
    .replace(/^0033/, '+33')
    .replace(/^\+330/, '+33');
}

/** Validation d'une étape donnée. Renvoie un objet d'erreurs (vide = valide).
 *  Les champs optionnels ne sont validés que s'ils sont renseignés. */
export function validateStep(step: number, f: PreRapportForm): PreRapportErrors {
  const e: PreRapportErrors = {};

  switch (step) {
    case 0:
      if (!f.secteurActivite.trim()) e.secteurActivite = 'Décrivez en quelques mots votre secteur et votre activité.';
      if (f.siret.trim() && !SIRET_RE.test(f.siret.replace(/\s/g, ''))) e.siret = 'Le SIRET doit comporter 14 chiffres.';
      break;
    case 1:
      if (!f.produitsServices.trim()) e.produitsServices = 'Indiquez vos produits ou services.';
      if (!f.clients.trim()) e.clients = 'Indiquez qui sont vos clients.';
      break;
    case 2:
      if (f.famillesMetiers.length === 0) e.famillesMetiers = 'Ajoutez au moins une famille de métiers.';
      break;
    case 3:
      if (f.siteUrl.trim() && !URL_RE.test(f.siteUrl.trim())) e.siteUrl = 'URL invalide (ex. https://votre-entreprise.fr).';
      break;
    case 4:
      if (!f.prenom.trim()) e.prenom = 'Votre prénom est requis.';
      if (!f.nom.trim()) e.nom = 'Votre nom est requis.';
      // Entreprise + fonction obligatoires depuis les retours CEO/CTO du 13/07.
      if (!f.entreprise.trim()) e.entreprise = 'Le nom de votre entreprise est requis.';
      if (!f.fonction.trim()) e.fonction = 'Votre fonction est requise.';
      if (f.telephone.trim() && !PHONE_RE.test(normalizePhone(f.telephone))) {
        e.telephone = 'Ce numéro semble invalide (ex. 06 12 34 56 78).';
      }
      if (!f.email.trim()) e.email = 'Votre email est requis.';
      else if (!EMAIL_RE.test(f.email.trim())) e.email = 'Cet email semble invalide.';
      if (!f.consentRgpd) e.consentRgpd = 'Le consentement est nécessaire pour générer votre pré-diagnostic.';
      break;
  }

  return e;
}
