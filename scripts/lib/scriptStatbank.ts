/**
 * Stat-bank des scripts de génération (échantillons, benchmark).
 * ==============================================================
 * Les scripts doivent produire le même rapport que la prod : ils chargent donc la
 * banque éditée dans `/admin` (Supabase), par le même `loadActiveStatbank` que la
 * function de génération. Repli sur la graine du code si Supabase n'est pas
 * configuré dans `.env`, ou sur demande explicite (`--graine`) pour un run qui ne
 * doit pas dépendre de la base.
 *
 * L'audit des citations vit ici aussi : il lit la banque ACTIVE au moment de l'appel
 * (un `Set` calculé au chargement du module figerait la graine, avant le chargement).
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/supabase';
import type { PreRapportOutput } from '../../src/data/reportSchema';
import { getStat, resetActiveStatbank } from '../../src/data/statbank';
import { reportSections, statsForSection } from '../../src/data/rapportStructure';
import { loadActiveStatbank, type StatbankOrigin } from '../../netlify/functions/lib/statbankStore';

/** Libellé lisible de l'origine, pour la console et les README produits. */
export const ORIGIN_LABEL: Record<StatbankOrigin, string> = {
  base: 'banque éditée dans /admin (Supabase)',
  graine: 'graine du code (`statbankSeed`)',
};

export async function loadScriptStatbank(
  readEnv: (key: string) => string | undefined,
  argv: readonly string[] = process.argv,
): Promise<StatbankOrigin> {
  let origin: StatbankOrigin = 'graine';
  const url = readEnv('SUPABASE_URL');
  const key = readEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (argv.includes('--graine')) {
    resetActiveStatbank();
  } else if (url && key) {
    const supabase = createClient<Database>(url, key, { auth: { persistSession: false } });
    origin = await loadActiveStatbank(supabase, '[statbank]');
  } else {
    console.warn('[statbank] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY absents de .env : graine du code.');
    resetActiveStatbank();
  }
  console.log(`[statbank] banque utilisée : ${ORIGIN_LABEL[origin]}.`);
  return origin;
}

/** Audit garde-fou : citations connues de la banque active + dans la grille de leur section. */
export function auditCitations(report: PreRapportOutput) {
  const allowedBySection = new Map(reportSections.map((s) => [s.id, new Set(statsForSection(s).map((x) => x.id))]));
  let total = 0;
  const invented: string[] = [];
  const outOfGrid: string[] = [];
  for (const sec of report.sections) {
    const allowed = allowedBySection.get(sec.id) ?? new Set<string>();
    for (const id of sec.sources_citees) {
      total++;
      if (!getStat(id)) invented.push(`${sec.id}→${id}`);
      else if (!allowed.has(id)) outOfGrid.push(`${sec.id}→${id}`);
    }
  }
  return { total, invented, outOfGrid };
}
