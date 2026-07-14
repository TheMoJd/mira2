import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks partagés (hoistés pour être accessibles dans les factories vi.mock).
const h = vi.hoisted(() => {
  // Les ids `leads` sont des uuid Supabase : le handler rejette tout autre format.
  const LEAD_ID = '4dc45e60-91a1-4a91-89f4-3ba7dc59f4a5';
  return {
    LEAD_ID,
    createCompletion: vi.fn(),
    sendReportEmail: vi.fn(),
    sendLeadNotification: vi.fn(),
    notifyFailure: vi.fn(async (..._args: unknown[]) => {}),
    htmlToPdf: vi.fn(async (..._args: unknown[]) => Buffer.from('%PDF-test')),
    /** Spy dédié à l'update `{status:'sent'}` : sert à l'assertion d'ORDRE
     *  (statut figé AVANT la notification interne) via invocationCallOrder. */
    sentStatusUpdate: vi.fn(),
    /** Drapeau : fait échouer l'update `{status:'sent'}` (branche statusError). */
    failSentUpdate: false,
    /** Drapeau : le select du lead ne trouve rien (lead introuvable → 404). */
    leadNotFound: false,
    updates: [] as Array<Record<string, unknown>>,
    inserts: [] as Array<Record<string, unknown>>,
    lead: {
      id: LEAD_ID,
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
  };
});

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: (...args: unknown[]) => h.createCompletion(...args) } };
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () =>
            h.leadNotFound ? { data: null, error: { message: 'x' } } : { data: h.lead, error: null },
        }),
      }),
      update: (payload: Record<string, unknown>) => {
        h.updates.push(payload);
        if (payload.status === 'sent') h.sentStatusUpdate();
        // Le CAS d'idempotence chaîne .update().eq().eq().select() ; les autres
        // updates font .update().eq() puis await. Builder thenable qui gère les deux.
        const result =
          payload.status === 'sent' && h.failSentUpdate
            ? { data: null, error: { message: 'boom' } }
            : { data: payload.status === 'generating' ? [{ id: h.LEAD_ID }] : null, error: null };
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
vi.mock('../lib/pdf', () => ({ htmlToPdf: (...args: unknown[]) => h.htmlToPdf(...args) }));
vi.mock('../lib/email', () => ({
  sendReportEmail: (...args: unknown[]) => h.sendReportEmail(...args),
  sendLeadNotification: (...args: unknown[]) => h.sendLeadNotification(...args),
  notifyFailure: (...args: unknown[]) => h.notifyFailure(...args),
}));

// Mock PARTIEL : renderReportHtml devient un spy (même implémentation) pour
// asserter le contexte de rendu (dateGeneration ISO) reçu du handler.
vi.mock('../../../src/data/reportHtml', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/data/reportHtml')>();
  return { ...actual, renderReportHtml: vi.fn(actual.renderReportHtml) };
});

import { handler } from '../generate-prerapport-background';
import { renderReportHtml } from '../../../src/data/reportHtml';

const REPORT = {
  sections: [
    { id: 'perimetre', titre: 'Périmètre', contenu: [{ intertitre: null, paragraphes: ['ok'] }], sources_citees: [], familles: null },
  ],
};

const event = { body: JSON.stringify({ leadId: h.LEAD_ID }) } as never;
const ctx = {} as never;

beforeEach(() => {
  h.updates.length = 0;
  h.inserts.length = 0;
  h.failSentUpdate = false;
  h.leadNotFound = false;
  h.createCompletion.mockReset();
  h.sendReportEmail.mockReset();
  h.sendReportEmail.mockResolvedValue('skipped');
  h.sendLeadNotification.mockReset();
  h.sendLeadNotification.mockResolvedValue('sent');
  h.notifyFailure.mockClear();
  h.htmlToPdf.mockClear();
  h.sentStatusUpdate.mockClear();
  vi.mocked(renderReportHtml).mockClear();
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
        leadId: h.LEAD_ID,
        prenom: 'Camille',
        nom: 'Durand',
        fonction: 'DRH',
        entreprise: 'ACME',
        email: 'camille@exemple.fr',
        secteur: 'Cloud et hébergement',
      }),
    );
  });

  it('fige le statut sent AVANT d’envoyer la notification interne', async () => {
    h.createCompletion.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(REPORT) } }],
    });
    h.sendReportEmail.mockResolvedValue('sent');

    await handler(event, ctx, () => {});
    expect(h.sentStatusUpdate).toHaveBeenCalledOnce();
    expect(h.sendLeadNotification).toHaveBeenCalledOnce();
    // Ordre garanti par le handler : réduire la fenêtre où une relance ops
    // renverrait le PDF passe avant la notification interne.
    expect(h.sentStatusUpdate.mock.invocationCallOrder[0]).toBeLessThan(
      h.sendLeadNotification.mock.invocationCallOrder[0],
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

  it('alerte l’ops (« NE PAS relancer ») sans rethrow si le passage à sent échoue', async () => {
    h.createCompletion.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(REPORT) } }],
    });
    h.sendReportEmail.mockResolvedValue('sent');
    h.failSentUpdate = true;

    const res = (await handler(event, ctx, () => {})) as { statusCode: number };
    // Pas de rethrow : le rapport est livré, re-passer en `failed` déclencherait
    // précisément la relance qu'on veut éviter.
    expect(res.statusCode).toBe(200);
    expect(h.notifyFailure).toHaveBeenCalledOnce();
    const { error } = h.notifyFailure.mock.calls[0][0] as { error: Error };
    expect(error.message).toContain('NE PAS relancer');
    expect(h.updates.some((u) => u.status === 'failed')).toBe(false);
  });

  it('transmet à htmlToPdf le pied de page « Mira audit · » (footer Chromium)', async () => {
    h.createCompletion.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(REPORT) } }],
    });

    await handler(event, ctx, () => {});
    expect(h.htmlToPdf).toHaveBeenCalledOnce();
    const options = h.htmlToPdf.mock.calls[0][1] as { footer: string };
    expect(options.footer).toContain('Mira audit · ');
  });

  it('passe dateGeneration (ISO 8601) au contexte de rendu HTML', async () => {
    h.createCompletion.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(REPORT) } }],
    });

    await handler(event, ctx, () => {});
    expect(renderReportHtml).toHaveBeenCalledOnce();
    const renderCtx = vi.mocked(renderReportHtml).mock.calls[0][1];
    expect(renderCtx.dateGeneration).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
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

  it('rejette un leadId non-UUID (400) sans alerter l’ops (endpoint public)', async () => {
    const forged = { body: JSON.stringify({ leadId: 'lead-1-forge' }) } as never;
    const res = (await handler(forged, ctx, () => {})) as { statusCode: number };
    expect(res.statusCode).toBe(400);
    expect(h.notifyFailure).not.toHaveBeenCalled();
    // Rien ne doit toucher la base pour un id forgé.
    expect(h.updates).toHaveLength(0);
  });

  it('répond 404 sans alerter l’ops quand le lead est introuvable', async () => {
    h.leadNotFound = true;
    const res = (await handler(event, ctx, () => {})) as { statusCode: number };
    expect(res.statusCode).toBe(404);
    expect(h.notifyFailure).not.toHaveBeenCalled();
    expect(h.updates.some((u) => u.status === 'failed')).toBe(false);
  });
});
