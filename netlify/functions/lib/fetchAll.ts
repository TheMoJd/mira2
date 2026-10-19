/**
 * fetchAll.ts — lire une table Supabase en entier, page par page.
 * ===============================================================
 * PostgREST plafonne chaque réponse (« Max rows », 1000 par défaut côté Supabase),
 * QUEL QUE SOIT le `.range()` demandé : un `.range(0, 9999)` renvoie 1000 lignes sans
 * erreur, et la suite disparaît en silence. On pagine donc par tranches de
 * `PAGE_SIZE` jusqu'à une page incomplète.
 *
 * `page(from, to)` doit reconstruire la requête à chaque appel (un builder supabase-js
 * ne se rejoue pas) et l'ORDONNER sur une clé unique, sinon deux pages peuvent se
 * chevaucher ou sauter des lignes.
 */

/** Taille de page alignée sur le plafond par défaut de Supabase. */
export const PAGE_SIZE = 1000;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = PAGE_SIZE,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}
