import { describe, it, expect } from 'vitest';
import { renderReportHtml } from './reportHtml';
import type { ReportRenderContext } from './reportHtml';
import type { PreRapportOutput } from './reportSchema';
import { assembleReport } from './reportSchema';
import { CONTACT_URL, SOURCES_SECTION_TITLE, CALIBRAGE_COURT } from './rapportStructure';
import { statById } from './statbank';
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

const WEF = 'wef-2025-skills-transformed-39';
const STANFORD = 'stanford-2026-genai-adoption-53';

// Le rapport est assemblé comme en production : corps + synthèse + textes figés
// injectés par le code (§8bis, §9 et les deux lignes de l'encart).
const report: PreRapportOutput = assembleReport(
  {
    sections: [
      {
        id: 'perimetre',
        titre: 'Périmètre',
        contenu: [{ intertitre: null, paragraphes: ['Rapport pour <Acme> & cie.'] }],
        sources_citees: [],
        familles: null,
      },
      {
        id: 'contexte',
        titre: 'Le contexte en bref',
        contenu: [
          {
            intertitre: 'La diffusion s’accélère',
            paragraphes: [`À l’échelle mondiale, l’adoption progresse [[${STANFORD}]].`],
          },
        ],
        sources_citees: [STANFORD],
        familles: null,
      },
      {
        id: 'familles-metiers',
        titre: 'Vos familles de métiers face à l’IA',
        contenu: [{ intertitre: 'Lecture', paragraphes: ['Analyse par famille.'] }],
        // une source réelle (World Economic Forum) + une source bidon ignorée
        sources_citees: [WEF, 'id-inexistant-xyz'],
        familles: [
          {
            famille: 'Tech, informatique & data',
            exposition: 'élevée',
            natures: ['augmentation', 'automatisation'],
            part_taches: 'jusqu’à 40 %',
            explication: `Forte exposition des tâches de développement [[${WEF}]]. Et [[id-inexistant-xyz]].`,
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
        chapeau: 'Acme SAS et ses métiers tech face à l’IA.',
        chiffre_signal: { valeur: '39 %', phrase: 'des compétences transformées', source_id: WEF },
        points_cles: [
          {
            axe: 'exposition',
            titre: 'Les tâches se déplacent',
            texte: `Un déplacement de tâches [[${WEF}]].`,
            source_id: WEF,
          },
          {
            // Marqueur oublié dans le texte : l'appel de note doit être ajouté au rendu.
            axe: 'concentration',
            titre: 'La tech concentre l’évolution',
            texte: 'L’évolution se concentre sur vos métiers tech.',
            source_id: STANFORD,
          },
        ],
      },
      contenu: [],
      sources_citees: [WEF, STANFORD],
    },
  },
);

describe('renderReportHtml', () => {
  const html = renderReportHtml(report, ctx);

  it('produit un document HTML autoportant avec la page de garde', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('Acme SAS');
    expect(html).toContain('22 juin 2026');
  });

  it('inclut le filigrane « MIRA AUDIT » répété par page (demande CEO 10/07)', () => {
    // `position:fixed` = re-peint sur chaque page en impression Chromium ;
    // le z-index le garde visible au-dessus des cartes à fond opaque.
    expect(html).toContain('MIRA AUDIT');
    expect(html).toContain('position:fixed');
  });

  it('rend les titres de section avec leur numéro §N, §8bis compris', () => {
    expect(html).toContain('Périmètre');
    expect(html).toContain('§3 · ');
    expect(html).toContain('Vos familles de métiers');
    expect(html).toContain('§9 · ');
  });

  it('rend l’encart de synthèse §1 : chiffre-signal et lignes figées du code', () => {
    expect(html).toContain('39 %');
    expect(html).toContain('des compétences transformées');
    expect(html).toContain('Acme SAS et ses métiers tech');
    expect(html).toContain(CALIBRAGE_COURT.slice(0, 40));
  });

  it('convertit les marqueurs [[id]] en appels de note numérotés', () => {
    expect(html).not.toContain('[[');
    // Un seul appel de note pour le chiffre-signal, même si son marqueur est dans la phrase.
    const avecMarqueur = renderReportHtml(
      {
        sections: [
          {
            id: 'synthese-executive',
            titre: 'Synthèse exécutive',
            contenu: [],
            sources_citees: [WEF],
            familles: null,
            encart: {
              chapeau: 'c',
              chiffre_signal: { valeur: '39 %', phrase: `des compétences transformées [[${WEF}]]`, source_id: WEF },
              points_cles: [],
              calibrage_court: 'x',
              perimetre: 'y',
            },
          },
        ],
      },
      ctx,
    );
    expect(avecMarqueur).not.toContain('[[');
    expect(avecMarqueur.match(/>1<\/sup>/g)).toHaveLength(1);
    // Numérotation continue dans l'ordre d'apparition : §1 (première page) d'abord.
    expect(html).toContain('<sup style="font-size:8.5px;font-weight:600;color:#35137d;line-height:0">1</sup>');
    expect(html).toContain('<sup style="font-size:8.5px;font-weight:600;color:#35137d;line-height:0">2</sup>');
  });

  it('construit la section « Sources de référence » depuis la stat-bank', () => {
    expect(html).toContain(SOURCES_SECTION_TITLE);
    expect(html).toContain('World Economic Forum');
    expect(html).toContain(statById[WEF].claim.slice(0, 30));
    // Le périmètre est porté par la référence, jamais par le corps du texte.
    expect(html).toContain('Périmètre monde.');
  });

  it('porte projection et nature commerciale dans la référence, jamais dans le texte', () => {
    const autre = renderReportHtml(
      {
        sections: [
          {
            id: 'competences',
            titre: 'Compétences',
            contenu: [
              {
                intertitre: null,
                paragraphes: [
                  'Constat [[pwc-2025-revenue-per-employee-3x]]. Autre constat [[wef-2025-jobs-churn-22]].',
                ],
              },
            ],
            sources_citees: ['pwc-2025-revenue-per-employee-3x', 'wef-2025-jobs-churn-22'],
            familles: null,
            encart: null,
          },
        ],
      },
      ctx,
    );
    expect(autre).toContain('Source commerciale.');
    expect(autre).toContain('Projection.');
  });

  it('ignore un marqueur inexistant sans planter ni laisser de trace', () => {
    expect(html).not.toContain('id-inexistant-xyz');
  });

  it('échappe le HTML du contenu LLM (anti-injection)', () => {
    expect(html).toContain('&lt;Acme&gt;');
    expect(html).not.toContain('Rapport pour <Acme>');
  });

  it('encadre §8bis et fait du « contactez-nous ! » un lien', () => {
    expect(html).toContain('Comment utiliser ce rapport');
    expect(html).toContain(`href="${CONTACT_URL}"`);
    expect(html).toContain('contactez-nous !');
  });

  it('inclut la page de transparence IA et la mention RGPD', () => {
    expect(html).toContain('Transparence et mentions');
    expect(html).toContain('généré avec l’aide de l’intelligence artificielle');
    expect(html).toContain(RGPD_PDF_FOOTER.slice(0, 30));
  });

  it('n’affiche plus ni niveau de confiance ni mention de transposabilité par famille', () => {
    expect(html).toContain('Exposition élevée');
    expect(html).not.toContain('Confiance :');
    expect(html).not.toContain('non directement transposable');
  });

  it('omet la section des références quand aucun chiffre n’est cité', () => {
    const sansChiffre = renderReportHtml(
      {
        sections: [
          {
            id: 'perimetre',
            titre: 'Périmètre',
            contenu: [{ intertitre: null, paragraphes: ['Sans chiffre.'] }],
            sources_citees: [],
            familles: null,
            encart: null,
          },
        ],
      },
      ctx,
    );
    expect(sansChiffre).not.toContain(SOURCES_SECTION_TITLE);
  });
});
