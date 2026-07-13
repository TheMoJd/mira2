/**
 * submit-prerapport — Netlify Function (Tranche 2)
 * ================================================
 * Reçoit la soumission du wizard (multipart/form-data), valide côté serveur,
 * upload la plaquette optionnelle dans Storage, insère le lead dans Supabase,
 * puis renvoie 202. La génération du rapport (Tranche 4) sera déclenchée ici.
 *
 * Sécurité : utilise la clé `service_role` (jamais exposée au navigateur). Le
 * front ne touche jamais Supabase en direct — tout passe par cette function.
 */
import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { parse as parseMultipart, getBoundary } from 'parse-multipart-data';
import { randomUUID } from 'node:crypto';
import type { Database } from '../../src/types/supabase';
import { EMAIL_RE, PHONE_RE, MAX_IDENTITY_LEN, normalizePhone } from '../../src/components/prerapport/validation';

/** Limite de taille plaquette : sous le plafond ~6 Mo des functions synchrones Netlify. */
const MAX_PLAQUETTE_BYTES = 4 * 1024 * 1024;
const ALLOWED_PLAQUETTE = /\.(pdf|pptx?|docx?)$/i;
/** Garde anti-abus sur les textes libres qui partent dans le prompt OpenAI
 *  (secteur, produits, clients, familles) : sans borne, une soumission acceptée
 *  peut injecter des mégaoctets dans le LLM (coût + surface d'injection). */
const MAX_FREETEXT_LEN = 3000;

/** Assainit un champ d'identité libre : retire les caractères de contrôle/format
 *  (retours ligne, RTL override…) et replie les espaces. Défense en profondeur :
 *  ces PII partiront un jour vers CRM/emails où elles seraient des vecteurs
 *  d'injection (en-têtes, templates). */
const cleanIdentity = (raw: string): string =>
  raw.replace(/[\p{Cc}\p{Cf}]/gu, '').replace(/\s+/g, ' ').trim();
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
  if (!contentType.includes('multipart/form-data')) {
    return fail(415, 'Format attendu : multipart/form-data.');
  }
  const boundary = getBoundary(contentType);
  if (!boundary) return fail(400, 'Requête multipart invalide.');

  // Le corps multipart est binaire → Netlify l'encode en base64.
  const bodyBuffer = Buffer.from(event.body ?? '', event.isBase64Encoded ? 'base64' : 'utf8');
  const parts = parseMultipart(bodyBuffer, boundary);

  const fields: Record<string, string> = {};
  let plaquette: { filename: string; type: string; data: Buffer } | null = null;
  for (const part of parts) {
    if (part.filename) {
      plaquette = {
        filename: part.filename,
        type: part.type || 'application/octet-stream',
        data: part.data,
      };
    } else if (part.name) {
      fields[part.name] = part.data.toString('utf8');
    }
  }

  // --- Anti-abus : honeypot (champ-piège jamais rempli par un humain) ---
  // Rempli ⇒ bot. On renvoie un 202 « ok » factice (sans rien insérer) pour ne pas
  // signaler au bot que le piège a été détecté.
  if ((fields.company_website_hp ?? '').trim() !== '') {
    return json(202, { ok: true });
  }

  // --- Validation serveur (on ne fait jamais confiance au client) ---
  const secteurActivite = (fields.secteurActivite ?? '').trim();
  const produitsServices = (fields.produitsServices ?? '').trim();
  const clients = (fields.clients ?? '').trim();
  const email = (fields.email ?? '').trim();
  const siteUrl = (fields.siteUrl ?? '').trim();
  const siret = (fields.siret ?? '').replace(/\s/g, '').trim();
  const prenom = cleanIdentity(fields.prenom ?? '');
  const nom = cleanIdentity(fields.nom ?? '');
  const fonction = cleanIdentity(fields.fonction ?? '');
  const telephone = normalizePhone(fields.telephone ?? '');
  const consentRgpd = fields.consentRgpd === 'true';
  let famillesMetiers: string[] = [];
  try {
    const parsed: unknown = JSON.parse(fields.famillesMetiers ?? '[]');
    if (Array.isArray(parsed)) famillesMetiers = parsed.map(String);
  } catch {
    /* familles invalide → reste vide, rejeté plus bas */
  }

  if (!secteurActivite || !produitsServices || !clients) {
    return fail(422, 'Merci de remplir les questions obligatoires.');
  }
  if (
    secteurActivite.length > MAX_FREETEXT_LEN ||
    produitsServices.length > MAX_FREETEXT_LEN ||
    clients.length > MAX_FREETEXT_LEN ||
    famillesMetiers.some((fam) => fam.length > MAX_IDENTITY_LEN)
  ) {
    return fail(422, 'Réponse trop longue. Merci de résumer.');
  }
  if (famillesMetiers.length < 1 || famillesMetiers.length > 6) {
    return fail(422, 'Indiquez 1 à 6 familles de métiers.');
  }
  if (!prenom || !nom) return fail(422, 'Merci d’indiquer votre prénom et votre nom.');
  if (prenom.length > MAX_IDENTITY_LEN || nom.length > MAX_IDENTITY_LEN || fonction.length > MAX_IDENTITY_LEN) {
    return fail(422, 'Champ d’identité trop long.');
  }
  if (telephone && !PHONE_RE.test(telephone)) return fail(422, 'Numéro de téléphone invalide.');
  if (!EMAIL_RE.test(email)) return fail(422, 'Adresse email invalide.');
  if (!consentRgpd) return fail(422, 'Le consentement RGPD est nécessaire.');
  if (siret && !/^\d{14}$/.test(siret)) return fail(422, 'Le SIRET doit comporter 14 chiffres.');

  const supabase = createClient<Database>(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // --- Anti-abus : rate-limit par email (fenêtre glissante) ---
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count, error: countError } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', since);
  if (!countError && (count ?? 0) >= RATE_LIMIT_MAX) {
    return fail(429, 'Trop de demandes pour cette adresse. Réessayez dans une heure.');
  }

  // --- Upload plaquette (optionnel) ---
  let plaquettePath: string | null = null;
  if (plaquette && plaquette.data.length > 0) {
    if (plaquette.data.length > MAX_PLAQUETTE_BYTES) {
      return fail(413, 'Plaquette trop volumineuse (4 Mo max). Partagez plutôt un lien.');
    }
    if (!ALLOWED_PLAQUETTE.test(plaquette.filename)) {
      return fail(415, 'Format de plaquette non supporté (PDF, PPT ou Word).');
    }
    const safeName = plaquette.filename.replace(/[^\w.\-]/g, '_');
    const path = `${randomUUID()}/${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(path, plaquette.data, { contentType: plaquette.type, upsert: false });
    if (uploadError) return fail(502, 'Échec de l’envoi de la plaquette.');
    plaquettePath = path;
  }

  // --- Insertion du lead ---
  const { data, error } = await supabase
    .from('leads')
    .insert({
      secteur_activite: secteurActivite,
      produits_services: produitsServices,
      clients,
      familles_metiers: famillesMetiers,
      site_url: siteUrl || null,
      plaquette_path: plaquettePath,
      siret: siret || null,
      prenom,
      nom,
      fonction: fonction || null,
      telephone: telephone || null,
      email,
      consent_rgpd: consentRgpd,
      status: 'received',
    })
    .select('id')
    .single();

  if (error || !data) return fail(502, 'Échec de l’enregistrement de votre demande.');

  // Déclenche la génération asynchrone. La background function répond 202 puis
  // tourne en arrière-plan ; on ne bloque donc pas la réponse à l'utilisateur.
  const base = process.env.URL ?? `http://${event.headers.host ?? 'localhost:8888'}`;
  try {
    await fetch(`${base}/.netlify/functions/generate-prerapport-background`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ leadId: data.id }),
    });
  } catch (triggerError) {
    // Le lead est capturé ; la génération pourra être relancée. On renvoie 202 quand même.
    console.error('[submit] déclenchement de la génération échoué', triggerError);
  }

  return json(202, { ok: true, leadId: data.id });
};
