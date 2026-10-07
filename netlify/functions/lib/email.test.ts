/**
 * Tests de `sendReportEmail` (copie cachée équipe, `REPORT_BCC_EMAIL`) et des alertes
 * ops (`OPS_EMAIL`).
 *
 * Resend est mocké : aucun email ne part, on inspecte seulement le payload que la
 * function aurait envoyé. Adresses en `.test` (domaine réservé, jamais routable).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendReportEmail, parseRecipients, notifyReview, notifySubmitFailure } from './email';

const h = vi.hoisted(() => ({
  sent: [] as Array<Record<string, unknown>>,
  /** Erreur d'API que le prochain envoi renverra (une seule fois), comme le fait Resend. */
  nextError: null as { message: string } | null,
  lastError: null as { message: string } | null,
}));

vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: async (payload: Record<string, unknown>) => {
        h.sent.push(payload);
        const error = h.nextError;
        h.nextError = null;
        h.lastError = error;
        return error ? { data: null, error } : { data: { id: 'email-test' }, error: null };
      },
    };
  },
}));

const PDF = Buffer.from('%PDF-test');

describe('sendReportEmail — copie cachée équipe', () => {
  beforeEach(() => {
    h.sent = [];
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('RESEND_FROM', 'rapport@mira.test');
    vi.stubEnv('RESEND_REPLY_TO', '');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('ajoute la CCI (liste à virgules) avec la même pièce jointe', async () => {
    vi.stubEnv('REPORT_BCC_EMAIL', ' equipe-a@mira.test , equipe-b@mira.test ');
    const result = await sendReportEmail({ to: 'prospect@client.test', pdf: PDF });

    expect(result).toBe('sent');
    expect(h.sent).toHaveLength(1); // un seul envoi : la CCI voyage avec l'email du prospect
    const payload = h.sent[0];
    expect(payload.to).toEqual(['prospect@client.test']);
    expect(payload.bcc).toEqual(['equipe-a@mira.test', 'equipe-b@mira.test']);
    expect(payload.attachments).toEqual([
      { filename: 'prerapport-mira.pdf', content: PDF.toString('base64') },
    ]);
  });

  it('aucune CCI quand la variable est vide ou absente', async () => {
    vi.stubEnv('REPORT_BCC_EMAIL', '');
    await sendReportEmail({ to: 'prospect@client.test', pdf: PDF });
    vi.stubEnv('REPORT_BCC_EMAIL', ' , ');
    await sendReportEmail({ to: 'prospect@client.test', pdf: PDF });

    expect(h.sent).toHaveLength(2);
    for (const payload of h.sent) expect(payload).not.toHaveProperty('bcc');
  });

  it('le prospect est informé de la transmission à l’équipe (mention RGPD)', async () => {
    await sendReportEmail({ to: 'prospect@client.test', pdf: PDF });
    expect(String(h.sent[0].html)).toContain('Une copie en est transmise à l\'équipe MIRA');
  });
});

describe('alertes ops (OPS_EMAIL)', () => {
  beforeEach(() => {
    h.sent = [];
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('RESEND_FROM', 'rapport@mira.test');
    vi.stubEnv('OPS_EMAIL', 'ops@mira.test');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('notifyReview : le rapport part à relire, l’ops reçoit le lead et les contrôles bloquants', async () => {
    await notifyReview({
      leadId: 'lead-9',
      findings: [
        { code: 'V13', level: 'bloquant', sectionId: 'familles-metiers', message: 'caractère hors alphabet latin' },
      ],
    });

    expect(h.sent).toHaveLength(1);
    const payload = h.sent[0];
    expect(payload.to).toEqual(['ops@mira.test']);
    expect(String(payload.subject)).toContain('lead-9');
    expect(String(payload.text)).toContain('V13');
    expect(String(payload.text)).toContain('familles-metiers');
    expect(String(payload.text)).toContain('caractère hors alphabet latin');
  });

  it('notifySubmitFailure : la demande n’a pas pu être enregistrée, l’ops reçoit l’erreur et l’adresse à recontacter', async () => {
    await notifySubmitFailure({ email: 'prospect@client.test', error: new Error('fetch failed') });

    expect(h.sent).toHaveLength(1);
    const payload = h.sent[0];
    expect(payload.to).toEqual(['ops@mira.test']);
    expect(String(payload.text)).toContain('fetch failed');
    expect(String(payload.text)).toContain('prospect@client.test');
  });

  it('une alerte refusée par Resend (erreur renvoyée, pas levée) est journalisée', async () => {
    h.nextError = { message: 'domain not verified' };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await notifyReview({ leadId: 'lead-9', findings: [] });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('refusée par Resend'), h.lastError);
    spy.mockRestore();
  });

  it('sans OPS_EMAIL, aucune alerte ne part (journalisée seulement)', async () => {
    vi.stubEnv('OPS_EMAIL', '');
    await notifyReview({ leadId: 'lead-9', findings: [] });
    await notifySubmitFailure({ email: 'prospect@client.test', error: new Error('x') });
    expect(h.sent).toHaveLength(0);
  });
});

describe('parseRecipients', () => {
  it('découpe, nettoie et ignore les entrées vides', () => {
    expect(parseRecipients('a@x.test,, b@y.test ,')).toEqual(['a@x.test', 'b@y.test']);
    expect(parseRecipients(undefined)).toEqual([]);
  });
});
