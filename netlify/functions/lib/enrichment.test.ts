import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchSiteResume, enrichSiret } from './enrichment';

/** Construit une réponse fetch minimale (headers.get insensible à la casse, body via text()). */
function makeRes(opts: { status?: number; location?: string; contentType?: string; body?: string }): Response {
  const { status = 200, location, contentType = 'text/html; charset=utf-8', body = '' } = opts;
  const headers = new Map<string, string>();
  if (contentType) headers.set('content-type', contentType);
  if (location) headers.set('location', location);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => headers.get(k.toLowerCase()) ?? null },
    body: undefined,
    text: async () => body,
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchSiteResume — garde anti-SSRF', () => {
  it('refuse un hôte interne dès le départ, sans aucun fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchSiteResume('http://169.254.169.254/latest/meta-data')).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ne suit PAS une redirection vers une IP de métadonnées cloud', async () => {
    const fetchMock = vi.fn(async () =>
      makeRes({ status: 302, location: 'http://169.254.169.254/latest/meta-data/iam/' }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const out = await fetchSiteResume('https://site-public.fr');
    expect(out).toBeUndefined();
    // La 1re URL publique est requêtée, mais on s'arrête AVANT la cible bloquée.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('ne suit PAS une redirection vers une IP privée (10.x)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => makeRes({ status: 301, location: 'http://10.0.0.5/admin' })));
    expect(await fetchSiteResume('https://site-public.fr')).toBeUndefined();
  });

  it('suit une redirection vers un hôte public et renvoie le texte nettoyé', async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      if (String(url).includes('redir')) return makeRes({ status: 301, location: 'https://final-public.fr/p' });
      return makeRes({ status: 200, body: '<html><body><h1>Bonjour</h1><script>alert(1)</script></body></html>' });
    });
    vi.stubGlobal('fetch', fetchMock);
    const out = await fetchSiteResume('https://redir-public.fr');
    expect(out).toContain('Bonjour');
    expect(out).not.toContain('script');
  });

  it('abandonne après trop de redirections', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => makeRes({ status: 302, location: 'https://autre-public.fr/next' })));
    expect(await fetchSiteResume('https://boucle-public.fr')).toBeUndefined();
  });

  it('ignore une réponse non-HTML', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => makeRes({ status: 200, contentType: 'application/pdf', body: '%PDF' })));
    expect(await fetchSiteResume('https://site-public.fr/doc.pdf')).toBeUndefined();
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
