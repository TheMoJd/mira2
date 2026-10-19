import { describe, expect, it } from 'vitest';
import { fail, json, NO_STORE, readJsonBody } from './http';

describe('http', () => {
  it('json / fail : format commun, en-têtes additionnels', () => {
    expect(json(202, { ok: true })).toEqual({
      statusCode: 202,
      headers: { 'content-type': 'application/json' },
      body: '{"ok":true}',
    });
    expect(fail(401, 'non', NO_STORE)).toEqual({
      statusCode: 401,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      body: '{"ok":false,"error":"non"}',
    });
  });

  it('readJsonBody : objet seulement, base64 compris', () => {
    expect(readJsonBody({ body: '{"a":1}', isBase64Encoded: false })).toEqual({ a: 1 });
    expect(readJsonBody({ body: Buffer.from('{"a":2}').toString('base64'), isBase64Encoded: true })).toEqual({ a: 2 });
    for (const body of ['', 'pas du json', '[1,2]', '"texte"', 'null', null]) {
      expect(readJsonBody({ body, isBase64Encoded: false }), String(body)).toBeNull();
    }
  });
});
