import { describe, it, expect } from 'vitest';
import { renderReportHtml, reportFooterText, stripSourceRefs, prepareProse } from './reportHtml';
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
      contenu: [
        {
          // L'intertitre porte AUSSI une référence : le retrait doit couvrir les titres.
          intertitre: 'Lecture sectorielle (World Economic Forum, 2025)',
          paragraphes: [
            'Analyse par famille. 39 % des compétences seront transformées d’ici 2030 (World Economic Forum, 2025).',
          ],
        },
      ],
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

  it('inclut le filigrane « mira-audit.fr » répété par page (CEO 10/07, texte revu 13/07)', () => {
    // `position:fixed` = re-peint sur chaque page en impression Chromium ;
    // le z-index le garde visible au-dessus des cartes à fond opaque.
    // Ces trois propriétés sont un ACQUIS à préserver (vérifié sur PDF 7 pages).
    expect(html).toContain('mira-audit.fr');
    expect(html).not.toContain('MIRA AUDIT');
    expect(html).toContain('position:fixed');
    expect(html).toContain('z-index:10');
  });

  it('rend les titres de section avec leur numéro §N', () => {
    expect(html).toContain('Périmètre');
    expect(html).toContain('§3 · ');
    expect(html).toContain('Vos familles de métiers');
  });

  it('résout les sources citées depuis la stat-bank (section de fin renommée, CEO 13/07)', () => {
    expect(html).toContain('Sources mobilisées pour votre pré-diagnostic');
    expect(html).toContain('World Economic Forum');
  });

  it('retire les références sources inline du corps, la section de fin les garde (CEO 13/07)', () => {
    // Le paragraphe §3 du fixture contient « (World Economic Forum, 2025) » :
    // il ne doit pas survivre dans le corps. L'occurrence restante vient de la
    // section Sources de fin.
    expect(html).not.toContain('(World Economic Forum, 2025)');
    expect(html).toContain('39 % des compétences seront transformées d’ici 2030.');
    // L'intertitre du fixture portait la même référence : couvert aussi.
    expect(html).toContain('Lecture sectorielle');
  });

  it('n’affiche plus le niveau de confiance des familles (CEO 13/07, champ conservé dans le JSON)', () => {
    expect(html).not.toContain('Confiance');
  });

  it('ignore une source citée inexistante sans planter', () => {
    expect(html).not.toContain('id-inexistant-xyz');
  });

  it('échappe le HTML du contenu LLM (anti-injection)', () => {
    expect(html).toContain('&lt;Acme&gt;');
    expect(html).not.toContain('Rapport pour <Acme>');
  });

  it('inclut la page de transparence IA et la mention RGPD', () => {
    expect(html).toContain('Transparence et mentions');
    expect(html).toContain('généré avec l’aide de l’intelligence artificielle');
    expect(html).toContain(RGPD_PDF_FOOTER.slice(0, 30));
  });

  it('ne contient plus les placeholders « à valider »', () => {
    expect(html).not.toContain('en cours de validation');
    expect(html).not.toContain('adresse à confirmer');
    expect(html).not.toContain('Victor');
  });

  it('affiche la caractérisation famille et la mention non transposable', () => {
    expect(html).toContain('Exposition élevée');
    expect(html).toContain('non directement transposable');
  });

  it('ne parle plus de « pré-rapport » ni de « gratuit » (renommage CEO 13/07)', () => {
    expect(html.toLowerCase()).not.toContain('pré-rapport');
    expect(html.toLowerCase()).not.toContain('gratuit');
    expect(html).toContain('Pré-diagnostic MIRA');
  });
});

describe('reportFooterText — bas de page CEO 13/07', () => {
  it('rend « Mira audit · … · <mois année> » avec la date de génération, sans cadratin', () => {
    const footer = reportFooterText(new Date('2026-07-13T10:00:00Z'));
    expect(footer).toBe(
      'Mira audit · Anticiper, mesurer et piloter l’impact de l’IA sur vos métiers et compétences · juillet 2026',
    );
    expect(footer).not.toMatch(/[—–]/);
  });

  it('suit dynamiquement le mois de génération', () => {
    expect(reportFooterText(new Date('2027-01-05T10:00:00Z'))).toContain('janvier 2027');
  });
});

describe('stripSourceRefs — retrait des références inline (CEO 13/07)', () => {
  it('retire « (Organisation connue, année) » et recolle la ponctuation', () => {
    expect(stripSourceRefs('39 % des compétences seront transformées d’ici 2030 (World Economic Forum, 2025).')).toBe(
      '39 % des compétences seront transformées d’ici 2030.',
    );
    expect(stripSourceRefs('Une adoption inégale (OCDE, 2024), surtout en PME.')).toBe(
      'Une adoption inégale, surtout en PME.',
    );
  });

  it('retire les recrédits de données secondaires « citée par »', () => {
    expect(stripSourceRefs('Un chiffre repris (Crédoc, citée par Parlons RH, 2025).')).toBe('Un chiffre repris.');
  });

  it('préserve les parenthèses de contenu (pourcentages, sigles, années seules)', () => {
    expect(stripSourceRefs('L’usage individuel (83 %) devance l’intégration.')).toBe(
      'L’usage individuel (83 %) devance l’intégration.',
    );
    expect(stripSourceRefs('La réforme des entretiens professionnels (EPP 2026) arrive.')).toBe(
      'La réforme des entretiens professionnels (EPP 2026) arrive.',
    );
  });

  it('parenthèse mixte donnée + référence : la donnée survit, la citation part', () => {
    expect(stripSourceRefs('L’usage individuel (83 %, Parlons RH, 2025) devance l’intégration.')).toBe(
      'L’usage individuel (83 %) devance l’intégration.',
    );
  });

  it('retire les références abrégées du LLM (alias, insensible à la casse)', () => {
    expect(stripSourceRefs('39 % des compétences transformées (WEF, 2025).')).toBe(
      '39 % des compétences transformées.',
    );
    expect(stripSourceRefs('Les métiers en 2030 (DARES, 2022).')).toBe('Les métiers en 2030.');
    expect(stripSourceRefs('Une productivité en hausse (mckinsey, 2017).')).toBe('Une productivité en hausse.');
  });

  it('ne casse pas une phrase construite sur la référence (« Selon (…) »)', () => {
    const phrase = 'Selon (OCDE, 2024), 40 % des PME ont commencé.';
    expect(stripSourceRefs(phrase)).toBe(phrase);
  });

  it('les alias courts ne matchent pas à l’intérieur d’un mot français', () => {
    const phrase = 'Le cadre du droit du travail (réforme prévue pour 2026) évolue.';
    expect(stripSourceRefs(phrase)).toBe(phrase);
  });

  it('nettoie les artefacts de ponctuation laissés par le retrait', () => {
    expect(stripSourceRefs('La courbe augmente. (WEF, 2025).')).toBe('La courbe augmente.');
  });

  it('retire une citation portant un segment de page « p.11 »', () => {
    expect(stripSourceRefs('Un chiffre marquant (Parlons RH, 2025, p.11).')).toBe('Un chiffre marquant.');
  });

  it('parenthèse mixte avec page : la donnée survit, citation et page partent', () => {
    expect(stripSourceRefs('L’usage individuel (83 %, Parlons RH, 2025, p.11) devance l’intégration.')).toBe(
      'L’usage individuel (83 %) devance l’intégration.',
    );
  });

  it('retire une citation sans virgule « (WEF 2025) »', () => {
    expect(stripSourceRefs('39 % des compétences transformées (WEF 2025).')).toBe(
      '39 % des compétences transformées.',
    );
  });

  it('préserve une parenthèse d’année sans organisation, même sans virgule', () => {
    expect(stripSourceRefs('Un cap se prépare (estimations pour 2030).')).toBe(
      'Un cap se prépare (estimations pour 2030).',
    );
  });

  it('normalise les points de suspension tapés en « … » au lieu de les manger', () => {
    expect(stripSourceRefs('Ils hésitent... puis adoptent.')).toBe('Ils hésitent… puis adoptent.');
  });
});

describe('prepareProse — filet de renommage hérité + retrait des références', () => {
  it('replie le « pré-rapport » écrit par le LLM (prompt verrouillé, benchmark R4) sur « pré-diagnostic »', () => {
    expect(prepareProse('Ce pré-rapport applique l’état de l’art (WEF, 2025).')).toBe(
      'Ce pré-diagnostic applique l’état de l’art.',
    );
    expect(prepareProse('Pré-rapport sectoriel offert.')).toBe('Pré-diagnostic sectoriel offert.');
  });
});
