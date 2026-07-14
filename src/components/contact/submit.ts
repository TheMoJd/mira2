import type { ContactForm } from '../../types/contact';
import { normalizePhone } from '../prerapport/validation';

export interface ContactSubmitResult {
  ok: boolean;
  /** Message d'erreur à afficher si `ok` est faux. */
  error?: string;
}

const ENDPOINT = '/.netlify/functions/submit-contact';

/**
 * Soumission de la fiche contact.
 *
 * Envoie le formulaire en JSON à la Netlify function `submit-contact`, qui
 * valide côté serveur, insère la demande dans Supabase et notifie l'équipe par
 * email. Le front ne touche jamais Supabase en direct : tout transite par la
 * function (clé `service_role`, jamais exposée au navigateur).
 */
export async function submitContact(form: ContactForm, honeypot = ''): Promise<ContactSubmitResult> {
  const payload = {
    ...form,
    telephone: normalizePhone(form.telephone),
    // Champ-piège anti-bot (honeypot) : un humain ne le remplit jamais.
    company_website_hp: honeypot,
  };

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, error: data?.error ?? `Une erreur est survenue (${res.status}). Réessayez.` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Connexion impossible. Vérifiez votre réseau et réessayez.' };
  }
}
