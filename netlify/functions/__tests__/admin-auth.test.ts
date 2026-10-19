import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HandlerContext, HandlerEvent } from '@netlify/functions';

const h = vi.hoisted(() => ({
  signIn: vi.fn(),
  refresh: vi.fn(),
  updateUser: vi.fn(),
  users: {} as Record<string, { id: string; email: string }>,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: h.signIn,
      refreshSession: h.refresh,
      getUser: async (token: string) =>
        h.users[token] ? { data: { user: h.users[token] }, error: null } : { data: { user: null }, error: { message: 'bad' } },
      admin: { updateUserById: h.updateUser },
    },
  }),
}));

import { handler } from '../admin-auth';

const session = (email: string) => ({
  access_token: 'acc',
  refresh_token: 'ref',
  expires_at: 2_000_000_000,
  expires_in: 3600,
  user: { id: 'u1', email },
});

async function call(body: unknown, token?: string) {
  const ev = {
    httpMethod: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(body),
    isBase64Encoded: false,
  } as unknown as HandlerEvent;
  const res = (await handler(ev, {} as HandlerContext)) as { statusCode: number; body: string };
  return { status: res.statusCode, payload: JSON.parse(res.body) as Record<string, unknown> };
}

beforeEach(() => {
  process.env.SUPABASE_URL = 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
  process.env.ADMIN_EMAILS = 'caroline@polaria.ai';
  h.users = { 'tok-caroline': { id: 'u1', email: 'caroline@polaria.ai' } };
  h.signIn.mockReset().mockImplementation(async ({ email }: { email: string }) => ({ data: { session: session(email) }, error: null }));
  h.refresh.mockReset();
  h.updateUser.mockReset().mockResolvedValue({ error: null });
});

describe('admin-auth', () => {
  it('connecte un admin de la liste et renvoie ses jetons', async () => {
    const { status, payload } = await call({ action: 'login', email: ' Caroline@Polaria.ai ', password: 'secret' });
    expect(status).toBe(200);
    expect(payload).toMatchObject({ email: 'caroline@polaria.ai', accessToken: 'acc', refreshToken: 'ref', expiresAt: 2_000_000_000 });
  });

  it('refuse une adresse hors liste sans même interroger Supabase, avec le même message', async () => {
    const intrus = await call({ action: 'login', email: 'prospect@exemple.fr', password: 'secret' });
    expect(intrus.status).toBe(401);
    expect(h.signIn).not.toHaveBeenCalled();
    h.signIn.mockResolvedValueOnce({ data: { session: null }, error: { message: 'Invalid login credentials' } });
    const mauvais = await call({ action: 'login', email: 'caroline@polaria.ai', password: 'faux' });
    expect(mauvais.status).toBe(401);
    expect(mauvais.payload.error).toBe(intrus.payload.error);
  });

  it('ne rafraîchit pas la session d’un compte sorti de la liste', async () => {
    h.refresh.mockResolvedValueOnce({ data: { session: session('ancien@polaria.ai') }, error: null });
    expect((await call({ action: 'refresh', refreshToken: 'ref' })).status).toBe(401);
  });

  it('change le mot de passe de l’admin connecté (12 caractères minimum)', async () => {
    expect((await call({ action: 'password', password: 'court' }, 'tok-caroline')).status).toBe(400);
    expect((await call({ action: 'password', password: 'un-mot-de-passe-long' }, 'tok-caroline')).status).toBe(200);
    expect(h.updateUser).toHaveBeenCalledWith('u1', { password: 'un-mot-de-passe-long' });
    expect((await call({ action: 'password', password: 'un-mot-de-passe-long' }, 'tok-autre')).status).toBe(401);
  });
});
