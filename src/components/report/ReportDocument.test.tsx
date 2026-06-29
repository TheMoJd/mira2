import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ReportDocument from './ReportDocument';
import type { ReportRenderContext } from '../../data/reportHtml';
import type { PreRapportOutput } from '../../data/reportSchema';
import { statbank } from '../../data/statbank';

const context: ReportRenderContext = {
  nomEntreprise: 'ACME',
  secteurDeclare: 'Cloud et hébergement',
  famillesLabels: ['Tech, informatique & data'],
  dateRapport: '22 juin 2026',
};

const citedStat = statbank[0];

const report: PreRapportOutput = {
  sections: [
    { id: 'perimetre', titre: 'Périmètre', contenu: [{ intertitre: null, paragraphes: ['Intro du périmètre.'] }], sources_citees: [], familles: null },
    {
      id: 'familles-metiers',
      titre: 'Vos familles de métiers',
      contenu: [{ intertitre: 'Analyse', paragraphes: ['Texte.'] }],
      sources_citees: [citedStat.id],
      familles: [
        {
          famille: 'Tech, informatique & data',
          exposition: 'élevée',
          natures: ['augmentation', 'automatisation'],
          part_taches: 'jusqu’à 40 %',
          confiance: 'moyenne',
          transposable_france: false,
          explication: 'Forte exposition des tâches de code.',
        },
      ],
    },
  ],
};

describe('ReportDocument', () => {
  const html = renderToStaticMarkup(<ReportDocument report={report} context={context} />);

  it('rend la page de garde depuis le contexte', () => {
    expect(html).toContain('ACME');
    expect(html).toContain('Cloud et hébergement');
    expect(html).toContain('22 juin 2026');
  });

  it('numérote les sections (§N) et affiche leurs titres', () => {
    expect(html).toContain('§0');
    expect(html).toContain('Périmètre');
    expect(html).toContain('§3');
    expect(html).toContain('Vos familles de métiers');
  });

  it('rend la caractérisation de famille §3 (exposition, natures, transposabilité)', () => {
    expect(html).toContain('Exposition');
    expect(html).toContain('élevée');
    expect(html).toContain('augmentation');
    expect(html).toContain('non directement transposable');
  });

  it('rend la section Sources (titre du document) pour les sources citées', () => {
    expect(html).toContain('Sources mobilisées');
    expect(html).toContain(citedStat.source.org);
  });

  it('omet la section Sources quand aucune source n’est citée', () => {
    const noCites: PreRapportOutput = {
      sections: [{ id: 'perimetre', titre: 'Périmètre', contenu: [], sources_citees: [], familles: null }],
    };
    const out = renderToStaticMarkup(<ReportDocument report={noCites} context={context} />);
    expect(out).not.toContain('Sources mobilisées');
  });
});
