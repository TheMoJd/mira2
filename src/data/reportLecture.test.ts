import { describe, it, expect } from 'vitest';
import { lireSection, PART_TACHES_SUFFIXE, PART_TACHES_PREFIXES } from './reportLecture';
import type { SectionLisible } from './reportLecture';
import type { ReportSectionOutput, ReportEncart, ReportFamille } from './reportSchema';
import { assembleReport } from './reportSchema';
import { buildCitationIndex } from './reportCitations';
import { COMMENT_UTILISER_PARAGRAPHES, reportSections } from './rapportStructure';
import { CORPS_CONFORME, SYNTHESE_CONFORME } from './__fixtures__/rapportConforme';

const WEF = 'wef-2025-skills-transformed-39';
const STANFORD = 'stanford-2026-genai-adoption-53';
const PWC = 'pwc-2025-revenue-per-employee-3x';

/** Un encart complet, tel que le document assemblé le porte. */
const encart = (over: Partial<ReportEncart> = {}): ReportEncart => ({
  chapeau: 'Acme et ses métiers.',
  chiffre_signal: { valeur: '39 %', phrase: 'des compétences transformées', source_id: WEF },
  points_cles: [
    { axe: 'exposition', titre: 'Les tâches se déplacent', texte: `x [[${STANFORD}]]`, source_id: STANFORD },
    // Marqueur oublié dans le texte : le source_id compte quand même.
    { axe: 'besoins', titre: 'Des besoins apparaissent', texte: 'y', source_id: PWC },
  ],
  calibrage_court: 'ligne de calibrage du code',
  perimetre: 'ligne de périmètre du code',
  ...over,
});

const synthese = (over: Partial<ReportSectionOutput> = {}): ReportSectionOutput => ({
  id: 'synthese-executive',
  titre: 'Synthèse exécutive',
  contenu: [],
  sources_citees: [WEF, STANFORD, PWC],
  familles: null,
  encart: encart(),
  ...over,
});

/** Une §3 avec une famille, pour lire la part de tâches. */
const famille = (part_taches: string | null, explication = `e [[${WEF}]]`): ReportFamille => ({
  famille: 'Comptabilité, paie & gestion des données',
  exposition: 'élevée',
  natures: ['automatisation', 'augmentation'],
  part_taches,
  explication,
});
const s3 = (part_taches: string | null): ReportSectionOutput => ({
  id: 'familles-metiers',
  titre: 'Vos familles de métiers face à l’IA',
  contenu: [{ intertitre: null, paragraphes: ['Intro.'] }],
  sources_citees: [WEF],
  familles: [famille(part_taches)],
  encart: null,
});

describe('lireSection — I1 : l’ordre de lecture fixe la numérotation des notes', () => {
  it('lit l’encart (chiffre-signal puis points clés) avant les familles', () => {
    // Sous un encart, `contenu` n'est pas lu (I2) : l'ordre se vérifie ici entre
    // l'encart et les familles, et ci-dessous entre les blocs et les familles.
    const section: SectionLisible = {
      id: 'section-de-test',
      titre: 't',
      contenu: [],
      familles: [famille(null, 'e [[c]]')],
      encart: encart(),
    };
    const l = lireSection(section);
    expect(l.notes).toEqual([WEF, STANFORD, PWC, 'c']);
    expect(l.encart!.notes).toEqual([WEF, STANFORD, PWC]);
  });

  it('lit les blocs (intertitre puis paragraphes) avant les familles (nom puis explication)', () => {
    const section: SectionLisible = {
      id: 'section-de-test',
      titre: 't',
      contenu: [
        { intertitre: 'Un [[a]]', paragraphes: ['p [[b]]', 'q [[b]]'] },
        { intertitre: null, paragraphes: ['r [[d]]'] },
      ],
      familles: [{ ...famille(null, 'e [[c]]'), famille: 'Nom [[n]]' }],
    };
    const l = lireSection(section);
    // Doublons conservés, marqueur d'un libellé compris (il est imprimé, donc numéroté).
    expect(l.notes).toEqual(['a', 'b', 'b', 'd', 'n', 'c']);
    expect(l.textes.map((t) => t.role)).toEqual([
      'intertitre',
      'paragraphe',
      'paragraphe',
      'paragraphe',
      'famille-nom',
      'famille-explication',
    ]);
  });

  it('ne compte le chiffre-signal qu’une fois quand la phrase porte déjà son marqueur', () => {
    const l = lireSection(
      synthese({
        encart: encart({
          chiffre_signal: { valeur: '39 %', phrase: `des compétences transformées [[${WEF}]]`, source_id: WEF },
          points_cles: [],
        }),
      }),
    );
    expect(l.encart!.notes).toEqual([WEF]);
    expect(l.encart!.signal.phrase.appelAjoute).toBeNull();
  });

  it('appelAjoute : le source_id à défaut de marqueur, null sinon (chiffre-signal et point clé)', () => {
    const l = lireSection(synthese());
    expect(l.encart!.signal.phrase.appelAjoute).toBe(WEF);
    expect(l.encart!.signal.phrase.notes).toEqual([WEF]);
    expect(l.encart!.points[0].texte.appelAjoute).toBeNull();
    expect(l.encart!.points[1].texte.appelAjoute).toBe(PWC);
    // Les titres et le chapeau n'ont jamais d'appel ajouté.
    expect(l.encart!.chapeau.appelAjoute).toBeNull();
    expect(l.encart!.points[0].titre.appelAjoute).toBeNull();
  });
});

describe('lireSection — I2 (Q1) : sous un encart, contenu n’est pas lu', () => {
  const six = Array.from({ length: 6 }, (_, i) => `Paragraphe ${i} qui reprend l’encart [[x]] avec un ; glissé.`);
  const avecContenu = lireSection(synthese({ contenu: [{ intertitre: null, paragraphes: six }] }));
  const sansContenu = lireSection(synthese({ contenu: [] }));

  it('blocs vide, contenuIgnore vrai', () => {
    expect(avecContenu.blocs).toEqual([]);
    expect(avecContenu.contenuIgnore).toBe(true);
    expect(sansContenu.contenuIgnore).toBe(false);
  });

  it('notes, mots et textes strictement identiques à la même section sans contenu', () => {
    expect(avecContenu.notes).toEqual(sansContenu.notes);
    expect(avecContenu.mots).toEqual(sansContenu.mots);
    expect(avecContenu.textes).toEqual(sansContenu.textes);
    expect(avecContenu.notes).not.toContain('x');
  });
});

describe('lireSection — I7 (Q3) : le titre d’affichage ne porte jamais de numéro', () => {
  it('une section à titre figé prend le titre du déroulé, le titre du modèle reste en diagnostic', () => {
    const l = lireSection({ id: 'facteur-humain', titre: '§6. Le facteur humain', contenu: [] });
    expect(l.titre).toBe('Le facteur humain');
    expect(l.titreModele).toBe('§6. Le facteur humain');
    expect(l.numero).toBe('6');
  });

  it.each([
    '§7. Le cloud en repère',
    '§7 · Le cloud en repère',
    '§7 Le cloud en repère',
    '§7, Le cloud en repère',
    '7 · Le cloud en repère',
    '7 - Le cloud en repère',
    '7. Le cloud en repère',
    '7) Le cloud en repère',
  ])('§7 garde le titre du modèle sans son préfixe : « %s »', (titre) => {
    const l = lireSection({ id: 'repere-sectoriel', titre, contenu: [] });
    expect(l.titre).toBe('Le cloud en repère');
    expect(l.titreModele).toBe(titre);
  });

  it.each(['3 constats sur le cloud', '2030, l’horizon du cloud'])('ne tronque pas un titre qui commence par un nombre : « %s »', (titre) => {
    expect(lireSection({ id: 'repere-sectoriel', titre, contenu: [] }).titre).toBe(titre);
  });

  it('un préfixe seul retombe sur le titre du déroulé', () => {
    expect(lireSection({ id: 'repere-sectoriel', titre: '§7.', contenu: [] }).titre).toBe('Votre secteur en repère');
  });
});

describe('lireSection — I8 (Q4) : la part de tâches', () => {
  it.each([
    ['jusqu’à 82 %', '82'],
    ["jusqu'à 82 %", '82'],
    ['82 %', '82'],
    ['environ 40 %', '40'],
    ['près de 40 %', '40'],
    ['82,5 %', '82,5'],
    ['82%', '82'],
  ])('« %s » est courte : nombre %s, suffixe accolé', (brut, nombre) => {
    const part = lireSection(s3(brut)).familles[0].part!;
    expect(part.court).toBe(true);
    expect(part.nombre).toBe(nombre);
    expect(part.affichage).toBe(`${brut} ${PART_TACHES_SUFFIXE}`);
  });

  it.each([
    '82 % des tâches exposées à un niveau supérieur à la moyenne, dont 24 % fortement',
    'de 30 à 40 %',
    'jusqu’à 82 % des tâches',
  ])('« %s » n’est pas courte : affichée telle quelle, jamais de double suffixe', (brut) => {
    const part = lireSection(s3(brut)).familles[0].part!;
    expect(part.court).toBe(false);
    expect(part.nombre).toBeNull();
    expect(part.affichage).toBe(brut);
    expect(part.affichage.endsWith(`${PART_TACHES_SUFFIXE} ${PART_TACHES_SUFFIXE}`)).toBe(false);
  });

  it('null ou blanc donne une part nulle', () => {
    expect(lireSection(s3(null)).familles[0].part).toBeNull();
    expect(lireSection(s3('')).familles[0].part).toBeNull();
    expect(lireSection(s3('   ')).familles[0].part).toBeNull();
  });

  // Vu le 07/10/2026 (gpt-5.4) : le modèle écrit la valeur nulle en toutes lettres, et le PDF
  // affichait « Exposition élevée · null ».
  it.each(['null', ' NULL ', 'None', 'n/a', 'N/A'])('« %s » (valeur nulle écrite en texte) donne une part nulle', (brut) => {
    expect(lireSection(s3(brut)).familles[0].part).toBeNull();
  });

  it('les préfixes admis sont exposés', () => {
    expect(PART_TACHES_PREFIXES).toEqual(['jusqu’à', 'environ', 'près de']);
  });
});

describe('lireSection — I4 / I11 : ce qui est prose, ce qui est titre, ce qui vient du code', () => {
  it('les libellés et les lignes du code sont hors prose, les titres y sont', () => {
    const l = lireSection(synthese());
    const roles = l.prose.map((t) => t.role);
    expect(roles).not.toContain('calibrage-court');
    expect(roles).not.toContain('ligne-perimetre');
    expect(roles).not.toContain('signal-valeur');
    expect(roles).toContain('chapeau');
    expect(roles).toContain('signal-phrase');
    expect(roles).toContain('point-titre');
    expect(roles).toContain('point-texte');
    expect(l.titres.map((t) => t.texte)).toEqual(['Les tâches se déplacent', 'Des besoins apparaissent']);
    expect(l.encart!.calibrageCourt.origine).toBe('code');
    expect(l.encart!.lignePerimetre.origine).toBe('code');
    expect(l.encart!.chapeau.origine).toBe('modele');
  });

  it('en §3, le nom de famille est un libellé hors prose, l’explication est de la prose', () => {
    const l = lireSection(s3('jusqu’à 82 %'));
    expect(l.prose.map((t) => t.role)).toEqual(['paragraphe', 'famille-explication']);
    expect(l.familles[0].nom.controle).toBe('libelle');
    expect(l.familles[0].explication.controle).toBe('prose');
  });

  it('les intertitres sont des titres et de la prose', () => {
    const l = lireSection({
      id: 'contexte',
      titre: 'Le contexte en bref',
      contenu: [{ intertitre: 'La diffusion s’accélère', paragraphes: ['p'] }],
    });
    expect(l.titres.map((t) => t.texte)).toEqual(['La diffusion s’accélère']);
    expect(l.prose.map((t) => t.texte)).toEqual(['La diffusion s’accélère', 'p']);
  });

  it('une section figée du code (§8bis) n’a ni prose ni mots, mais garde ses blocs', () => {
    const l = lireSection({
      id: 'comment-utiliser',
      titre: 'Comment utiliser ce rapport',
      contenu: [{ intertitre: null, paragraphes: COMMENT_UTILISER_PARAGRAPHES }],
    });
    expect(l.origine).toBe('code');
    expect(l.prose).toEqual([]);
    expect(l.mots).toBe(0);
    expect(l.blocs).toHaveLength(1);
    expect(l.blocs[0].paragraphes).toHaveLength(COMMENT_UTILISER_PARAGRAPHES.length);
    expect(l.textes.every((t) => t.origine === 'code')).toBe(true);
  });
});

describe('lireSection — I6 : parité du comptage de mots', () => {
  it('compte les mots marqueurs retirés, comme l’ancien wordCount de V9', () => {
    const l = lireSection({ id: 'contexte', titre: 't', contenu: [{ intertitre: null, paragraphes: ['Trois mots ici [[x]].'] }] });
    expect(l.mots).toBe(4);
    expect(l.textes[0].mots).toBe(4);
  });
});

describe('lireSection — I10 : nettoyage des blocs', () => {
  it('retire les paragraphes blancs, ramène un intertitre blanc à null, supprime un bloc vide', () => {
    const l = lireSection({
      id: 'contexte',
      titre: 't',
      contenu: [
        { intertitre: '', paragraphes: [' ', 'p'] },
        { intertitre: null, paragraphes: ['', '   '] },
      ],
    });
    expect(l.blocs).toHaveLength(1);
    expect(l.blocs[0].intertitre).toBeNull();
    expect(l.blocs[0].paragraphes.map((p) => p.texte)).toEqual(['p']);
  });
});

describe('lireSection — I9 : totale et pure', () => {
  it('lit une section d’id inconnu sans lever : spec null, numero null, origine modele', () => {
    const l = lireSection({ id: 'fantome', titre: '§12. Un titre', contenu: [] });
    expect(l.spec).toBeNull();
    expect(l.numero).toBeNull();
    expect(l.origine).toBe('modele');
    expect(l.titre).toBe('Un titre');
  });

  it('ne mute pas l’entrée et donne deux lectures égales', () => {
    const section = synthese({ contenu: [{ intertitre: ' ', paragraphes: ['p', ''] }] });
    const avant = structuredClone(section);
    const a = lireSection(section);
    const b = lireSection(section);
    expect(section).toEqual(avant);
    expect(a).toEqual(b);
  });
});

describe('lireSection — parité de numérotation avec buildCitationIndex', () => {
  it('la concaténation dédupliquée des notes donne la même liste que l’index des notes', () => {
    const report = assembleReport(CORPS_CONFORME, SYNTHESE_CONFORME);
    const vus = new Set<string>();
    const ordre: string[] = [];
    for (const s of report.sections) {
      for (const id of lireSection(s).notes) {
        if (vus.has(id)) continue;
        vus.add(id);
        ordre.push(id);
      }
    }
    expect(ordre).toEqual([...buildCitationIndex(report).numberById.keys()]);
  });

  it('une section du corps (sans encart) se lit sans conversion', () => {
    const l = lireSection(CORPS_CONFORME.sections[1]);
    expect(l.encart).toBeNull();
    expect(l.id).toBe('contexte');
    expect(l.blocs.length).toBeGreaterThan(0);
  });

  it('numero et titre suivent le déroulé pour toute section connue', () => {
    for (const spec of reportSections) {
      const l = lireSection({ id: spec.id, titre: `§${spec.numLabel}. ${spec.title}`, contenu: [] });
      expect(l.numero, spec.id).toBe(spec.numLabel);
      expect(l.titre, spec.id).toBe(spec.title);
    }
  });
});
