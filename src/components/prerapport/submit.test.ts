/**
 * Test du transport client (`submitPreRapport`) : vérifie que les clés FormData
 * envoyées correspondent EXACTEMENT à ce que lit le serveur (`fields.prenom`,
 * `fields.telephone`…). Sans ce test, une clé mal orthographiée côté client
 * ferait un 422 systématique en prod pendant que toute la suite reste verte
 * (le test serveur construit son propre corps multipart).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { submitPreRapport } from './submit';
import { emptyPreRapportForm } from '../../types/prerapport';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('submitPreRapport — contrat de transport FormData', () => {
  it('envoie les clés attendues par le serveur, téléphone normalisé côté client', async () => {
    let sent: FormData | null = null;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: { body: FormData }) => {
        sent = init.body;
        return { ok: true, json: async () => ({ leadId: 'lead-test' }) };
      }),
    );

    const result = await submitPreRapport(
      {
        ...emptyPreRapportForm,
        secteurActivite: 'Transport',
        produitsServices: 'Livraison',
        clients: 'E-commerçants',
        famillesMetiers: ['Transport & logistique'],
        siret: '424 761 419 00045',
        prenom: 'Camille',
        nom: 'Durand',
        fonction: 'DRH',
        telephone: '+33 (0)6 12 34 56 78',
        email: 'camille@exemple.fr',
        consentRgpd: true,
      },
      '',
    );

    expect(result).toEqual({ ok: true, leadId: 'lead-test' });
    const fd = sent as unknown as FormData;
    expect(fd).not.toBeNull();
    // Les clés lues par submit-prerapport (fields.<clé>) — toute dérive = 422 en prod.
    expect(fd.get('prenom')).toBe('Camille');
    expect(fd.get('nom')).toBe('Durand');
    expect(fd.get('fonction')).toBe('DRH');
    expect(fd.get('telephone')).toBe('+33612345678');
    expect(fd.get('email')).toBe('camille@exemple.fr');
    expect(fd.get('siret')).toBe('42476141900045');
    expect(fd.get('consentRgpd')).toBe('true');
    expect(fd.get('famillesMetiers')).toBe(JSON.stringify(['Transport & logistique']));
    expect(fd.get('company_website_hp')).toBe('');
  });
});
