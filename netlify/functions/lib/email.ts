/**
 * email.ts — livraison du pré-diagnostic par email (Tranche 4b + repli Tranche 5)
 * ================================================================================
 * Resend, PDF en pièce jointe. **Dégradation propre** : tant que `RESEND_API_KEY`
 * (+ `RESEND_FROM`) ne sont pas configurés, on log et on retourne `'skipped'` —
 * la génération aboutit quand même (le PDF est stocké), sans planter la chaîne.
 *
 * `notifyFailure` est l'email de repli ops en cas d'échec de génération.
 *
 * NB : le nom de la pièce jointe est renommé « pre-diagnostic » (retours CEO
 * 13/07) mais le CHEMIN de stockage Supabase reste `<leadId>/prerapport-mira.pdf`
 * (référencé par `scripts/resend-report.ts` et la doc ops, hors périmètre).
 */
import { Resend } from 'resend';
import { RGPD_EMAIL_NOTICE, EMAIL_SENDER_NAME } from '../../../src/data/rgpd';

const PDF_FILENAME = 'pre-diagnostic-mira.pdf';

/** Échappe le HTML (le nom d'entreprise vient d'une API externe, donné non fiable). */
const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

/** `from` complet (« MIRA <rapport@domaine> ») si l'envoi est configuré, sinon null. */
function senderOrNull(): string | null {
  const from = process.env.RESEND_FROM;
  if (!process.env.RESEND_API_KEY || !from) return null;
  return from.includes('<') ? from : `${EMAIL_SENDER_NAME} <${from}>`;
}

export interface SendReportArgs {
  to: string;
  pdf: Buffer;
  nomEntreprise?: string;
}

export type SendResult = 'sent' | 'skipped' | 'error';

/** Envoie le pré-diagnostic (PDF joint). Retourne le statut sans jamais throw. */
export async function sendReportEmail({ to, pdf, nomEntreprise }: SendReportArgs): Promise<SendResult> {
  const from = senderOrNull();
  if (!from) {
    console.warn('[email] RESEND_API_KEY/RESEND_FROM absent — envoi ignoré (PDF stocké).');
    return 'skipped';
  }

  const cible = nomEntreprise ? ` de ${escapeHtml(nomEntreprise)}` : '';
  const html = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#160f2e;line-height:1.6;font-size:15px">
    <p>Bonjour,</p>
    <p>Votre pré-diagnostic MIRA${cible} est prêt : vous le trouverez en pièce jointe (PDF).</p>
    <p>Il applique l'état de l'art public à vos familles de métiers. Chaque chiffre y est sourcé. Pour aller plus loin (diagnostic à partir de vos données internes, feuille de route), répondez simplement à cet email.</p>
    <p>L'équipe ${EMAIL_SENDER_NAME}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:22px 0">
    <p style="font-size:11px;color:#8a83a6">${RGPD_EMAIL_NOTICE}</p>
  </div>`;

  // Optionnel : route les réponses des prospects vers une boîte qu'on relève vraiment
  // (ex. moetez@polaria.ai) plutôt que vers l'adresse d'envoi `@mira-audit.fr`, qui
  // n'a pas de boîte derrière. Absent → les réponses repartent vers le `from`.
  const replyTo = process.env.RESEND_REPLY_TO;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from,
      to: [to],
      ...(replyTo ? { replyTo } : {}),
      subject: 'Votre pré-diagnostic MIRA',
      html,
      attachments: [{ filename: PDF_FILENAME, content: pdf.toString('base64') }],
    });
    if (error) {
      console.error('[email] échec Resend', error);
      return 'error';
    }
    return 'sent';
  } catch (err) {
    console.error('[email] exception Resend', err);
    return 'error';
  }
}

/** Email de repli ops si la génération échoue. No-op (log) si Resend non configuré. */
export async function notifyFailure({ leadId, error }: { leadId: string; error: unknown }): Promise<void> {
  const from = senderOrNull();
  const ops = process.env.OPS_EMAIL;
  const message = error instanceof Error ? error.message : String(error);
  if (!from || !ops) {
    console.error(`[email] échec génération lead ${leadId} — repli ops non configuré : ${message}`);
    return;
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from,
      to: [ops],
      subject: `[MIRA] Échec génération pré-diagnostic · lead ${leadId}`,
      text: `La génération du pré-diagnostic a échoué pour le lead ${leadId}.\n\nErreur : ${message}`,
    });
  } catch (err) {
    console.error('[email] échec de l’email de repli ops', err);
  }
}
