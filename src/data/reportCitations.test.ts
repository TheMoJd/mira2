import { describe, it, expect } from 'vitest';
import {
  buildCitationIndex,
  tokenizeCitations,
  stripMarkers,
  markersIn,
  renderNoteText,
} from './reportCitations';
import type { PreRapportOutput } from './reportSchema';
import { statById } from './statbank';

const WEF = 'wef-2025-skills-transformed-39';
const STANFORD = 'stanford-2026-genai-adoption-53';
const CIANUM_SECONDAIRE = 'cianum-2025-cout-inference-90x';
const PWC_COMMERCIALE = 'pwc-2025-revenue-per-employee-3x';
const PROJECTION = 'wef-2025-jobs-churn-22';

describe('marqueurs de citation', () => {
  it('découpe une chaîne en segments de texte et marqueurs, dans l’ordre', () => {
    expect(tokenizeCitations(`Avant [[${WEF}]] après.`)).toEqual([
      { type: 'text', value: 'Avant ' },
      { type: 'note', id: WEF },
      { type: 'text', value: ' après.' },
    ]);
  });

  it('retire les marqueurs pour le comptage de mots', () => {
    expect(stripMarkers(`Trois mots ici [[${WEF}]].`)).toBe('Trois mots ici .');
    expect(markersIn(`a [[x]] b [[y]] c [[x]]`)).toEqual(['x', 'y', 'x']);
  });
  // L'ordre de lecture de l'encart (chiffre-signal puis points clés, source_id compté
  // à défaut de marqueur) se teste à l'interface de la lecture : reportLecture.test.ts.
});

describe('buildCitationIndex — numérotation continue, regroupement par section', () => {
  const report: PreRapportOutput = {
    sections: [
      {
        id: 'synthese-executive',
        titre: 'Synthèse exécutive',
        contenu: [],
        sources_citees: [WEF],
        familles: null,
        encart: {
          chapeau: 'c',
          chiffre_signal: { valeur: '39 %', phrase: 'p', source_id: WEF },
          points_cles: [],
          calibrage_court: '',
          perimetre: '',
        },
      },
      {
        id: 'contexte',
        titre: 'Le contexte en bref',
        // Reprise du chiffre de §1 (même numéro) + un chiffre neuf + un id inconnu.
        contenu: [
          { intertitre: null, paragraphes: [`a [[${WEF}]] b [[${STANFORD}]] c [[inconnu-xyz]]`] },
        ],
        sources_citees: [WEF, STANFORD],
        familles: null,
        encart: null,
      },
    ],
  };
  const index = buildCitationIndex(report);

  it('donne son numéro à chaque chiffre à sa première apparition', () => {
    expect(index.numberById.get(WEF)).toBe(1);
    expect(index.numberById.get(STANFORD)).toBe(2);
  });

  it('n’attribue pas de numéro à un id inconnu de la stat-bank', () => {
    expect(index.numberById.has('inconnu-xyz')).toBe(false);
  });

  it('regroupe les notes par section dans l’ordre d’apparition', () => {
    expect(index.groups.map((g) => g.sectionId)).toEqual(['synthese-executive', 'contexte']);
    expect(index.groups[0].notes.map((n) => n.id)).toEqual([WEF]);
    // §2 ne re-liste pas le chiffre déjà numéroté en première page.
    expect(index.groups[1].notes.map((n) => n.id)).toEqual([STANFORD]);
  });

  it('le groupe de notes porte le titre canonique et le numéro de la section (Q3)', () => {
    const doublé = buildCitationIndex({
      sections: [
        {
          id: 'facteur-humain',
          // Le modèle a mis le numéro dans le titre : le groupe ne le reprend pas.
          titre: '§6. Le facteur humain',
          contenu: [{ intertitre: null, paragraphes: [`a [[${WEF}]]`] }],
          sources_citees: [WEF],
          familles: null,
          encart: null,
        },
      ],
    });
    expect(doublé.groups[0].sectionTitle).toBe('Le facteur humain');
    expect(doublé.groups[0].numero).toBe('6');
  });

  it('un contenu recopié sous l’encart §1 ne crée aucune note (Q1)', () => {
    const avecContenu = buildCitationIndex({
      sections: [
        {
          ...report.sections[0],
          contenu: [{ intertitre: null, paragraphes: [`recopie [[${PWC_COMMERCIALE}]]`] }],
        },
      ],
    });
    expect([...avecContenu.numberById.keys()]).toEqual([WEF]);
  });
});

describe('renderNoteText — la ligne de référence', () => {
  it('donne organisation, année, page, formulation et périmètre', () => {
    const note = renderNoteText(statById[WEF]);
    expect(note).toContain('World Economic Forum, 2025');
    expect(note).toContain(statById[WEF].claim);
    expect(note).toContain('Périmètre monde.');
  });

  it('signale une projection', () => {
    expect(renderNoteText(statById[PROJECTION])).toContain('Projection.');
  });

  it('signale une source commerciale', () => {
    expect(renderNoteText(statById[PWC_COMMERCIALE])).toContain('Source commerciale.');
  });

  it('recrédite une donnée secondaire à sa source d’origine', () => {
    const note = renderNoteText(statById[CIANUM_SECONDAIRE]);
    expect(note.startsWith('Epoch AI.')).toBe(true);
    expect(note).toContain('Cité par CIANum, 2025');
  });
});
