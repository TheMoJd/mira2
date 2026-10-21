/**
 * supabase.ts — le client Supabase `service_role` de toutes les functions.
 * =======================================================================
 * Un seul endroit pour créer le client serveur, avec une protection contre un défaut
 * d'infrastructure observé le 19/10/2026.
 *
 * Avec les nouvelles clés `sb_secret_…`, la passerelle Supabase fabrique à chaque requête
 * un JWT court pour PostgREST. Vu depuis les functions Netlify (us-east-2, point d'accès
 * Cloudflare CMH), ce jeton arrive parfois daté de quelques instants dans le futur pour
 * PostgREST, qui répond 401 `PGRST303` « JWT issued at future ». Le défaut est ponctuel :
 * sur trois lectures parallèles, deux passent et la troisième échoue. Il est invisible
 * depuis la France. Côté admin, la page affichait « Lecture de la banque impossible ».
 * Côté génération, la banque retombait en silence sur la graine du code.
 *
 * Parade : `clockSkewRetryFetch` rejoue la requête après une courte pause quand, et
 * seulement quand, la réponse est ce 401 précis. Les autres 401 (jeton expiré, clé
 * invalide) repartent tels quels, sans attente.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../src/types/supabase';

/** Code PostgREST d'un JWT dont la date d'émission est dans le futur (décalage d'horloge). */
export const CLOCK_SKEW_CODE = 'PGRST303';

/** Pauses avant chaque nouvel essai (ms) : un décalage d'horloge se résorbe en quelques secondes. */
export const CLOCK_SKEW_RETRY_DELAYS_MS = [300, 1000, 2000];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Le 401 est-il un décalage d'horloge (et pas un vrai refus d'accès) ? */
async function isClockSkew(res: Response): Promise<boolean> {
  if (res.status !== 401) return false;
  const body = await res.clone().text().catch(() => '');
  return body.includes(CLOCK_SKEW_CODE) || /issued at future/i.test(body);
}

/** `fetch` qui rejoue une requête refusée pour cause de décalage d'horloge. */
export function clockSkewRetryFetch(
  baseFetch: typeof fetch = fetch,
  delays: readonly number[] = CLOCK_SKEW_RETRY_DELAYS_MS,
  onRetry: (attempt: number, url: string) => void = (attempt, url) =>
    console.warn(`[supabase] JWT daté dans le futur (${CLOCK_SKEW_CODE}), nouvel essai ${attempt} : ${url}`),
): typeof fetch {
  return async (input, init) => {
    for (let attempt = 0; ; attempt++) {
      const res = await baseFetch(input, init);
      if (attempt >= delays.length || !(await isClockSkew(res))) return res;
      onRetry(attempt + 1, typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
      await sleep(delays[attempt]);
    }
  };
}

/** Client `service_role` (bypass RLS) des functions, sans session, tolérant au décalage d'horloge. */
export function createServiceClient(url: string, serviceKey: string): SupabaseClient<Database> {
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: clockSkewRetryFetch() },
  });
}
