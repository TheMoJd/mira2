import { describe, it, expect } from 'vitest';
import {
  statbankSeed,
  socleStats,
  franceLayerStats,
  statsBySource,
  getStat,
} from './statbank';
import { SOURCE_CODE_RE } from './statbankSchema';

const THEMES = ['exposition', 'competences', 'emploi', 'adoption', 'productivite', 'formation', 'gouvernance', 'rh'];
const SCOPES = ['monde', 'france', 'europe', 'ocde', 'usa', 'secteur'];
const PROVENANCES = ['primaire', 'secondaire'];

describe('statbank — invariants', () => {
  it('contient des statistiques', () => {
    expect(statbankSeed.length).toBeGreaterThan(50);
  });

  it('les identifiants sont uniques', () => {
    const ids = statbankSeed.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('chaque stat est complète et bien typée', () => {
    for (const s of statbankSeed) {
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
      expect(s.source.sourceId, s.id).toMatch(SOURCE_CODE_RE);
    }
  });

  it('le drapeau inSocle est cohérent avec le code source (S = socle, FR = couche France)', () => {
    for (const s of statbankSeed) {
      const isSocleCode = s.source.sourceId.startsWith('S');
      expect(s.source.inSocle, s.id).toBe(isSocleCode);
    }
  });

  it('socle + couche France partitionnent exactement la banque', () => {
    expect(socleStats().length + franceLayerStats().length).toBe(statbankSeed.length);
  });

  it('getStat et statsBySource sont cohérents', () => {
    const sample = statbankSeed[0];
    expect(getStat(sample.id)).toBe(sample);
    expect(statsBySource(sample.source.sourceId)).toContain(sample);
  });

  // La claim est recopiée telle quelle dans les notes « Sources de référence » du PDF et
  // donnée au modèle : elle suit le style du rapport (ni tiret long ni point-virgule).
  // Le verbatim, citation exacte de la source, n'est pas concerné.
  it('aucune claim ne porte de tiret cadratin, demi-cadratin ou point-virgule', () => {
    const fautives = statbankSeed.filter((s) => /[—–;]/.test(s.claim)).map((s) => s.id);
    expect(fautives).toEqual([]);
  });
});
