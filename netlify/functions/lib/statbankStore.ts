/**
 * statbankStore.ts — lecture de la stat-bank éditée dans l'admin
 * ==============================================================
 * Charge `stat_sources` + `stats` et installe la banque active (`setActiveStatbank`)
 * avant une génération. Filet de sécurité : si la base ne répond pas, si les tables
 * n'existent pas encore (migration 0006 non appliquée) ou si la banque active est
 * vide, on garde la graine du code et on le dit dans les logs. Une génération ne
 * doit pas échouer parce que l'admin est indisponible.
 */
import { resetActiveStatbank, setActiveStatbank } from '../../../src/data/statbank';
import { rowsToStatbank, type StatRow, type StatSourceRow } from '../../../src/data/statbankSchema';
import { gridSections } from '../../../src/data/rapportStructure';
import type { AdminClient } from './admin';
import { fetchAll } from './fetchAll';

export async function fetchStatbankRows(
  supabase: AdminClient,
): Promise<{ sources: StatSourceRow[]; stats: StatRow[] }> {
  const [sources, stats] = await Promise.all([
    fetchAll((from, to) => supabase.from('stat_sources').select('*').order('code').range(from, to)),
    fetchAll((from, to) => supabase.from('stats').select('*').order('id').range(from, to)),
  ]);
  return { sources, stats };
}

export type StatbankOrigin = 'base' | 'graine';

/** Installe la banque de la base (ou la graine en repli). Renvoie l'origine retenue. */
export async function loadActiveStatbank(supabase: AdminClient, logPrefix = '[statbank]'): Promise<StatbankOrigin> {
  try {
    const { sources, stats } = await fetchStatbankRows(supabase);
    const loaded = rowsToStatbank(sources, stats, gridSections());
    for (const r of loaded.rejected) console.warn(`${logPrefix} ligne écartée ${r.id} : ${r.reason}`);
    if (loaded.stats.length === 0) {
      console.warn(`${logPrefix} banque en base vide, repli sur la graine du code.`);
      resetActiveStatbank();
      return 'graine';
    }
    setActiveStatbank(loaded.stats, loaded.grid);
    console.log(`${logPrefix} banque chargée depuis la base : ${loaded.stats.length} statistiques.`);
    return 'base';
  } catch (err) {
    console.error(`${logPrefix} lecture de la banque impossible, repli sur la graine du code.`, err);
    resetActiveStatbank();
    return 'graine';
  }
}
