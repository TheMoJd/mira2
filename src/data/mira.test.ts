import { describe, it, expect } from 'vitest';
import mira from './mira';
import { collectStrings, offenders } from './styleLock.helpers';
import type { FoundString } from './styleLock.helpers';

/**
 * Verrou de style (décision CTO du 13/07) : aucune chaîne visible du site ne
 * doit contenir de tiret cadratin (—, U+2014) ni demi-cadratin (–, U+2013).
 * Ces signes font « écrit par une IA » ; on préfère virgule, deux-points, ·
 * ou une reformulation. Les traits d'union simples (-) restent permis
 * (mots composés, plages de chiffres).
 *
 * Le parcours (`collectStrings`) et la règle (`offenders`) sont partagés avec
 * `styleLock.test.ts` (données du pré-diagnostic) via `styleLock.helpers.ts`.
 */

describe('mira — verrou de style (pas de tiret cadratin ni demi-cadratin)', () => {
  const strings: FoundString[] = [];
  collectStrings(mira, 'mira', strings);

  it('parcourt bien les chaînes de mira (garde-fou du test lui-même)', () => {
    expect(strings.length).toBeGreaterThan(50);
  });

  it('aucune chaîne ne contient — (U+2014) ni – (U+2013)', () => {
    expect(offenders(strings)).toEqual([]);
  });
});
