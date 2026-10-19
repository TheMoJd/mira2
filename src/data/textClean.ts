/**
 * Nettoyage des textes libres saisis par un humain (formulaires, admin).
 * =====================================================================
 * Un seul endroit pour la même règle, partagée par la fiche contact et la saisie
 * de la stat-bank :
 *  - NFC : un accent décomposé (« a + ◌̀ ») devient l'accent composé (« à ») que nos
 *    listes fermées et nos comparaisons attendent ;
 *  - caractères invisibles (contrôle `Cc`, format `Cf` : trait d'union conditionnel,
 *    espaces de largeur nulle, marques de direction…) **supprimés**, jamais remplacés
 *    par une espace : un trait d'union conditionnel collé depuis un PDF au milieu de
 *    « compé­tences » couperait sinon le mot en deux ;
 *  - blancs repliés. Les espaces insécables (U+00A0, U+202F) sont gardées par défaut :
 *    c'est la typographie française de « 63 % », qui évite une coupure de ligne entre
 *    le chiffre et son unité dans le PDF.
 */

const INVISIBLE = /[\p{Cc}\p{Cf}]/gu;
/** Blancs de contrôle (tabulation, retours ligne…) : à convertir en espace AVANT la suppression des `Cc`. */
const CONTROL_WHITESPACE = /[\t\n\v\f\r]/g;

export interface CleanLineOptions {
  /** Garder les espaces insécables (défaut `true`). `false` = les replier en espace simple. */
  keepNbsp?: boolean;
}

/** Texte sur une ligne : NFC, invisibles supprimés, blancs repliés, bords rognés. */
export function cleanLine(raw: unknown, { keepNbsp = true }: CleanLineOptions = {}): string {
  const text = String(raw ?? '')
    .normalize('NFC')
    .replace(CONTROL_WHITESPACE, ' ')
    .replace(INVISIBLE, '');
  const blancs = keepNbsp ? /[^\S  ]+/g : /\s+/g;
  return text.replace(blancs, ' ').trim();
}

/** Texte multi-ligne : NFC, invisibles supprimés sauf les sauts de ligne, bords rognés. */
export function cleanMultiline(raw: unknown): string {
  return String(raw ?? '')
    .normalize('NFC')
    .replace(INVISIBLE, (c) => (c === '\n' ? '\n' : ''))
    .trim();
}
