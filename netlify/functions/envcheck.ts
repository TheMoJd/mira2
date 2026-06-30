/**
 * envcheck — Netlify Function de diagnostic TEMPORAIRE.
 * =====================================================
 * Renvoie, pour les variables d'env critiques, UNIQUEMENT leur présence
 * (booléen) et la longueur de la valeur — jamais la valeur elle-même.
 * But : vérifier ce que le runtime des functions voit réellement.
 *
 * ⚠️ À SUPPRIMER une fois le diagnostic terminé.
 */
import type { Handler } from '@netlify/functions';

const present = (k: string) => {
  const v = process.env[k];
  return { set: !!v, len: v ? v.length : 0 };
};

export const handler: Handler = async () => {
  const body = {
    RESEND_API_KEY: present('RESEND_API_KEY'),
    RESEND_FROM: present('RESEND_FROM'),
    RESEND_REPLY_TO: present('RESEND_REPLY_TO'),
    OPS_EMAIL: present('OPS_EMAIL'),
    SUPABASE_URL: present('SUPABASE_URL'),
    OPENAI_API_KEY: present('OPENAI_API_KEY'),
    // Préfixe de la clé Resend pour confirmer qu'elle commence bien par "re_"
    // (sans révéler la valeur complète).
    RESEND_API_KEY_prefix: (process.env.RESEND_API_KEY ?? '').slice(0, 3),
  };
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body, null, 2),
  };
};
