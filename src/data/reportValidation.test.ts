import { describe, it, expect } from 'vitest';
import {
  validateReport,
  blockingFindings,
  sectionsToReplay,
  findingsBrief,
  syncSourcesCitees,
} from './reportValidation';
import type { PreRapportOutput, ReportSectionOutput, ReportEncart } from './reportSchema';
import { COMMENT_UTILISER_PARAGRAPHES } from './rapportStructure';

const WEF = 'wef-2025-skills-transformed-39';
const STANFORD = 'stanford-2026-genai-adoption-53';

/** Section §2 de test : la grille de `contexte` autorise Stanford (S02). */
function contexte(paragraphes: string[], sources = [STANFORD]): ReportSectionOutput {
  return {
    id: 'contexte',
    titre: 'Le contexte en bref',
    contenu: [{ intertitre: 'La diffusion s’accélère', paragraphes }],
    sources_citees: sources,
    familles: null,
    encart: null,
  };
}

/** Un rapport d'une seule section, pour cibler un contrôle. */
function reportWith(section: ReportSectionOutput): PreRapportOutput {
  return { sections: [section] };
}

/** Ne garde que les codes des contrôles en échec (l'ordre du rapport est stable). */
function codes(report: PreRapportOutput): string[] {
  return [...new Set(validateReport(report).map((f) => f.code))];
}

const encart = (over: Partial<ReportEncart> = {}): ReportEncart => ({
  chapeau: 'Acme et ses métiers.',
  chiffre_signal: { valeur: '39 %', phrase: 'des compétences transformées', source_id: WEF },
  points_cles: [
    {
      axe: 'exposition',
      titre: 'Les tâches se déplacent',
      texte: `Un déplacement de tâches [[${WEF}]].`,
      source_id: WEF,
    },
  ],
  calibrage_court: 'ligne du code',
  perimetre: 'ligne du code',
  ...over,
});

describe('V1 / V2 / V3 — la synthèse exécutive §1', () => {
  const synthese = (over: Partial<ReportSectionOutput> = {}): ReportSectionOutput => ({
    id: 'synthese-executive',
    titre: 'Synthèse exécutive',
    contenu: [],
    sources_citees: [WEF],
    familles: null,
    encart: encart(),
    ...over,
  });

  it('V1 — refuse un chiffre absent du corps (hors liste héritée)', () => {
    const report: PreRapportOutput = { sections: [synthese()] };
    const v1 = validateReport(report).filter((f) => f.code === 'V1');
    expect(v1).toHaveLength(1);
    expect(v1[0].level).toBe('bloquant');
    expect(v1[0].message).toContain(WEF);
  });

  it('V1 — accepte un chiffre déjà cité en §2 à §7', () => {
    const report: PreRapportOutput = {
      sections: [synthese(), contexte([`Constat [[${WEF}]].`], [WEF])],
    };
    expect(codes(report)).not.toContain('V1');
  });

  it('V2 — refuse un source_id d’encart absent de sources_citees', () => {
    const report: PreRapportOutput = {
      sections: [synthese({ sources_citees: [] }), contexte([`Constat [[${WEF}]].`], [WEF])],
    };
    expect(codes(report)).toContain('V2');
  });

  it('V3 — refuse un encart hors des bornes de 3 à 5 chiffres', () => {
    const report: PreRapportOutput = {
      sections: [synthese(), contexte([`Constat [[${WEF}]].`], [WEF])],
    };
    // Un seul chiffre dans l'encart (chiffre-signal repris par le point clé).
    const v3 = validateReport(report).filter((f) => f.code === 'V3');
    expect(v3).toHaveLength(1);
    expect(v3[0].message).toContain('entre 3 et 5');
  });
});

describe('V4 / V5 — la source ne s’écrit jamais dans le texte', () => {
  it('V4 — refuse une parenthèse de citation', () => {
    expect(codes(reportWith(contexte(['39 % des compétences (World Economic Forum, 2025).'])))).toContain('V4');
    expect(codes(reportWith(contexte(['Une hausse mesurée (2025).'])))).toContain('V4');
  });

  it('V4 — laisse passer une parenthèse qui n’est pas une citation', () => {
    expect(codes(reportWith(contexte(['Une bascule attendue (d’ici 2030).'])))).not.toContain('V4');
  });

  it('V5 — avertit sur un nom d’organisation du socle, sans bloquer', () => {
    const findings = validateReport(reportWith(contexte(['Selon le World Economic Forum, cela bouge.'])));
    const v5 = findings.filter((f) => f.code === 'V5');
    expect(v5).toHaveLength(1);
    expect(v5[0].level).toBe('avertissement');
  });
});

describe('V6 — toute phrase chiffrée porte un marqueur', () => {
  it('refuse un pourcentage sans marqueur', () => {
    expect(codes(reportWith(contexte(['À l’échelle mondiale, 53 % des organisations adoptent.'])))).toContain('V6');
  });

  it('accepte le même pourcentage avec son marqueur', () => {
    expect(
      codes(reportWith(contexte([`À l’échelle mondiale, 53 % des organisations adoptent [[${STANFORD}]].`]))),
    ).not.toContain('V6');
  });

  it('n’attrape ni les années, ni les codes ISCO, ni les codes NAF', () => {
    const report = reportWith(
      contexte(['Vos métiers de vente (ISCO 52) du secteur 47.29B évoluent entre 2025 et 2030.'], []),
    );
    expect(codes(report)).not.toContain('V6');
  });

  it('refuse un nombre statistique avec unité sans marqueur', () => {
    expect(codes(reportWith(contexte(['170 millions de postes seraient créés.'], [])))).toContain('V6');
  });
});

describe('V7 — marqueurs, liste autorisée et sources_citees se recoupent', () => {
  it('refuse un marqueur inconnu de la stat-bank', () => {
    const findings = validateReport(reportWith(contexte(['a [[inconnu-xyz]]'], ['inconnu-xyz'])));
    expect(findings.some((f) => f.code === 'V7' && f.message.includes('inconnu'))).toBe(true);
  });

  it('refuse une statistique hors de la liste autorisée de la section', () => {
    // WEF (S06) n'est pas dans la grille de §2 (S02, S07, S08, S15, S16, S17, FR1, FR2).
    const findings = validateReport(reportWith(contexte([`a [[${WEF}]]`], [WEF])));
    expect(findings.some((f) => f.code === 'V7' && f.message.includes('hors de la liste'))).toBe(true);
  });

  it('refuse un id déclaré mais non marqué, et réciproquement', () => {
    const declareSeul = validateReport(reportWith(contexte(['aucun marqueur ici'], [STANFORD])));
    expect(declareSeul.some((f) => f.code === 'V7' && f.message.includes('non marqué'))).toBe(true);

    const marqueSeul = validateReport(reportWith(contexte([`a [[${STANFORD}]]`], [])));
    expect(marqueSeul.some((f) => f.code === 'V7' && f.message.includes('absent de sources_citees'))).toBe(true);
  });
});

describe('V8 — un chiffre ne se donne qu’une fois dans le corps', () => {
  it('avertit quand le même id est cité dans deux sections du corps', () => {
    const report: PreRapportOutput = {
      sections: [
        contexte([`a [[${STANFORD}]]`], [STANFORD]),
        {
          id: 'repere-sectoriel',
          titre: 'Votre secteur en repère',
          contenu: [{ intertitre: null, paragraphes: [`b [[${STANFORD}]]`] }],
          sources_citees: [STANFORD],
          familles: null,
          encart: null,
        },
      ],
    };
    const v8 = validateReport(report).filter((f) => f.code === 'V8');
    expect(v8).toHaveLength(1);
    expect(v8[0].level).toBe('avertissement');
  });
});

describe('V9 — budget de mots', () => {
  const mots = (n: number) => Array.from({ length: n }, () => 'mot').join(' ');

  it('refuse une section trop courte', () => {
    expect(codes(reportWith(contexte(['trop court'], [])))).toContain('V9');
  });

  it('accepte une section dans les bornes, tolérance comprise', () => {
    // §2 : 220 à 300 mots.
    expect(codes(reportWith(contexte([mots(250)], [])))).not.toContain('V9');
  });

  it('calcule le budget de §3 par famille déclarée', () => {
    const famille = (explication: string) => ({
      famille: 'Vente & commerce',
      exposition: 'modérée' as const,
      natures: ['augmentation' as const],
      part_taches: null,
      explication,
    });
    const s3 = (nFamilles: number, motsParFamille: number): ReportSectionOutput => ({
      id: 'familles-metiers',
      titre: 'Vos familles de métiers face à l’IA',
      // Introduction : 40 à 60 mots.
      contenu: [{ intertitre: null, paragraphes: [mots(50)] }],
      sources_citees: [],
      familles: Array.from({ length: nFamilles }, () => famille(mots(motsParFamille))),
      encart: null,
    });
    // 3 familles à 110 mots : dans les bornes (40-60 + 3 x 80-140).
    expect(codes(reportWith(s3(3, 110)))).not.toContain('V9');
    // Même longueur par famille, mais une seule famille déclarée : hors bornes.
    expect(codes(reportWith(s3(1, 400)))).toContain('V9');
  });
});

describe('V10 / V11 / V12 — registre et style', () => {
  const mots = (n: number) => Array.from({ length: n }, () => 'mot').join(' ');

  it('V10 — refuse cadratin, demi-cadratin, point-virgule et point d’exclamation', () => {
    for (const texte of ['Un constat — net.', 'Un constat – net.', 'Un constat ; net.', 'Un constat net !']) {
      expect(codes(reportWith(contexte([texte], []))), texte).toContain('V10');
    }
  });

  it('V11 — refuse les mots creux et le vocabulaire de décision', () => {
    expect(codes(reportWith(contexte(['Une révolution des métiers.'], [])))).toContain('V11');
    expect(codes(reportWith(contexte(['Un levier de performance.'], [])))).toContain('V11');
    expect(codes(reportWith(contexte(['Il faut former vos équipes.'], [])))).toContain('V11');
    expect(codes(reportWith(contexte(['Une feuille de route est attendue.'], [])))).toContain('V11');
  });

  it('V11 — « clé » en adjectif est interdit, « clé de lecture » reste permis', () => {
    expect(codes(reportWith(contexte(['Un facteur clé de la transformation.'], [])))).toContain('V11');
    expect(codes(reportWith(contexte([`${mots(250)} une clé de lecture`], [])))).not.toContain('V11');
  });

  it('V12 — avertit sur un intertitre de plus de douze mots', () => {
    const long = 'Le partage du travail entre les humains et les machines se déplace nettement partout';
    const section = contexte([mots(250)], []);
    section.contenu[0].intertitre = long;
    const v12 = validateReport(reportWith(section)).filter((f) => f.code === 'V12');
    expect(v12).toHaveLength(1);
    expect(v12[0].level).toBe('avertissement');
  });
});

describe('portée des contrôles', () => {
  it('ne valide jamais les sections figées injectées par le code', () => {
    // §8bis contient un point d'exclamation (V10) et des parenthèses : c'est voulu,
    // ce n'est pas une sortie du modèle.
    const report: PreRapportOutput = {
      sections: [
        {
          id: 'comment-utiliser',
          titre: 'Comment utiliser ce rapport',
          contenu: [{ intertitre: null, paragraphes: COMMENT_UTILISER_PARAGRAPHES }],
          sources_citees: [],
          familles: null,
          encart: null,
        },
      ],
    };
    expect(validateReport(report)).toEqual([]);
  });

  it('n’applique ni V5 ni V6 à la §0 (carte d’identité du rapport)', () => {
    const perimetre: ReportSectionOutput = {
      id: 'perimetre',
      titre: 'Périmètre',
      contenu: [
        {
          intertitre: null,
          paragraphes: [
            `Socle public de rapports de référence, OCDE comprise, 2023-2026. ${Array.from(
              { length: 70 },
              () => 'mot',
            ).join(' ')} 50 salariés`,
          ],
        },
      ],
      sources_citees: [],
      familles: null,
      encart: null,
    };
    const found = codes(reportWith(perimetre));
    expect(found).not.toContain('V5');
    expect(found).not.toContain('V6');
  });
});

describe('boucle de rejeu', () => {
  it('ne fait rejouer que les sections porteuses d’un échec bloquant', () => {
    const report: PreRapportOutput = {
      sections: [
        contexte(['trop court'], []), // V9 bloquant
        {
          id: 'repere-sectoriel',
          titre: 'Votre secteur en repère',
          contenu: [
            {
              intertitre: 'Un intertitre bien trop long pour tenir dans la limite des douze mots fixée',
              paragraphes: [Array.from({ length: 240 }, () => 'mot').join(' ')],
            },
          ],
          sources_citees: [],
          familles: null,
          encart: null,
        },
      ],
    };
    const findings = validateReport(report);
    expect(findings.some((f) => f.code === 'V12')).toBe(true); // avertissement seul
    expect(sectionsToReplay(findings)).toEqual(['contexte']);
    expect(blockingFindings(findings).every((f) => f.sectionId === 'contexte')).toBe(true);
    expect(findingsBrief(findings, 'contexte')).toContain('[V9]');
  });
});

describe('syncSourcesCitees — l’audit décrit ce que le lecteur voit en note', () => {
  it('aligne sources_citees sur les marqueurs réellement posés, ids inconnus exclus', () => {
    const report = reportWith(
      contexte([`a [[${STANFORD}]] b [[inconnu-xyz]]`], ['id-declare-mais-non-marque']),
    );
    const out = syncSourcesCitees(report);
    expect(out.sections[0].sources_citees).toEqual([STANFORD]);
  });
});
