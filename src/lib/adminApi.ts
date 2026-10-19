/**
 * Client de l'interface admin : session et appels aux functions `admin-*`.
 *
 * La session (jetons Supabase Auth obtenus par `admin-auth`) vit en `sessionStorage` :
 * elle disparaît à la fermeture de l'onglet, ce qui suffit pour un outil interne et
 * limite la durée d'exposition du jeton. Le jeton d'accès est rafraîchi une minute
 * avant expiration, et une fois de plus si le serveur répond 401.
 */
import type { GridSection, RejectedRow, StatRow, StatSourceRow } from '../data/statbankSchema';

export interface AdminSession {
  email: string;
  accessToken: string;
  refreshToken: string;
  /** Epoch en secondes. */
  expiresAt: number;
}

export interface AdminData {
  sources: StatSourceRow[];
  stats: StatRow[];
  gridSections: GridSection[];
  /** Nombre de rapports envoyés citant chaque statistique. */
  citations: Record<string, number>;
  email: string;
  /** Statistiques que la génération pourra citer (même lecture qu'elle, côté serveur). */
  citableCount: number;
  /** Lignes actives que la génération écarte, avec la raison. */
  rejected: RejectedRow[];
}

const KEY = 'mira-admin-session';

export class AdminAuthError extends Error {}

export function loadSession(): AdminSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AdminSession) : null;
  } catch {
    return null;
  }
}

function saveSession(s: AdminSession | null): void {
  try {
    if (s) sessionStorage.setItem(KEY, JSON.stringify(s));
    else sessionStorage.removeItem(KEY);
  } catch {
    /* stockage indisponible (navigation privée stricte) : session en mémoire seulement */
  }
}

export const logout = (): void => saveSession(null);

async function post(path: string, body: unknown, token?: string): Promise<Record<string, unknown>> {
  const res = await fetch(`/.netlify/functions/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status === 401) throw new AdminAuthError(String(payload.error ?? 'Session expirée.'));
  if (!res.ok || payload.ok === false) throw new Error(String(payload.error ?? `Erreur ${res.status}.`));
  return payload;
}

const toSession = (p: Record<string, unknown>): AdminSession => ({
  email: String(p.email),
  accessToken: String(p.accessToken),
  refreshToken: String(p.refreshToken),
  expiresAt: Number(p.expiresAt),
});

export async function login(email: string, password: string): Promise<AdminSession> {
  const s = toSession(await post('admin-auth', { action: 'login', email, password }));
  saveSession(s);
  return s;
}

async function refresh(session: AdminSession): Promise<AdminSession> {
  try {
    const s = toSession(await post('admin-auth', { action: 'refresh', refreshToken: session.refreshToken }));
    saveSession(s);
    return s;
  } catch (err) {
    saveSession(null);
    throw err instanceof AdminAuthError ? err : new AdminAuthError('Session expirée. Reconnectez-vous.');
  }
}

/** Jeton d'accès valide (rafraîchi s'il expire dans moins d'une minute). */
async function freshToken(): Promise<string> {
  let s = loadSession();
  if (!s) throw new AdminAuthError('Connectez-vous.');
  if (s.expiresAt - 60 < Date.now() / 1000) s = await refresh(s);
  return s.accessToken;
}

/** Appel authentifié, avec une seconde chance après rafraîchissement sur 401. */
async function authed<T>(call: (token: string) => Promise<T>): Promise<T> {
  try {
    return await call(await freshToken());
  } catch (err) {
    const s = loadSession();
    if (!(err instanceof AdminAuthError) || !s) throw err;
    return call((await refresh(s)).accessToken);
  }
}

export function fetchAdminData(): Promise<AdminData> {
  return authed(async (token) => {
    const res = await fetch('/.netlify/functions/admin-sources', { headers: { authorization: `Bearer ${token}` } });
    const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.status === 401) throw new AdminAuthError(String(payload.error ?? 'Session expirée.'));
    if (!res.ok || payload.ok === false) throw new Error(String(payload.error ?? `Erreur ${res.status}.`));
    return payload as unknown as AdminData;
  });
}

export type AdminAction =
  | { action: 'createSource' | 'updateSource'; data: unknown }
  | { action: 'archiveSource' | 'restoreSource'; code: string }
  | { action: 'createStat' | 'updateStat'; data: unknown }
  | { action: 'archiveStat' | 'restoreStat'; id: string };

export function adminWrite(body: AdminAction): Promise<void> {
  return authed(async (token) => {
    await post('admin-sources', body, token);
  });
}

export function changePassword(password: string): Promise<void> {
  return authed(async (token) => {
    await post('admin-auth', { action: 'password', password }, token);
  });
}
