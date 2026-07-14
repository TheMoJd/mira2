import { describe, it, expect } from 'vitest';
import { validateStep, STEP_COUNT, normalizePhone } from './validation';
import { emptyPreRapportForm } from '../../types/prerapport';
import type { PreRapportForm } from '../../types/prerapport';

const f = (over: Partial<PreRapportForm>): PreRapportForm => ({ ...emptyPreRapportForm, ...over });

describe('validateStep', () => {
  it('a bien 5 étapes', () => {
    expect(STEP_COUNT).toBe(5);
  });

  it('étape 0 : secteur requis, SIRET optionnel mais 14 chiffres si fourni', () => {
    expect(validateStep(0, f({ secteurActivite: '' }))).toHaveProperty('secteurActivite');
    expect(validateStep(0, f({ secteurActivite: 'Transport' }))).toEqual({});
    expect(validateStep(0, f({ secteurActivite: 'Transport', siret: '123' }))).toHaveProperty('siret');
    expect(validateStep(0, f({ secteurActivite: 'Transport', siret: '424 761 419 00045' }))).toEqual({});
  });

  it('étape 1 : produits et clients requis', () => {
    const e = validateStep(1, f({ produitsServices: '', clients: '' }));
    expect(e).toHaveProperty('produitsServices');
    expect(e).toHaveProperty('clients');
    expect(validateStep(1, f({ produitsServices: 'X', clients: 'Y' }))).toEqual({});
  });

  it('étape 2 : au moins une famille de métiers', () => {
    expect(validateStep(2, f({ famillesMetiers: [] }))).toHaveProperty('famillesMetiers');
    expect(validateStep(2, f({ famillesMetiers: ['Tech'] }))).toEqual({});
  });

  it('étape 3 : URL optionnelle mais valide si fournie', () => {
    expect(validateStep(3, f({ siteUrl: 'pas-une-url' }))).toHaveProperty('siteUrl');
    expect(validateStep(3, f({ siteUrl: '' }))).toEqual({});
    expect(validateStep(3, f({ siteUrl: 'https://ovhcloud.com' }))).toEqual({});
  });

  /** Étape identité complète et valide (le 13/07 ajoute entreprise + fonction obligatoires). */
  const identiteValide = {
    prenom: 'Camille',
    nom: 'Durand',
    entreprise: 'Transports Durand',
    fonction: 'DRH',
    email: 'a@b.fr',
    consentRgpd: true,
  };

  it('étape 4 : email valide + consentement obligatoires', () => {
    const e = validateStep(4, f({ email: 'invalide', consentRgpd: false }));
    expect(e).toHaveProperty('email');
    expect(e).toHaveProperty('consentRgpd');
    expect(validateStep(4, f(identiteValide))).toEqual({});
  });

  it('étape 4 : prénom et nom requis (qualification lead, réunion 10/07)', () => {
    const e = validateStep(4, f({ ...identiteValide, prenom: '', nom: ' ' }));
    expect(e).toHaveProperty('prenom');
    expect(e).toHaveProperty('nom');
  });

  it('étape 4 : entreprise et fonction requises (décision CTO 13/07)', () => {
    const e = validateStep(4, f({ ...identiteValide, entreprise: '  ', fonction: '' }));
    expect(e).toHaveProperty('entreprise');
    expect(e).toHaveProperty('fonction');
    expect(validateStep(4, f(identiteValide))).toEqual({});
  });

  it('étape 4 : téléphone optionnel, format FR validé si fourni', () => {
    expect(validateStep(4, f({ ...identiteValide, telephone: '' }))).toEqual({});
    expect(validateStep(4, f({ ...identiteValide, telephone: '06 12 34 56 78' }))).toEqual({});
    expect(validateStep(4, f({ ...identiteValide, telephone: '+33 6 12 34 56 78' }))).toEqual({});
    expect(validateStep(4, f({ ...identiteValide, telephone: '123' }))).toHaveProperty('telephone');
    expect(validateStep(4, f({ ...identiteValide, telephone: '00 12 34 56 78' }))).toHaveProperty('telephone');
  });
});

describe('normalizePhone', () => {
  it('retire espaces, points, tirets et parenthèses', () => {
    expect(normalizePhone('06 12.34-56 78')).toBe('0612345678');
    expect(normalizePhone('+33 6-12-34-56-78')).toBe('+33612345678');
    expect(normalizePhone('(06) 12 34 56 78')).toBe('0612345678');
  });

  it('replie les conventions internationales « +33 (0)6… » et « 0033… » sur « +336… »', () => {
    // Formats répandus dans les signatures email FR : un lead qui colle
    // son numéro ne doit pas être rejeté sur un champ optionnel.
    expect(normalizePhone('+33 (0)6 12 34 56 78')).toBe('+33612345678');
    expect(normalizePhone('0033 6 12 34 56 78')).toBe('+33612345678');
  });
});
