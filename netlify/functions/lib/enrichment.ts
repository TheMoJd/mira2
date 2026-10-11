/**
 * enrichment.ts — enrichissement du lead (Tranche 4, TODO 2)
 * ==========================================================
 * Deux enrichissements **best-effort** : ils ne doivent JAMAIS faire échouer la
 * génération. En cas d'erreur/timeout, on retourne vide et la génération continue
 * avec ce qu'on a (les 6 questions du formulaire restent l'entrée minimale).
 *
 *  - `enrichSiret`  : SIRET → NAF / effectif / raison sociale via l'API REST
 *    publique `recherche-entreprises.api.gouv.fr` (gratuite, sans clé).
 *    NB : le MCP « données gouv » n'existe pas au runtime de la function déployée
 *    → on appelle l'API HTTP directement.
 *  - `fetchSiteResume` : URL du site → texte nettoyé/tronqué, avec garde anti-SSRF
 *    par IP (`netGuard.ts`).
 */
import { pipeline } from 'node:stream';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';
import { isBlockedHost, makeGuardedGet } from './netGuard';
import type { GuardedGet, GuardedResponse } from './netGuard';

const FETCH_TIMEOUT_MS = 6000;
const SITE_MAX_BYTES = 1_500_000; // ~1.5 Mo de HTML lu au maximum
const SITE_RESUME_MAX_CHARS = 2500;

/** Libellés des tranches d'effectif salarié INSEE (code `tranche_effectif_salarie`). */
const EFFECTIF_LABELS: Record<string, string> = {
  '00': '0 salarié',
  '01': '1 ou 2 salariés',
  '02': '3 à 5 salariés',
  '03': '6 à 9 salariés',
  '11': '10 à 19 salariés',
  '12': '20 à 49 salariés',
  '21': '50 à 99 salariés',
  '22': '100 à 199 salariés',
  '31': '200 à 249 salariés',
  '32': '250 à 499 salariés',
  '41': '500 à 999 salariés',
  '42': '1 000 à 1 999 salariés',
  '51': '2 000 à 4 999 salariés',
  '52': '5 000 à 9 999 salariés',
  '53': '10 000 salariés et plus',
};

/** Libellés des catégories d'entreprise INSEE (`categorie_entreprise`). */
const CATEGORIE_LABELS: Record<string, string> = {
  PME: 'PME',
  ETI: 'ETI (entreprise de taille intermédiaire)',
  GE: 'Grande entreprise',
};

export interface SiretEnrichment {
  nomEntreprise?: string;
  nafCode?: string;
  nafLibelle?: string;
  effectifTranche?: string;
  /** Catégorie INSEE : « PME » / « ETI … » / « Grande entreprise ». */
  categorieEntreprise?: string;
  /** Année de création (ex. « 1955 »). */
  anneeCreation?: string;
  /** Localisation du siège (ex. « PARIS (75) »). */
  localisation?: string;
  /** Établissement actif (`etat_administratif === 'A'`). Sert au contrôle qualité. */
  actif?: boolean;
}

/** `fetch` avec timeout (AbortController). */
async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Enrichit un SIRET (14 chiffres) via l'API recherche-entreprises. Best-effort. */
export async function enrichSiret(siret: string): Promise<SiretEnrichment> {
  const clean = siret.replace(/\s/g, '');
  if (!/^\d{14}$/.test(clean)) return {};
  try {
    const url = `https://recherche-entreprises.api.gouv.fr/search?q=${clean}&page=1&per_page=1`;
    const res = await fetchWithTimeout(url, { headers: { accept: 'application/json' } });
    if (!res.ok) return {};
    const data = (await res.json()) as { results?: Array<Record<string, unknown>> };
    const r = data.results?.[0];
    if (!r) return {};

    const siege = r.siege as Record<string, unknown> | undefined;
    const nafCode = (r.activite_principale as string | undefined) ?? undefined;
    const nafLibelle =
      (r.libelle_activite_principale as string | undefined) ??
      (siege?.libelle_activite_principale as string | undefined) ??
      undefined;
    const effectifCode = r.tranche_effectif_salarie as string | undefined;

    // Champs de qualification / contexte (best-effort, souvent partiels).
    const categorieRaw = r.categorie_entreprise as string | undefined;
    const dateCreation = r.date_creation as string | undefined; // 'YYYY-MM-DD'
    const commune = siege?.libelle_commune as string | undefined;
    const dept = siege?.departement as string | undefined;
    const etat = r.etat_administratif as string | undefined; // 'A' (actif) | 'C' (cessé)

    return {
      nomEntreprise:
        (r.nom_complet as string | undefined) ?? (r.nom_raison_sociale as string | undefined) ?? undefined,
      nafCode,
      nafLibelle,
      effectifTranche: effectifCode ? EFFECTIF_LABELS[effectifCode] ?? undefined : undefined,
      categorieEntreprise: categorieRaw ? CATEGORIE_LABELS[categorieRaw] ?? categorieRaw : undefined,
      anneeCreation: dateCreation ? dateCreation.slice(0, 4) : undefined,
      localisation: commune ? `${commune}${dept ? ` (${dept})` : ''}` : undefined,
      actif: etat ? etat === 'A' : undefined,
    };
  } catch (err) {
    console.warn('[enrich] SIRET indisponible', err);
    return {};
  }
}

/** Nettoie un HTML en texte lisible tronqué. */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SITE_RESUME_MAX_CHARS);
}

const MAX_REDIRECTS = 3;

/**
 * Suit les redirections **manuellement**, chaque saut repassant par le transport gardé
 * (`netGuard.ts`) : hôte littéral contrôlé avant la connexion, nom résolu contrôlé au
 * moment même de la connexion (une URL publique qui redirige vers 169.254.169.254, ou un
 * nom public qui résout vers 127.0.0.1, sont refusés). Les réponses abandonnées sont
 * vidées pour libérer la socket.
 */
async function getFollowingSafeRedirects(
  start: URL,
  get: GuardedGet,
  signal: AbortSignal,
): Promise<GuardedResponse | undefined> {
  let current = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (current.protocol !== 'http:' && current.protocol !== 'https:') return undefined;
    if (isBlockedHost(current.hostname)) return undefined;

    const res = await get(current, signal);
    if (res.status >= 300 && res.status < 400) {
      res.body.resume();
      const location = res.headers.location;
      if (!location) return undefined;
      try {
        current = new URL(location, current); // résout les redirections relatives
      } catch {
        return undefined;
      }
      continue; // re-valide l'hôte cible au tour suivant
    }
    return res;
  }
  return undefined; // trop de redirections
}

/** Décompresse si le serveur ignore `accept-encoding: identity`. `pipeline` (et non
 *  `pipe`) propage l'erreur ou le timeout de la réponse au flux décompressé : sinon la
 *  lecture attendrait indéfiniment un flux jamais terminé. */
function decoded(res: GuardedResponse): AsyncIterable<Buffer> {
  const encoding = String(res.headers['content-encoding'] ?? '').toLowerCase();
  const inflate =
    encoding === 'gzip' || encoding === 'x-gzip'
      ? createGunzip()
      : encoding === 'deflate'
        ? createInflate()
        : encoding === 'br'
          ? createBrotliDecompress()
          : null;
  return inflate ? pipeline(res.body, inflate, () => {}) : res.body;
}

/**
 * Récupère un résumé texte du site déclaré. Best-effort + garde anti-SSRF.
 * `get` est injectable pour les tests ; en production, transport gardé de `netGuard.ts`.
 */
export async function fetchSiteResume(siteUrl: string, get: GuardedGet = makeGuardedGet()): Promise<string | undefined> {
  let url: URL;
  try {
    url = new URL(siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`);
  } catch {
    return undefined;
  }

  // Un seul délai pour toute la chaîne (redirections et lecture du corps comprises).
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  try {
    const res = await getFollowingSafeRedirects(url, get, signal);
    if (!res) return undefined;
    const contentType = String(res.headers['content-type'] ?? '');
    if (res.status < 200 || res.status >= 300 || !contentType.includes('text/html')) {
      res.body.resume();
      return undefined;
    }

    // Lecture bornée (après décompression) pour ne pas ingérer une page géante.
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of decoded(res)) {
      chunks.push(chunk);
      total += chunk.length;
      if (total >= SITE_MAX_BYTES) break;
    }
    res.body.destroy();
    const resume = htmlToText(Buffer.concat(chunks).subarray(0, SITE_MAX_BYTES).toString('utf8'));
    return resume || undefined;
  } catch (err) {
    console.warn('[enrich] site indisponible', err);
    return undefined;
  }
}
