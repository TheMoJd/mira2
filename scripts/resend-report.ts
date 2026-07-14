/**
 * resend-report.ts — renvoi ponctuel d'un rapport déjà généré.
 * Usage : npx tsx scripts/resend-report.ts <leadId>
 * Lit .env (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, RESEND_FROM, RESEND_REPLY_TO).
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { RGPD_EMAIL_NOTICE } from '../src/data/rgpd';

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
  // Copie alignée sur `netlify/functions/lib/email.ts` (renommage pré-diagnostic,
  // retours CEO 13/07). Seul le CHEMIN de stockage garde l'ancien nom (cf. pdfPath).
  subject: 'Votre pré-diagnostic MIRA',
  html: `<div style="font-family:system-ui,sans-serif;color:#160f2e;line-height:1.6;font-size:15px">
    <p>Bonjour,</p>
    <p>Votre pré-diagnostic MIRA est prêt : vous le trouverez en pièce jointe (PDF).</p>
    <p>Il applique l'état de l'art public à vos familles de métiers. Chaque chiffre y est sourcé. Pour aller plus loin, répondez simplement à cet email.</p>
    <p>L'équipe MIRA</p>
    <hr style="border:none;border-top:1px solid #eee;margin:22px 0">
    <p style="font-size:11px;color:#8a83a6">${RGPD_EMAIL_NOTICE}</p>
  </div>`,
  attachments: [{ filename: 'pre-diagnostic-mira.pdf', content: pdf.toString('base64') }],
});
if (error) throw new Error(`Resend : ${JSON.stringify(error)}`);
console.log(`Email envoyé, id Resend : ${data?.id}`);
