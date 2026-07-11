/**
 * POST-PROCESSING DE STYLE DE LA SORTIE LLM (demande CEO 10/07)
 * =============================================================
 *
 * La règle n°8 du `SYSTEM_PROMPT` interdit déjà tirets cadratins/demi-cadratins et
 * points-virgules (signaux « écrit par une IA »), mais le modèle peut désobéir.
 * Ce module est le **verrou garanti** : appliqué par `parseReport` sur chaque
 * chaîne du rapport, avant persistance et rendu PDF.
 *
 * Transformations (conservatrices, pour ne pas dégrader le sens — un rapport
 * chiffré ne doit JAMAIS voir ses nombres altérés) :
 *  - plages numériques : « 2025–2030 » et « 2025 – 2030 » (demi-cadratin, typo
 *    française des plages) → « 2025-2030 » ; « 2025—2030 » (cadratin collé) idem ;
 *  - signe moins : « –5 % » / « de –15 % » → le tiret devant un chiffre est un
 *    moins, préservé en « -5 % » (jamais transformé en virgule ni supprimé) ;
 *  - tiret cadratin/demi-cadratin en tête de chaîne suivi d'un espace (puce) → supprimé ;
 *  - tout autre « — » / « – » → virgule (le tiret y joint deux propositions) ;
 *  - « ; » → virgule ;
 *  - nettoyage des artefacts (« ,, » → « , », « ,. » → « . », virgule finale orpheline).
 */

/** Applique les règles de style à une chaîne de prose. */
export function sanitizeProse(text: string): string {
  return (
    text
      // Variantes Unicode : U+2212 (vrai signe moins) → trait d'union ;
      // U+2015 (barre horizontale) → assimilée au cadratin.
      .replace(/−/g, '-')
      .replace(/―/g, '—')
      // Plages numériques. Le demi-cadratin entre chiffres est une plage même
      // espacé ; le cadratin ne l'est que collé (espacé = tiret de proposition).
      .replace(/(\d)\s*–\s*(\d)/g, '$1-$2')
      .replace(/(\d)—(\d)/g, '$1-$2')
      // Signe moins : demi-cadratin devant un chiffre (espace optionnel entre
      // les deux), en début de chaîne ou après espace/parenthèse/deux-points.
      // Le CADRATIN n'est jamais un moins (il tombe dans la règle virgule) :
      // « Les PME —30 % du panel— » ne doit pas inventer un -30 %.
      .replace(/(^|[\s(:])–\s?(?=\d)/g, '$1-')
      // Puce en tête de chaîne (l'espace requis la distingue d'un moins).
      .replace(/^[—–]\s+/, '')
      // Tiret cadratin / demi-cadratin entre propositions → virgule.
      .replace(/\s*[—–]\s*/g, ', ')
      // Point-virgule → virgule.
      .replace(/\s*;\s*/g, ', ')
      // Artefacts : virgules doublées (ex. « — ; » → « ,, »), « ,. » → « . »,
      // virgule orpheline en fin de chaîne.
      .replace(/,(\s*,)+/g, ',')
      .replace(/,\s*\./g, '.')
      .replace(/,\s*$/, '')
      .trim()
  );
}

/**
 * Sanitise récursivement toutes les chaînes d'une structure (rapport complet).
 * Générique volontairement : les ids (`sections[].id`, `sources_citees`) utilisent
 * des traits d'union simples, jamais visés par les règles ci-dessus.
 */
export function sanitizeReportProse<T>(value: T): T {
  if (typeof value === 'string') return sanitizeProse(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => sanitizeReportProse(v)) as unknown as T;
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitizeReportProse(v);
    return out as T;
  }
  return value;
}
