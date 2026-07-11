import { describe, it, expect } from 'vitest';
import { sanitizeProse, sanitizeReportProse } from './reportSanitize';

describe('sanitizeProse — verrou de style (pas de tiret cadratin ni point-virgule)', () => {
  it('remplace le tiret cadratin entre propositions par une virgule', () => {
    expect(sanitizeProse('Les métiers évoluent — souvent plus vite que prévu.')).toBe(
      'Les métiers évoluent, souvent plus vite que prévu.',
    );
  });

  it('remplace le demi-cadratin entre propositions par une virgule', () => {
    expect(sanitizeProse('Un signal fort – à surveiller.')).toBe('Un signal fort, à surveiller.');
  });

  it('préserve les plages numériques en trait d’union (collées ou espacées)', () => {
    expect(sanitizeProse('Sur la période 2025–2030, la tendance se confirme.')).toBe(
      'Sur la période 2025-2030, la tendance se confirme.',
    );
    expect(sanitizeProse('Sur la période 2025 – 2030, la tendance se confirme.')).toBe(
      'Sur la période 2025-2030, la tendance se confirme.',
    );
    expect(sanitizeProse('entre 10 – 20 % des tâches')).toBe('entre 10-20 % des tâches');
  });

  it('préserve le signe moins devant un chiffre (jamais virgule, jamais supprimé)', () => {
    expect(sanitizeProse('–5 % de baisse attendue')).toBe('-5 % de baisse attendue');
    expect(sanitizeProse('une baisse de –15 % des effectifs')).toBe('une baisse de -15 % des effectifs');
    expect(sanitizeProse('un solde net (–3 %) sur la période')).toBe('un solde net (-3 %) sur la période');
    // Moins ESPACÉ (typo française courante) et vrai signe moins Unicode (U+2212).
    expect(sanitizeProse('une baisse de – 5 % des tâches')).toBe('une baisse de -5 % des tâches');
    expect(sanitizeProse('un solde de −5 %')).toBe('un solde de -5 %');
  });

  it('un cadratin collé à un chiffre reste une incise (jamais un moins inventé)', () => {
    expect(sanitizeProse('Les PME —30 % du panel— innovent')).toBe('Les PME, 30 % du panel, innovent');
  });

  it('gère les variantes : plage cadratin collé, barre horizontale, puce demi-cadratin', () => {
    expect(sanitizeProse('Sur 2025—2030, la tendance.')).toBe('Sur 2025-2030, la tendance.');
    expect(sanitizeProse('Un signal ― fort.')).toBe('Un signal, fort.');
    expect(sanitizeProse('– Premier point')).toBe('Premier point');
    expect(sanitizeProse('Une fin en suspens –')).toBe('Une fin en suspens');
  });

  it('ne laisse pas de virgules doublées quand tiret et point-virgule se suivent', () => {
    expect(sanitizeProse('un signal — ; un autre')).toBe('un signal, un autre');
  });

  it('remplace le point-virgule par une virgule', () => {
    expect(sanitizeProse('Trois leviers ; un seul prioritaire.')).toBe('Trois leviers, un seul prioritaire.');
  });

  it('supprime une puce cadratin en tête de chaîne', () => {
    expect(sanitizeProse('— Premier point')).toBe('Premier point');
  });

  it('nettoie les artefacts en fin de phrase (« —. » ne devient pas « ,. »)', () => {
    expect(sanitizeProse('Une conclusion nette —.')).toBe('Une conclusion nette.');
  });

  it('laisse intacte une prose déjà conforme', () => {
    const ok = 'Une phrase simple, avec des virgules et un trait d’union bien-fondé.';
    expect(sanitizeProse(ok)).toBe(ok);
  });
});

describe('sanitizeReportProse — application récursive au rapport', () => {
  it('sanitise toutes les chaînes sans toucher aux ids ni aux autres types', () => {
    const report = {
      sections: [
        {
          id: 'familles-metiers',
          titre: 'Vos métiers — face à l’IA',
          contenu: [{ intertitre: null, paragraphes: ['Un impact fort ; mesuré.'] }],
          sources_citees: ['wef-2025-01'],
          familles: [
            {
              famille: 'Vente & commerce',
              exposition: 'modérée',
              natures: ['augmentation'],
              part_taches: null,
              confiance: 'élevée',
              transposable_france: true,
              explication: 'Les tâches répétitives — surtout administratives — s’automatisent.',
            },
          ],
        },
      ],
    };
    const out = sanitizeReportProse(report);
    expect(out.sections[0].titre).toBe('Vos métiers, face à l’IA');
    expect(out.sections[0].contenu[0].paragraphes[0]).toBe('Un impact fort, mesuré.');
    expect(out.sections[0].familles?.[0].explication).toBe(
      'Les tâches répétitives, surtout administratives, s’automatisent.',
    );
    expect(out.sections[0].id).toBe('familles-metiers');
    expect(out.sections[0].sources_citees).toEqual(['wef-2025-01']);
    expect(out.sections[0].contenu[0].intertitre).toBeNull();
    expect(out.sections[0].familles?.[0].transposable_france).toBe(true);
  });
});
