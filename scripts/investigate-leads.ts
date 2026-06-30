/**
 * investigate-leads.ts — diagnostic ponctuel des leads récents.
 * Usage : npx tsx scripts/investigate-leads.ts
 * Lit .env (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env: Record<string, string> = {};
for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: leads, error } = await supabase
  .from('leads')
  .select('id, email, status, created_at, report_json')
  .order('created_at', { ascending: false })
  .limit(20);
if (error) throw new Error(error.message);

console.log(`\n=== ${leads!.length} derniers leads ===`);
for (const l of leads!) {
  const hasReport = l.report_json ? 'report:oui' : 'report:NON';
  console.log(`${l.created_at}  ${String(l.status).padEnd(11)}  ${hasReport}  ${l.email}  (${l.id})`);
}

// Lignes reports (PDF stockés + email)
const { data: reports, error: rErr } = await supabase
  .from('reports')
  .select('lead_id, created_at, pdf_path')
  .order('created_at', { ascending: false })
  .limit(20);
if (rErr) {
  console.log(`\n[reports] erreur: ${rErr.message}`);
} else {
  console.log(`\n=== ${reports!.length} dernières lignes reports ===`);
  for (const r of reports!) console.log(`${r.created_at}  ${r.lead_id}  ${r.pdf_path}`);
}
