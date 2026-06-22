import { describe, it, expect } from 'vitest';
import { famillesMetiers, domainesOrdre, famillesParDomaine } from './famillesMetiers';

describe('famillesMetiers — champ guidé Q4', () => {
  it('contient les 28 familles', () => {
    expect(famillesMetiers).toHaveLength(28);
  });

  it('ids uniques et codes ISCO non vides', () => {
    const ids = famillesMetiers.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const fam of famillesMetiers) {
      expect(fam.isco.length, fam.id).toBeGreaterThan(0);
      expect(domainesOrdre, fam.id).toContain(fam.domaine);
    }
  });

  it('le regroupement par domaine couvre toutes les familles', () => {
    const groupes = famillesParDomaine();
    const total = Object.values(groupes).reduce((n, arr) => n + arr.length, 0);
    expect(total).toBe(famillesMetiers.length);
    expect(Object.keys(groupes).sort()).toEqual([...domainesOrdre].sort());
  });
});
