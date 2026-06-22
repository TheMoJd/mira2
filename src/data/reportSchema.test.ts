import { describe, it, expect } from 'vitest';
import { RESPONSE_FORMAT, PreRapportSchema, parseReport } from './reportSchema';
import { reportSections } from './rapportStructure';

// Le `response_format` est désormais dérivé de la source unique `PreRapportSchema`
// via `zodResponseFormat`. On vérifie (1) que la forme générée respecte les
// invariants du mode strict OpenAI, (2) qu'elle reste alignée sur le vocabulaire
// contrôlé, et (3) que `parseReport` valide réellement la réponse du modèle.

/**
 * Vérifie récursivement les invariants du mode strict OpenAI sur chaque objet :
 * additionalProperties:false et required == clés de properties. Gère `anyOf`
 * (forme générée pour les champs `nullable`) et `items`.
 */
function assertStrict(node: any, path = 'schema'): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node.anyOf)) {
    node.anyOf.forEach((child: any, i: number) => assertStrict(child, `${path}.anyOf[${i}]`));
  }
  const types = Array.isArray(node.type) ? node.type : [node.type];
  if (types.includes('object') || node.properties) {
    expect(node.additionalProperties, `${path}.additionalProperties`).toBe(false);
    const keys = Object.keys(node.properties ?? {}).sort();
    expect([...(node.required ?? [])].sort(), `${path}.required`).toEqual(keys);
    for (const [k, child] of Object.entries(node.properties ?? {})) {
      assertStrict(child, `${path}.${k}`);
    }
  }
  if (types.includes('array') && node.items) {
    assertStrict(node.items, `${path}[]`);
  }
}

/** Branche non-null d'un champ nullable généré (`anyOf:[<T>, {type:"null"}]`). */
function nonNullBranch(node: any): any {
  return node.anyOf?.find((b: any) => b.type !== 'null') ?? node;
}

describe('reportSchema — `response_format` dérivé (mode strict OpenAI)', () => {
  const schema: any = RESPONSE_FORMAT.json_schema.schema;
  const sectionItem: any = schema.properties.sections.items;

  it('est en mode strict', () => {
    expect(RESPONSE_FORMAT.json_schema.strict).toBe(true);
    expect(RESPONSE_FORMAT.json_schema.name).toBe('prerapport_mira');
  });

  it('respecte les contraintes du mode strict (récursivement)', () => {
    assertStrict(schema);
  });

  it('l’enum des id de section correspond exactement à reportSections', () => {
    expect([...sectionItem.properties.id.enum]).toEqual(reportSections.map((s) => s.id));
  });

  it('les enums métier correspondent au vocabulaire contrôlé', () => {
    const familles = nonNullBranch(sectionItem.properties.familles).items.properties;
    expect([...familles.exposition.enum]).toEqual(['faible', 'modérée', 'élevée', 'à confirmer']);
    expect([...familles.natures.items.enum]).toEqual(['automatisation', 'augmentation', 'création']);
    expect([...familles.confiance.enum]).toEqual(['élevée', 'moyenne', 'faible']);
  });
});

describe('parseReport — validation runtime de la réponse du modèle', () => {
  const validReport = {
    sections: [
      { id: 'perimetre', titre: 'Périmètre', contenu: [{ intertitre: null, paragraphes: ['ok'] }], sources_citees: [], familles: null },
      {
        id: 'familles-metiers',
        titre: 'Vos familles',
        contenu: [{ intertitre: 'Intro', paragraphes: ['p'] }],
        sources_citees: ['S01'],
        familles: [
          {
            famille: 'Tech',
            exposition: 'élevée',
            natures: ['augmentation', 'automatisation'],
            part_taches: 'jusqu’à 40 %',
            confiance: 'moyenne',
            transposable_france: true,
            explication: 'e',
          },
        ],
      },
    ],
  };

  it('accepte une réponse conforme et la renvoie typée', () => {
    expect(parseReport(JSON.stringify(validReport))).toEqual(validReport);
  });

  it('lève une erreur explicite sur un JSON illisible', () => {
    expect(() => parseReport('{ pas du json')).toThrow(/JSON invalide/);
  });

  it('rejette une valeur hors du vocabulaire contrôlé', () => {
    const bad = structuredClone(validReport);
    (bad.sections[1].familles as any)[0].exposition = 'catastrophique';
    expect(() => parseReport(JSON.stringify(bad))).toThrow(/non conforme/);
  });

  it('rejette une section à laquelle il manque un champ requis', () => {
    const bad = { sections: [{ id: 'perimetre', titre: 'x', contenu: [], sources_citees: [] }] };
    expect(() => parseReport(JSON.stringify(bad))).toThrow(/non conforme/);
  });

  it('rejette une §3 (familles-metiers) sans caractérisation de famille', () => {
    const bad = structuredClone(validReport);
    (bad.sections[1] as any).familles = null;
    expect(() => parseReport(JSON.stringify(bad))).toThrow(/§3 doit porter/);
  });

  it('rejette des familles posées hors de la §3', () => {
    const bad = structuredClone(validReport);
    (bad.sections[0] as any).familles = (validReport.sections[1] as any).familles;
    expect(() => parseReport(JSON.stringify(bad))).toThrow(/réservé à §3/);
  });

  it('le schéma source accepte les 10 ids de section réels', () => {
    for (const s of reportSections) {
      const ok = PreRapportSchema.safeParse({
        sections: [{ id: s.id, titre: s.title, contenu: [], sources_citees: [], familles: null }],
      });
      expect(ok.success, `section ${s.id}`).toBe(true);
    }
  });
});
