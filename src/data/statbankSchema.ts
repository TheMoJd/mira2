/**
 * STAT-BANK ÉDITABLE — contrat de l'interface admin des sources
 * =============================================================
 *
 * La stat-bank (cf. `statbank.ts`) vit en base depuis l'interface admin : deux
 * tables Supabase, `stat_sources` (les documents de référence, S01…, FR1…) et
 * `stats` (les statistiques citables, rattachées à un document). Ce module est le
 * **contrat unique** entre le formulaire admin (front), la function `admin-sources`
 * (écriture) et la génération (lecture) :
 *
 *  - les schémas zod des saisies, qui portent les mêmes règles que les invariants
 *    de `statbank.test.ts` (claim sans tiret long ni point-virgule, code de source,
 *    codes ISCO connus…). Le front valide avant d'envoyer, le serveur revalide ;
 *  - la conversion lignes de base → `StatEntry` (lecture par la génération), qui
 *    écarte les lignes archivées et celles qui ne passent plus le contrat ;
 *  - la conversion graine du code → lignes (seed SQL de la migration 0007).
 *
 * Volontairement sans dépendance à `rapportStructure.ts` : ce module part dans le
 * bundle client de `/admin`, et les prompts n'ont rien à y faire. Les sections de
 * la grille sont passées en paramètre (le serveur les calcule, cf. `gridSections`).
 */
import { z } from 'zod';
import type {
  StatEntry,
  StatNature,
  StatProvenance,
  StatScope,
  StatTheme,
} from './statbank';
import { famillesMetiers } from './famillesMetiers';
import { cleanLine } from './textClean';

// ---------------------------------------------------------------------------
// Vocabulaire contrôlé (forme runtime des unions de `statbank.ts`).
// ---------------------------------------------------------------------------

export const THEMES = [
  'exposition',
  'competences',
  'emploi',
  'adoption',
  'productivite',
  'formation',
  'gouvernance',
  'rh',
] as const satisfies readonly StatTheme[];

export const SCOPES = ['monde', 'france', 'europe', 'ocde', 'usa', 'secteur'] as const satisfies readonly StatScope[];

export const PROVENANCES = ['primaire', 'secondaire'] as const satisfies readonly StatProvenance[];

export const NATURES = ['recherche', 'commerciale'] as const satisfies readonly StatNature[];

/** Libellés lisibles pour l'admin (Caroline ne lit pas des clés techniques). */
export const THEME_LABELS: Record<StatTheme, string> = {
  exposition: 'Exposition des métiers',
  competences: 'Compétences',
  emploi: 'Emploi',
  adoption: 'Adoption de l’IA',
  productivite: 'Productivité',
  formation: 'Formation',
  gouvernance: 'Gouvernance et risques',
  rh: 'Pratiques RH',
};
export const SCOPE_LABELS: Record<StatScope, string> = {
  monde: 'Monde',
  france: 'France',
  europe: 'Europe',
  ocde: 'OCDE',
  usa: 'États-Unis',
  secteur: 'Secteur',
};

/**
 * Code d'une source : `S` + deux chiffres pour le socle, `FR` + un ou deux chiffres
 * pour la couche France complémentaire. Le préfixe porte l'appartenance au socle
 * (`inSocle`), qui n'est donc jamais saisi à part (la base la calcule).
 */
export const SOURCE_CODE_RE = /^(S\d{2}|FR\d{1,2})$/;

/** Identifiant d'une statistique : kebab-case, stable (il est cité dans les rapports). */
export const STAT_ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Ponctuation proscrite dans un claim (repris tel quel dans le rapport). */
export const CLAIM_FORBIDDEN_RE = /[—–;]/;

/** Codes ISCO à 2 chiffres couverts par le champ guidé des familles. */
export const ISCO_CODES: readonly string[] = [...new Set(famillesMetiers.flatMap((f) => f.isco))].sort();

/** Une section du rapport dont la grille de sources est éditable. */
export interface GridSection {
  id: string;
  /** Libellé d'affichage (« §3 Familles de métiers »). */
  label: string;
}

// ---------------------------------------------------------------------------
// Schémas de saisie.
// ---------------------------------------------------------------------------

/** Texte libre nettoyé par `cleanLine` (invisibles supprimés, insécables gardées). */
const texte = (min: number, max: number, label: string) =>
  z
    .string()
    .transform((v) => cleanLine(v))
    .pipe(
      z
        .string()
        .min(min, `${label} : ${min} caractère${min > 1 ? 's' : ''} minimum.`)
        .max(max, `${label} : ${max} caractères maximum.`),
    );

/** Texte facultatif : vide → `null`. */
const texteOptionnel = (max: number, label: string) =>
  z
    .string()
    .nullish()
    .transform((v) => cleanLine(v))
    .pipe(z.string().max(max, `${label} : ${max} caractères maximum.`))
    .transform((v) => (v === '' ? null : v));

/**
 * Saisie d'un document source. `sections` = les sections du rapport autorisées à
 * citer ce document (grille « section → sources » inversée, vue côté source).
 */
export const sourceInputSchema = (gridSectionIds: readonly string[]) =>
  z.object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(SOURCE_CODE_RE, 'Code : S + deux chiffres (socle, ex. S18) ou FR + un chiffre (couche France, ex. FR6).'),
    nature: z.enum(NATURES, { error: 'Nature : recherche ou commerciale.' }),
    report: texte(3, 300, 'Titre du document'),
    org: texte(2, 200, 'Organisation'),
    year: z.coerce
      .number({ error: 'Année : un nombre.' })
      .int('Année : un entier.')
      .min(1950, 'Année : 1950 minimum.')
      .max(2100, 'Année : 2100 maximum.'),
    sections: z
      .array(z.enum(gridSectionIds as [string, ...string[]], { error: 'Section inconnue.' }))
      .default([])
      .transform((v) => [...new Set(v)]),
    note: texteOptionnel(1000, 'Note interne'),
  });
export type SourceInput = z.infer<ReturnType<typeof sourceInputSchema>>;

/** Saisie d'une statistique. */
export const statInputSchema = z
  .object({
    id: z
      .string()
      .trim()
      .toLowerCase()
      .max(80, 'Identifiant : 80 caractères maximum.')
      .regex(STAT_ID_RE, 'Identifiant : minuscules, chiffres et tirets (ex. wef-2025-skills-gap).'),
    sourceCode: z.string().trim().toUpperCase().regex(SOURCE_CODE_RE, 'Source : choisir un document.'),
    // Saisie à la française tolérée : « 42,5 » vaut 42.5, et les espaces de milliers
    // sont ignorés (`\s` couvre aussi les espaces insécables U+00A0 et U+202F).
    value: z.preprocess(
      (v) => (typeof v === 'string' ? (v.trim() === '' ? NaN : Number(v.replace(/\s/g, '').replace(',', '.'))) : v),
      z
        .number({ error: 'Valeur : un nombre (point ou virgule décimale).' })
        .refine((v) => Number.isFinite(v), 'Valeur : un nombre fini.'),
    ),
    unit: z.string().trim().max(12, 'Unité : 12 caractères maximum.'),
    claim: texte(10, 600, 'Formulation (claim)').refine(
      (v) => !CLAIM_FORBIDDEN_RE.test(v),
      'Formulation : ni tiret cadratin (—), ni demi-cadratin (–), ni point-virgule. Elle est reprise telle quelle dans le rapport.',
    ),
    verbatim: texte(1, 3000, 'Citation d’origine (verbatim)'),
    theme: z.enum(THEMES, { error: 'Thème : choisir dans la liste.' }),
    scope: z.enum(SCOPES, { error: 'Périmètre : choisir dans la liste.' }),
    provenance: z.enum(PROVENANCES, { error: 'Provenance : primaire ou secondaire.' }),
    projection: z.boolean().default(false),
    isco: z
      .array(z.string().refine((c) => ISCO_CODES.includes(c), 'Code ISCO inconnu du champ des familles.'))
      .default([])
      .transform((v) => [...new Set(v)].sort()),
    page: texteOptionnel(40, 'Page'),
    originalSource: texteOptionnel(200, 'Source d’origine'),
  });
// Pas de verrou « secondaire ⇒ source d'origine » : deux entrées historiques de la
// graine (Neobrain) n'en ont pas, et on n'invente pas une source. L'admin l'affiche
// en avertissement (`statWarnings`).
export type StatInput = z.infer<typeof statInputSchema>;

/** Avertissements non bloquants d'une saisie valide (affichés dans l'admin). */
export function statWarnings(s: StatInput): string[] {
  const w: string[] = [];
  if (s.provenance === 'secondaire' && !s.originalSource) {
    w.push('Donnée secondaire sans source d’origine : la recréditer si elle est connue.');
  }
  if (s.unit === '%' && !s.claim.includes(String(s.value).replace('.', ','))) {
    w.push('La formulation ne reprend pas la valeur telle quelle : vérifier la cohérence chiffre / claim.');
  }
  return w;
}

/** Premier message d'erreur lisible d'un échec zod, préfixé du champ. */
export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  return issue ? issue.message : 'Saisie invalide.';
}

// ---------------------------------------------------------------------------
// Lignes de base (forme exacte des tables Supabase, cf. migration 0006).
// ---------------------------------------------------------------------------

export interface StatSourceRow {
  code: string;
  in_socle: boolean;
  nature: string;
  report: string;
  org: string;
  year: number;
  sections: string[];
  note: string | null;
  archived_at: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface StatRow {
  id: string;
  source_code: string;
  value: number;
  unit: string;
  claim: string;
  verbatim: string;
  theme: string;
  scope: string;
  provenance: string;
  projection: boolean;
  isco: string[];
  page: string | null;
  original_source: string | null;
  archived_at: string | null;
  updated_at: string;
  updated_by: string | null;
}

/** Colonnes écrites par l'admin pour une source (le reste est géré par la base). */
export const sourceInputToRow = (s: SourceInput) => ({
  code: s.code,
  nature: s.nature,
  report: s.report,
  org: s.org,
  year: s.year,
  sections: s.sections,
  note: s.note,
});

/** Colonnes écrites par l'admin pour une statistique. */
export const statInputToRow = (s: StatInput) => ({
  id: s.id,
  source_code: s.sourceCode,
  value: s.value,
  unit: s.unit,
  claim: s.claim,
  verbatim: s.verbatim,
  theme: s.theme,
  scope: s.scope,
  provenance: s.provenance,
  projection: s.projection,
  isco: s.isco,
  page: s.page,
  original_source: s.originalSource,
});

/** Ligne de base → saisie (pré-remplissage du formulaire d'édition). */
export const statRowToInput = (r: StatRow): Record<keyof StatInput, unknown> => ({
  id: r.id,
  sourceCode: r.source_code,
  value: r.value,
  unit: r.unit,
  claim: r.claim,
  verbatim: r.verbatim,
  theme: r.theme,
  scope: r.scope,
  provenance: r.provenance,
  projection: r.projection,
  isco: r.isco,
  page: r.page,
  originalSource: r.original_source,
});

// ---------------------------------------------------------------------------
// Lecture : lignes de base → banque active.
// ---------------------------------------------------------------------------

export interface LoadedStatbank {
  stats: StatEntry[];
  /** Grille éditée : section → codes des sources actives autorisées. */
  grid: Record<string, string[]>;
  /**
   * Lignes actives écartées parce qu'elles ne passent plus le contrat (édition SQL,
   * règle durcie, section retirée…). Journalisées à la génération et affichées dans
   * l'admin : sans ça, une ligne « active » dans l'admin serait ignorée en silence.
   */
  rejected: RejectedRow[];
}

export interface RejectedRow {
  kind: 'source' | 'stat';
  /** Code du document ou id de la statistique. */
  id: string;
  reason: string;
}

/**
 * Construit la banque active à partir des tables. Écarte les lignes archivées, les
 * statistiques dont le document est absent ou archivé, et toute ligne qui ne
 * repasse pas le contrat de saisie (défense en profondeur : une édition directe en
 * SQL ne doit pas pouvoir faire citer une claim non conforme).
 */
export function rowsToStatbank(
  sources: StatSourceRow[],
  stats: StatRow[],
  gridSections: readonly GridSection[],
): LoadedStatbank {
  const rejected: LoadedStatbank['rejected'] = [];
  const gridIds = gridSections.map((g) => g.id);
  const sourceSchema = sourceInputSchema(gridIds);

  const activeSources = new Map<string, SourceInput & { inSocle: boolean }>();
  const archivedSources = new Set<string>();
  const rejectedSources = new Set<string>();
  for (const row of sources) {
    if (row.archived_at) {
      archivedSources.add(row.code);
      continue;
    }
    const parsed = sourceSchema.safeParse({ ...row, sections: row.sections.filter((s) => gridIds.includes(s)) });
    if (!parsed.success) {
      rejected.push({ kind: 'source', id: row.code, reason: firstIssue(parsed.error) });
      rejectedSources.add(row.code);
      continue;
    }
    activeSources.set(parsed.data.code, { ...parsed.data, inSocle: parsed.data.code.startsWith('S') });
  }

  const entries: StatEntry[] = [];
  for (const row of stats) {
    if (row.archived_at) continue;
    const src = activeSources.get(row.source_code);
    if (!src) {
      // Document archivé : retrait voulu, pas une anomalie à signaler.
      if (archivedSources.has(row.source_code)) continue;
      const reason = rejectedSources.has(row.source_code)
        ? `document ${row.source_code} écarté (voir sa fiche)`
        : `document ${row.source_code} introuvable`;
      rejected.push({ kind: 'stat', id: row.id, reason });
      continue;
    }
    const parsed = statInputSchema.safeParse(statRowToInput(row));
    if (!parsed.success) {
      rejected.push({ kind: 'stat', id: row.id, reason: firstIssue(parsed.error) });
      continue;
    }
    const s = parsed.data;
    entries.push({
      id: s.id,
      value: s.value,
      unit: s.unit,
      claim: s.claim,
      verbatim: s.verbatim,
      theme: s.theme,
      scope: s.scope,
      provenance: s.provenance,
      ...(s.projection ? { projection: true } : {}),
      ...(s.isco.length ? { isco: s.isco } : {}),
      source: {
        sourceId: src.code,
        inSocle: src.inSocle,
        nature: src.nature,
        report: src.report,
        org: src.org,
        year: src.year,
        ...(s.page ? { page: s.page } : {}),
        ...(s.originalSource ? { originalSource: s.originalSource } : {}),
      },
    });
  }

  const grid: Record<string, string[]> = {};
  for (const g of gridSections) {
    grid[g.id] = [...activeSources.values()].filter((s) => s.sections.includes(g.id)).map((s) => s.code);
  }
  return { stats: entries, grid, rejected };
}

// ---------------------------------------------------------------------------
// Graine : banque du code → lignes (seed SQL).
// ---------------------------------------------------------------------------

/**
 * Lignes de seed à partir de la graine du code et de sa grille. `codeGrid` = section →
 * codes autorisés (hors `'*'`), tel que défini dans `rapportStructure.ts`.
 */
export function seedRows(seed: readonly StatEntry[], codeGrid: Record<string, readonly string[]>) {
  const sources = new Map<string, ReturnType<typeof sourceInputToRow>>();
  for (const s of seed) {
    if (sources.has(s.source.sourceId)) continue;
    sources.set(s.source.sourceId, {
      code: s.source.sourceId,
      nature: s.source.nature,
      report: s.source.report,
      org: s.source.org,
      year: s.source.year,
      sections: Object.entries(codeGrid)
        .filter(([, codes]) => codes.includes(s.source.sourceId))
        .map(([id]) => id),
      note: null,
    });
  }
  const stats = seed.map((s) => ({
    id: s.id,
    source_code: s.source.sourceId,
    value: s.value,
    unit: s.unit,
    claim: s.claim,
    verbatim: s.verbatim,
    theme: s.theme,
    scope: s.scope,
    provenance: s.provenance,
    projection: s.projection ?? false,
    isco: s.isco ?? [],
    page: s.source.page ?? null,
    original_source: s.source.originalSource ?? null,
  }));
  return { sources: [...sources.values()], stats };
}
