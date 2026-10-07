/**
 * benchmark-models.ts — compare plusieurs modèles (OpenAI + Anthropic) sur le MÊME pré-rapport MIRA.
 * =====================================================================================
 * Point R4 « Benchmark modèles » (réunion CEO 10/07). Génère le pré-rapport pour un
 * corpus de VRAIS clients, avec plusieurs modèles, et produit un comparatif qualité/coût
 * pour évaluation humaine (Cyril).
 *
 * Même cœur que `generate-samples.ts` (prompt + schéma + rendu + audit garde-fou) ; seule
 * la génération change de fournisseur :
 *   - OpenAI  : chat.completions + response_format json_schema strict (RESPONSE_FORMAT).
 *   - Anthropic (Opus) : tool use forcé avec le MÊME schéma JSON, sortie validée par parseReport.
 * Pour chaque (modèle × entreprise) on relève : tokens, latence, coût $, et l'audit
 * « zéro chiffre inventé » (citations inventées / hors-grille).
 *
 * Usage : `npx tsx scripts/benchmark-models.ts`
 *   Requiert OPENAI_API_KEY dans .env (modèles GPT). ANTHROPIC_API_KEY dans .env pour les
 *   modèles Opus — si absente, les Opus sont SAUTÉS proprement (les GPT tournent quand même).
 * Sorties : `docs/samples/bench/<modele>/<slug>.{report.json,html}` + `bench/README.md`.
 *
 * ⚠️ Corpus = VRAIS clients → NE PAS committer les sorties (docs/samples/bench/ ignoré git).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, buildUserMessage } from '../src/data/reportPrompt';
import type { GenerationContext } from '../src/data/reportPrompt';
import { RESPONSE_FORMAT, parseReport } from '../src/data/reportSchema';
import type { PreRapportOutput } from '../src/data/reportSchema';
import { renderReportHtml } from '../src/data/reportHtml';
import type { ReportRenderContext } from '../src/data/reportHtml';
import { famillesMetiers } from '../src/data/famillesMetiers';
import { statbank } from '../src/data/statbank';
import { reportSections, statsForSection, enforceSectionGrid } from '../src/data/rapportStructure';
import { enrichSiret } from '../netlify/functions/lib/enrichment';

const OUT_DIR = 'docs/samples/bench';

/** Modèles à comparer, avec leur fournisseur et leur tarif ($ par 1M tokens, in/out). */
interface ModelSpec {
  id: string;
  label: string;
  provider: 'openai' | 'anthropic';
  prixIn: number;
  prixOut: number;
}
const MODELS: ModelSpec[] = [
  { id: 'gpt-5.5-2026-04-23', label: 'GPT-5.5', provider: 'openai', prixIn: 5, prixOut: 30 },
  { id: 'gpt-5.6-terra', label: 'GPT-5.6 Terra', provider: 'openai', prixIn: 2.5, prixOut: 15 },
  { id: 'gpt-5.6-sol', label: 'GPT-5.6 Sol', provider: 'openai', prixIn: 5, prixOut: 30 },
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8', provider: 'anthropic', prixIn: 5, prixOut: 25 },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', provider: 'anthropic', prixIn: 3, prixOut: 15 },
];

interface Company {
  slug: string;
  nom: string;
  siret: string;
  secteurDeclare: string;
  produitsServices: string;
  clients: string;
  familles: string[];
}

/** Corpus = 6TM, avec les VRAIES réponses wizard saisies par Cyril (base Supabase, lead 30/06). */
const BENCH_COMPANIES: Company[] = [
  {
    slug: '6tm',
    nom: '6TM',
    siret: '41795474000052',
    secteurDeclare:
      "6TM est une société de conseil en transformation numérique. De l’idée à la réalisation, nous accompagnons nos clients PME, ETI, Grands Comptes, pour donner vie à des projets digitaux intelligents et durables.",
    produitsServices:
      'Développement informatique, E-commerce, Intranet – Extranet, ERP, CRM, Logiciels et outils métier',
    clients:
      'BtoB. Echnage direct via commerciaux.\nAménagement de la maison\nAutomotive\nE-commerce\nEnvironnement\nFormation\nFranchises & Réseaux\nInstitutions & Collectivité\nNégoce\nServices',
    familles: ['Direction générale & dirigeants', 'Tech, informatique & data', 'Ingénierie & sciences'],
  },
];

/** Schéma JSON sous-jacent (réutilisé tel quel pour les structured outputs Anthropic). */
const REPORT_JSON_SCHEMA = RESPONSE_FORMAT.json_schema.schema;

/** Lecture directe du .env (le script ne dépend pas d'un loader). */
function readEnv(key: string): string | undefined {
  try {
    for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && m[1] === key) return m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* pas de .env */
  }
  return undefined;
}

/** Retry générique : couvre les erreurs transitoires (401 sporadique, 429, 5xx). */
async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (i < tries - 1) {
        console.warn(`  …retry ${i + 1}/${tries - 1} après erreur : ${msg}`);
        await new Promise((res) => setTimeout(res, 2000 * (i + 1)));
      }
    }
  }
  throw lastErr;
}

/** Enrichissement INSEE avec retry (l'API recherche-entreprises est parfois lente). */
async function enrichWithRetry(siret: string, tries = 3): Promise<Awaited<ReturnType<typeof enrichSiret>>> {
  for (let i = 0; i < tries; i++) {
    const r = await enrichSiret(siret);
    if (Object.keys(r).length > 0) return r;
    if (i < tries - 1) await new Promise((res) => setTimeout(res, 1000));
  }
  return {};
}

function mapFamilles(declarees: string[]): GenerationContext['famillesDeclarees'] {
  return declarees.map((label) => {
    const m = famillesMetiers.find((f) => f.label.toLowerCase() === label.toLowerCase() || f.id === label);
    return m ? { label: m.label, isco: m.isco } : { label };
  });
}

// Audit garde-fou (identique à generate-samples.ts) : citations connues + dans la grille.
const KNOWN = new Set(statbank.map((s) => s.id));
const ALLOWED = new Map(reportSections.map((s) => [s.id, new Set(statsForSection(s).map((x) => x.id))]));
function audit(report: PreRapportOutput) {
  let total = 0;
  const invented: string[] = [];
  const outOfGrid: string[] = [];
  for (const sec of report.sections) {
    const allowed = ALLOWED.get(sec.id) ?? new Set<string>();
    for (const id of sec.sources_citees) {
      total++;
      if (!KNOWN.has(id)) invented.push(`${sec.id}→${id}`);
      else if (!allowed.has(id)) outOfGrid.push(`${sec.id}→${id}`);
    }
  }
  return { total, invented, outOfGrid };
}

function familleVerdicts(report: PreRapportOutput): string {
  const fam = report.sections.find((s) => s.id === 'familles-metiers')?.familles ?? [];
  return fam.map((f) => `${f.famille} → **${f.exposition}** (conf. ${f.confiance})`).join(' · ');
}

interface GenResult {
  report: PreRapportOutput;
  promptTokens: number;
  completionTokens: number;
  ms: number;
}

/** Génère un rapport via le bon fournisseur. Même prompt/schéma des deux côtés. */
async function generateOne(
  m: ModelSpec,
  ctx: GenerationContext,
  openai: OpenAI,
  anthropic: Anthropic | null,
): Promise<GenResult> {
  const t0 = Date.now();
  if (m.provider === 'openai') {
    const completion = await withRetry(() =>
      openai.chat.completions.create({
        model: m.id,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserMessage(ctx) },
        ],
        response_format: RESPONSE_FORMAT,
      }),
    );
    const ms = Date.now() - t0;
    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error('réponse OpenAI vide');
    return {
      report: parseReport(raw),
      promptTokens: completion.usage?.prompt_tokens ?? 0,
      completionTokens: completion.usage?.completion_tokens ?? 0,
      ms,
    };
  }

  // Anthropic (Opus 4.8 / Sonnet 5) : structured outputs (MÊME schéma JSON que le
  // response_format OpenAI) + adaptive thinking. Pas de temperature (rejetée sur ces modèles).
  // On passe par output_config.format plutôt que par un tool_choice forcé, car ce dernier est
  // incompatible avec le thinking ; les structured outputs, eux, sont compatibles.
  if (!anthropic) throw new Error('client Anthropic non initialisé');
  // Streaming OBLIGATOIRE : max_tokens élevé + thinking → l'appel peut dépasser le timeout
  // non-stream de 10 min, que le SDK refuse. `.finalMessage()` recompose le message complet.
  // `as any` : output_config/thinking pas toujours typés selon la version du SDK (tsx n'en typecheck rien).
  const msg = (await withRetry(() =>
    (anthropic.messages.stream as any)({
      model: m.id,
      max_tokens: 32000,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(ctx) }],
      output_config: { format: { type: 'json_schema', schema: REPORT_JSON_SCHEMA } },
    }).finalMessage(),
  )) as Anthropic.Message;
  const ms = Date.now() - t0;
  if (msg.stop_reason === 'refusal') throw new Error('refus du modèle (stop_reason=refusal)');
  // Concatène TOUS les blocs texte (le JSON peut être réparti sur plusieurs blocs).
  let jsonText = '';
  for (const b of msg.content) if (b.type === 'text') jsonText += b.text;
  if (!jsonText) throw new Error(`pas de bloc texte JSON (stop_reason=${msg.stop_reason})`);
  try {
    return {
      report: parseReport(jsonText),
      promptTokens: msg.usage.input_tokens,
      completionTokens: msg.usage.output_tokens,
      ms,
    };
  } catch (e) {
    const emsg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `${emsg} [stop_reason=${msg.stop_reason}, len=${jsonText.length}, début="${jsonText.slice(0, 100).replace(/\s+/g, ' ')}"]`,
    );
  }
}

interface BenchResult {
  modelId: string;
  modelLabel: string;
  slug: string;
  nom: string;
  ok: boolean;
  error?: string;
  promptTokens: number;
  completionTokens: number;
  ms: number;
  cost: number;
  citations: number;
  invented: number;
  outOfGrid: number;
  verdicts: string;
}

async function main() {
  const openaiKey = readEnv('OPENAI_API_KEY');
  if (!openaiKey) throw new Error('OPENAI_API_KEY absent de .env');
  const openai = new OpenAI({ apiKey: openaiKey });

  const anthropicKey = readEnv('ANTHROPIC_API_KEY');
  const anthropic = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;
  if (!anthropic) {
    console.warn('\n⚠️  ANTHROPIC_API_KEY absente de .env → les modèles Opus seront SAUTÉS.');
    console.warn('   Ajoute `ANTHROPIC_API_KEY=sk-ant-...` dans .env puis relance pour les inclure.\n');
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const dateRapport = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  // 1. Pré-enrichir chaque entreprise UNE fois → contexte identique pour tous les modèles.
  type Enriched = { c: Company; ctx: GenerationContext; renderCtx: ReportRenderContext };
  const enriched: Enriched[] = [];
  for (const c of BENCH_COMPANIES) {
    console.log(`\n[enrich] ${c.nom} (${c.siret})`);
    const enr = await enrichWithRetry(c.siret);
    console.log(
      `  cat=${enr.categorieEntreprise} NAF=${enr.nafCode} eff=${enr.effectifTranche} loc=${enr.localisation} actif=${enr.actif}`,
    );
    const ctx: GenerationContext = {
      nomEntreprise: enr.nomEntreprise ?? c.nom,
      secteurDeclare: c.secteurDeclare,
      nafCode: enr.nafCode,
      nafLibelle: enr.nafLibelle,
      categorieEntreprise: enr.categorieEntreprise,
      effectifTranche: enr.effectifTranche,
      localisation: enr.localisation,
      anneeCreation: enr.anneeCreation,
      produitsServices: c.produitsServices,
      clients: c.clients,
      famillesDeclarees: mapFamilles(c.familles),
      sourceResume: undefined,
      dateRapport,
    };
    const renderCtx: ReportRenderContext = {
      nomEntreprise: ctx.nomEntreprise,
      secteurDeclare: ctx.secteurDeclare,
      nafLibelle: ctx.nafLibelle,
      nafCode: ctx.nafCode,
      categorieEntreprise: ctx.categorieEntreprise,
      effectifTranche: ctx.effectifTranche,
      localisation: ctx.localisation,
      famillesLabels: ctx.famillesDeclarees.map((f) => f.label),
      dateRapport,
    };
    enriched.push({ c, ctx, renderCtx });
  }

  // 2. Générer chaque (modèle × entreprise), relever tokens / latence / coût / audit.
  const results: BenchResult[] = [];
  for (const m of MODELS) {
    const dir = `${OUT_DIR}/${m.id}`;
    mkdirSync(dir, { recursive: true });
    for (const e of enriched) {
      const tag = `${m.label} · ${e.c.nom}`;
      console.log(`\n=== ${tag} ===`);

      if (m.provider === 'anthropic' && !anthropic) {
        console.warn('  [skip] ANTHROPIC_API_KEY absente de .env');
        results.push({
          modelId: m.id,
          modelLabel: m.label,
          slug: e.c.slug,
          nom: e.c.nom,
          ok: false,
          error: 'ANTHROPIC_API_KEY absente de .env (ajoute-la puis relance)',
          promptTokens: 0,
          completionTokens: 0,
          ms: 0,
          cost: 0,
          citations: 0,
          invented: 0,
          outOfGrid: 0,
          verdicts: '',
        });
        continue;
      }

      try {
        const { report, promptTokens: pt, completionTokens: ct, ms } = await generateOne(m, e.ctx, openai, anthropic);
        // Garde-fou grille : retire les citations hors section autorisée (défense en profondeur).
        enforceSectionGrid(report);
        writeFileSync(`${dir}/${e.c.slug}.report.json`, JSON.stringify(report, null, 2), 'utf8');
        writeFileSync(`${dir}/${e.c.slug}.html`, renderReportHtml(report, e.renderCtx), 'utf8');

        const a = audit(report);
        const cost = (m.prixIn * pt + m.prixOut * ct) / 1e6;
        console.log(
          `  in=${pt} out=${ct} | ${(ms / 1000).toFixed(1)}s | $${cost.toFixed(4)} | ` +
            `citations=${a.total} inventées=${a.invented.length} hors-grille=${a.outOfGrid.length}`,
        );
        results.push({
          modelId: m.id,
          modelLabel: m.label,
          slug: e.c.slug,
          nom: e.c.nom,
          ok: true,
          promptTokens: pt,
          completionTokens: ct,
          ms,
          cost,
          citations: a.total,
          invented: a.invented.length,
          outOfGrid: a.outOfGrid.length,
          verdicts: familleVerdicts(report),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  ÉCHEC (${m.id}) : ${msg}`);
        results.push({
          modelId: m.id,
          modelLabel: m.label,
          slug: e.c.slug,
          nom: e.c.nom,
          ok: false,
          error: msg,
          promptTokens: 0,
          completionTokens: 0,
          ms: 0,
          cost: 0,
          citations: 0,
          invented: 0,
          outOfGrid: 0,
          verdicts: '',
        });
      }
    }
  }

  writeReadme(results, dateRapport, anthropic !== null);
  const nbOk = results.filter((r) => r.ok).length;
  console.log(`\nTerminé : ${nbOk}/${results.length} rapports générés. Comparatif → ${OUT_DIR}/README.md`);
}

/** Écrit le comparatif Markdown (synthèse par modèle + verdicts §3). */
function writeReadme(results: BenchResult[], dateRapport: string, anthropicRan: boolean): void {
  const fmt$ = (n: number) => `$${n.toFixed(4)}`;
  const fmtS = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

  let md = `# Benchmark modèles — pré-rapport MIRA\n\n`;
  md += `> Généré le ${dateRapport} par [\`scripts/benchmark-models.ts\`](../../../scripts/benchmark-models.ts). `;
  md += `Même prompt, même schéma, même entrée — seule variable : le modèle. `;
  md += `Corpus = **6TM** (vrai client, réponses wizard réelles saisies par Cyril). `;
  md += `**Sorties non committées (confidentiel).**\n\n`;
  if (!anthropicRan) {
    md += `> ⚠️ **Modèles Claude sautés** : \`ANTHROPIC_API_KEY\` absente de \`.env\`. `;
    md += `Ajoute-la puis relance \`npx tsx scripts/benchmark-models.ts\` pour compléter Opus 4.8 / Sonnet 5.\n\n`;
  }

  // Tableau par modèle (1 entreprise → 1 ligne par modèle)
  md += `## Résultats par modèle\n\n`;
  md += `| Modèle | OK | Citations | Inventées | Hors-grille | Tokens in / out | Latence | Coût / rapport | Fichiers |\n`;
  md += `|---|---|---|---|---|---|---|---|---|\n`;
  for (const m of MODELS) {
    const r = results.find((x) => x.modelId === m.id);
    if (!r || !r.ok) {
      md += `| **${m.label}** (\`${m.id}\`) | ❌ | — | — | — | — | — | — | ⚠️ ${r?.error ?? 'pas de sortie'} |\n`;
      continue;
    }
    const links = `[HTML](${m.id}/${r.slug}.html) · [JSON](${m.id}/${r.slug}.report.json)`;
    md += `| **${m.label}** (\`${m.id}\`) | ✅ | ${r.citations} | ${r.invented} | ${r.outOfGrid} | ${r.promptTokens} / ${r.completionTokens} | ${fmtS(r.ms)} | ${fmt$(r.cost)} | ${links} |\n`;
  }
  md += `\n**Garde-fou « zéro chiffre inventé »** : objectif **0 inventée / 0 hors-grille** partout. `;
  md += `Coût = tarif du fournisseur (in/out par 1M tokens) × tokens réellement consommés.\n\n`;

  // Verdicts §3 (justesse métier)
  md += `## Verdicts §3 par famille (justesse métier)\n\n`;
  md += `À iso-entrée, comparer le verdict d'exposition par famille d'un modèle à l'autre.\n\n`;
  for (const m of MODELS) {
    const r = results.find((x) => x.modelId === m.id);
    if (r?.ok && r.verdicts) md += `- **${m.label}** : ${r.verdicts}\n`;
    else md += `- **${m.label}** : ⚠️ ${r?.error ?? 'pas de sortie'}\n`;
  }
  md += `\n`;

  // Mode d'emploi
  md += `## Comment lire ce comparatif\n\n`;
  md += `1. **Filtre objectif d'abord** : tout modèle avec des citations inventées ou hors-grille est disqualifié `;
  md += `pour un rapport RH (contexte IA Act, garde-fou « zéro chiffre inventé »).\n`;
  md += `2. **Puis coût/latence** : à qualité factuelle égale, regarder le coût par rapport et la latence.\n`;
  md += `3. **Puis lecture humaine** (Cyril) : ouvrir les HTML côte à côte et juger la rédaction (ton conseil, `;
  md += `absence de « slop IA »), la justesse des verdicts §3, et le respect du périmètre freemium.\n\n`;
  md += `> ⚠️ **Config** : les GPT-5.x sont des modèles de raisonnement à effort par défaut ; `;
  md += `Opus 4.8 et Sonnet 5 tournent **avec adaptive thinking activé** (effort par défaut), sortie `;
  md += `structurée via \`output_config.format\` (même schéma JSON que le response_format OpenAI). `;
  md += `Sonnet 5 : tarif standard $3/$15 appliqué ici ; remise intro $2/$10 jusqu'au 31/08/2026.\n`;
  md += `>\n`;
  md += `> ⚠️ **Variance** : température par défaut, pas de seed. Un run = un échantillon ; relancer pour juger la stabilité.\n`;

  writeFileSync(`${OUT_DIR}/README.md`, md, 'utf8');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
