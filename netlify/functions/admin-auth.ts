/**
 * admin-auth — Netlify Function (connexion à l'interface admin)
 * =============================================================
 * POST application/json, champ `action` :
 *  - `login`    { email, password }   → jetons de session (accès + rafraîchissement)
 *  - `refresh`  { refreshToken }      → nouveaux jetons
 *  - `password` { password } + Bearer → change le mot de passe de l'admin connecté
 *
 * Supabase Auth est appelé côté serveur : le navigateur ne reçoit que les jetons,
 * jamais une clé Supabase. Seules les adresses de `ADMIN_EMAILS` peuvent se
 * connecter (une adresse hors liste reçoit le même message qu'un mauvais mot de
 * passe, pour ne pas révéler qui est admin). Supabase Auth limite lui-même le
 * rythme des tentatives de connexion.
 */
import type { Handler } from '@netlify/functions';
import type { Session } from '@supabase/supabase-js';
import { fail, isAdminEmail, json, readJson, requireAdmin, serviceClient } from './lib/admin';

/** Longueur minimale d'un nouveau mot de passe admin. */
export const MIN_PASSWORD_LENGTH = 12;

const sessionPayload = (session: Session) => ({
  ok: true,
  email: session.user.email,
  accessToken: session.access_token,
  refreshToken: session.refresh_token,
  // Epoch en secondes (fourni par Supabase), le front rafraîchit un peu avant.
  expiresAt: session.expires_at ?? Math.floor(Date.now() / 1000) + session.expires_in,
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return fail(405, 'Méthode non autorisée.');
  const supabase = serviceClient();
  if (!supabase || !process.env.ADMIN_EMAILS) return fail(500, 'Configuration serveur manquante.');

  const body = readJson(event);
  if (!body) return fail(400, 'Requête JSON invalide.');

  switch (body.action) {
    case 'login': {
      const email = String(body.email ?? '').trim().toLowerCase();
      const password = String(body.password ?? '');
      const refused = fail(401, 'Email ou mot de passe incorrect.');
      if (!email || !password || !isAdminEmail(email)) return refused;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) {
        console.warn(`[admin-auth] connexion refusée pour ${email} : ${error?.message ?? 'pas de session'}`);
        return refused;
      }
      console.log(`[admin-auth] connexion ${email}`);
      return json(200, sessionPayload(data.session));
    }

    case 'refresh': {
      const refreshToken = String(body.refreshToken ?? '');
      if (!refreshToken) return fail(401, 'Session expirée. Reconnectez-vous.');
      const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
      if (error || !data.session || !isAdminEmail(data.session.user.email)) {
        return fail(401, 'Session expirée. Reconnectez-vous.');
      }
      return json(200, sessionPayload(data.session));
    }

    case 'password': {
      const auth = await requireAdmin(event, supabase);
      if (!auth.ok) return auth.response;
      const password = String(body.password ?? '');
      if (password.length < MIN_PASSWORD_LENGTH) {
        return fail(400, `Mot de passe : ${MIN_PASSWORD_LENGTH} caractères minimum.`);
      }
      const { error } = await supabase.auth.admin.updateUserById(auth.userId, { password });
      if (error) {
        console.error(`[admin-auth] changement de mot de passe échoué pour ${auth.email}`, error);
        return fail(500, 'Le mot de passe n’a pas pu être changé.');
      }
      console.log(`[admin-auth] mot de passe changé par ${auth.email}`);
      return json(200, { ok: true });
    }

    default:
      return fail(400, 'Action inconnue.');
  }
};
