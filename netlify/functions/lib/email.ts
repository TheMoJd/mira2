/**
 * email.ts — livraison du pré-rapport par email (Tranche 4b + repli Tranche 5)
 * ============================================================================
 * Resend, PDF en pièce jointe. **Dégradation propre** : tant que `RESEND_API_KEY`
 * (+ `RESEND_FROM`) ne sont pas configurés, on log et on retourne `'skipped'` —
 * la génération aboutit quand même (le PDF est stocké), sans planter la chaîne.
 *
 * Alertes ops vers `OPS_EMAIL` : `notifyFailure` (génération en échec),
 * `notifyReview` (rapport parti mais à relire, TODO Q9) et `notifySubmitFailure`
 * (demande non enregistrée, base indisponible).
 *
 * Copie cachée équipe : si `REPORT_BCC_EMAIL` est posée (une ou plusieurs adresses
 * séparées par des virgules), chaque rapport envoyé au prospect part aussi en CCI
 * à ces adresses, pièce jointe comprise. Variable vide ou absente → pas de CCI.
 */
import { Resend } from 'resend';
import { RGPD_EMAIL_NOTICE, EMAIL_SENDER_NAME } from '../../../src/data/rgpd';
import type { ContactForm } from '../../../src/types/contact';
import { FONCTION_AUTRE } from '../../../src/data/contact';
import type { ValidationFinding } from '../../../src/data/reportValidation';

const PDF_FILENAME = 'prerapport-mira.pdf';

/** Échappe le HTML (le nom d'entreprise vient d'une API externe, donné non fiable). */
const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

/** Liste d'adresses séparées par des virgules (« a@x.fr, b@y.fr ») → tableau nettoyé.
 *  Même format pour `CONTACT_NOTIFY_EMAIL`, `REPORT_BCC_EMAIL` et `RESEND_REPLY_TO`. */
export function parseRecipients(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((addr) => addr.trim())
    .filter(Boolean);
}

/** `from` complet (« MIRA <rapport@domaine> ») si l'envoi est configuré, sinon null. */
function senderOrNull(): string | null {
  const from = process.env.RESEND_FROM;
  if (!process.env.RESEND_API_KEY || !from) return null;
  return from.includes('<') ? from : `${EMAIL_SENDER_NAME} <${from}>`;
}

export interface SendReportArgs {
  to: string;
  pdf: Buffer;
}

export type SendResult = 'sent' | 'skipped' | 'error';

export const REPORT_EMAIL_SUBJECT = 'Votre pré-rapport MIRA';

/** Corps de l'email de livraison du pré-rapport. Partagé avec `scripts/resend-report.ts`
 *  pour qu'un renvoi manuel parte avec le même texte que l'envoi automatique. */
export const REPORT_EMAIL_HTML = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#160f2e;line-height:1.6;font-size:15px">
    <p>Bonjour,</p>
    <p>Comme convenu, vous trouverez en pièce jointe votre pré-rapport MIRA, réalisé à partir des données publiques disponibles et des évolutions de l'intelligence artificielle dans vos familles de métiers.</p>
    <p>Ce premier éclairage vous permet d'identifier les transformations possibles, les opportunités à explorer et les enjeux à anticiper pour votre organisation.</p>
    <p>Mais au-delà des tendances générales, une question essentielle se pose : où en est réellement votre entreprise dans sa transformation par l'IA ?</p>
    <p>Chaque organisation possède ses propres enjeux, son niveau de maturité et ses priorités.</p>
    <p>C'est pourquoi nous vous proposons un premier échange de 20 minutes, sans engagement, pour :</p>
    <ul style="margin:0 0 1em;padding-left:22px">
      <li>Comprendre votre contexte et vos enjeux.</li>
      <li>Identifier votre niveau actuel de maturité face à l'IA.</li>
      <li>Échanger sur les opportunités et les premières pistes d'action adaptées à votre organisation.</li>
    </ul>
    <p>Cet échange pourra, si cela s'avère pertinent, ouvrir la voie à un diagnostic plus approfondi et à une feuille de route concrète, adaptée à vos équipes et à vos objectifs.</p>
    <p>Vous souhaitez faire le point ? Répondez simplement à cet e-mail et nous conviendrons d'un créneau.</p>
    <p>Au plaisir d'échanger,</p>
    <p>L'équipe ${EMAIL_SENDER_NAME}<br><a href="https://mira-audit.fr" style="color:#160f2e">mira-audit.fr</a></p>
    <hr style="border:none;border-top:1px solid #eee;margin:22px 0">
    <p style="font-size:11px;color:#8a83a6">${RGPD_EMAIL_NOTICE}</p>
  </div>`;

/** Envoie le pré-rapport (PDF joint). Retourne le statut sans jamais throw. */
export async function sendReportEmail({ to, pdf }: SendReportArgs): Promise<SendResult> {
  const from = senderOrNull();
  if (!from) {
    console.warn('[email] RESEND_API_KEY/RESEND_FROM absent — envoi ignoré (PDF stocké).');
    return 'skipped';
  }

  const html = REPORT_EMAIL_HTML;

  // Optionnel : route les réponses des prospects vers des boîtes qu'on relève vraiment
  // (ex. moetez@polaria.ai, liste à virgules acceptée) plutôt que vers l'adresse
  // d'envoi `@mira-audit.fr`, qui n'a pas de boîte derrière. Absent → les réponses
  // repartent vers le `from`.
  const replyTo = parseRecipients(process.env.RESEND_REPLY_TO);
  // Optionnel : l'équipe reçoit une copie cachée de chaque rapport envoyé. Le
  // prospect ne voit pas ces adresses (CCI), et la mention RGPD l'en informe.
  const bcc = parseRecipients(process.env.REPORT_BCC_EMAIL);

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from,
      to: [to],
      ...(bcc.length > 0 ? { bcc } : {}),
      ...(replyTo.length > 0 ? { replyTo } : {}),
      subject: REPORT_EMAIL_SUBJECT,
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

/**
 * Notifie l'équipe d'une nouvelle demande de contact (fiche « parcours MIRA »).
 * Best-effort : ne throw jamais, log et sort si Resend ou le destinataire ne
 * sont pas configurés (comme la livraison du rapport). Destinataires :
 * `CONTACT_NOTIFY_EMAIL` (une ou plusieurs adresses séparées par une virgule,
 * ex. « moetez@…,caroline@… ») sinon repli sur `OPS_EMAIL`.
 */
export async function notifyContactRequest(form: ContactForm): Promise<void> {
  const from = senderOrNull();
  // Plusieurs destinataires possibles : liste séparée par des virgules.
  const recipients = parseRecipients(process.env.CONTACT_NOTIFY_EMAIL || process.env.OPS_EMAIL);
  const replyTo = parseRecipients(process.env.RESEND_REPLY_TO);
  if (!from || recipients.length === 0) {
    console.warn('[email] CONTACT_NOTIFY_EMAIL/OPS_EMAIL absent — notification contact ignorée (demande enregistrée).');
    return;
  }

  const fonction =
    form.fonction === FONCTION_AUTRE && form.fonctionAutre
      ? `${form.fonction} : ${form.fonctionAutre}`
      : form.fonction;

  // Toutes les valeurs viennent du formulaire (donné non fiable) → échappées.
  const rows: Array<[string, string]> = [
    ['Nom', `${form.prenom} ${form.nom}`],
    ['Email', form.email],
    ['Téléphone', form.telephone || '—'],
    ['Fonction', fonction],
    ['Entreprise', form.entreprise],
    ['Secteur', form.secteur],
    ['Effectif', form.effectif],
    ['Maturité IA', `${form.maturiteIa}/10`],
    ['Pré-diagnostic réalisé', form.preDiagnostic],
    ['Priorité', form.priorite],
    ['Horizon', form.horizon],
    ['Veille MIRA', form.newsletter ? 'oui' : 'non'],
  ];
  const rowsHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 14px 4px 0;color:#8a83a6;white-space:nowrap;vertical-align:top">${escapeHtml(k)}</td><td style="padding:4px 0;color:#160f2e">${escapeHtml(v)}</td></tr>`,
    )
    .join('');
  const messageHtml = form.message
    ? `<p style="margin:18px 0 0"><strong>Contexte :</strong><br>${escapeHtml(form.message).replace(/\n/g, '<br>')}</p>`
    : '';

  const html = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#160f2e;line-height:1.6;font-size:15px">
    <p>Nouvelle demande de contact via le parcours MIRA :</p>
    <table style="border-collapse:collapse;font-size:14px">${rowsHtml}</table>
    ${messageHtml}
  </div>`;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from,
      to: recipients,
      ...(replyTo.length > 0 ? { replyTo } : {}),
      subject: `[MIRA] Demande de contact — ${form.prenom} ${form.nom} (${form.entreprise})`,
      html,
    });
    if (error) console.error('[email] échec notification contact', error);
  } catch (err) {
    console.error('[email] exception notification contact', err);
  }
}

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * Alerte texte vers `OPS_EMAIL`. Best-effort : ne throw jamais. Sans Resend ou sans
 * `OPS_EMAIL`, rien ne part et `journal` est écrit dans les logs de la function, qui
 * restent alors le seul endroit où l'incident est visible.
 */
async function sendOpsAlert(subject: string, text: string, journal: string): Promise<void> {
  const from = senderOrNull();
  const ops = process.env.OPS_EMAIL;
  if (!from || !ops) {
    console.error(`[email] ${journal} (alerte ops non configurée)`);
    return;
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    // Resend ne lève pas sur une erreur d'API : il la renvoie. Sans ce contrôle, une
    // alerte refusée (domaine, quota, clé) disparaissait sans trace.
    const { error } = await resend.emails.send({ from, to: [ops], subject, text });
    if (error) console.error(`[email] alerte ops refusée par Resend (${journal})`, error);
  } catch (err) {
    console.error('[email] échec de l’alerte ops', err);
  }
}

/** Email de repli ops si la génération échoue (lead `failed`, ou rapport généré mais email non parti). */
export async function notifyFailure({ leadId, error }: { leadId: string; error: unknown }): Promise<void> {
  const message = messageOf(error);
  await sendOpsAlert(
    `[MIRA] Échec génération pré-rapport — lead ${leadId}`,
    `La génération du pré-rapport a échoué pour le lead ${leadId}.\n\nErreur : ${message}`,
    `échec génération lead ${leadId} : ${message}`,
  );
}

/**
 * Le rapport est parti au prospect avec des contrôles bloquants encore en échec après
 * les rejeux (`reports.needs_review = true`). TODO Q9 : on envoie quand même tant que le
 * volume est faible, mais l'équipe doit relire. L'alerte donne de quoi le faire sans
 * ouvrir Supabase : le lead et la liste des contrôles en échec.
 */
export async function notifyReview({
  leadId,
  findings,
}: {
  leadId: string;
  findings: ValidationFinding[];
}): Promise<void> {
  const lignes = findings.map((f) => `- ${f.code} (${f.sectionId}) : ${f.message}`).join('\n');
  await sendOpsAlert(
    `[MIRA] Rapport à relire : lead ${leadId}`,
    `Le pré-rapport du lead ${leadId} a été envoyé au prospect, mais ${findings.length} contrôle(s) ` +
      `bloquant(s) restent en échec après les rejeux (reports.needs_review = true).\n\n${lignes}\n\n` +
      `Relire leads.report_json et le PDF du bucket reports (${leadId}/prerapport-mira.pdf).`,
    `rapport à relire, lead ${leadId} : ${findings.map((f) => f.code).join(', ')}`,
  );
}

/**
 * La demande n'a pas pu être enregistrée (base indisponible, par exemple Supabase en
 * pause) : le prospect voit une erreur et aucun lead n'existe. L'adresse saisie est
 * jointe pour pouvoir le recontacter, ce que couvre son consentement.
 */
export async function notifySubmitFailure({ email, error }: { email: string; error: unknown }): Promise<void> {
  const message = messageOf(error);
  await sendOpsAlert(
    '[MIRA] Échec d’enregistrement d’une demande de pré-rapport',
    `Une demande de pré-rapport n'a pas pu être enregistrée : le prospect a reçu une erreur et ` +
      `aucun lead n'a été créé.\n\nAdresse saisie : ${email}\nErreur : ${message}\n\n` +
      `Vérifier l'état du projet Supabase (pause, quota), puis recontacter le prospect.`,
    `échec d’enregistrement d’une demande : ${message}`,
  );
}
