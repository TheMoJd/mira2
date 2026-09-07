import { describe, it, expect } from 'vitest';
import {
  reportSections,
  statsForSection,
  statBearingSections,
  corpsSections,
  syntheseSection,
  codeSections,
  inheritedStatIds,
  enforceSectionGrid,
  HERITAGE_SECTION_IDS,
  COMMENT_UTILISER_PARAGRAPHES,
  COMMENT_UTILISER_CTA,
  CALIBRAGE_COURT,
  LIGNE_PERIMETRE,
} from './rapportStructure';
import { statbank } from './statbank';

const ALL_SOURCE_IDS = new Set(statbank.map((s) => s.source.sourceId));

describe('rapportStructure — déroulé §0 → §9 (+ §8bis)', () => {
  it('a 11 blocs ordonnés, §8bis intercalé entre §8 et §9, ids uniques', () => {
    expect(reportSections).toHaveLength(11);
    expect(reportSections.map((s) => s.numLabel)).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '8bis',
      '9',
    ]);
    // `num` est croissant : c'est lui qui ordonne le document assemblé.
    const nums = reportSections.map((s) => s.num);
    expect([...nums].sort((a, b) => a - b)).toEqual(nums);
    const ids = reportSections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('répartit les sections entre les deux appels et les textes figés du code', () => {
    // Premier appel : le corps (§0, §2 → §8). Second appel : la synthèse §1.
    expect(corpsSections().map((s) => s.id)).toEqual([
      'perimetre',
      'contexte',
      'familles-metiers',
      'competences',
      'reorganisation',
      'facteur-humain',
      'repere-sectoriel',
      'lecture-strategique',
    ]);
    expect(syntheseSection().id).toBe('synthese-executive');
    expect(codeSections().map((s) => s.id)).toEqual(['comment-utiliser', 'sources-methode']);
  });

  it('les sections figées portent leurs paragraphes et aucune consigne au modèle', () => {
    for (const section of codeSections()) {
      expect(section.fixedParagraphs?.length, section.id).toBeGreaterThan(0);
      expect(section.llmBrief, section.id).toBeUndefined();
    }
    // Le pont vers l'offre approfondie vit dans §8bis, pas dans §8.
    expect(COMMENT_UTILISER_PARAGRAPHES[COMMENT_UTILISER_PARAGRAPHES.length - 1]).toBe(COMMENT_UTILISER_CTA);
    expect(reportSections.find((s) => s.id === 'lecture-strategique')?.fixedParagraphs).toBeUndefined();
  });

  it('les deux lignes figées de la première page sont sans vocabulaire de décision', () => {
    for (const ligne of [CALIBRAGE_COURT, LIGNE_PERIMETRE]) {
      expect(ligne).not.toMatch(/vous devez|il faut|feuille de route/i);
    }
  });

  it('chaque section du modèle porte un budget de mots, §3 en plus par famille', () => {
    for (const section of [...corpsSections(), syntheseSection()]) {
      expect(section.wordBudget, section.id).toBeDefined();
      expect(section.wordBudget!.min).toBeLessThan(section.wordBudget!.max);
    }
    const s3 = reportSections.find((s) => s.id === 'familles-metiers')!;
    expect(s3.wordBudget).toEqual({ min: 40, max: 60 });
    expect(s3.wordBudgetPerFamille).toEqual({ min: 80, max: 140 });
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
    const lecture = reportSections.find((s) => s.id === 'lecture-strategique')!;
    expect(statsForSection(lecture)).toEqual([]);
  });

  it('le cœur §3 cible les sources métier du socle (+ McKinsey terrain S15, + couche France RH) ; DARES exclu (dynamique d’emploi, pas exposition)', () => {
    const s3 = reportSections.find((s) => s.id === 'familles-metiers')!;
    expect(s3.allowedSources).toEqual(['S01', 'S06', 'S10', 'S12', 'S13', 'S14', 'S15', 'FR1', 'FR2']);
    expect(s3.allowedSources).not.toContain('FR5'); // DARES = contexte (§6/§7), pas exposition
  });
});

describe('liste héritée — la première page ne cite que le corps', () => {
  const report = {
    sections: [
      { id: 'synthese-executive', sources_citees: ['a', 'inconnu-hors-corps'] },
      { id: 'contexte', sources_citees: ['a'] },
      { id: 'repere-sectoriel', sources_citees: ['b'] },
      // §8 n'alimente pas la liste héritée (§2 → §7 seulement).
      { id: 'lecture-strategique', sources_citees: ['c'] },
    ],
  };

  it('inheritedStatIds = union des sources_citees de §2 à §7', () => {
    expect(HERITAGE_SECTION_IDS).not.toContain('lecture-strategique');
    expect([...inheritedStatIds(report)].sort()).toEqual(['a', 'b']);
  });

  it('enforceSectionGrid réduit §1 à la liste héritée', () => {
    const out = enforceSectionGrid(structuredClone(report));
    expect(out.sections[0].sources_citees).toEqual(['a']);
  });
});
