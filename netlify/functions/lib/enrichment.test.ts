import { describe, it, expect, vi, afterEach } from 'vitest';
import { Readable } from 'node:stream';
import { gzipSync } from 'node:zlib';
import { fetchSiteResume, enrichSiret } from './enrichment';
import type { GuardedGet, GuardedResponse } from './netGuard';

/** Réponse du transport gardé : corps en flux, en-têtes Node (minuscules). */
function makeRes(opts: { status?: number; location?: string; contentType?: string; body?: string }): GuardedResponse {
  const { status = 200, location, contentType = 'text/html; charset=utf-8', body = '' } = opts;
  const headers: Record<string, string> = {};
  if (contentType) headers['content-type'] = contentType;
  if (location) headers.location = location;
  return { status, headers, body: Readable.from([Buffer.from(body)]) as unknown as GuardedResponse['body'] };
}

/** Transport simulé : une réponse par URL demandée. */
function fakeGet(respond: (url: string) => GuardedResponse) {
  return vi.fn<GuardedGet>(async (url) => respond(url.toString()));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchSiteResume — garde anti-SSRF', () => {
  it('refuse un hôte interne dès le départ, sans aucune requête', async () => {
    const get = fakeGet(() => makeRes({}));
    expect(await fetchSiteResume('http://169.254.169.254/latest/meta-data', get)).toBeUndefined();
    expect(get).not.toHaveBeenCalled();
  });

  it.each([
    'http://[::ffff:127.0.0.1]/',
    'http://[::1]/',
    'http://[::]/',
    'http://[fd00::1]/',
    'http://[fe80::1]/',
    'http://100.100.100.200/',
    'http://2130706433/', // 127.0.0.1 en décimal
    'http://0/',
    'http://localhost./',
  ])('refuse %s (contournements du filtre par nom d’hôte)', async (url) => {
    const get = fakeGet(() => makeRes({}));
    expect(await fetchSiteResume(url, get)).toBeUndefined();
    expect(get).not.toHaveBeenCalled();
  });

  it('ne suit PAS une redirection vers une IP de métadonnées cloud', async () => {
    const get = fakeGet(() => makeRes({ status: 302, location: 'http://169.254.169.254/latest/meta-data/iam/' }));
    expect(await fetchSiteResume('https://site-public.fr', get)).toBeUndefined();
    // La 1re URL publique est requêtée, mais on s'arrête AVANT la cible bloquée.
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('ne suit PAS une redirection vers une IP privée (10.x) ni IPv6 mappée', async () => {
    expect(
      await fetchSiteResume('https://site-public.fr', fakeGet(() => makeRes({ status: 301, location: 'http://10.0.0.5/admin' }))),
    ).toBeUndefined();
    expect(
      await fetchSiteResume('https://site-public.fr', fakeGet(() => makeRes({ status: 301, location: 'http://[::ffff:a00:5]/' }))),
    ).toBeUndefined();
  });

  it('suit une redirection vers un hôte public et renvoie le texte nettoyé', async () => {
    const get = fakeGet((url) =>
      url.includes('redir')
        ? makeRes({ status: 301, location: 'https://final-public.fr/p' })
        : makeRes({ body: '<html><body><h1>Bonjour</h1><script>alert(1)</script></body></html>' }),
    );
    const out = await fetchSiteResume('https://redir-public.fr', get);
    expect(out).toContain('Bonjour');
    expect(out).not.toContain('script');
  });

  it('décompresse une réponse gzip envoyée malgré accept-encoding: identity', async () => {
    const res = makeRes({});
    res.headers['content-encoding'] = 'gzip';
    res.body = Readable.from([gzipSync('<p>Compressé</p>')]) as unknown as GuardedResponse['body'];
    expect(await fetchSiteResume('https://site-public.fr', fakeGet(() => res))).toBe('Compressé');
  });

  it('abandonne après trop de redirections', async () => {
    const get = fakeGet(() => makeRes({ status: 302, location: 'https://autre-public.fr/next' }));
    expect(await fetchSiteResume('https://boucle-public.fr', get)).toBeUndefined();
  });

  it('ignore une réponse non-HTML', async () => {
    const get = fakeGet(() => makeRes({ contentType: 'application/pdf', body: '%PDF' }));
    expect(await fetchSiteResume('https://site-public.fr/doc.pdf', get)).toBeUndefined();
  });
});

describe('enrichSiret', () => {
  it('rejette un SIRET invalide sans appel réseau', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await enrichSiret('123')).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
