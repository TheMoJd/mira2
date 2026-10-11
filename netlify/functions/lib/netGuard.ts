/**
 * netGuard.ts — garde anti-SSRF des requêtes vers une URL fournie par l'utilisateur
 * =================================================================================
 * Le filtre précédent ne regardait que le nom d'hôte écrit dans l'URL : un nom public
 * qui résout vers une IP interne (`localtest.me` → 127.0.0.1), une adresse IPv6
 * (`[::ffff:127.0.0.1]`, `[fd00::1]`) ou la plage partagée 100.64.0.0/10 passaient.
 *
 * Deux verrous, tous deux par IP :
 *  - `isBlockedHost` refuse un hôte littéral (IP ou `localhost`) AVANT toute connexion.
 *    Node ne passe pas par `lookup` quand l'hôte est déjà une IP : ce contrôle est le
 *    seul qui s'applique à ce cas.
 *  - `guardedLookup` est branché comme résolveur DNS de la connexion elle-même : il
 *    refuse si UNE des adresses résolues est interne, et l'adresse vérifiée est celle
 *    sur laquelle on se connecte. Pas de fenêtre entre contrôle et connexion, donc pas
 *    de DNS-rebinding.
 */
import { BlockList, isIP } from 'node:net';
import type { LookupFunction } from 'node:net';
import { lookup as dnsLookup } from 'node:dns';
import type { LookupAddress } from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';

/** Plages jamais joignables : privées, loopback, link-local, réservées, multicast. */
const BLOCKED = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8], // « ce réseau », dont 0.0.0.0
  ['10.0.0.0', 8],
  ['100.64.0.0', 10], // espace partagé (CGNAT, réseaux internes d'hébergeurs)
  ['127.0.0.0', 8],
  ['169.254.0.0', 16], // link-local, métadonnées cloud
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // réservé, dont 255.255.255.255
] as const) {
  BLOCKED.addSubnet(net, prefix, 'ipv4');
}
for (const [net, prefix] of [
  // Pas de règle `::ffff:0:0/96` : BlockList confronte les IPv4 mappées (`::ffff:7f00:1`)
  // aux règles IPv4 ci-dessus, et une telle règle bloquerait aussi toute adresse IPv4.
  ['::', 96], // non spécifiée, loopback, IPv4-compatibles
  ['64:ff9b::', 96], // NAT64
  ['100::', 64],
  ['2001::', 32], // Teredo
  ['2001:db8::', 32],
  ['2002::', 16], // 6to4
  ['fc00::', 7], // ULA
  ['fe80::', 10], // link-local
  ['ff00::', 8], // multicast
] as const) {
  BLOCKED.addSubnet(net, prefix, 'ipv6');
}

/** Une adresse IP (sans crochets) appartient-elle à une plage interdite ? Non-IP → refusé. */
export function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return BLOCKED.check(address, 'ipv4');
  if (family === 6) return BLOCKED.check(address, 'ipv6');
  return true;
}

/** Hôte d'URL (`URL.hostname`, crochets IPv6 compris) refusé avant toute connexion. */
export function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal')) return true;
  return isIP(h) !== 0 && isBlockedAddress(h);
}

type Resolve = (
  hostname: string,
  callback: (err: NodeJS.ErrnoException | null, addresses: LookupAddress[]) => void,
) => void;

const resolveAll: Resolve = (hostname, callback) => dnsLookup(hostname, { all: true }, callback);

/**
 * Résolveur DNS de connexion : résout toutes les adresses, refuse si l'une est interne.
 * Gère les deux formes d'appel de Node (`all: true` avec la sélection de famille
 * automatique, ou une seule adresse).
 */
export function guardedLookup(resolve: Resolve = resolveAll): LookupFunction {
  return (hostname, options, callback) => {
    resolve(hostname, (err, addresses) => {
      if (err) return callback(err, '', 0);
      const wanted = options.family === 4 || options.family === 6 ? options.family : 0;
      const usable = addresses.filter((a) => wanted === 0 || a.family === wanted);
      if (usable.length === 0) {
        return callback(Object.assign(new Error(`aucune adresse pour ${hostname}`), { code: 'ENOTFOUND' }), '', 0);
      }
      if (addresses.some((a) => isBlockedAddress(a.address))) {
        return callback(Object.assign(new Error(`hôte interne refusé : ${hostname}`), { code: 'EBLOCKED' }), '', 0);
      }
      if (options.all) return (callback as (e: null, a: LookupAddress[]) => void)(null, usable);
      return callback(null, usable[0].address, usable[0].family);
    });
  };
}

export interface GuardedResponse {
  status: number;
  headers: IncomingHttpHeaders;
  body: IncomingMessage;
}

/** Une requête GET, sans suivre les redirections, via le résolveur gardé. */
export type GuardedGet = (url: URL, signal: AbortSignal) => Promise<GuardedResponse>;

/** Transport par défaut : `node:http(s)` avec `guardedLookup` sur la connexion. */
export function makeGuardedGet(lookup: LookupFunction = guardedLookup()): GuardedGet {
  return (url, signal) =>
    new Promise((resolve, reject) => {
      if (isBlockedHost(url.hostname)) {
        reject(new Error(`hôte interne refusé : ${url.hostname}`));
        return;
      }
      const client = url.protocol === 'https:' ? https : url.protocol === 'http:' ? http : null;
      if (!client) {
        reject(new Error(`protocole refusé : ${url.protocol}`));
        return;
      }
      const req = client.get(
        url,
        {
          headers: { accept: 'text/html', 'accept-encoding': 'identity', 'user-agent': 'MIRA-prerapport/1.0' },
          lookup,
          signal,
          // Agent dédié : pas de socket réutilisée d'une requête précédente.
          agent: false,
        },
        (res) => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: res }),
      );
      req.on('error', reject);
    });
}
