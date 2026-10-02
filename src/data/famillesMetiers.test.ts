import { describe, it, expect } from 'vitest';
import { famillesMetiers, domainesOrdre, famillesParDomaine } from './famillesMetiers';

describe('famillesMetiers — champ guidé Q4', () => {
  it('contient les 29 familles', () => {
    expect(famillesMetiers).toHaveLength(29);
  });

  it('ids uniques et codes ISCO non vides', () => {
    const ids = famillesMetiers.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const fam of famillesMetiers) {
      expect(fam.isco.length, fam.id).toBeGreaterThan(0);
      expect(domainesOrdre, fam.id).toContain(fam.domaine);
    }
  });

  it('management commercial et administratif : deux familles, un même ISCO 12', () => {
    const byId = (id: string) => famillesMetiers.find((f) => f.id === id);
    expect(byId('management-commercial-admin')).toBeUndefined();
    for (const id of ['management-commercial', 'management-administratif']) {
      expect(byId(id), id).toMatchObject({ isco: ['12'], domaine: 'Direction & encadrement' });
    }
    // Libellés distincts : le wizard stocke le libellé, qui doit rester non ambigu.
    expect(byId('management-commercial')?.label).toBe('Management commercial');
    expect(byId('management-administratif')?.label).toBe('Management administratif');
  });

  it('le regroupement par domaine couvre toutes les familles', () => {
    const groupes = famillesParDomaine();
    const total = Object.values(groupes).reduce((n, arr) => n + arr.length, 0);
    expect(total).toBe(famillesMetiers.length);
    expect(Object.keys(groupes).sort()).toEqual([...domainesOrdre].sort());
  });
});
