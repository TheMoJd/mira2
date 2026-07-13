import { describe, it, expect } from 'vitest';
import { preRapport } from './prerapport';
import { famillesMetiers, domainesOrdre } from './famillesMetiers';
import { statbank } from './statbank';

/**
 * Verrou de style étendu (Lot 2, sur le modèle de `mira.test.ts` créé au Lot 1) :
 * aucune chaîne VISIBLE des données du pré-diagnostic ne doit contenir de tiret
 * cadratin (—, U+2014) ni demi-cadratin (–, U+2013). Règle CTO du 13/07 : ces
 * signes font « écrit par une IA » ; on préfère virgule, deux-points, « · » ou
 * une reformulation. Les traits d'union simples (-) restent permis (mots
 * composés, plages de chiffres, moins).
 *
 * Périmètre par module :
 *  - `prerapport` (copie du wizard) : TOUTES les chaînes sont affichées → tout est vérifié.
 *  - `famillesMetiers` : labels/domaines affichés par le FamilyPicker, stockés en
 *    base et repris dans le document → tout est vérifié.
 *  - `statbank` : seuls les champs qui alimentent le document ou le prompt sont
 *    vérifiés (`claim`, `unit`, `source.report`, `source.org`, `originalSource`,
 *    `page`). **`verbatim` est volontairement EXCLU** : c'est la citation
 *    d'origine exacte (piste d'audit, jamais affichée) — la réécrire fausserait
 *    la vérification à la source.
 */

interface FoundString {
  path: string;
  text: string;
}

/** Aplati récursivement toutes les chaînes d'une valeur, avec leur chemin. */
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

const offenders = (strings: FoundString[]) => strings.filter(({ text }) => /[—–]/.test(text));

describe('verrou de style — pas de tiret cadratin ni demi-cadratin (CTO 13/07)', () => {
  it('prerapport (copie du wizard) : aucune chaîne', () => {
    const strings: FoundString[] = [];
    collectStrings(preRapport, 'preRapport', strings);
    expect(strings.length).toBeGreaterThan(30); // garde-fou : le test parcourt bien les données
    expect(offenders(strings)).toEqual([]);
  });

  it('famillesMetiers : labels, domaines et ordre d’affichage', () => {
    const strings: FoundString[] = [];
    collectStrings(famillesMetiers, 'famillesMetiers', strings);
    collectStrings(domainesOrdre, 'domainesOrdre', strings);
    expect(strings.length).toBeGreaterThan(50);
    expect(offenders(strings)).toEqual([]);
  });

  it('statbank : champs affichés/injectés au prompt (verbatim exclu, cf. en-tête)', () => {
    const strings: FoundString[] = [];
    statbank.forEach((s, i) => {
      const visible = {
        id: s.id,
        unit: s.unit,
        claim: s.claim,
        source: {
          sourceId: s.source.sourceId,
          report: s.source.report,
          org: s.source.org,
          page: s.source.page,
          originalSource: s.source.originalSource,
        },
      };
      collectStrings(visible, `statbank[${i}]<${s.id}>`, strings);
    });
    expect(strings.length).toBeGreaterThan(200);
    expect(offenders(strings)).toEqual([]);
  });
});
