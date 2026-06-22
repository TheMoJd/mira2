import type { PreRapportForm, PreRapportErrors } from '../../types/prerapport';

export const STEP_COUNT = 5;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/.+\..+/i;
const SIRET_RE = /^\d{14}$/;

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
      if (!f.email.trim()) e.email = 'Votre email est requis.';
      else if (!EMAIL_RE.test(f.email.trim())) e.email = 'Cet email semble invalide.';
      if (!f.consentRgpd) e.consentRgpd = 'Le consentement est nécessaire pour générer le rapport.';
      break;
  }

  return e;
}
