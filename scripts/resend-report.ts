/**
 * resend-report.ts — renvoi ponctuel d'un rapport déjà généré.
 * Usage : npx tsx scripts/resend-report.ts <leadId>
 * Lit .env (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, RESEND_FROM, RESEND_REPLY_TO).
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { REPORT_EMAIL_HTML, REPORT_EMAIL_SUBJECT } from '../netlify/functions/lib/email';

// --- mini parseur .env (évite une dépendance dotenv) ---
const env: Record<string, string> = {};
for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
}
// Repli sur l'environnement du process (ex. clés posées sur Netlify, pas en .env local).
for (const k of ['RESEND_API_KEY', 'RESEND_FROM', 'RESEND_REPLY_TO']) {
  if (!env[k] && process.env[k]) env[k] = process.env[k] as string;
}

const leadId = process.argv[2];
if (!leadId) throw new Error('leadId manquant');

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: lead, error: leadErr } = await supabase
  .from('leads')
  .select('email, secteur_activite')
  .eq('id', leadId)
  .single();
if (leadErr || !lead) throw new Error(`Lead introuvable : ${leadErr?.message}`);

const pdfPath = `${leadId}/prerapport-mira.pdf`;
const { data: blob, error: dlErr } = await supabase.storage.from('reports').download(pdfPath);
if (dlErr || !blob) throw new Error(`Download PDF échoué : ${dlErr?.message}`);
const pdf = Buffer.from(await blob.arrayBuffer());
console.log(`PDF téléchargé : ${pdf.length} octets pour ${lead.email}`);

const resend = new Resend(env.RESEND_API_KEY);
const { data, error } = await resend.emails.send({
  from: env.RESEND_FROM,
  to: [lead.email],
  replyTo: env.RESEND_REPLY_TO || undefined,
  subject: REPORT_EMAIL_SUBJECT,
  html: REPORT_EMAIL_HTML,
  attachments: [{ filename: 'prerapport-mira.pdf', content: pdf.toString('base64') }],
});
if (error) throw new Error(`Resend : ${JSON.stringify(error)}`);
console.log(`Email envoyé, id Resend : ${data?.id}`);
