import { describe, expect, it, vi } from 'vitest';
import { fetchAll } from './fetchAll';

/** Table simulée de `total` lignes, servie avec le plafond `cap` de PostgREST. */
const table = (total: number, cap: number) => {
  const rows = Array.from({ length: total }, (_, i) => ({ id: i }));
  return vi.fn(async (from: number, to: number) => ({
    data: rows.slice(from, Math.min(to + 1, from + cap)),
    error: null,
  }));
};

describe('fetchAll', () => {
  it('lit toutes les lignes au-delà du plafond de 1000', async () => {
    const page = table(2003, 1000);
    const rows = await fetchAll(page);
    expect(rows).toHaveLength(2003);
    expect(rows.at(-1)).toEqual({ id: 2002 });
    expect(page).toHaveBeenCalledTimes(3);
  });

  it('s’arrête après une page vide quand le total tombe juste', async () => {
    const page = table(2000, 1000);
    expect(await fetchAll(page)).toHaveLength(2000);
    expect(page).toHaveBeenCalledTimes(3);
  });

  it('remonte l’erreur d’une page', async () => {
    await expect(fetchAll(async () => ({ data: null, error: { message: 'boom' } }))).rejects.toThrow('boom');
  });
});
