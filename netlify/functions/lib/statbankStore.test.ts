import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadActiveStatbank } from './statbankStore';
import { getStat, getStatbank, resetActiveStatbank, statbankSeed } from '../../../src/data/statbank';
import type { AdminClient } from './admin';

/** Client minimal : `from(table).select().order().range()` renvoie le résultat donné. */
const fakeClient = (tables: Record<string, { data: unknown[] | null; error: { message: string } | null }>) =>
  ({
    from: (table: string) => {
      const q = { select: () => q, order: () => q, range: async () => tables[table] };
      return q;
    },
  }) as unknown as AdminClient;

const NOW = '2026-10-19T00:00:00Z';
const source = { code: 'S06', in_socle: true, nature: 'recherche', report: 'WEF, Future of Jobs 2025', org: 'WEF', year: 2025, sections: ['competences'], note: null, archived_at: null, updated_at: NOW, updated_by: null };
const stat = { id: 'seule-stat', source_code: 'S06', value: 12, unit: '%', claim: 'Une seule statistique, à 12 % des cas observés.', verbatim: '12%', theme: 'emploi', scope: 'monde', provenance: 'primaire', projection: false, isco: [], page: null, original_source: null, archived_at: null, updated_at: NOW, updated_by: null };

afterEach(() => resetActiveStatbank());

describe('loadActiveStatbank', () => {
  it('installe la banque de la base', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const origin = await loadActiveStatbank(fakeClient({ stat_sources: { data: [source], error: null }, stats: { data: [stat], error: null } }));
    expect(origin).toBe('base');
    expect(getStatbank().map((s) => s.id)).toEqual(['seule-stat']);
  });

  it('retombe sur la graine si la table manque (migration non appliquée)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const origin = await loadActiveStatbank(
      fakeClient({ stat_sources: { data: null, error: { message: 'relation "stat_sources" does not exist' } }, stats: { data: [], error: null } }),
    );
    expect(origin).toBe('graine');
    expect(getStatbank()).toBe(statbankSeed);
  });

  it('retombe sur la graine si la banque active est vide', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const origin = await loadActiveStatbank(fakeClient({ stat_sources: { data: [source], error: null }, stats: { data: [], error: null } }));
    expect(origin).toBe('graine');
    expect(getStat(statbankSeed[0].id)).toBeDefined();
  });
});
