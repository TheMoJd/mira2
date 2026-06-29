/**
 * WORDING RGPD — pré-rapport freemium MIRA (Tranche 5)
 * =====================================================
 *
 * Mentions d'information centralisées, réutilisées par le **pied de page du PDF**
 * (`reportHtml.ts`) et par l'**email de livraison** (`netlify/functions/lib/email.ts`).
 *
 * ⚠️ PLACEHOLDERS — textes provisoires en attendant la version juridique définitive
 * de **Victor / Jean-Marie** (mention d'information + DPA). Cf. décisions produit P5 :
 * « coffre par entreprise », pas d'entraînement sur les données, accord CSE/collaborateurs.
 * Ne pas mettre en avant comme une affirmation de conformité tant que non validé côté métier/juridique.
 *
 * NB : le §9 « Sources & méthode » de `rapportStructure.ts` porte sa propre mention figée
 * (placeholder Victor/JM) ; on ne la duplique pas ici — ce module couvre le pied de PDF et l'email.
 */

/** Mention d'information affichée en pied de chaque page du PDF (placeholder). */
export const RGPD_PDF_FOOTER =
  'Document indicatif, ne constitue pas un diagnostic individuel. Données traitées par MIRA pour ' +
  "produire ce pré-rapport, sans entraînement de modèle sur vos données. [Mention d'information " +
  'RGPD à finaliser, Victor et Jean-Marie.]';

/** Bloc RGPD en bas de l'email de livraison (placeholder). */
export const RGPD_EMAIL_NOTICE =
  'Vous recevez cet email car une demande de pré-rapport MIRA a été soumise avec cette adresse. ' +
  "Vos données servent uniquement à produire et vous transmettre ce document, elles ne sont pas " +
  "utilisées pour entraîner de modèle. Pour exercer vos droits (accès, rectification, suppression), " +
  'répondez à cet email. [Mention d\'information RGPD à finaliser, Victor et Jean-Marie.]';

/** Expéditeur lisible par défaut (le domaine réel vient de RESEND_FROM côté env). */
export const EMAIL_SENDER_NAME = 'MIRA';
