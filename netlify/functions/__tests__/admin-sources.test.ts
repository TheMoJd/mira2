import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HandlerContext, HandlerEvent } from '@netlify/functions';

// Supabase mocké : un utilisateur par jeton, des tables en mémoire, et le journal
// des écritures pour vérifier ce qui part en base.
const h = vi.hoisted(() => ({
  users: {} as Record<string, { id: string; email: string }>,
  sources: [] as Array<Record<string, unknown>>,
  stats: [] as Array<Record<string, unknown>>,
  writes: [] as Array<{ table: string; op: string; payload: Record<string, unknown>; key?: unknown }>,
  insertError: null as null | { code: string; message: string },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: async (token: string) =>
        h.users[token] ? { data: { user: h.users[token] }, error: null } : { data: { user: null }, error: { message: 'bad jwt' } },
    },
    from: (table: string) => {
      const rows = () => (table === 'stat_sources' ? h.sources : table === 'stats' ? h.stats : []);
      const keyCol = table === 'stat_sources' ? 'code' : 'id';
      return {
        select: () => {
          const q = {
            order: () => q,
            range: async () => ({ data: rows(), error: null }),
            eq: (_col: string, v: unknown) => ({
              maybeSingle: async () => ({ data: rows().find((r) => r[keyCol] === v) ?? null, error: null }),
            }),
          };
          return q;
        },
        insert: async (payload: Record<string, unknown>) => {
          if (h.insertError) return { error: h.insertError };
          h.writes.push({ table, op: 'insert', payload });
          return { error: null };
        },
        update: (payload: Record<string, unknown>) => ({
          eq: (_col: string, key: unknown) => ({
            select: async () => {
              const found = rows().some((r) => r[keyCol] === key);
              if (found) h.writes.push({ table, op: 'update', payload, key });
              return { data: found ? [{ [keyCol]: key }] : [], error: null };
            },
          }),
        }),
      };
    },
  }),
}));

import { handler } from '../admin-sources';

const event = (method: string, body?: unknown, token?: string): HandlerEvent =>
  ({
    httpMethod: method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: body === undefined ? null : JSON.stringify(body),
    isBase64Encoded: false,
  }) as unknown as HandlerEvent;

async function call(method: string, body?: unknown, token = 'tok-caroline') {
  const res = (await handler(event(method, body, token), {} as HandlerContext)) as { statusCode: number; body: string };
  return { status: res.statusCode, payload: JSON.parse(res.body) as Record<string, unknown> };
}

const VALID_STAT = {
  id: 'test-2026-nouvelle',
  sourceCode: 'S06',
  value: '41',
  unit: '%',
  claim: 'En 2026, 41 % des employeurs prévoient de réduire leurs effectifs du fait de l’IA.',
  verbatim: '41% of employers plan to reduce their workforce due to AI',
  theme: 'emploi',
  scope: 'monde',
  provenance: 'primaire',
  projection: true,
  isco: [],
  page: 'p.5',
  originalSource: '',
};

const NOW = '2026-10-19T00:00:00Z';
const SOURCE_ROW = {
  in_socle: true, nature: 'recherche', report: 'WEF, Future of Jobs 2025', org: 'WEF', year: 2025,
  sections: ['competences'], note: null, archived_at: null as string | null, updated_at: NOW, updated_by: null,
};
const STAT_ROW = {
  source_code: 'S06', value: 41, unit: '%', claim: 'En 2026, 41 % des employeurs prévoient de réduire leurs effectifs.',
  verbatim: '41%', theme: 'emploi', scope: 'monde', provenance: 'primaire', projection: false, isco: [] as string[],
  page: null, original_source: null, archived_at: null as string | null, updated_at: NOW, updated_by: null,
};

beforeEach(() => {
  process.env.SUPABASE_URL = 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
  process.env.ADMIN_EMAILS = 'caroline@polaria.ai, Moetez@Polaria.ai';
  h.users = {
    'tok-caroline': { id: 'u1', email: 'caroline@polaria.ai' },
    'tok-intrus': { id: 'u2', email: 'prospect@exemple.fr' },
  };
  h.sources = [
    { ...SOURCE_ROW, code: 'S06' },
    { ...SOURCE_ROW, code: 'S99', archived_at: '2026-10-01T00:00:00Z' },
  ];
  h.stats = [{ ...STAT_ROW, id: 'wef-existante' }];
  h.writes = [];
  h.insertError = null;
});

describe('admin-sources — contrôle d’accès', () => {
  it('refuse sans jeton, avec un jeton invalide, et un compte hors liste ADMIN_EMAILS', async () => {
    for (const token of ['', 'tok-inconnu', 'tok-intrus']) {
      const { status } = await call('GET', undefined, token);
      expect(status, token || '(aucun)').toBe(401);
    }
    expect((await call('POST', { action: 'createStat', data: VALID_STAT }, 'tok-intrus')).status).toBe(401);
    expect(h.writes).toEqual([]);
  });

  it('accepte un admin de la liste (casse ignorée)', async () => {
    h.users['tok-moetez'] = { id: 'u3', email: 'moetez@polaria.ai' };
    const { status, payload } = await call('GET', undefined, 'tok-moetez');
    expect(status).toBe(200);
    expect(payload.gridSections).toBeInstanceOf(Array);
  });

  it('refuse tout si ADMIN_EMAILS n’est pas configurée', async () => {
    delete process.env.ADMIN_EMAILS;
    expect((await call('GET')).status).toBe(500);
  });
});

describe('admin-sources — lecture', () => {
  it('compte les stats citables comme la génération et signale les lignes écartées', async () => {
    h.stats.push({ ...STAT_ROW, id: 'claim-fautive', claim: 'Une formulation devenue fautive ; avec point-virgule.' });
    const { status, payload } = await call('GET');
    expect(status).toBe(200);
    expect(payload.citableCount).toBe(1);
    expect(payload.rejected).toEqual([{ kind: 'stat', id: 'claim-fautive', reason: expect.stringMatching(/point-virgule/) }]);
  });
});

describe('admin-sources — écritures', () => {
  it('crée une statistique normalisée, signée de l’admin', async () => {
    const { status } = await call('POST', { action: 'createStat', data: VALID_STAT });
    expect(status).toBe(200);
    expect(h.writes).toHaveLength(1);
    expect(h.writes[0]).toMatchObject({
      table: 'stats',
      op: 'insert',
      payload: { id: 'test-2026-nouvelle', source_code: 'S06', value: 41, projection: true, original_source: null, updated_by: 'caroline@polaria.ai' },
    });
  });

  it('rejette en 400 une saisie non conforme, sans rien écrire', async () => {
    const { status, payload } = await call('POST', { action: 'createStat', data: { ...VALID_STAT, claim: 'Un claim ; avec point-virgule interdit.' } });
    expect(status).toBe(400);
    expect(String(payload.error)).toMatch(/point-virgule/);
    expect(h.writes).toEqual([]);
  });

  it('refuse de rattacher une stat à un document inconnu ou archivé', async () => {
    expect((await call('POST', { action: 'createStat', data: { ...VALID_STAT, sourceCode: 'S42' } })).status).toBe(400);
    expect((await call('POST', { action: 'createStat', data: { ...VALID_STAT, sourceCode: 'S99' } })).status).toBe(400);
    expect(h.writes).toEqual([]);
  });

  it('répond 409 sur un identifiant déjà pris', async () => {
    h.insertError = { code: '23505', message: 'duplicate key' };
    expect((await call('POST', { action: 'createStat', data: VALID_STAT })).status).toBe(409);
  });

  it('met à jour sans jamais réécrire la clé', async () => {
    const { status } = await call('POST', { action: 'updateStat', data: { ...VALID_STAT, id: 'wef-existante' } });
    expect(status).toBe(200);
    expect(h.writes[0]).toMatchObject({ table: 'stats', op: 'update', key: 'wef-existante' });
    expect(h.writes[0].payload).not.toHaveProperty('id');
  });

  it('« supprimer » archive (et restaurer désarchive), 404 sur un id inconnu', async () => {
    expect((await call('POST', { action: 'archiveStat', id: 'wef-existante' })).status).toBe(200);
    expect(h.writes[0].payload.archived_at).toEqual(expect.any(String));
    expect((await call('POST', { action: 'restoreStat', id: 'wef-existante' })).status).toBe(200);
    expect(h.writes[1].payload.archived_at).toBeNull();
    expect((await call('POST', { action: 'archiveStat', id: 'inconnue' })).status).toBe(404);
  });

  it('crée un document avec sa grille de sections, refuse une section inconnue', async () => {
    const doc = { code: 's18', nature: 'recherche', report: 'OCDE, Employment Outlook 2026', org: 'OCDE', year: 2026, sections: ['contexte', 'competences'] };
    expect((await call('POST', { action: 'createSource', data: doc })).status).toBe(200);
    expect(h.writes[0]).toMatchObject({ table: 'stat_sources', op: 'insert', payload: { code: 'S18', sections: ['contexte', 'competences'] } });
    expect((await call('POST', { action: 'createSource', data: { ...doc, sections: ['synthese-executive'] } })).status).toBe(400);
  });

  it('rejette une action inconnue', async () => {
    expect((await call('POST', { action: 'dropTable' })).status).toBe(400);
  });
});
