import { describe, it, expect, afterEach } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { LookupAddress } from 'node:dns';
import { isBlockedAddress, isBlockedHost, guardedLookup, makeGuardedGet } from './netGuard';
import { fetchSiteResume } from './enrichment';

describe('isBlockedAddress', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.31.255.255',
    '192.168.0.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '255.255.255.255',
    '::',
    '::1',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    'fd12:3456::1',
    'fe80::1',
    'pas-une-ip',
  ])('bloque %s', (ip) => expect(isBlockedAddress(ip)).toBe(true));

  it.each(['93.184.215.14', '172.32.0.1', '2606:4700::6810:85e5'])('laisse passer %s', (ip) =>
    expect(isBlockedAddress(ip)).toBe(false),
  );
});

describe('isBlockedHost', () => {
  it('bloque les IP littérales internes (crochets IPv6 compris) et localhost', () => {
    for (const h of ['[::ffff:7f00:1]', '[fd00::1]', '127.0.0.1', 'localhost', 'LOCALHOST.', 'x.localhost', 'db.internal']) {
      expect(isBlockedHost(h)).toBe(true);
    }
  });
  it('laisse les noms publics au contrôle DNS de la connexion', () => {
    expect(isBlockedHost('localtest.me')).toBe(false);
    expect(isBlockedHost('mira-audit.fr')).toBe(false);
  });
});

/** Résolveur simulé : renvoie les adresses données pour tout nom. */
const fakeResolve = (addresses: LookupAddress[]) => (_h: string, cb: (e: null, a: LookupAddress[]) => void) =>
  cb(null, addresses);

function lookupOnce(addresses: LookupAddress[], all: boolean) {
  return new Promise<{ err: NodeJS.ErrnoException | null; result: unknown }>((resolve) =>
    guardedLookup(fakeResolve(addresses))('exemple.fr', { all }, (err, result) => resolve({ err, result })),
  );
}

describe('guardedLookup', () => {
  it('refuse un nom public qui résout vers une IP interne (localtest.me, nip.io…)', async () => {
    const { err } = await lookupOnce([{ address: '127.0.0.1', family: 4 }], false);
    expect(err?.code).toBe('EBLOCKED');
  });

  it('refuse si UNE seule des adresses résolues est interne', async () => {
    const { err } = await lookupOnce(
      [
        { address: '93.184.215.14', family: 4 },
        { address: '10.0.0.1', family: 4 },
      ],
      true,
    );
    expect(err?.code).toBe('EBLOCKED');
  });

  it('renvoie les adresses publiques dans les deux formes d’appel de Node', async () => {
    const addrs = [{ address: '93.184.215.14', family: 4 }];
    expect((await lookupOnce(addrs, true)).result).toEqual(addrs);
    expect((await lookupOnce(addrs, false)).result).toBe('93.184.215.14');
  });
});

describe('makeGuardedGet — contrôle au moment de la connexion', () => {
  let server: http.Server | undefined;
  afterEach(() => new Promise<void>((r) => (server ? server.close(() => r()) : r())));

  /** Serveur local qui compte les requêtes reçues. */
  async function startServer() {
    let hits = 0;
    server = http.createServer((_req, res) => {
      hits++;
      res.writeHead(200, { 'content-type': 'text/html' }).end('<p>interne</p>');
    });
    await new Promise<void>((r) => server!.listen(0, '127.0.0.1', () => r()));
    return { port: (server!.address() as AddressInfo).port, hits: () => hits };
  }

  it('n’ouvre aucune connexion vers un nom qui résout vers 127.0.0.1', async () => {
    const { port, hits } = await startServer();
    const get = makeGuardedGet(guardedLookup(fakeResolve([{ address: '127.0.0.1', family: 4 }])));
    await expect(get(new URL(`http://interne.exemple:${port}/`), AbortSignal.timeout(2000))).rejects.toThrow(/interne/);
    expect(hits()).toBe(0);
  });

  it('refuse une IP littérale interne sans passer par le DNS', async () => {
    const { port, hits } = await startServer();
    const get = makeGuardedGet(guardedLookup(fakeResolve([{ address: '93.184.215.14', family: 4 }])));
    await expect(get(new URL(`http://127.0.0.1:${port}/`), AbortSignal.timeout(2000))).rejects.toThrow();
    await expect(get(new URL(`http://[::ffff:127.0.0.1]:${port}/`), AbortSignal.timeout(2000))).rejects.toThrow();
    expect(hits()).toBe(0);
  });

  it('se connecte à l’adresse validée par le résolveur (témoin : résolveur permissif)', async () => {
    // Témoin du test précédent : un résolveur qui laisse passer 127.0.0.1 atteint bien le
    // serveur, ce qui prouve que la connexion utilise l'adresse fournie par `lookup`.
    const { port, hits } = await startServer();
    const permissif = ((_h: string, o: { all?: boolean }, cb: (e: null, a: unknown, f?: number) => void) =>
      o.all ? cb(null, [{ address: '127.0.0.1', family: 4 }]) : cb(null, '127.0.0.1', 4)) as unknown as Parameters<
      typeof makeGuardedGet
    >[0];
    const res = await makeGuardedGet(permissif)(new URL(`http://interne.exemple:${port}/`), AbortSignal.timeout(2000));
    res.body.resume();
    expect(res.status).toBe(200);
    expect(hits()).toBe(1);
    // Chemin nominal complet de `fetchSiteResume` sur le vrai transport : lecture du flux
    // et nettoyage du HTML.
    expect(await fetchSiteResume(`http://site.exemple:${port}/`, makeGuardedGet(permissif))).toBe('interne');
  });
});
