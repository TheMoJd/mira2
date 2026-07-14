/**
 * envcheck — Netlify Function de diagnostic (protégée par token).
 * ================================================================
 * Renvoie, pour les variables d'env critiques, UNIQUEMENT leur présence
 * (booléen) et la longueur de la valeur — jamais la valeur elle-même.
 * But : vérifier ce que le runtime des functions voit réellement.
 *
 * Accès (review du 14/07) : la route est publique côté Netlify, elle exige donc
 * le header `x-envcheck-token` égal à la variable d'env `ENVCHECK_TOKEN`.
 * Sans token configuré ou sans header valide → 404 (on ne révèle pas la route).
 *
 * Usage : curl -H "x-envcheck-token: $ENVCHECK_TOKEN" https://…/.netlify/functions/envcheck
 */
import type { Handler } from '@netlify/functions';
import { timingSafeEqual } from 'node:crypto';

const present = (k: string) => {
  const v = process.env[k];
  return { set: !!v, len: v ? v.length : 0 };
};

/** Comparaison en temps constant. Les longueurs différentes court-circuitent :
 *  acceptable, la longueur du token n'est pas un secret exploitable ici. */
const tokenOk = (provided: string | undefined, expected: string | undefined): boolean => {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

export const handler: Handler = async (event) => {
  if (!tokenOk(event.headers['x-envcheck-token'], process.env.ENVCHECK_TOKEN)) {
    return { statusCode: 404, body: 'Not found' };
  }
  const body = {
    RESEND_API_KEY: present('RESEND_API_KEY'),
    RESEND_FROM: present('RESEND_FROM'),
    RESEND_REPLY_TO: present('RESEND_REPLY_TO'),
    OPS_EMAIL: present('OPS_EMAIL'),
    NOTIF_EMAILS: present('NOTIF_EMAILS'),
    SUPABASE_URL: present('SUPABASE_URL'),
    OPENAI_API_KEY: present('OPENAI_API_KEY'),
  };
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body, null, 2),
  };
};
