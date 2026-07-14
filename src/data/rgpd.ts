/**
 * WORDING RGPD — pré-diagnostic freemium MIRA (Tranche 5)
 * ========================================================
 *
 * Mentions d'information centralisées, réutilisées par le **pied de page du PDF**
 * (`reportHtml.ts`) et par l'**email de livraison** (`netlify/functions/lib/email.ts`).
 *
 * Texte volontairement factuel (pas d'affirmation de conformité). La version
 * juridique complète (mention d'information détaillée + DPA) sera intégrée une
 * fois validée côté métier/juridique.
 */

/** Mention de transparence affichée en pied de la page de fin du PDF. */
export const RGPD_PDF_FOOTER =
  'Document indicatif, ne constitue pas un diagnostic individuel. Données traitées par MIRA pour ' +
  'produire ce pré-diagnostic, sans entraînement de modèle sur vos données.';

/** Bloc RGPD en bas de l'email de livraison. */
export const RGPD_EMAIL_NOTICE =
  'Vous recevez cet email car une demande de pré-diagnostic MIRA a été soumise avec cette adresse. ' +
  'Vos données servent à produire et vous transmettre ce document, et à vous recontacter à son ' +
  "sujet si vous l'avez accepté. Elles ne sont pas utilisées pour entraîner de modèle. Pour exercer " +
  'vos droits (accès, rectification, suppression), répondez à cet email.';

/** Expéditeur lisible par défaut (le domaine réel vient de RESEND_FROM côté env). */
export const EMAIL_SENDER_NAME = 'MIRA';
