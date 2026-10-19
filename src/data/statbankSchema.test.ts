import { afterEach, describe, expect, it } from 'vitest';
import {
  rowsToStatbank,
  seedRows,
  sourceInputSchema,
  statInputSchema,
  statWarnings,
  type StatRow,
  type StatSourceRow,
} from './statbankSchema';
import { statbankSeed, setActiveStatbank, resetActiveStatbank, getStat } from './statbank';
import { codeGrid, gridSections, reportSections, statsForSection } from './rapportStructure';

const NOW = '2026-10-19T00:00:00Z';

/** La graine, telle que la migration 0007 la pose en base. */
function seededTables(): { sources: StatSourceRow[]; stats: StatRow[] } {
  const { sources, stats } = seedRows(statbankSeed, codeGrid());
  return {
    sources: sources.map((s) => ({
      ...s,
      in_socle: s.code.startsWith('S'),
      archived_at: null,
      updated_at: NOW,
      updated_by: null,
    })),
    stats: stats.map((s) => ({ ...s, archived_at: null, updated_at: NOW, updated_by: null })),
  };
}

const VALID_STAT = {
  id: 'test-2026-exemple',
  sourceCode: 'S06',
  value: '42,5',
  unit: '%',
  claim: 'En 2026, 42,5 % des entreprises interrogées déclarent un usage régulier de l’IA.',
  verbatim: '42.5% of companies report regular AI use',
  theme: 'adoption',
  scope: 'monde',
  provenance: 'primaire',
  projection: false,
  isco: ['25', '24', '25'],
  page: 'p.12',
  originalSource: '',
};

afterEach(() => resetActiveStatbank());

describe('statbankSchema — seed et relecture', () => {
  it('la graine passe le contrat : aucune ligne écartée au rechargement', () => {
    const { sources, stats } = seededTables();
    const loaded = rowsToStatbank(sources, stats, gridSections());
    expect(loaded.rejected).toEqual([]);
    expect(loaded.stats).toHaveLength(statbankSeed.length);
  });

  it('le rechargement restitue chaque entrée de la graine à l’identique', () => {
    const { sources, stats } = seededTables();
    const loaded = rowsToStatbank(sources, stats, gridSections());
    const byId = new Map(loaded.stats.map((s) => [s.id, s]));
    for (const seed of statbankSeed) {
      const got = byId.get(seed.id)!;
      expect(got, seed.id).toBeDefined();
      expect(got.claim, seed.id).toBe(seed.claim);
      expect(got.value, seed.id).toBe(seed.value);
      expect(got.source, seed.id).toEqual(seed.source);
      expect(got.isco, seed.id).toEqual(seed.isco ? [...seed.isco].sort() : undefined);
      expect(Boolean(got.projection), seed.id).toBe(Boolean(seed.projection));
    }
  });

  it('la grille seedée reproduit celle du code', () => {
    const { sources, stats } = seededTables();
    const loaded = rowsToStatbank(sources, stats, gridSections());
    for (const [sectionId, codes] of Object.entries(codeGrid())) {
      expect([...loaded.grid[sectionId]].sort(), sectionId).toEqual([...codes].sort());
    }
  });

  it('banque chargée = mêmes stats par section que la graine', () => {
    const { sources, stats } = seededTables();
    const before = new Map(reportSections.map((s) => [s.id, statsForSection(s).map((x) => x.id).sort()]));
    const loaded = rowsToStatbank(sources, stats, gridSections());
    setActiveStatbank(loaded.stats, loaded.grid);
    for (const s of reportSections) {
      expect(statsForSection(s).map((x) => x.id).sort(), s.id).toEqual(before.get(s.id));
    }
  });
});

describe('statbankSchema — archivage et grille éditée', () => {
  it('une stat archivée disparaît de la banque active', () => {
    const { sources, stats } = seededTables();
    const cible = stats[0].id;
    stats[0].archived_at = NOW;
    const loaded = rowsToStatbank(sources, stats, gridSections());
    setActiveStatbank(loaded.stats, loaded.grid);
    expect(getStat(cible)).toBeUndefined();
    expect(loaded.rejected).toEqual([]);
  });

  it('archiver un document retire toutes ses stats', () => {
    const { sources, stats } = seededTables();
    sources.find((s) => s.code === 'S06')!.archived_at = NOW;
    const loaded = rowsToStatbank(sources, stats, gridSections());
    expect(loaded.stats.some((s) => s.source.sourceId === 'S06')).toBe(false);
    expect(Object.values(loaded.grid).some((codes) => codes.includes('S06'))).toBe(false);
  });

  it('la grille éditée prime sur celle du code dans statsForSection', () => {
    const { sources, stats } = seededTables();
    // On retire S06 de toutes les sections et on l'autorise seulement en §6.
    sources.find((s) => s.code === 'S06')!.sections = ['facteur-humain'];
    const loaded = rowsToStatbank(sources, stats, gridSections());
    setActiveStatbank(loaded.stats, loaded.grid);
    const sec = (id: string) => reportSections.find((s) => s.id === id)!;
    expect(statsForSection(sec('facteur-humain')).some((s) => s.source.sourceId === 'S06')).toBe(true);
    expect(statsForSection(sec('competences')).some((s) => s.source.sourceId === 'S06')).toBe(false);
  });

  it('une ligne non conforme éditée en SQL est écartée et signalée', () => {
    const { sources, stats } = seededTables();
    stats[0].claim = 'Un claim avec un point-virgule ; interdit dans le rapport.';
    const loaded = rowsToStatbank(sources, stats, gridSections());
    expect(loaded.rejected.map((r) => r.id)).toEqual([stats[0].id]);
  });
});

describe('statbankSchema — saisie', () => {
  it('normalise une saisie valide (virgule décimale, ISCO dédoublonnés, vides → null)', () => {
    const r = statInputSchema.parse(VALID_STAT);
    expect(r.value).toBe(42.5);
    expect(r.isco).toEqual(['24', '25']);
    expect(r.originalSource).toBeNull();
  });

  it('nettoie un claim collé depuis un PDF sans casser les mots ni la typographie', () => {
    const r = statInputSchema.parse({
      ...VALID_STAT,
      claim: 'En 2026, 42,5 % des entre­prises interrogées déclarent un usage régulier de l’IA.',
    });
    expect(r.claim).toBe('En 2026, 42,5 % des entreprises interrogées déclarent un usage régulier de l’IA.');
  });

  it('refuse un claim avec tiret long ou point-virgule', () => {
    for (const bad of ['Un claim — avec tiret long ici.', 'Un claim avec point-virgule ; ici.']) {
      expect(statInputSchema.safeParse({ ...VALID_STAT, claim: bad }).success, bad).toBe(false);
    }
  });

  it('refuse un id hors kebab-case et un code ISCO inconnu', () => {
    expect(statInputSchema.safeParse({ ...VALID_STAT, id: 'Pas Kebab' }).success).toBe(false);
    expect(statInputSchema.safeParse({ ...VALID_STAT, isco: ['99'] }).success).toBe(false);
  });

  it('avertit (sans bloquer) une secondaire sans source d’origine', () => {
    const r = statInputSchema.parse({ ...VALID_STAT, provenance: 'secondaire' });
    expect(statWarnings(r)).toHaveLength(1);
    expect(statWarnings(statInputSchema.parse(VALID_STAT))).toEqual([]);
  });

  it('valide un document source et ses sections', () => {
    const schema = sourceInputSchema(gridSections().map((g) => g.id));
    const ok = schema.safeParse({ code: 'fr6', nature: 'recherche', report: 'DARES 2026', org: 'DARES', year: '2026', sections: ['contexte'] });
    expect(ok.success && ok.data.code).toBe('FR6');
    expect(schema.safeParse({ code: 'X1', nature: 'recherche', report: 'abc', org: 'ab', year: 2026 }).success).toBe(false);
    expect(
      schema.safeParse({ code: 'S18', nature: 'recherche', report: 'abc', org: 'ab', year: 2026, sections: ['synthese-executive'] })
        .success,
    ).toBe(false);
  });
});
