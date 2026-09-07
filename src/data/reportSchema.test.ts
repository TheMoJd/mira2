import { describe, it, expect } from 'vitest';
import {
  RESPONSE_FORMAT_CORPS,
  RESPONSE_FORMAT_SYNTHESE,
  PreRapportSchema,
  parseCorps,
  parseSynthese,
  parseReport,
  assembleReport,
} from './reportSchema';
import {
  reportSections,
  corpsSections,
  CALIBRAGE_COURT,
  LIGNE_PERIMETRE,
  COMMENT_UTILISER_PARAGRAPHES,
} from './rapportStructure';

// Les deux `response_format` sont dérivés des schémas zod via `zodResponseFormat`.
// On vérifie (1) que la forme générée respecte les invariants du mode strict
// OpenAI, (2) qu'elle reste alignée sur le vocabulaire contrôlé, (3) que les
// parseurs valident réellement les réponses, (4) que l'assemblage injecte bien les
// textes figés du code.

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

describe('reportSchema — `response_format` du premier appel (le corps)', () => {
  const schema: any = RESPONSE_FORMAT_CORPS.json_schema.schema;
  const sectionItem: any = schema.properties.sections.items;

  it('est en mode strict', () => {
    expect(RESPONSE_FORMAT_CORPS.json_schema.strict).toBe(true);
    expect(RESPONSE_FORMAT_CORPS.json_schema.name).toBe('prerapport_mira_corps');
  });

  it('respecte les contraintes du mode strict (récursivement)', () => {
    assertStrict(schema);
  });

  it('n’expose que les sections du premier appel (ni §1, ni les sections figées)', () => {
    expect([...sectionItem.properties.id.enum]).toEqual(corpsSections().map((s) => s.id));
    expect([...sectionItem.properties.id.enum]).not.toContain('synthese-executive');
    expect([...sectionItem.properties.id.enum]).not.toContain('comment-utiliser');
  });

  it('les enums métier correspondent au vocabulaire contrôlé', () => {
    const familles = nonNullBranch(sectionItem.properties.familles).items.properties;
    expect([...familles.exposition.enum]).toEqual(['faible', 'modérée', 'élevée', 'à confirmer']);
    expect([...familles.natures.items.enum]).toEqual(['automatisation', 'augmentation', 'création']);
  });

  it('la caractérisation §3 ne porte plus ni confiance ni transposable_france (décision Caroline)', () => {
    const familles = nonNullBranch(sectionItem.properties.familles).items.properties;
    expect(Object.keys(familles).sort()).toEqual([
      'explication',
      'exposition',
      'famille',
      'natures',
      'part_taches',
    ]);
  });
});

describe('reportSchema — `response_format` du second appel (la synthèse §1)', () => {
  const schema: any = RESPONSE_FORMAT_SYNTHESE.json_schema.schema;
  const encart: any = schema.properties.section.properties.encart.properties;

  it('est en mode strict et ne porte que §1', () => {
    expect(RESPONSE_FORMAT_SYNTHESE.json_schema.strict).toBe(true);
    expect(RESPONSE_FORMAT_SYNTHESE.json_schema.name).toBe('prerapport_mira_synthese');
    assertStrict(schema);
    expect(schema.properties.section.properties.id.const).toBe('synthese-executive');
  });

  it('impose chapeau, chiffre-signal et points clés par axe', () => {
    expect(Object.keys(encart).sort()).toEqual(['chapeau', 'chiffre_signal', 'points_cles']);
    expect([...encart.points_cles.items.properties.axe.enum]).toEqual([
      'exposition',
      'concentration',
      'competences',
      'besoins',
    ]);
  });

  it('ne demande PAS au modèle les deux lignes injectées par le code', () => {
    expect(Object.keys(encart)).not.toContain('calibrage_court');
    expect(Object.keys(encart)).not.toContain('perimetre');
  });
});

// --- Fixtures --------------------------------------------------------------

const corps = {
  sections: [
    {
      id: 'perimetre',
      titre: 'Périmètre',
      contenu: [{ intertitre: null, paragraphes: ['ok'] }],
      sources_citees: [],
      familles: null,
    },
    {
      id: 'familles-metiers',
      titre: 'Vos familles',
      contenu: [{ intertitre: 'Intro', paragraphes: ['p'] }],
      sources_citees: ['wef-2025-skills-transformed-39'],
      familles: [
        {
          famille: 'Tech',
          exposition: 'élevée',
          natures: ['augmentation', 'automatisation'],
          part_taches: 'jusqu’à 40 %',
          explication: 'e [[wef-2025-skills-transformed-39]]',
        },
      ],
    },
  ],
};

const synthese = {
  section: {
    id: 'synthese-executive',
    titre: 'Synthèse exécutive',
    encart: {
      chapeau: 'Acme et ses métiers tech.',
      chiffre_signal: {
        valeur: '39 %',
        phrase: 'des compétences transformées',
        source_id: 'wef-2025-skills-transformed-39',
      },
      points_cles: [
        {
          axe: 'exposition',
          titre: 'Les tâches se déplacent',
          texte: 'Constat [[wef-2025-skills-transformed-39]].',
          source_id: 'wef-2025-skills-transformed-39',
        },
      ],
    },
    contenu: [],
    sources_citees: ['wef-2025-skills-transformed-39'],
  },
};

describe('parseCorps / parseSynthese — validation runtime des réponses du modèle', () => {
  it('accepte des réponses conformes et les renvoie typées', () => {
    expect(parseCorps(JSON.stringify(corps))).toEqual(corps);
    expect(parseSynthese(JSON.stringify(synthese))).toEqual(synthese);
  });

  it('applique le verrou de style (sanitizeReportProse) sur la sortie du modèle', () => {
    // Garantit que le câblage parseCorps → sanitizeReportProse ne peut pas
    // disparaître silencieusement (zéro tiret long, zéro « ; »).
    const dirty = structuredClone(corps);
    dirty.sections[0].contenu[0].paragraphes = ['Un impact fort — mesuré ; net.'];
    const out = parseCorps(JSON.stringify(dirty));
    expect(out.sections[0].contenu[0].paragraphes[0]).toBe('Un impact fort, mesuré, net.');
  });

  it('lève une erreur explicite sur un JSON illisible', () => {
    expect(() => parseCorps('{ pas du json')).toThrow(/JSON invalide/);
  });

  it('rejette une valeur hors du vocabulaire contrôlé', () => {
    const bad = structuredClone(corps);
    (bad.sections[1].familles as any)[0].exposition = 'catastrophique';
    expect(() => parseCorps(JSON.stringify(bad))).toThrow(/non conforme/);
  });

  it('rejette une section à laquelle il manque un champ requis', () => {
    const bad = { sections: [{ id: 'perimetre', titre: 'x', contenu: [], sources_citees: [] }] };
    expect(() => parseCorps(JSON.stringify(bad))).toThrow(/non conforme/);
  });

  it('rejette une §3 (familles-metiers) sans caractérisation de famille', () => {
    const bad = structuredClone(corps);
    (bad.sections[1] as any).familles = null;
    expect(() => parseCorps(JSON.stringify(bad))).toThrow(/§3 doit porter/);
  });

  it('rejette des familles posées hors de la §3', () => {
    const bad = structuredClone(corps);
    (bad.sections[0] as any).familles = (corps.sections[1] as any).familles;
    expect(() => parseCorps(JSON.stringify(bad))).toThrow(/réservé à §3/);
  });

  it('refuse un autre id de section dans la réponse de la synthèse', () => {
    const bad = structuredClone(synthese);
    (bad.section as any).id = 'contexte';
    expect(() => parseSynthese(JSON.stringify(bad))).toThrow(/non conforme/);
  });
});

describe('assembleReport — le code injecte ce que le modèle ne rédige pas', () => {
  const report = assembleReport(parseCorps(JSON.stringify(corps)), parseSynthese(JSON.stringify(synthese)));

  it('ordonne les sections selon le déroulé du rapport', () => {
    expect(report.sections.map((s) => s.id)).toEqual([
      'perimetre',
      'synthese-executive',
      'familles-metiers',
      'comment-utiliser',
      'sources-methode',
    ]);
  });

  it('complète l’encart avec les deux lignes figées de la première page', () => {
    const encart = report.sections.find((s) => s.id === 'synthese-executive')!.encart!;
    expect(encart.calibrage_court).toBe(CALIBRAGE_COURT);
    expect(encart.perimetre).toBe(LIGNE_PERIMETRE);
    expect(encart.chapeau).toBe('Acme et ses métiers tech.');
  });

  it('ajoute §8bis et §9 tels quels, hors de portée du modèle', () => {
    const bis = report.sections.find((s) => s.id === 'comment-utiliser')!;
    expect(bis.titre).toBe('Comment utiliser ce rapport');
    expect(bis.contenu[0].paragraphes).toEqual(COMMENT_UTILISER_PARAGRAPHES);
    expect(report.sections.find((s) => s.id === 'sources-methode')!.contenu[0].paragraphes.length).toBeGreaterThan(0);
  });

  it('le document assemblé est conforme au contrat persisté', () => {
    expect(PreRapportSchema.safeParse(report).success).toBe(true);
    expect(parseReport(JSON.stringify(report))).toEqual(report);
  });

  it('le contrat persisté accepte tous les ids de section réels', () => {
    for (const s of reportSections) {
      const ok = PreRapportSchema.safeParse({
        sections: [
          { id: s.id, titre: s.title, contenu: [], sources_citees: [], familles: null, encart: null },
        ],
      });
      expect(ok.success, `section ${s.id}`).toBe(true);
    }
  });
});
