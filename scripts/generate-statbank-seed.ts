/**
 * Génère `supabase/migrations/0007_seed_statbank.sql` depuis la banque du code.
 *
 *   npx tsx scripts/generate-statbank-seed.ts
 *
 * Le seed pose la graine (`statbankSeed` + grille de `rapportStructure.ts`) dans les
 * tables `stat_sources` et `stats`. `on conflict do nothing` : le rejouer n'écrase
 * jamais une ligne déjà éditée dans l'admin, il n'ajoute que les absentes.
 */
import { writeFileSync } from 'node:fs';
import { statbankSeed } from '../src/data/statbank';
import { seedRows } from '../src/data/statbankSchema';
import { codeGrid } from '../src/data/rapportStructure';

const lit = (v: string | null): string => (v === null ? 'null' : `'${v.replace(/'/g, "''")}'`);
const arr = (v: string[]): string => (v.length ? `array[${v.map(lit).join(', ')}]::text[]` : `'{}'::text[]`);

const { sources, stats } = seedRows(statbankSeed, codeGrid());

const out: string[] = [
  '-- =============================================================================',
  '-- MIRA — seed de la stat-bank éditable (GÉNÉRÉ, ne pas éditer à la main)',
  '-- =============================================================================',
  '-- Produit par `npx tsx scripts/generate-statbank-seed.ts` depuis `statbankSeed`',
  `-- (${sources.length} documents, ${stats.length} statistiques) et la grille de \`rapportStructure.ts\`.`,
  '-- `on conflict do nothing` : rejouable sans écraser les éditions faites dans /admin.',
  '-- À appliquer après 0006_statbank_admin.sql.',
  '',
  'insert into public.stat_sources (code, nature, report, org, year, sections, note) values',
  sources
    .map((s) => `  (${lit(s.code)}, ${lit(s.nature)}, ${lit(s.report)}, ${lit(s.org)}, ${s.year}, ${arr(s.sections)}, ${lit(s.note)})`)
    .join(',\n'),
  'on conflict (code) do nothing;',
  '',
  'insert into public.stats (id, source_code, value, unit, claim, verbatim, theme, scope, provenance, projection, isco, page, original_source) values',
  stats
    .map(
      (s) =>
        `  (${lit(s.id)}, ${lit(s.source_code)}, ${s.value}, ${lit(s.unit)}, ${lit(s.claim)}, ${lit(s.verbatim)}, ${lit(s.theme)}, ${lit(s.scope)}, ${lit(s.provenance)}, ${s.projection}, ${arr(s.isco)}, ${lit(s.page)}, ${lit(s.original_source)})`,
    )
    .join(',\n'),
  'on conflict (id) do nothing;',
  '',
];

writeFileSync('supabase/migrations/0007_seed_statbank.sql', out.join('\n'), 'utf8');
console.log(`Seed écrit : ${sources.length} documents, ${stats.length} statistiques.`);
