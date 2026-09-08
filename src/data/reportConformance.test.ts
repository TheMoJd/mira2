import { describe, it, expect } from 'vitest';
import { CORPS_CONFORME, SYNTHESE_CONFORME, CONTEXTE_CONFORME } from './__fixtures__/rapportConforme';
import { assembleReport, parseCorps, parseSynthese, PreRapportSchema } from './reportSchema';
import { validateReport, blockingFindings } from './reportValidation';
import { buildCitationIndex } from './reportCitations';
import { renderReportHtml } from './reportHtml';
import { statById } from './statbank';
import { SOURCES_SECTION_TITLE } from './rapportStructure';

/**
 * Le contrat de sortie est-il SATISFAISABLE ?
 *
 * Les contrôles V1 → V12 sont sévères. Un jeu de règles sévère peut être
 * impossible à satisfaire, et le code ne le dirait pas : il marquerait chaque
 * rapport pour relecture, indéfiniment, et l'équipe apprendrait à ignorer le
 * signal. Ce test est le garde-fou contre ce scénario : un rapport bien formé
 * passe les douze contrôles sans un seul échec, ni même un avertissement.
 *
 * Il sert aussi de test d'intégration de bout en bout de la chaîne de rendu :
 * assemblage, numérotation des notes, section des références, encart §1.
 */
describe('rapport de référence — le contrat est satisfaisable', () => {
  const report = assembleReport(CORPS_CONFORME, SYNTHESE_CONFORME);

  it('la fixture respecte les deux contrats d’appel du modèle', () => {
    // Ce que le modèle doit produire est bien ce que les parseurs acceptent.
    expect(parseCorps(JSON.stringify(CORPS_CONFORME))).toEqual(CORPS_CONFORME);
    expect(parseSynthese(JSON.stringify(SYNTHESE_CONFORME))).toEqual(SYNTHESE_CONFORME);
    expect(PreRapportSchema.safeParse(report).success).toBe(true);
  });

  it('passe les contrôles V1 → V12 sans échec bloquant ni avertissement', () => {
    const findings = validateReport(report);
    // Message d'échec lisible : le détail des contrôles, pas juste un compte.
    expect(findings.map((f) => `[${f.code}] §${f.sectionId} : ${f.message}`)).toEqual([]);
    expect(blockingFindings(findings)).toEqual([]);
  });

  it('couvre le cas honnête : deux familles que le socle ne documente pas', () => {
    const familles = report.sections.find((s) => s.id === 'familles-metiers')!.familles!;
    expect(familles).toHaveLength(3);
    expect(familles.filter((f) => f.exposition === 'à confirmer')).toHaveLength(2);
    // La famille documentée directement porte sa part de tâches.
    const compta = familles.find((f) => f.exposition === 'élevée')!;
    expect(compta.part_taches).toBe('jusqu’à 82 %');
    // Aucune caractérisation ne porte plus de confiance ni de transposabilité.
    for (const f of familles) {
      expect(Object.keys(f).sort()).toEqual([
        'explication',
        'exposition',
        'famille',
        'natures',
        'part_taches',
      ]);
    }
  });

  it('la synthèse §1 ne cite que des chiffres déjà exposés dans le corps', () => {
    const synthese = report.sections.find((s) => s.id === 'synthese-executive')!;
    const corpsIds = new Set(
      report.sections
        .filter((s) => !['synthese-executive', 'comment-utiliser', 'sources-methode'].includes(s.id))
        .flatMap((s) => s.sources_citees),
    );
    for (const id of synthese.sources_citees) {
      expect(corpsIds, `§1 cite ${id}`).toContain(id);
    }
    // Trois à cinq chiffres dans l'encart, un point clé par axe.
    expect(synthese.sources_citees.length).toBeGreaterThanOrEqual(3);
    expect(synthese.sources_citees.length).toBeLessThanOrEqual(5);
    expect(synthese.encart!.points_cles.map((p) => p.axe)).toEqual([
      'exposition',
      'concentration',
      'competences',
      'besoins',
    ]);
  });

  it('numérote les notes en continu, la première page d’abord', () => {
    const index = buildCitationIndex(report);
    // Le chiffre-signal de la §1 est le premier appel de note du document.
    expect(index.numberById.get('ilo-2023-clerical-exposure-82')).toBe(1);
    const numeros = index.groups.flatMap((g) => g.notes.map((n) => n.n));
    expect(numeros).toEqual(Array.from({ length: numeros.length }, (_, i) => i + 1));
    // Chaque statistique citée dans le rapport reçoit exactement une note.
    const citees = new Set(report.sections.flatMap((s) => s.sources_citees));
    expect(numeros).toHaveLength(citees.size);
    for (const id of citees) expect(statById[id], `stat ${id}`).toBeDefined();
  });

  it('se rend en HTML sans laisser de marqueur brut et avec ses références', () => {
    const html = renderReportHtml(report, CONTEXTE_CONFORME);
    expect(html).not.toContain('[[');
    expect(html).not.toContain(']]');
    // L'encart de synthèse, le cœur §3, l'encart §8bis et les références.
    expect(html).toContain('82 %');
    expect(html).toContain('Exposition à confirmer');
    expect(html).toContain('Comment utiliser ce rapport');
    expect(html).toContain(SOURCES_SECTION_TITLE);
    expect(html).toContain('Périmètre France.');
    expect(html).toContain('Source commerciale.');
    // Aucune référence de source dans le corps : ni organisation, ni année parenthésée.
    const corps = html.slice(html.indexOf('§0 · '), html.indexOf(SOURCES_SECTION_TITLE));
    expect(corps).not.toContain('World Economic Forum');
    expect(corps).not.toMatch(/\(\s*(?:19|20)\d{2}\s*\)/);
  });
});

describe('V5 — « OCDE » comme périmètre géographique', () => {
  it('n’avertit pas quand le nom sert à nommer le périmètre du chiffre', () => {
    // La règle 3 EXIGE de nommer le périmètre dans la phrase : l'avertissement ne
    // doit pas punir la phrase conforme.
    const findings = validateReport({
      sections: [
        {
          id: 'facteur-humain',
          titre: 'Le facteur humain',
          contenu: [
            {
              intertitre: null,
              paragraphes: [
                `Dans les pays de l’OCDE, 22 % des travailleurs peu diplômés occupent un métier à haut risque d’automatisation [[s14-2024-risque-auto-diplome-22]]. ${Array.from(
                  { length: 150 },
                  () => 'mot',
                ).join(' ')}`,
              ],
            },
          ],
          sources_citees: ['s14-2024-risque-auto-diplome-22'],
          familles: null,
          encart: null,
        },
      ],
    });
    expect(findings.filter((f) => f.code === 'V5')).toEqual([]);
  });

  it('avertit toujours quand le nom sert à créditer la source', () => {
    const findings = validateReport({
      sections: [
        {
          id: 'facteur-humain',
          titre: 'Le facteur humain',
          contenu: [{ intertitre: null, paragraphes: ['Selon l’OCDE, le risque est inégal.'] }],
          sources_citees: [],
          familles: null,
          encart: null,
        },
      ],
    });
    expect(findings.filter((f) => f.code === 'V5')).toHaveLength(1);
  });
});
