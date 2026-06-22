import { describe, it, expect } from 'vitest';
import {
  statbank,
  socleStats,
  franceLayerStats,
  statsBySource,
  statById,
} from './statbank';

const THEMES = ['exposition', 'competences', 'emploi', 'adoption', 'productivite', 'formation', 'gouvernance', 'rh'];
const SCOPES = ['monde', 'france', 'europe', 'ocde', 'usa', 'secteur'];
const PROVENANCES = ['primaire', 'secondaire'];

describe('statbank — invariants', () => {
  it('contient des statistiques', () => {
    expect(statbank.length).toBeGreaterThan(50);
  });

  it('les identifiants sont uniques', () => {
    const ids = statbank.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('chaque stat est complète et bien typée', () => {
    for (const s of statbank) {
      expect(typeof s.value, s.id).toBe('number');
      expect(typeof s.unit).toBe('string');
      expect(s.claim.trim().length, s.id).toBeGreaterThan(0);
      expect(s.verbatim.trim().length, s.id).toBeGreaterThan(0);
      expect(THEMES, s.id).toContain(s.theme);
      expect(SCOPES, s.id).toContain(s.scope);
      expect(PROVENANCES, s.id).toContain(s.provenance);
      // Source complète + traçabilité
      expect(s.source.report.length, s.id).toBeGreaterThan(0);
      expect(s.source.org.length, s.id).toBeGreaterThan(0);
      expect(typeof s.source.year, s.id).toBe('number');
      expect(s.source.sourceId, s.id).toMatch(/^(S\d{2}|FR\d)$/);
    }
  });

  it('le drapeau inSocle est cohérent avec le code source (S = socle, FR = couche France)', () => {
    for (const s of statbank) {
      const isSocleCode = s.source.sourceId.startsWith('S');
      expect(s.source.inSocle, s.id).toBe(isSocleCode);
    }
  });

  it('socle + couche France partitionnent exactement la banque', () => {
    expect(socleStats().length + franceLayerStats().length).toBe(statbank.length);
  });

  it('statById et statsBySource sont cohérents', () => {
    const sample = statbank[0];
    expect(statById[sample.id]).toBe(sample);
    expect(statsBySource(sample.source.sourceId)).toContain(sample);
  });
});
