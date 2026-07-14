import { describe, it, expect } from 'vitest';
import { preRapport } from './prerapport';
import { famillesMetiers, domainesOrdre } from './famillesMetiers';
import { statbank } from './statbank';
import { reportSections } from './rapportStructure';
import { RGPD_PDF_FOOTER, RGPD_EMAIL_NOTICE } from './rgpd';
import { SLOGAN, VALUE_PROP, reportFooterText } from './reportHtml';
import { collectStrings, offenders } from './styleLock.helpers';
import type { FoundString } from './styleLock.helpers';

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

  it('rapportStructure (title, fixedText), rgpd et chaînes exportées de reportHtml', () => {
    // `intent`/`allowedSources` restent hors périmètre (prompt interne, jamais
    // affichés) — même logique que l'exclusion de `verbatim` ci-dessus.
    const strings: FoundString[] = [];
    reportSections.forEach((s, i) =>
      collectStrings({ title: s.title, fixedText: s.fixedText }, `reportSections[${i}]<${s.id}>`, strings),
    );
    collectStrings({ RGPD_PDF_FOOTER, RGPD_EMAIL_NOTICE }, 'rgpd', strings);
    collectStrings(
      { SLOGAN, VALUE_PROP, footer: reportFooterText(new Date('2026-07-14T12:00:00Z')) },
      'reportHtml',
      strings,
    );
    expect(strings.length).toBeGreaterThan(10);
    expect(offenders(strings)).toEqual([]);
  });
});
