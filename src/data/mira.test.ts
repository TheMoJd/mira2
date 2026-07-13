import { describe, it, expect } from 'vitest';
import mira from './mira';

/**
 * Verrou de style (décision CTO du 13/07) : aucune chaîne visible du site ne
 * doit contenir de tiret cadratin (—, U+2014) ni demi-cadratin (–, U+2013).
 * Ces signes font « écrit par une IA » ; on préfère virgule, deux-points, ·
 * ou une reformulation. Les traits d'union simples (-) restent permis
 * (mots composés, plages de chiffres).
 */

interface FoundString {
  path: string;
  text: string;
}

/** Aplati récursivement toutes les chaînes d'une valeur, avec leur chemin
 *  (ex. `mira.phases[0].title`) pour un message d'échec actionnable. */
function collectStrings(value: unknown, path: string, out: FoundString[]): void {
  if (typeof value === 'string') {
    out.push({ path, text: value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => collectStrings(v, `${path}[${i}]`, out));
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, v] of Object.entries(value)) {
      collectStrings(v, `${path}.${key}`, out);
    }
  }
}

describe('mira — verrou de style (pas de tiret cadratin ni demi-cadratin)', () => {
  const strings: FoundString[] = [];
  collectStrings(mira, 'mira', strings);

  it('parcourt bien les chaînes de mira (garde-fou du test lui-même)', () => {
    expect(strings.length).toBeGreaterThan(50);
  });

  it('aucune chaîne ne contient — (U+2014) ni – (U+2013)', () => {
    const offenders = strings.filter(({ text }) => /[—–]/.test(text));
    expect(offenders).toEqual([]);
  });
});
