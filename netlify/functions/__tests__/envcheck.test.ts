/**
 * Tests de la function de diagnostic `envcheck`. La route est publique côté
 * Netlify : le header `x-envcheck-token` est le SEUL contrôle d'accès. On
 * vérifie que la route ne se révèle pas (404) sans token valide, et que la
 * réponse 200 n'expose que des drapeaux de présence/longueur — jamais une
 * valeur de secret, même partielle.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { handler } from '../envcheck';

const TOKEN = 'jeton-envcheck-de-test';
const SECRET = 're_secret_resend_0123456789';

const call = async (headers: Record<string, string>) =>
  (await handler({ headers } as never, {} as never, () => {})) as { statusCode: number; body?: string };

beforeEach(() => {
  process.env.ENVCHECK_TOKEN = TOKEN;
  process.env.RESEND_API_KEY = SECRET;
  process.env.RESEND_FROM = 'rapport@mira-audit.fr';
});

describe('envcheck — contrôle d’accès par token', () => {
  it('répond 404 quand ENVCHECK_TOKEN n’est pas configurée, même avec un header', async () => {
    delete process.env.ENVCHECK_TOKEN;
    expect((await call({ 'x-envcheck-token': TOKEN })).statusCode).toBe(404);
  });

  it('répond 404 sans header ou avec un token faux', async () => {
    expect((await call({})).statusCode).toBe(404);
    expect((await call({ 'x-envcheck-token': 'mauvais-jeton-envcheck' })).statusCode).toBe(404);
  });

  it('répond 200 avec le bon token (header minuscule, la casse de Netlify)', async () => {
    const res = await call({ 'x-envcheck-token': TOKEN });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body!) as Record<string, { set: boolean; len: number }>;
    expect(body.RESEND_API_KEY).toEqual({ set: true, len: SECRET.length });
    expect(body.RESEND_FROM.set).toBe(true);
  });

  it('accepte aussi la casse majuscule du header (parité submit-prerapport)', async () => {
    expect((await call({ 'X-Envcheck-Token': TOKEN })).statusCode).toBe(200);
  });
});

describe('envcheck — la réponse ne fuit aucun secret', () => {
  it('n’expose ni préfixe de clé ni valeur de secret, seulement set/len', async () => {
    const res = await call({ 'x-envcheck-token': TOKEN });
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toContain('RESEND_API_KEY_prefix');
    expect(res.body).not.toContain(SECRET);
    // Même un fragment du secret ne doit pas apparaître.
    expect(res.body).not.toContain(SECRET.slice(0, 10));
  });
});
