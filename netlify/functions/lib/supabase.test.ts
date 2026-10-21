import { describe, expect, it, vi } from 'vitest';
import { clockSkewRetryFetch } from './supabase';

const skew = () =>
  new Response(JSON.stringify({ code: 'PGRST303', message: 'JWT issued at future' }), { status: 401 });
const ok = () => new Response('[]', { status: 200 });

describe('clockSkewRetryFetch', () => {
  it('rejoue un 401 PGRST303 puis rend la réponse qui passe', async () => {
    const base = vi.fn().mockResolvedValueOnce(skew()).mockResolvedValueOnce(ok());
    const onRetry = vi.fn();
    const res = await clockSkewRetryFetch(base, [0, 0], onRetry)('https://x/rest/v1/stats');
    expect(res.status).toBe(200);
    expect(base).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledWith(1, 'https://x/rest/v1/stats');
  });

  it('ne rejoue pas un vrai refus (401 sans PGRST303)', async () => {
    const base = vi.fn().mockResolvedValue(new Response('{"code":"PGRST301","message":"JWT expired"}', { status: 401 }));
    const res = await clockSkewRetryFetch(base, [0, 0], vi.fn())('https://x/rest/v1/stats');
    expect(res.status).toBe(401);
    expect(base).toHaveBeenCalledTimes(1);
  });

  it('s’arrête après le dernier essai et rend le 401 lisible', async () => {
    const base = vi.fn().mockImplementation(async () => skew());
    const res = await clockSkewRetryFetch(base, [0, 0], vi.fn())('https://x/rest/v1/stats');
    expect(res.status).toBe(401);
    expect(base).toHaveBeenCalledTimes(3);
    expect(await res.json()).toMatchObject({ code: 'PGRST303' });
  });

  it('laisse passer les autres statuts sans les lire', async () => {
    const base = vi.fn().mockResolvedValue(new Response('boom', { status: 500 }));
    expect((await clockSkewRetryFetch(base, [0], vi.fn())('https://x')).status).toBe(500);
    expect(base).toHaveBeenCalledTimes(1);
  });
});
