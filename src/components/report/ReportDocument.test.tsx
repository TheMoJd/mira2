import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ReportDocument from './ReportDocument';
import type { ReportRenderContext } from '../../data/reportHtml';
import type { PreRapportOutput } from '../../data/reportSchema';
import { assembleReport } from '../../data/reportSchema';
import { CONTACT_URL, SOURCES_SECTION_TITLE, CALIBRAGE_COURT } from '../../data/rapportStructure';
import { statById } from '../../data/statbank';

const context: ReportRenderContext = {
  nomEntreprise: 'ACME',
  secteurDeclare: 'Cloud et hébergement',
  famillesLabels: ['Tech, informatique & data'],
  dateRapport: '22 juin 2026',
};

const WEF = 'wef-2025-skills-transformed-39';
const citedStat = statById[WEF];

const report: PreRapportOutput = assembleReport(
  {
    sections: [
      {
        id: 'perimetre',
        titre: 'Périmètre',
        contenu: [{ intertitre: null, paragraphes: ['Intro du périmètre.'] }],
        sources_citees: [],
        familles: null,
      },
      {
        id: 'familles-metiers',
        titre: 'Vos familles de métiers',
        contenu: [{ intertitre: 'Analyse', paragraphes: ['Texte.'] }],
        sources_citees: [WEF],
        familles: [
          {
            famille: 'Tech, informatique & data',
            exposition: 'élevée',
            natures: ['augmentation', 'automatisation'],
            part_taches: 'jusqu’à 40 %',
            explication: `Forte exposition des tâches de code [[${WEF}]].`,
          },
        ],
      },
    ],
  },
  {
    section: {
      id: 'synthese-executive',
      titre: 'Synthèse exécutive',
      encart: {
        chapeau: 'ACME et ses métiers tech face à l’IA.',
        chiffre_signal: { valeur: '39 %', phrase: 'des compétences transformées', source_id: WEF },
        points_cles: [
          {
            axe: 'exposition',
            titre: 'Les tâches se déplacent',
            texte: `Un déplacement de tâches [[${WEF}]].`,
            source_id: WEF,
          },
        ],
      },
      sources_citees: [WEF],
    },
  },
);

describe('ReportDocument', () => {
  const html = renderToStaticMarkup(<ReportDocument report={report} context={context} />);

  it('rend la page de garde depuis le contexte', () => {
    expect(html).toContain('ACME');
    expect(html).toContain('Cloud et hébergement');
    expect(html).toContain('22 juin 2026');
  });

  it('numérote les sections (§N) et affiche leurs titres, §8bis compris', () => {
    expect(html).toContain('§0');
    expect(html).toContain('Périmètre');
    expect(html).toContain('§3');
    expect(html).toContain('Vos familles de métiers');
    expect(html).toContain('§9');
  });

  it('rend l’encart de synthèse §1 avec les lignes figées du code', () => {
    expect(html).toContain('39 %');
    expect(html).toContain('des compétences transformées');
    expect(html).toContain(CALIBRAGE_COURT.slice(0, 40));
  });

  it('rend la caractérisation de famille §3, sans confiance ni transposabilité', () => {
    expect(html).toContain('Exposition');
    expect(html).toContain('élevée');
    expect(html).toContain('augmentation');
    expect(html).not.toContain('Confiance :');
    expect(html).not.toContain('non directement transposable');
  });

  it('convertit les marqueurs en appels de note et construit les références', () => {
    expect(html).not.toContain('[[');
    expect(html).toContain('<sup');
    expect(html).toContain(SOURCES_SECTION_TITLE);
    expect(html).toContain(citedStat.source.org);
  });

  it('encadre §8bis et fait du « contactez-nous ! » un lien', () => {
    expect(html).toContain('Comment utiliser ce rapport');
    expect(html).toContain(CONTACT_URL);
    expect(html).toContain('contactez-nous !');
  });

  it('omet la section des références quand aucun chiffre n’est cité', () => {
    const noCites: PreRapportOutput = {
      sections: [
        {
          id: 'perimetre',
          titre: 'Périmètre',
          contenu: [],
          sources_citees: [],
          familles: null,
          encart: null,
        },
      ],
    };
    const out = renderToStaticMarkup(<ReportDocument report={noCites} context={context} />);
    expect(out).not.toContain(SOURCES_SECTION_TITLE);
  });
});
