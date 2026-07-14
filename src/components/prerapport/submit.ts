import type { PreRapportForm } from '../../types/prerapport';
import { normalizePhone } from './validation';

export interface SubmitResult {
  ok: boolean;
  /** Id du lead créé (présent si `ok`) — sert à rejoindre la page de résultat. */
  leadId?: string;
  /** Message d'erreur à afficher si `ok` est faux. */
  error?: string;
}

const ENDPOINT = '/.netlify/functions/submit-prerapport';

/**
 * Soumission du pré-rapport (Tranche 2).
 *
 * Envoie le formulaire en `multipart/form-data` à la Netlify function
 * `submit-prerapport`, qui valide, stocke le lead dans Supabase (+ upload de la
 * plaquette) et déclenchera la génération asynchrone (Tranche 4). Le front ne
 * touche jamais Supabase en direct : tout transite par la function.
 */
export async function submitPreRapport(form: PreRapportForm, honeypot = ''): Promise<SubmitResult> {
  const fd = new FormData();
  fd.set('secteurActivite', form.secteurActivite);
  fd.set('produitsServices', form.produitsServices);
  fd.set('clients', form.clients);
  fd.set('famillesMetiers', JSON.stringify(form.famillesMetiers));
  fd.set('siteUrl', form.siteUrl);
  fd.set('siret', form.siret.replace(/\s/g, ''));
  fd.set('prenom', form.prenom);
  fd.set('nom', form.nom);
  fd.set('entreprise', form.entreprise);
  fd.set('fonction', form.fonction);
  fd.set('telephone', normalizePhone(form.telephone));
  fd.set('email', form.email);
  fd.set('consentRgpd', String(form.consentRgpd));
  // Champ-piège anti-bot (honeypot) : un humain ne le remplit jamais.
  fd.set('company_website_hp', honeypot);
  if (form.plaquette) fd.set('plaquette', form.plaquette);
  // NB : ne pas fixer le header Content-Type — le navigateur ajoute le boundary.

  try {
    const res = await fetch(ENDPOINT, { method: 'POST', body: fd });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, error: data?.error ?? `Une erreur est survenue (${res.status}). Réessayez.` };
    }
    const data = (await res.json().catch(() => null)) as { leadId?: string } | null;
    return { ok: true, leadId: data?.leadId };
  } catch {
    return { ok: false, error: 'Connexion impossible. Vérifiez votre réseau et réessayez.' };
  }
}
