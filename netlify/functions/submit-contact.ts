/**
 * submit-contact — Netlify Function (fiche contact « parcours MIRA »)
 * ===================================================================
 * Reçoit la fiche contact (application/json), valide côté serveur avec les
 * MÊMES règles que le client (`validateContact`), insère la demande dans
 * Supabase (`contact_requests`) puis notifie l'équipe par email. Renvoie 202.
 *
 * Sécurité : clé `service_role` (jamais exposée au navigateur). Le front ne
 * touche jamais Supabase en direct — tout passe par cette function.
 */
import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/supabase';
import type { ContactForm } from '../../src/types/contact';
import { emptyContactForm } from '../../src/types/contact';
import { FONCTION_AUTRE } from '../../src/data/contact';
import { validateContact } from '../../src/components/contact/validation';
import { normalizePhone } from '../../src/components/prerapport/validation';
import { notifyContactRequest } from './lib/email';

/** Assainit un champ libre : normalise en NFC (un client peut envoyer un accent
 *  décomposé « a + ◌̀ » que nos listes closes stockent composé « à » — sans NFC
 *  la comparaison échouerait à tort), retire les caractères de contrôle/format
 *  (retours ligne, RTL override…) et replie les espaces. Défense en profondeur :
 *  ces PII partent en base et en email, où elles seraient des vecteurs d'injection. */
const clean = (raw: unknown): string =>
  String(raw ?? '').normalize('NFC').replace(/[\p{Cc}\p{Cf}]/gu, '').replace(/\s+/g, ' ').trim();
/** Nettoie un texte multi-ligne en préservant les sauts de ligne (message libre). */
const cleanMultiline = (raw: unknown): string =>
  String(raw ?? '').normalize('NFC').replace(/[\p{Cc}\p{Cf}]/gu, (c) => (c === '\n' ? '\n' : '')).trim();

/** Anti-abus : plafond de soumissions par email sur une fenêtre glissante. */
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 heure

const json = (statusCode: number, payload: unknown) => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(payload),
});
const fail = (statusCode: number, error: string) => json(statusCode, { ok: false, error });

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return fail(405, 'Méthode non autorisée.');

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return fail(500, 'Configuration serveur manquante.');

  const contentType = event.headers['content-type'] ?? event.headers['Content-Type'] ?? '';
  if (!contentType.includes('application/json')) {
    return fail(415, 'Format attendu : application/json.');
  }

  let body: Record<string, unknown>;
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body ?? '', 'base64').toString('utf8') : event.body ?? '';
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) throw new Error('payload');
    body = parsed as Record<string, unknown>;
  } catch {
    return fail(400, 'Requête JSON invalide.');
  }

  // --- Anti-abus : honeypot (champ-piège jamais rempli par un humain) ---
  // Rempli ⇒ bot. On renvoie un 202 « ok » factice (sans rien insérer) pour ne
  // pas signaler au bot que le piège a été détecté.
  if (clean(body.company_website_hp) !== '') {
    return json(202, { ok: true });
  }

  // --- Reconstruit une fiche propre, puis valide avec les règles partagées ---
  const form: ContactForm = {
    ...emptyContactForm,
    prenom: clean(body.prenom),
    nom: clean(body.nom),
    email: clean(body.email),
    fonction: clean(body.fonction),
    fonctionAutre: clean(body.fonctionAutre),
    entreprise: clean(body.entreprise),
    telephone: normalizePhone(clean(body.telephone)),
    secteur: clean(body.secteur),
    effectif: clean(body.effectif),
    maturiteIa: clean(body.maturiteIa),
    preDiagnostic: clean(body.preDiagnostic),
    priorite: clean(body.priorite),
    horizon: clean(body.horizon),
    message: cleanMultiline(body.message),
    newsletter: body.newsletter === true || body.newsletter === 'true',
  };

  const errors = validateContact(form);
  const firstError = Object.values(errors)[0];
  if (firstError) return fail(422, firstError);

  const supabase = createClient<Database>(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // --- Anti-abus : rate-limit par email (fenêtre glissante) ---
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count, error: countError } = await supabase
    .from('contact_requests')
    .select('id', { count: 'exact', head: true })
    .eq('email', form.email)
    .gte('created_at', since);
  if (!countError && (count ?? 0) >= RATE_LIMIT_MAX) {
    return fail(429, 'Trop de demandes pour cette adresse. Réessayez dans une heure.');
  }

  // --- Insertion de la demande ---
  const { error } = await supabase.from('contact_requests').insert({
    prenom: form.prenom,
    nom: form.nom,
    email: form.email,
    fonction: form.fonction,
    fonction_autre: form.fonction === FONCTION_AUTRE ? form.fonctionAutre : null,
    entreprise: form.entreprise,
    telephone: form.telephone || null,
    secteur: form.secteur,
    effectif: form.effectif,
    maturite_ia: Number(form.maturiteIa),
    pre_diagnostic: form.preDiagnostic,
    priorite: form.priorite,
    horizon: form.horizon,
    message: form.message || null,
    newsletter_opt_in: form.newsletter,
    status: 'new',
  });

  if (error) {
    console.error('[submit-contact] échec insertion', error);
    return fail(502, 'Échec de l’enregistrement de votre demande.');
  }

  // Notifie l'équipe (best-effort, ne bloque jamais la réponse à l'utilisateur).
  await notifyContactRequest(form);

  return json(202, { ok: true });
};
