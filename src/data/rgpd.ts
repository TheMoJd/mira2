/**
 * WORDING RGPD — pré-rapport freemium MIRA (Tranche 5)
 * =====================================================
 *
 * Mention d'information utilisée par l'**email de livraison**
 * (`netlify/functions/lib/email.ts`).
 *
 * Texte volontairement factuel (pas d'affirmation de conformité). La version
 * juridique complète (mention d'information détaillée + DPA) sera intégrée une
 * fois validée côté métier/juridique.
 */

/** Bloc RGPD en bas de l'email de livraison. */
export const RGPD_EMAIL_NOTICE =
  'Vous recevez cet email car une demande de pré-rapport MIRA a été soumise avec cette adresse. ' +
  "Vos données servent uniquement à produire et vous transmettre ce document, elles ne sont pas " +
  "utilisées pour entraîner de modèle. Pour exercer vos droits (accès, rectification, suppression), " +
  'répondez à cet email.';

/** Expéditeur lisible par défaut (le domaine réel vient de RESEND_FROM côté env). */
export const EMAIL_SENDER_NAME = 'MIRA';
