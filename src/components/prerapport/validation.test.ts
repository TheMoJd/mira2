import { describe, it, expect } from 'vitest';
import { validateStep, STEP_COUNT } from './validation';
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

  it('étape 4 : email valide + consentement obligatoires', () => {
    const e = validateStep(4, f({ email: 'invalide', consentRgpd: false }));
    expect(e).toHaveProperty('email');
    expect(e).toHaveProperty('consentRgpd');
    expect(validateStep(4, f({ email: 'a@b.fr', consentRgpd: true }))).toEqual({});
  });
});
