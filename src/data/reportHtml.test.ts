import { describe, it, expect } from 'vitest';
import { renderReportHtml } from './reportHtml';
import type { ReportRenderContext } from './reportHtml';
import type { PreRapportOutput } from './reportSchema';
import { RGPD_PDF_FOOTER } from './rgpd';

const ctx: ReportRenderContext = {
  nomEntreprise: 'Acme SAS',
  secteurDeclare: 'Conseil',
  nafLibelle: 'Conseil pour les affaires',
  nafCode: '70.22Z',
  effectifTranche: '20 à 49 salariés',
  famillesLabels: ['Tech, informatique & data'],
  dateRapport: '22 juin 2026',
};

const report: PreRapportOutput = {
  sections: [
    {
      id: 'perimetre',
      titre: 'Périmètre',
      contenu: [{ intertitre: null, paragraphes: ['Rapport pour <Acme> & cie.'] }],
      sources_citees: [],
      familles: null,
    },
    {
      id: 'familles-metiers',
      titre: 'Vos familles de métiers face à l’IA',
      contenu: [{ intertitre: 'Lecture', paragraphes: ['Analyse par famille.'] }],
      // une source réelle (World Economic Forum) + une source bidon ignorée
      sources_citees: ['wef-2025-skills-transformed-39', 'id-inexistant-xyz'],
      familles: [
        {
          famille: 'Tech, informatique & data',
          exposition: 'élevée',
          natures: ['augmentation', 'automatisation'],
          part_taches: 'jusqu’à 40 %',
          confiance: 'moyenne',
          transposable_france: false,
          explication: 'Forte exposition des tâches de développement.',
        },
      ],
    },
    {
      id: 'sources-methode',
      titre: 'Sources & méthode',
      contenu: [{ intertitre: null, paragraphes: ['Socle de 11 sources.'] }],
      sources_citees: [],
      familles: null,
    },
  ],
};

describe('renderReportHtml', () => {
  const html = renderReportHtml(report, ctx);

  it('produit un document HTML autoportant avec la page de garde', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('Acme SAS');
    expect(html).toContain('22 juin 2026');
  });

  it('rend les titres de section avec leur numéro §N', () => {
    expect(html).toContain('Périmètre');
    expect(html).toContain('§3 · ');
    expect(html).toContain('Vos familles de métiers');
  });

  it('résout les sources citées depuis la stat-bank (section Sources allégée)', () => {
    expect(html).toContain('Sources mobilisées');
    expect(html).toContain('World Economic Forum');
  });

  it('ignore une source citée inexistante sans planter', () => {
    expect(html).not.toContain('id-inexistant-xyz');
  });

  it('échappe le HTML du contenu LLM (anti-injection)', () => {
    expect(html).toContain('&lt;Acme&gt;');
    expect(html).not.toContain('Rapport pour <Acme>');
  });

  it('affiche la caractérisation famille et la mention non transposable', () => {
    expect(html).toContain('Exposition élevée');
    expect(html).toContain('non directement transposable');
  });

  it('inclut la mention RGPD de pied de page', () => {
    expect(html).toContain(RGPD_PDF_FOOTER.slice(0, 30));
  });
});
