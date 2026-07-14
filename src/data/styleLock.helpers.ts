/**
 * Helpers partagés des verrous de style (`mira.test.ts`, `styleLock.test.ts`).
 * La règle CTO du 13/07 (aucun tiret cadratin —, U+2014, ni demi-cadratin –,
 * U+2013, dans les chaînes visibles) vit ici en un seul exemplaire : l'étendre
 * (ou corriger le parcours) ne demande qu'une seule édition.
 *
 * Fichier utilisé par les tests uniquement, jamais importé par le code
 * applicatif (rien à craindre pour le bundle client).
 */

export interface FoundString {
  path: string;
  text: string;
}

/** Aplati récursivement toutes les chaînes d'une valeur, avec leur chemin
 *  (ex. `mira.phases[0].title`) pour un message d'échec actionnable. */
export function collectStrings(value: unknown, path: string, out: FoundString[]): void {
  if (typeof value === 'string') {
    out.push({ path, text: value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => collectStrings(v, `${path}[${i}]`, out));
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, v] of Object.entries(value)) {
      collectStrings(v, `${path}.${key}`, out);
    }
  }
}

/** Chaînes en infraction : contiennent — (U+2014) ou – (U+2013). */
export const offenders = (strings: FoundString[]): FoundString[] =>
  strings.filter(({ text }) => /[—–]/.test(text));
