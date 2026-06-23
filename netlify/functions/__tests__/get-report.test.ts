import { describe, it, expect, beforeEach, vi } from 'vitest';

const h = vi.hoisted(() => ({
  lead: null as Record<string, unknown> | null,
  signedUrl: 'https://signed.example/prerapport-mira.pdf' as string | null,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: h.lead, error: h.lead ? null : { message: 'no rows' } }),
        }),
      }),
    }),
    storage: {
      from: () => ({
        createSignedUrl: async () => ({
          data: h.signedUrl ? { signedUrl: h.signedUrl } : null,
          error: h.signedUrl ? null : { message: 'no file' },
        }),
      }),
    },
  }),
}));

import { handler } from '../get-report';

const LEAD_ID = '11111111-1111-4111-8111-111111111111';
const VALID_REPORT = {
  sections: [
    { id: 'perimetre', titre: 'Périmètre', contenu: [{ intertitre: null, paragraphes: ['ok'] }], sources_citees: [], familles: null },
  ],
};

function baseLead(overrides: Record<string, unknown> = {}) {
  return {
    id: LEAD_ID,
    status: 'sent',
    report_json: VALID_REPORT,
    siret: null,
    created_at: '2026-06-22T10:00:00Z',
    secteur_activite: 'Cloud',
    produits_services: 'Serveurs',
    clients: 'PME',
    familles_metiers: ['Tech, informatique & data'],
    naf_code: null,
    effectif_tranche: null,
    ...overrides,
  };
}

const call = async (leadId = LEAD_ID) => {
  const res = (await handler(
    { httpMethod: 'GET', queryStringParameters: { leadId } } as never,
    {} as never,
    () => {},
  )) as { statusCode: number; body: string };
  return { statusCode: res.statusCode, body: JSON.parse(res.body) };
};

beforeEach(() => {
  h.lead = baseLead();
  h.signedUrl = 'https://signed.example/prerapport-mira.pdf';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
});

describe('get-report (Supabase mocké)', () => {
  it('404 + not_found si le lead est introuvable', async () => {
    h.lead = null;
    const { statusCode, body } = await call();
    expect(statusCode).toBe(404);
    expect(body.status).toBe('not_found');
  });

  it('404 si leadId n’est pas un UUID', async () => {
    const { statusCode, body } = await call('pas-un-uuid');
    expect(statusCode).toBe(404);
    expect(body.status).toBe('not_found');
  });

  it('renvoie le statut brut tant que la génération est en cours', async () => {
    h.lead = baseLead({ status: 'generating' });
    const { statusCode, body } = await call();
    expect(statusCode).toBe(200);
    expect(body.status).toBe('generating');
    expect(body.report).toBeUndefined();
  });

  it('renvoie failed si le lead a échoué', async () => {
    h.lead = baseLead({ status: 'failed' });
    const { body } = await call();
    expect(body.status).toBe('failed');
  });

  it('sent → report + context + pdfUrl', async () => {
    const { statusCode, body } = await call();
    expect(statusCode).toBe(200);
    expect(body.status).toBe('sent');
    expect(body.report).toEqual(VALID_REPORT);
    expect(body.context.secteurDeclare).toBe('Cloud');
    expect(body.context.famillesLabels).toEqual(['Tech, informatique & data']);
    expect(body.context.dateRapport).toBe('22 juin 2026');
    expect(body.pdfUrl).toBe('https://signed.example/prerapport-mira.pdf');
  });

  it('sent mais report_json corrompu → failed', async () => {
    h.lead = baseLead({ report_json: { sections: [{ id: 'perimetre' }] } });
    const { body } = await call();
    expect(body.status).toBe('failed');
  });

  it('pdfUrl null si la signature échoue (rapport quand même lisible)', async () => {
    h.signedUrl = null;
    const { body } = await call();
    expect(body.status).toBe('sent');
    expect(body.pdfUrl).toBeNull();
  });
});
