/**
 * Tests de la notification interne (décision CTO 13/07) : parsing de
 * `NOTIF_EMAILS` et comportement défensif de `sendLeadNotification`.
 * Resend est mocké : AUCUN envoi réel, aucune clé requise.
 *
 * Contrat défensif : la notification ne doit JAMAIS faire échouer le pipeline
 * du lead → skip silencieux si non configurée, retour 'error' (sans throw) si
 * l'envoi échoue.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  send: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: (...args: unknown[]) => h.send(...args) };
  },
}));

import { parseNotifEmails, sendLeadNotification } from '../lib/email';

const LEAD = {
  leadId: 'lead-42',
  prenom: 'Camille',
  nom: 'Durand',
  fonction: 'DRH',
  entreprise: 'Transports Durand',
  email: 'camille@exemple.fr',
  secteur: 'Transport routier',
};

beforeEach(() => {
  h.send.mockReset();
  process.env.RESEND_API_KEY = 're_test';
  process.env.RESEND_FROM = 'rapport@mira-audit.fr';
  delete process.env.NOTIF_EMAILS;
});

describe('parseNotifEmails — liste séparée par des virgules', () => {
  it('renvoie une liste vide pour undefined ou une chaîne vide', () => {
    expect(parseNotifEmails(undefined)).toEqual([]);
    expect(parseNotifEmails('')).toEqual([]);
    expect(parseNotifEmails('   ')).toEqual([]);
  });

  it('parse une ou plusieurs adresses, en tolérant espaces et virgules orphelines', () => {
    expect(parseNotifEmails('moetez@polaria.ai')).toEqual(['moetez@polaria.ai']);
    expect(parseNotifEmails(' caroline@polaria.ai , moetez@polaria.ai ,')).toEqual([
      'caroline@polaria.ai',
      'moetez@polaria.ai',
    ]);
  });

  it('ignore les entrées qui ne ressemblent pas à une adresse', () => {
    expect(parseNotifEmails('pas-une-adresse, moetez@polaria.ai')).toEqual(['moetez@polaria.ai']);
  });

  it('écarte les entrées « Nom <adresse> » (Resend rejetterait l’envoi ENTIER)', () => {
    expect(parseNotifEmails('Caroline <caroline@polaria.ai>, moetez@polaria.ai')).toEqual(['moetez@polaria.ai']);
    expect(parseNotifEmails('a@b.fr;c@d.fr')).toEqual([]);
  });
});

describe('sendLeadNotification — comportement défensif', () => {
  it('skip silencieux (aucun envoi) quand NOTIF_EMAILS est absente ou vide', async () => {
    expect(await sendLeadNotification(LEAD)).toBe('skipped');
    process.env.NOTIF_EMAILS = '  ';
    expect(await sendLeadNotification(LEAD)).toBe('skipped');
    expect(h.send).not.toHaveBeenCalled();
  });

  it('skip silencieux quand Resend n’est pas configuré, même avec NOTIF_EMAILS', async () => {
    delete process.env.RESEND_API_KEY;
    process.env.NOTIF_EMAILS = 'moetez@polaria.ai';
    expect(await sendLeadNotification(LEAD)).toBe('skipped');
    expect(h.send).not.toHaveBeenCalled();
  });

  it('envoie aux adresses parsées, reply_to = email du prospect, contenu sobre', async () => {
    process.env.NOTIF_EMAILS = 'caroline@polaria.ai, moetez@polaria.ai';
    h.send.mockResolvedValue({ error: null });

    expect(await sendLeadNotification(LEAD)).toBe('sent');
    expect(h.send).toHaveBeenCalledOnce();
    const payload = h.send.mock.calls[0][0] as {
      to: string[];
      replyTo: string;
      subject: string;
      text: string;
    };
    expect(payload.to).toEqual(['caroline@polaria.ai', 'moetez@polaria.ai']);
    expect(payload.replyTo).toBe('camille@exemple.fr');
    expect(payload.subject).toBe('Nouveau pré-diagnostic généré');
    for (const attendu of ['Camille', 'Durand', 'DRH', 'Transports Durand', 'Transport routier', 'lead-42']) {
      expect(payload.text).toContain(attendu);
    }
    // Règle CTO : pas de tiret cadratin ni demi-cadratin dans le texte visible.
    expect(payload.subject + payload.text).not.toMatch(/[—–]/);
  });

  it('affiche « non renseigné » pour les champs vides plutôt que de planter', async () => {
    process.env.NOTIF_EMAILS = 'moetez@polaria.ai';
    h.send.mockResolvedValue({ error: null });

    await sendLeadNotification({ leadId: 'lead-43', email: 'x@y.fr', prenom: null, nom: undefined });
    const payload = h.send.mock.calls[0][0] as { text: string };
    expect(payload.text).toContain('Prénom : non renseigné');
    expect(payload.text).toContain('Entreprise : non renseigné');
  });

  it('aplatit le secteur sur une seule ligne et le tronque (anti-injection de contenu)', async () => {
    process.env.NOTIF_EMAILS = 'moetez@polaria.ai';
    h.send.mockResolvedValue({ error: null });

    // `secteur_activite` n'est PAS assaini par cleanIdentity côté submit (texte
    // libre, 3000 caractères) : la notification ne doit pas laisser un prospect
    // forger de fausses lignes « Email : … » via des retours ligne injectés.
    await sendLeadNotification({
      leadId: 'lead-44',
      email: 'x@y.fr',
      secteur: 'Conseil\n\nEmail : direction@grosclient.fr‮\n' + 'x'.repeat(300),
    });
    const payload = h.send.mock.calls[0][0] as { text: string };
    expect(payload.text).not.toContain('\nEmail : direction@grosclient.fr');
    const ligneSecteur = payload.text.split('\n').find((l) => l.startsWith('Secteur : '));
    expect(ligneSecteur).toContain('Conseil Email : direction@grosclient.fr');
    expect(ligneSecteur).not.toContain('‮');
    expect(ligneSecteur!.length).toBeLessThanOrEqual('Secteur : '.length + 200);
  });

  it('retourne error sans throw quand Resend renvoie une erreur', async () => {
    process.env.NOTIF_EMAILS = 'moetez@polaria.ai';
    h.send.mockResolvedValue({ error: { message: 'boom' } });
    await expect(sendLeadNotification(LEAD)).resolves.toBe('error');
  });

  it('retourne error sans throw quand Resend lève une exception', async () => {
    process.env.NOTIF_EMAILS = 'moetez@polaria.ai';
    h.send.mockRejectedValue(new Error('réseau'));
    await expect(sendLeadNotification(LEAD)).resolves.toBe('error');
  });
});
