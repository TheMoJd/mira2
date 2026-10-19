/**
 * admin.ts — socle commun des functions de l'interface admin (/admin)
 * ===================================================================
 * Authentification : comptes Supabase Auth (email + mot de passe), créés à la main
 * dans le dashboard Supabase, ET liste blanche `ADMIN_EMAILS` côté serveur. Les deux
 * sont nécessaires : un compte Supabase Auth seul ne donne aucun droit (la suite du
 * produit aura d'autres utilisateurs), une adresse de la liste sans compte non plus.
 *
 * Le front ne parle jamais à Supabase : il obtient un jeton par `admin-auth` (qui
 * appelle Supabase Auth côté serveur) et le renvoie en `Authorization: Bearer` à
 * chaque appel. Ici on vérifie ce jeton auprès de Supabase et l'adresse dans la liste.
 */
import type { HandlerEvent, HandlerResponse } from '@netlify/functions';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../src/types/supabase';
import { parseRecipients } from './email';

export type AdminClient = SupabaseClient<Database>;

export const json = (statusCode: number, payload: unknown): HandlerResponse => ({
  statusCode,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  body: JSON.stringify(payload),
});
export const fail = (statusCode: number, error: string): HandlerResponse => json(statusCode, { ok: false, error });

/** Adresses autorisées (`ADMIN_EMAILS`, séparées par des virgules), en minuscules. */
export function adminEmails(): string[] {
  return parseRecipients(process.env.ADMIN_EMAILS).map((e) => e.toLowerCase());
}

export const isAdminEmail = (email: string | undefined | null): boolean =>
  !!email && adminEmails().includes(email.trim().toLowerCase());

/** Client `service_role` (bypass RLS). `null` si la configuration manque. */
export function serviceClient(): AdminClient | null {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Corps JSON d'une requête (base64 compris), `null` si illisible. */
export function readJson(event: HandlerEvent): Record<string, unknown> | null {
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body ?? '', 'base64').toString('utf8') : event.body ?? '';
    const parsed: unknown = JSON.parse(raw || '{}');
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export type AdminAuth = { ok: true; email: string; userId: string } | { ok: false; response: HandlerResponse };

/**
 * Vérifie le jeton `Authorization: Bearer` : jeton Supabase valide (signature,
 * expiration, utilisateur existant) ET adresse dans `ADMIN_EMAILS`. Message d'erreur
 * volontairement unique (on ne dit pas lequel des deux a échoué).
 */
export async function requireAdmin(event: HandlerEvent, supabase: AdminClient): Promise<AdminAuth> {
  const header = event.headers.authorization ?? event.headers.Authorization ?? '';
  const token = /^Bearer\s+(.+)$/i.exec(header)?.[1]?.trim();
  const denied = { ok: false as const, response: fail(401, 'Session expirée ou accès refusé. Reconnectez-vous.') };
  if (!token) return denied;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user || !isAdminEmail(data.user.email)) return denied;
  return { ok: true, email: data.user.email!.toLowerCase(), userId: data.user.id };
}
