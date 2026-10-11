/**
 * trigger.ts — authentification du déclenchement de la génération
 * ================================================================
 * `generate-prerapport-background` est une URL publique. Sans contrôle, n'importe qui
 * pouvait l'appeler avec un `leadId` arbitraire : un lead introuvable déclenchait une
 * alerte `notifyFailure` vers `OPS_EMAIL`, avec un texte choisi par l'appelant, envoyée
 * depuis le domaine MIRA (spam ou hameçonnage de l'équipe, sans limite).
 *
 * `submit-prerapport` signe le `leadId` (HMAC-SHA256) et la background function vérifie
 * la signature. La clé est dérivée de `SUPABASE_SERVICE_ROLE_KEY`, que les deux functions
 * ont déjà : aucune variable d'environnement de plus à poser sur Netlify.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

/** En-tête qui porte la signature (Netlify transmet les en-têtes en minuscules). */
export const TRIGGER_HEADER = 'x-mira-generation-token';

/** Format d'un `leadId` (uuid Postgres). Tout le reste est refusé avant la base. */
export const LEAD_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Signature du déclenchement pour ce lead. Préfixe de domaine : la clé ne signe rien d'autre. */
export function generationToken(leadId: string, secret: string): string {
  return createHmac('sha256', secret).update(`mira-generation:${leadId}`).digest('hex');
}

/** Vérifie la signature en temps constant. */
export function isValidGenerationToken(leadId: string, token: string | undefined, secret: string): boolean {
  if (!token) return false;
  const expected = Buffer.from(generationToken(leadId, secret));
  const received = Buffer.from(token);
  return received.length === expected.length && timingSafeEqual(received, expected);
}
