import { describe, it, expect } from 'vitest';
import { RESPONSE_FORMAT } from './reportSchema';
import { reportSections } from './rapportStructure';

// Vérifie récursivement les invariants du mode strict OpenAI :
// tout objet a additionalProperties:false et required == clés de properties.
function assertStrict(node: any, path = 'schema') {
  const types = Array.isArray(node.type) ? node.type : [node.type];
  if (types.includes('object')) {
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

describe('reportSchema — sortie structurée OpenAI', () => {
  const schema: any = RESPONSE_FORMAT.json_schema.schema;
  const sectionItem: any = schema.properties.sections.items;

  it('est en mode strict', () => {
    expect(RESPONSE_FORMAT.json_schema.strict).toBe(true);
  });

  it('respecte les contraintes du mode strict (récursivement)', () => {
    assertStrict(schema);
  });

  it('l’enum des id de section correspond exactement à reportSections', () => {
    expect([...sectionItem.properties.id.enum]).toEqual(reportSections.map((s) => s.id));
  });

  it('les enums métier correspondent au vocabulaire contrôlé', () => {
    const familles = sectionItem.properties.familles.items.properties;
    expect([...familles.exposition.enum]).toEqual(['faible', 'modérée', 'élevée', 'à confirmer']);
    expect([...familles.natures.items.enum]).toEqual(['automatisation', 'augmentation', 'création']);
    expect([...familles.confiance.enum]).toEqual(['élevée', 'moyenne', 'faible']);
  });
});
