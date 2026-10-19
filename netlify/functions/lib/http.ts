/**
 * http.ts — réponses et lecture de corps communes aux Netlify Functions.
 * ======================================================================
 * Toutes les functions répondent en JSON `{ ok, … }` / `{ ok: false, error }`.
 * Un seul endroit pour ce format, pour que les functions ne divergent pas.
 */
import type { HandlerEvent, HandlerResponse } from '@netlify/functions';

/** En-tête des réponses qui ne doivent jamais être mises en cache (données admin). */
export const NO_STORE = { 'cache-control': 'no-store' } as const;

export const json = (statusCode: number, payload: unknown, headers: Record<string, string> = {}): HandlerResponse => ({
  statusCode,
  headers: { 'content-type': 'application/json', ...headers },
  body: JSON.stringify(payload),
});

export const fail = (statusCode: number, error: string, headers: Record<string, string> = {}): HandlerResponse =>
  json(statusCode, { ok: false, error }, headers);

/**
 * Corps JSON d'une requête (base64 compris) s'il s'agit d'un objet, sinon `null`
 * (corps vide, JSON invalide, tableau ou valeur scalaire).
 */
export function readJsonBody(event: Pick<HandlerEvent, 'body' | 'isBase64Encoded'>): Record<string, unknown> | null {
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body ?? '', 'base64').toString('utf8') : event.body ?? '';
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
