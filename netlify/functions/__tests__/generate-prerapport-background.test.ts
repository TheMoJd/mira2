import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks partagés (hoistés pour être accessibles dans les factories vi.mock).
const h = vi.hoisted(() => ({
  createCompletion: vi.fn(),
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
  sendReportEmail: vi.fn(async () => 'skipped'),
  notifyFailure: vi.fn(async () => {}),
}));

import { handler } from '../generate-prerapport-background';

/**
 * Réponses du modèle, un fixture par appel. Le corps est volontairement minimal :
 * il échoue donc aux budgets de mots (V9), ce qui exerce la boucle de rejeu et le
 * marquage pour relecture humaine.
 */
const CORPS = {
  sections: [
    {
      id: 'perimetre',
      titre: 'Périmètre',
      contenu: [{ intertitre: null, paragraphes: ['ok'] }],
      sources_citees: [],
      familles: null,
    },
  ],
};

const WEF = 'wef-2025-skills-transformed-39';

const SYNTHESE = {
  section: {
    id: 'synthese-executive',
    titre: 'Synthèse exécutive',
    encart: {
      chapeau: 'ACME et ses métiers tech.',
      chiffre_signal: { valeur: '39 %', phrase: 'des compétences transformées', source_id: WEF },
      points_cles: [
        {
          axe: 'exposition',
          titre: 'Les tâches se déplacent',
          texte: `Un déplacement de tâches [[${WEF}]].`,
          source_id: WEF,
        },
      ],
    },
    sources_citees: [WEF],
  },
};

/** Nom du `response_format` demandé, pour répondre le bon fixture. */
function formatName(params: unknown): string {
  return (params as { response_format?: { json_schema?: { name?: string } } }).response_format
    ?.json_schema?.name ?? '';
}

const event = { body: JSON.stringify({ leadId: 'lead-1' }) } as never;
const ctx = {} as never;

beforeEach(() => {
  h.updates.length = 0;
  h.inserts.length = 0;
  h.createCompletion.mockReset();
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  process.env.OPENAI_API_KEY = 'sk-test';
});

describe('generate-prerapport-background (OpenAI + Supabase mockés)', () => {
  it('génère en deux appels, assemble avec les textes figés et persiste report_json', async () => {
    h.createCompletion.mockImplementation(async (params: unknown) => ({
      choices: [
        {
          message: {
            content: JSON.stringify(formatName(params).endsWith('synthese') ? SYNTHESE : CORPS),
          },
        },
      ],
    }));

    const res = (await handler(event, ctx, () => {})) as { statusCode: number };
    expect(res.statusCode).toBe(200);

    // Deux appels au minimum : le corps, puis la synthèse à partir de la liste héritée.
    const names = h.createCompletion.mock.calls.map(([p]) => formatName(p));
    expect(names[0]).toBe('prerapport_mira_corps');
    expect(names).toContain('prerapport_mira_synthese');

    expect(h.updates.some((u) => u.status === 'generating')).toBe(true);
    const stored = h.updates.find((u) => 'report_json' in u)?.report_json as {
      sections: { id: string; encart: unknown }[];
    };
    // Le rapport persisté porte les sections figées du code et l'encart complété.
    expect(stored.sections.map((s) => s.id)).toEqual([
      'perimetre',
      'synthese-executive',
      'comment-utiliser',
      'sources-methode',
    ]);
    expect(stored.sections.find((s) => s.id === 'synthese-executive')?.encart).toMatchObject({
      calibrage_court: expect.any(String),
      perimetre: expect.any(String),
    });

    // PDF uploadé → ligne `reports` insérée → statut final `sent`.
    const inserted = h.inserts.find((i) => 'pdf_path' in i)!;
    expect(inserted).toBeDefined();
    expect(h.updates.some((u) => u.status === 'sent')).toBe(true);
  });

  it('marque le rapport pour relecture quand des contrôles restent en échec après les rejeux', async () => {
    h.createCompletion.mockImplementation(async (params: unknown) => ({
      choices: [
        {
          message: {
            content: JSON.stringify(formatName(params).endsWith('synthese') ? SYNTHESE : CORPS),
          },
        },
      ],
    }));

    await handler(event, ctx, () => {});
    const inserted = h.inserts.find((i) => 'pdf_path' in i)!;
    // §0 tient en un mot : le budget de mots (V9) reste en échec après les rejeux.
    expect(inserted.needs_review).toBe(true);
    expect(Array.isArray(inserted.validation_findings)).toBe(true);
    // Plafond de deux rejeux par section : la boucle s'arrête, elle ne tourne pas sans fin.
    expect(h.createCompletion.mock.calls.length).toBeLessThanOrEqual(12);
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
