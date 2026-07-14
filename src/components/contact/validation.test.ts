import { describe, it, expect } from 'vitest';
import { validateContact } from './validation';
import { emptyContactForm } from '../../types/contact';
import type { ContactForm } from '../../types/contact';
import {
  FONCTION_AUTRE,
  FONCTIONS,
  SECTEURS,
  EFFECTIFS,
  PRE_DIAGNOSTICS,
  PRIORITES,
  HORIZONS,
  MAX_MESSAGE_LEN,
} from '../../data/contact';

const f = (over: Partial<ContactForm>): ContactForm => ({ ...emptyContactForm, ...over });

/** Fiche minimale entièrement valide, sur laquelle chaque test tord un champ. */
const valid: ContactForm = {
  ...emptyContactForm,
  prenom: 'Camille',
  nom: 'Durand',
  email: 'camille@entreprise.fr',
  fonction: FONCTIONS[0],
  entreprise: 'Acme',
  secteur: SECTEURS[0],
  effectif: EFFECTIFS[0],
  maturiteIa: '5',
  preDiagnostic: PRE_DIAGNOSTICS[0],
  priorite: PRIORITES[0],
  horizon: HORIZONS[0],
};

describe('validateContact', () => {
  it('accepte une fiche complète', () => {
    expect(validateContact(valid)).toEqual({});
  });

  it('exige les champs d’identité obligatoires', () => {
    const e = validateContact(f({}));
    for (const k of ['prenom', 'nom', 'email', 'fonction', 'entreprise'] as const) {
      expect(e).toHaveProperty(k);
    }
  });

  it('valide le format de l’email', () => {
    expect(validateContact({ ...valid, email: 'pas-un-email' })).toHaveProperty('email');
    expect(validateContact({ ...valid, email: 'a@b.fr' })).toEqual({});
  });

  it('exige la précision de fonction uniquement pour « Autre »', () => {
    // « Autre » sans précision → erreur ciblée.
    expect(validateContact({ ...valid, fonction: FONCTION_AUTRE, fonctionAutre: '' }))
      .toHaveProperty('fonctionAutre');
    // « Autre » avec précision → OK.
    expect(validateContact({ ...valid, fonction: FONCTION_AUTRE, fonctionAutre: 'Chief AI Officer' }))
      .toEqual({});
    // Fonction standard → la précision n’est jamais requise.
    expect(validateContact({ ...valid, fonctionAutre: '' })).toEqual({});
  });

  it('rejette une valeur hors liste (anti-tampering serveur)', () => {
    expect(validateContact({ ...valid, secteur: 'Secteur bidon' })).toHaveProperty('secteur');
    expect(validateContact({ ...valid, effectif: '42 salariés' })).toHaveProperty('effectif');
    expect(validateContact({ ...valid, maturiteIa: '11' })).toHaveProperty('maturiteIa');
    expect(validateContact({ ...valid, maturiteIa: '0' })).toHaveProperty('maturiteIa');
  });

  it('exige les champs de contexte et de besoin', () => {
    const e = validateContact(f({
      prenom: 'A', nom: 'B', email: 'a@b.fr', fonction: FONCTIONS[0], entreprise: 'C',
    }));
    for (const k of ['secteur', 'effectif', 'maturiteIa', 'preDiagnostic', 'priorite', 'horizon'] as const) {
      expect(e).toHaveProperty(k);
    }
  });

  it('téléphone optionnel, validé au format FR si fourni', () => {
    expect(validateContact({ ...valid, telephone: '' })).toEqual({});
    expect(validateContact({ ...valid, telephone: '06 12 34 56 78' })).toEqual({});
    expect(validateContact({ ...valid, telephone: '+33 (0)6 12 34 56 78' })).toEqual({});
    expect(validateContact({ ...valid, telephone: '123' })).toHaveProperty('telephone');
  });

  it('message optionnel mais borné', () => {
    expect(validateContact({ ...valid, message: 'RAS' })).toEqual({});
    expect(validateContact({ ...valid, message: 'x'.repeat(MAX_MESSAGE_LEN + 1) })).toHaveProperty('message');
  });
});
