import { describe, expect, it } from 'vitest';
import { cleanLine, cleanMultiline } from './textClean';

describe('cleanLine', () => {
  it('supprime un trait d’union conditionnel sans couper le mot', () => {
    expect(cleanLine('compé­tences')).toBe('compétences');
  });

  it('supprime les espaces de largeur nulle et marques de direction', () => {
    expect(cleanLine('IA​générative‮')).toBe('IAgénérative');
  });

  it('garde les espaces insécables françaises par défaut', () => {
    expect(cleanLine('63 % des employeurs')).toBe('63 % des employeurs');
  });

  it('replie les insécables si demandé', () => {
    expect(cleanLine('63 %', { keepNbsp: false })).toBe('63 %');
  });

  it('replie tabulations et retours ligne en une espace', () => {
    expect(cleanLine('  un\t\tdeux\r\ntrois  ')).toBe('un deux trois');
  });

  it('compose les accents (NFC)', () => {
    expect(cleanLine('à la')).toBe('à la');
  });

  it('tolère null et undefined', () => {
    expect(cleanLine(null)).toBe('');
    expect(cleanLine(undefined)).toBe('');
  });
});

describe('cleanMultiline', () => {
  it('garde les sauts de ligne, supprime le reste des invisibles', () => {
    expect(cleanMultiline(' ligne 1\r\nligne­ 2​ ')).toBe('ligne 1\nligne 2');
  });
});
