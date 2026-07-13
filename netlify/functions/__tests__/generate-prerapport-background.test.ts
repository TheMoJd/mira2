import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks partagés (hoistés pour être accessibles dans les factories vi.mock).
const h = vi.hoisted(() => ({
  createCompletion: vi.fn(),
  sendReportEmail: vi.fn(),
  sendLeadNotification: vi.fn(),
  updates: [] as Array<Record<string, unknown>>,
  inserts: [] as Array<Record<string, unknown>>,
  lead: {
    id: 'lead-1',
    secteur_activite: 'Cloud et hébergement',
    produits_services: 'Serveurs, cloud',
    clients: 'PME, grands comptes',
    familles_metiers: ['Tech, informatique & data'],
    naf_code: null,
    effectif_tranche: null,
    prenom: 'Camille',
    nom: 'Durand',
    fonction: 'DRH',
    entreprise: 'ACME',
    email: 'camille@exemple.fr',
  },
}));

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: (...args: unknown[]) => h.createCompletion(...args) } };
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: h.lead, error: null }) }) }),
      update: (payload: Record<string, unknown>) => {
        h.updates.push(payload);
        // Le CAS d'idempotence chaîne .update().eq().eq().select() ; les autres
        // updates font .update().eq() puis await. Builder thenable qui gère les deux.
        const result = {
          data: payload.status === 'generating' ? [{ id: 'lead-1' }] : null,
          error: null,
        };
        const builder: {
          eq: () => typeof builder;
          select: () => Promise<typeof result>;
          then: (resolve: (v: typeof result) => unknown) => unknown;
        } = {
          eq: () => builder,
          select: async () => result,
          then: (resolve) => resolve(result),
        };
        return builder;
      },
      insert: async (payload: Record<string, unknown>) => {
        h.inserts.push(payload);
        return { data: null, error: null };
      },
    }),
    storage: { from: () => ({ upload: async () => ({ error: null }) }) },
  }),
}));

// PDF (Chromium) et email (Resend) mockés : on teste l'orchestration, pas les binaires.
vi.mock('../lib/pdf', () => ({ htmlToPdf: vi.fn(async () => Buffer.from('%PDF-test')) }));
vi.mock('../lib/email', () => ({
  sendReportEmail: (...args: unknown[]) => h.sendReportEmail(...args),
  sendLeadNotification: (...args: unknown[]) => h.sendLeadNotification(...args),
  notifyFailure: vi.fn(async () => {}),
}));

import { handler } from '../generate-prerapport-background';

const REPORT = {
  sections: [
    { id: 'perimetre', titre: 'Périmètre', contenu: [{ intertitre: null, paragraphes: ['ok'] }], sources_citees: [], familles: null },
  ],
};

const event = { body: JSON.stringify({ leadId: 'lead-1' }) } as never;
const ctx = {} as never;

beforeEach(() => {
  h.updates.length = 0;
  h.inserts.length = 0;
  h.createCompletion.mockReset();
  h.sendReportEmail.mockReset();
  h.sendReportEmail.mockResolvedValue('skipped');
  h.sendLeadNotification.mockReset();
  h.sendLeadNotification.mockResolvedValue('sent');
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  process.env.OPENAI_API_KEY = 'sk-test';
});

describe('generate-prerapport-background (OpenAI + Supabase mockés)', () => {
  it('génère puis persiste report_json et passe par le statut generating', async () => {
    h.createCompletion.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(REPORT) } }],
    });

    const res = (await handler(event, ctx, () => {})) as { statusCode: number };
    expect(res.statusCode).toBe(200);
    expect(h.createCompletion).toHaveBeenCalledOnce();
    expect(h.updates.some((u) => u.status === 'generating')).toBe(true);
    const stored = h.updates.find((u) => 'report_json' in u);
    expect(stored?.report_json).toEqual(REPORT);
    // Tranche 4b : PDF uploadé → ligne `reports` insérée → statut final `sent`.
    expect(h.inserts.some((i) => 'pdf_path' in i)).toBe(true);
    expect(h.updates.some((u) => u.status === 'sent')).toBe(true);
  });

  it('notifie l’interne après livraison effective au prospect (CTO 13/07)', async () => {
    h.createCompletion.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(REPORT) } }],
    });
    h.sendReportEmail.mockResolvedValue('sent');

    const res = (await handler(event, ctx, () => {})) as { statusCode: number };
    expect(res.statusCode).toBe(200);
    expect(h.sendLeadNotification).toHaveBeenCalledOnce();
    expect(h.sendLeadNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: 'lead-1',
        prenom: 'Camille',
        nom: 'Durand',
        fonction: 'DRH',
        entreprise: 'ACME',
        email: 'camille@exemple.fr',
        secteur: 'Cloud et hébergement',
      }),
    );
  });

  it('ne notifie pas quand la livraison au prospect n’a pas eu lieu (skipped)', async () => {
    h.createCompletion.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(REPORT) } }],
    });
    // Défaut du beforeEach : sendReportEmail → 'skipped'.
    const res = (await handler(event, ctx, () => {})) as { statusCode: number };
    expect(res.statusCode).toBe(200);
    expect(h.sendLeadNotification).not.toHaveBeenCalled();
  });

  it('un échec de la notification interne ne fait pas échouer le pipeline', async () => {
    h.createCompletion.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(REPORT) } }],
    });
    h.sendReportEmail.mockResolvedValue('sent');
    // Contrat : sendLeadNotification ne throw jamais, mais même si ça arrivait,
    // le handler doit rester sur le chemin nominal (ceinture + bretelles).
    h.sendLeadNotification.mockRejectedValue(new Error('resend down'));

    const res = (await handler(event, ctx, () => {})) as { statusCode: number };
    expect(res.statusCode).toBe(200);
    expect(h.updates.some((u) => u.status === 'sent')).toBe(true);
    expect(h.updates.some((u) => u.status === 'failed')).toBe(false);
  });

  it('passe le lead en failed si OpenAI échoue', async () => {
    h.createCompletion.mockRejectedValue(new Error('boom'));

    const res = (await handler(event, ctx, () => {})) as { statusCode: number };
    expect(res.statusCode).toBe(500);
    expect(h.updates.some((u) => u.status === 'failed')).toBe(true);
  });

  it('refuse une requête sans leadId', async () => {
    const res = (await handler({ body: '{}' } as never, ctx, () => {})) as { statusCode: number };
    expect(res.statusCode).toBe(400);
  });
});
