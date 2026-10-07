/**
 * replay-report.ts — rejeu HORS LIGNE d'un rapport déjà produit.
 * =============================================================
 *
 * Usage :
 *   npx --yes tsx scripts/replay-report.ts <leadId> [--out <fichier.html>]
 *   npx --yes tsx scripts/replay-report.ts --file <report.json> [--out <fichier.html>] [--entreprise <nom>]
 *
 * Le premier mode relit `leads.report_json` dans Supabase (lecture seule, `.env` :
 * `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) ; le second relit un fichier JSON local,
 * sans réseau du tout.
 *
 * Étapes, dans les deux modes : `parseReport` (contrat + verrou de style) → `validateReport`
 * (contrôles V1 → V14) → décompte de mots par section, lu par `lireSection` → `renderReportHtml`.
 * Le HTML est écrit sur disque (par défaut `tmp/replay-<id>.html`, ignoré par git).
 *
 * Ce script n'appelle JAMAIS OpenAI et n'écrit JAMAIS en base : il sert à voir l'effet d'un
 * changement de contrôle, de lecture ou de gabarit sur un vrai rapport, sans rien régénérer
 * ni renvoyer. Sortie 0 même quand des contrôles échouent (c'est l'information cherchée) ;
 * sortie 1 seulement sur erreur technique (fichier illisible, lead introuvable, JSON hors
 * contrat).
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseReport } from '../src/data/reportSchema';
import type { PreRapportOutput } from '../src/data/reportSchema';
import { validateReport, budgetOf } from '../src/data/reportValidation';
import type { ValidationFinding } from '../src/data/reportValidation';
import { lireSection } from '../src/data/reportLecture';
import { renderReportHtml } from '../src/data/reportHtml';
import type { ReportRenderContext } from '../src/data/reportHtml';

// --- Arguments ---------------------------------------------------------------

interface Args {
  leadId?: string;
  file?: string;
  out?: string;
  entreprise?: string;
}

function parseArgs(argv: readonly string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file') args.file = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--entreprise') args.entreprise = argv[++i];
    else if (!a.startsWith('--') && !args.leadId) args.leadId = a;
  }
  return args;
}

const USAGE = [
  'Usage :',
  '  npx --yes tsx scripts/replay-report.ts <leadId> [--out <fichier.html>]',
  '  npx --yes tsx scripts/replay-report.ts --file <report.json> [--out <fichier.html>] [--entreprise <nom>]',
].join('\n');

// --- Lecture du .env (même mini parseur que scripts/resend-report.ts) --------

function readEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (!env[k] && process.env[k]) env[k] = process.env[k] as string;
  }
  return env;
}

// --- Les deux sources de rapport --------------------------------------------

interface Rejeu {
  /** Ce qui nomme la sortie (id du lead, ou nom du fichier). */
  readonly etiquette: string;
  readonly report: PreRapportOutput;
  readonly ctx: ReportRenderContext;
}

/**
 * Contexte de rendu minimal : de quoi rendre les pages de garde sans rien inventer.
 * Les familles passent par `lireSection`, seule traversée de la forme d'une section.
 */
function contexteMinimal(report: PreRapportOutput, entreprise?: string): ReportRenderContext {
  const s3 = report.sections.find((s) => s.id === 'familles-metiers');
  return {
    nomEntreprise: entreprise,
    secteurDeclare: 'rejeu hors ligne (secteur non relu)',
    famillesLabels: s3 ? lireSection(s3).familles.map((f) => f.nom.texte) : [],
    dateRapport: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
  };
}

/** Mode `--file` : un `report_json` sur disque, aucun réseau. */
function depuisFichier(chemin: string, entreprise?: string): Rejeu {
  const raw = readFileSync(chemin, 'utf8');
  const report = parseReport(raw);
  const etiquette = (chemin.split(/[\\/]/).pop() ?? 'report').replace(/\.json$/i, '');
  return { etiquette, report, ctx: contexteMinimal(report, entreprise) };
}

/** Mode `<leadId>` : `leads.report_json`, en lecture seule. */
async function depuisLead(leadId: string): Promise<Rejeu> {
  const env = readEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY absents du .env.');
  }
  // Import dynamique : le mode `--file` ne doit dépendre ni de Supabase ni du .env.
  const { createClient } = await import('@supabase/supabase-js');
  const { buildGenerationContext } = await import('../netlify/functions/lib/context');

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data: lead, error } = await supabase.from('leads').select('*').eq('id', leadId).single();
  if (error || !lead) throw new Error(`Lead introuvable : ${error?.message ?? leadId}`);
  if (!lead.report_json) throw new Error(`Le lead ${leadId} ne porte pas de report_json.`);

  const report = parseReport(JSON.stringify(lead.report_json));
  // Enrichissement vide : le rejeu ne rappelle ni l'INSEE ni le site du lead.
  const gen = buildGenerationContext(lead, { siret: {} }, new Date());
  const ctx: ReportRenderContext = {
    nomEntreprise: gen.nomEntreprise,
    secteurDeclare: gen.secteurDeclare,
    nafLibelle: gen.nafLibelle,
    nafCode: gen.nafCode,
    effectifTranche: gen.effectifTranche,
    categorieEntreprise: gen.categorieEntreprise,
    localisation: gen.localisation,
    famillesLabels: gen.famillesDeclarees.map((f) => f.label),
    dateRapport: gen.dateRapport,
  };
  return { etiquette: leadId, report, ctx };
}

// --- Rapport de rejeu à l'écran ---------------------------------------------

function imprimeFindings(findings: readonly ValidationFinding[]): void {
  const bloquants = findings.filter((f) => f.level === 'bloquant');
  console.log(
    `\nContrôles V1 → V14 : ${findings.length} échec(s), dont ${bloquants.length} bloquant(s).`,
  );
  if (findings.length === 0) {
    console.log('  (aucun : ce rapport passe tous les contrôles)');
    return;
  }
  for (const f of findings) {
    console.log(`  [${f.code}] ${f.level} · ${f.sectionId} : ${f.message}`);
  }
  if (bloquants.length > 0) {
    console.log(
      `\nEn production, ce rapport partirait marqué needs_review (codes bloquants : ${[
        ...new Set(bloquants.map((f) => f.code)),
      ].join(', ')}).`,
    );
  }
}

function imprimeMots(report: PreRapportOutput): void {
  console.log('\nDécompte de mots par section (prose du modèle, lue par lireSection) :');
  for (const section of report.sections) {
    const l = lireSection(section);
    // Le budget affiché est celui que V9 applique : part par famille comprise (§3) et
    // tolérance de 10 % incluse. La règle vient de `budgetOf`, elle n'est pas recopiée ici.
    const bornes = l.spec ? budgetOf(l.spec, l.familles.length) : null;
    const budget = bornes ? ` [budget toléré ${bornes.min} à ${bornes.max}]` : '';
    const ignore = l.contenuIgnore ? ' · contenu ignoré (la section porte un encart)' : '';
    console.log(`  §${l.numero ?? '?'} ${l.titre} : ${l.mots} mots${budget}${ignore}`);
  }
}

// --- Point d'entrée ----------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file && !args.leadId) {
    console.error(`Ni leadId ni --file.\n${USAGE}`);
    process.exit(1);
  }

  const rejeu = args.file ? depuisFichier(args.file, args.entreprise) : await depuisLead(args.leadId!);
  console.log(`Rejeu de « ${rejeu.etiquette} » : ${rejeu.report.sections.length} sections.`);

  imprimeFindings(validateReport(rejeu.report));
  imprimeMots(rejeu.report);

  const out = args.out ?? `tmp/replay-${rejeu.etiquette}.html`;
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, renderReportHtml(rejeu.report, rejeu.ctx), 'utf8');
  console.log(`\nHTML écrit : ${out}`);
}

main().catch((err: unknown) => {
  console.error(`\nÉchec du rejeu : ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
