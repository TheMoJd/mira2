/**
 * Tests du handler `submit-prerapport` — validation serveur des champs de
 * qualification des leads (réunion du 10/07/2026).
 *
 * Les branches 422 s'exécutent AVANT tout accès Supabase : seuls les env vars
 * et un event multipart sont nécessaires. Le chemin nominal traverse un client
 * Supabase mocké pour asserter ce qui part réellement en base (normalisation
 * téléphone, nettoyage des champs d'identité, null pour les optionnels vides).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { HandlerEvent, HandlerContext } from '@netlify/functions';
import { handler } from '../submit-prerapport';

const h = vi.hoisted(() => ({
  inserts: [] as Array<Record<string, unknown>>,
  /** Nombre de soumissions récentes renvoyé au rate-limit (paramétrable par test). */
  rateCount: 0,
  /** Erreur renvoyée par l'insertion du lead (base indisponible), null sinon. */
  insertError: null as { message: string } | null,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      // Rate-limit : .select().eq().gte() → { count, error }
      select: () => ({ eq: () => ({ gte: async () => ({ count: h.rateCount, error: null }) }) }),
      insert: (payload: Record<string, unknown>) => {
        h.inserts.push(payload);
        return {
          select: () => ({
            single: async () =>
              h.insertError ? { data: null, error: h.insertError } : { data: { id: 'lead-test' }, error: null },
          }),
        };
      },
    }),
    storage: { from: () => ({ upload: async () => ({ error: null }) }) },
  }),
}));

vi.mock('../lib/email', () => ({ notifySubmitFailure: vi.fn(async () => {}) }));
import { notifySubmitFailure } from '../lib/email';

const BOUNDARY = 'vitestboundary';

/** Construit un event Netlify multipart/form-data à partir de champs texte. */
function multipartEvent(fields: Record<string, string>, host = 'localhost'): HandlerEvent {
  const body =
    Object.entries(fields)
      .map(([name, value]) => `--${BOUNDARY}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`)
      .join('') + `--${BOUNDARY}--\r\n`;
  return {
    httpMethod: 'POST',
    headers: { 'content-type': `multipart/form-data; boundary=${BOUNDARY}`, host },
    body: Buffer.from(body, 'utf8').toString('base64'),
    isBase64Encoded: true,
  } as unknown as HandlerEvent;
}

/** Soumission valide de référence : chaque test ne fait varier que sa cible. */
const validFields = {
  secteurActivite: 'Transport routier',
  produitsServices: 'Livraison dernier kilomètre',
  clients: 'E-commerçants B2B',
  famillesMetiers: '["Transport & logistique"]',
  siteUrl: '',
  siret: '',
  prenom: 'Camille',
  nom: 'Durand',
  fonction: '',
  telephone: '',
  email: 'camille@exemple.fr',
  consentRgpd: 'true',
  company_website_hp: '',
};

async function submit(overrides: Partial<typeof validFields> = {}) {
  const res = await handler(multipartEvent({ ...validFields, ...overrides }), {} as HandlerContext);
  const { statusCode, body } = res as { statusCode: number; body: string };
  return { statusCode, payload: JSON.parse(body) as { ok: boolean; error?: string; leadId?: string } };
}

beforeEach(() => {
  h.inserts.length = 0;
  h.rateCount = 0;
  h.insertError = null;
  vi.mocked(notifySubmitFailure).mockClear();
  process.env.SUPABASE_URL = 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
  // Déclenchement de la génération : fire-and-forget, on le neutralise.
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })));
});

describe('submit-prerapport — validation serveur des champs d’identité', () => {
  it('rejette en 422 un prénom ou nom manquant', async () => {
    expect((await submit({ prenom: '' })).statusCode).toBe(422);
    expect((await submit({ nom: '   ' })).statusCode).toBe(422);
    expect(h.inserts).toHaveLength(0);
  });

  it('borne les champs d’identité à 120 caractères (121 rejeté, 120 accepté)', async () => {
    expect((await submit({ prenom: 'a'.repeat(121) })).statusCode).toBe(422);
    expect((await submit({ fonction: 'b'.repeat(121) })).statusCode).toBe(422);
    expect((await submit({ nom: 'c'.repeat(120) })).statusCode).toBe(202);
  });

  it('rejette en 422 un téléphone invalide, accepte un téléphone vide', async () => {
    expect((await submit({ telephone: '123' })).statusCode).toBe(422);
    expect((await submit({ telephone: '00 12 34 56 78' })).statusCode).toBe(422);
    expect((await submit({ telephone: '' })).statusCode).toBe(202);
  });

  it('normalise le téléphone (dont « +33 (0)6… ») avant insertion', async () => {
    const { statusCode } = await submit({ telephone: '+33 (0)6 12 34 56 78' });
    expect(statusCode).toBe(202);
    expect(h.inserts.at(-1)).toMatchObject({ telephone: '+33612345678' });
  });

  it('nettoie les caractères de contrôle/format des champs d’identité', async () => {
    const { statusCode } = await submit({ prenom: 'Camille‮', nom: 'Du\n rand' });
    expect(statusCode).toBe(202);
    expect(h.inserts.at(-1)).toMatchObject({ prenom: 'Camille', nom: 'Du rand' });
  });

  it('insère null pour fonction et téléphone vides, et les valeurs saisies sinon', async () => {
    await submit();
    expect(h.inserts.at(-1)).toMatchObject({ prenom: 'Camille', nom: 'Durand', fonction: null, telephone: null });
    await submit({ fonction: 'DRH', telephone: '06 12 34 56 78' });
    expect(h.inserts.at(-1)).toMatchObject({ fonction: 'DRH', telephone: '0612345678' });
  });

  it('borne les textes libres qui partent au LLM (3000 caractères max)', async () => {
    expect((await submit({ secteurActivite: 'a'.repeat(3001) })).statusCode).toBe(422);
    expect(h.inserts).toHaveLength(0);
  });
});

describe('submit-prerapport — garde-fous anti-abus (préexistants, désormais épinglés)', () => {
  it('renvoie 429 quand le plafond de soumissions par email est atteint', async () => {
    h.rateCount = 3;
    const { statusCode } = await submit();
    expect(statusCode).toBe(429);
    expect(h.inserts).toHaveLength(0);
  });

  it('honeypot rempli → 202 factice sans aucune insertion (le bot ne doit rien apprendre)', async () => {
    const { statusCode, payload } = await submit({ company_website_hp: 'http://bot.example' });
    expect(statusCode).toBe(202);
    expect(payload.ok).toBe(true);
    expect(payload.leadId).toBeUndefined();
    expect(h.inserts).toHaveLength(0);
  });
});

describe('submit-prerapport — déclenchement de la génération', () => {
  /** URL appelée par le déclenchement (le seul fetch du handler). */
  const triggerUrl = () => String(vi.mocked(fetch).mock.calls.at(-1)?.[0]);
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('déclenche la génération sur le déploiement qui a reçu la soumission, pas sur l’URL principale', async () => {
    // Sur une deploy preview, Netlify fixe URL à l'adresse principale du site : s'y fier
    // lançait la génération en prod (ancien code, copie cachée à l'équipe).
    vi.stubEnv('URL', 'https://mira-audit.fr');
    const host = 'deploy-preview-12--spontaneous-macaron-edc853.netlify.app';
    await handler(multipartEvent(validFields, host), {} as HandlerContext);
    expect(triggerUrl()).toBe(`https://${host}/.netlify/functions/generate-prerapport-background`);
  });

  it('en production, l’hôte de la requête est le domaine du site', async () => {
    await handler(multipartEvent(validFields, 'mira-audit.fr'), {} as HandlerContext);
    expect(triggerUrl()).toBe('https://mira-audit.fr/.netlify/functions/generate-prerapport-background');
  });

  it('en local (netlify dev), reste en http', async () => {
    await handler(multipartEvent(validFields, 'localhost:8888'), {} as HandlerContext);
    expect(triggerUrl()).toBe('http://localhost:8888/.netlify/functions/generate-prerapport-background');
  });
});

describe('submit-prerapport — base indisponible', () => {
  it('alerte l’ops avec l’adresse du demandeur et renvoie 502 quand l’enregistrement échoue', async () => {
    h.insertError = { message: 'TypeError: fetch failed' };
    const { statusCode } = await submit();
    expect(statusCode).toBe(502);
    expect(notifySubmitFailure).toHaveBeenCalledWith(
      expect.objectContaining({ email: validFields.email }),
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
