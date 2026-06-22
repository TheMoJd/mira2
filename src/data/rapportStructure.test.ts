import { describe, it, expect } from 'vitest';
import { reportSections, statsForSection, statBearingSections } from './rapportStructure';
import { statbank } from './statbank';

const ALL_SOURCE_IDS = new Set(statbank.map((s) => s.source.sourceId));

describe('rapportStructure — blueprint §0→§9', () => {
  it('a 10 blocs numérotés 0 à 9, ids uniques', () => {
    expect(reportSections).toHaveLength(10);
    expect(reportSections.map((s) => s.num)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const ids = reportSections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('chaque code de allowedSources est "*" ou une vraie source de la banque', () => {
    for (const section of reportSections) {
      for (const code of section.allowedSources) {
        if (code === '*') continue;
        expect(ALL_SOURCE_IDS, `${section.id} → ${code}`).toContain(code);
      }
    }
  });

  it('statsForSection ne renvoie que des stats autorisées', () => {
    for (const section of statBearingSections()) {
      if (section.allowedSources.includes('*')) continue;
      const allowed = new Set(section.allowedSources);
      for (const s of statsForSection(section)) {
        expect(allowed, `${section.id}`).toContain(s.source.sourceId);
      }
    }
  });

  it('une section sans stats renvoie une liste vide', () => {
    const perimetre = reportSections.find((s) => s.id === 'perimetre')!;
    expect(statsForSection(perimetre)).toEqual([]);
  });

  it('le cœur §3 (familles-metiers) cible les sources métier du socle + la couche France RH', () => {
    const s3 = reportSections.find((s) => s.id === 'familles-metiers')!;
    expect(s3.allowedSources).toEqual(['S01', 'S06', 'S10', 'S12', 'S13', 'S14', 'FR1', 'FR2']);
  });
});
