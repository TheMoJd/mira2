/**
 * generate-samples.ts — génère des pré-rapports d'exemple sur de VRAIES entreprises.
 * =================================================================================
 * Récupère les vraies données d'enrichissement (INSEE Sirene via `enrichSiret`),
 * appelle réellement OpenAI avec le vrai prompt + schéma, rend le HTML, et écrit
 * les artefacts dans `docs/samples/` pour partage en équipe. Audite au passage que
 * chaque statistique citée existe ET est autorisée dans sa section (garde-fou).
 *
 * Usage : `npx tsx scripts/generate-samples.ts`  (nécessite OPENAI_API_KEY dans .env)
 * Les fichiers produits sont versionnés (docs/*.md/.html/.json suivis par git).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import OpenAI from 'openai';
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

const OUT_DIR = 'docs/samples';

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

interface Company {
  slug: string;
  nom: string;
  siret: string;
  secteurDeclare: string;
  produitsServices: string;
  clients: string;
  familles: string[];
}

/** 3 vraies entreprises (entités d'exploitation vérifiées via recherche-entreprises). */
const COMPANIES: Company[] = [
  {
    slug: 'doctolib',
    nom: 'Doctolib',
    siret: '79459881300077',
    secteurDeclare:
      "Éditeur de logiciels de santé (e-santé). Plateforme de prise de rendez-vous médicaux en ligne et de téléconsultation, pour praticiens et établissements de santé.",
    produitsServices:
      "Logiciel SaaS de gestion d'agenda, prise de rendez-vous, téléconsultation et logiciel médical. Valeur : réduire les rendez-vous non honorés, fluidifier l'accès aux soins.",
    clients:
      "Praticiens de santé (médecins, dentistes, kinés), hôpitaux et cliniques, et patients. Relation via une force commerciale terrain, un support client et la plateforme en self-service.",
    familles: ['Tech, informatique & data', 'Relation client & accueil', 'Gestion, finance & administration'],
  },
  {
    slug: 'biocoop',
    nom: 'Biocoop',
    siret: '38289175200299',
    secteurDeclare:
      "Réseau coopératif de distribution de produits biologiques : centrale d'achat et magasins spécialisés en alimentation bio en France.",
    produitsServices:
      "Approvisionnement et distribution de produits alimentaires bio via un réseau de magasins coopératifs. Valeur : filière bio équitable, traçabilité, proximité.",
    clients:
      "Consommateurs en magasin et magasins sociétaires du réseau. Relation via les points de vente et une centrale d'achat/logistique.",
    familles: ['Vente & commerce', 'Transport & logistique', 'Comptabilité, paie & gestion des données'],
  },
  {
    slug: 'norauto',
    nom: 'Norauto France',
    siret: '48047015202984',
    secteurDeclare:
      "Enseigne d'entretien et d'équipement automobile : centres auto avec atelier mécanique et magasin de pièces et accessoires.",
    produitsServices:
      "Prestations d'entretien et de réparation automobile en atelier + vente de pièces, pneus et accessoires. Valeur : entretien accessible, rapide et de proximité.",
    clients:
      "Automobilistes particuliers, en centre auto et en ligne (prise de rendez-vous atelier). Relation via les conseillers en magasin et le service client.",
    familles: ['Industrie, maintenance & métiers qualifiés', 'Vente & commerce', 'Relation client & accueil'],
  },
  {
    // Cas « terrain » : familles nettoyage/manutention (ISCO 91/93) — « à confirmer »
    // avant l'ajout DARES, censées remonter une exposition sourcée après.
    slug: 'onet',
    nom: 'Onet Services',
    siret: '06780042503681',
    secteurDeclare:
      "Entreprise de propreté et services associés : nettoyage et entretien de bâtiments tertiaires, industriels et collectivités.",
    produitsServices:
      "Prestations de nettoyage, propreté et services multi-techniques sur sites clients. Valeur : environnements sains, continuité d'exploitation, conformité.",
    clients:
      "Entreprises, collectivités et sites industriels sous contrat. Relation via des chefs de site, encadrants de proximité et un service client.",
    familles: ['Manutention, nettoyage & métiers élémentaires', 'Relation client & accueil', 'Gestion, finance & administration'],
  },
];

/**
 * Enrichissement avec retry : l'API recherche-entreprises est parfois lente
 * (timeout 6s → AbortError → {} en best-effort). Pour des échantillons fiables
 * on réessaie quelques fois. (Le runtime de prod garde le best-effort sans retry.)
 */
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
    const m = famillesMetiers.find(
      (f) => f.label.toLowerCase() === label.toLowerCase() || f.id === label,
    );
    return m ? { label: m.label, isco: m.isco } : { label };
  });
}

// Audit garde-fou : citations connues + dans la grille de la section.
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

async function main() {
  const apiKey = readEnv('OPENAI_API_KEY');
  const model = readEnv('OPENAI_MODEL') ?? 'gpt-4.1';
  if (!apiKey) throw new Error('OPENAI_API_KEY absent de .env');
  mkdirSync(OUT_DIR, { recursive: true });
  const openai = new OpenAI({ apiKey });
  const dateRapport = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  type Row = {
    c: Company;
    enr: Awaited<ReturnType<typeof enrichSiret>>;
    report: PreRapportOutput;
    a: ReturnType<typeof audit>;
  };
  const rows: Row[] = [];

  for (const c of COMPANIES) {
    console.log(`\n=== ${c.nom} (${c.siret}) ===`);
    const enr = await enrichWithRetry(c.siret);
    console.log(`  enrichissement: cat=${enr.categorieEntreprise} NAF=${enr.nafCode} eff=${enr.effectifTranche} loc=${enr.localisation} actif=${enr.actif}`);

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

    // Mode réutilisation : ré-applique le garde-fou + re-rend depuis le report.json
    // existant, sans rappeler OpenAI (SAMPLES_REUSE=1). Sinon, vraie génération.
    const existing = `${OUT_DIR}/${c.slug}.report.json`;
    let report: PreRapportOutput;
    if (process.env.SAMPLES_REUSE && existsSync(existing)) {
      report = JSON.parse(readFileSync(existing, 'utf8')) as PreRapportOutput;
      console.log('  [reuse] report.json existant réutilisé (pas d’appel OpenAI)');
    } else {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserMessage(ctx) },
        ],
        response_format: RESPONSE_FORMAT,
      });
      const raw = completion.choices[0]?.message?.content;
      if (!raw) throw new Error(`Réponse OpenAI vide pour ${c.nom}`);
      report = parseReport(raw);
    }
    // Garde-fou grille : retire les citations hors section autorisée (défense en profondeur).
    enforceSectionGrid(report);

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
    writeFileSync(`${OUT_DIR}/${c.slug}.report.json`, JSON.stringify(report, null, 2), 'utf8');
    writeFileSync(`${OUT_DIR}/${c.slug}.html`, renderReportHtml(report, renderCtx), 'utf8');

    const a = audit(report);
    console.log(`  citations=${a.total} inventées=${a.invented.length} hors-grille=${a.outOfGrid.length}`);
    rows.push({ c, enr, report, a });
  }

  // Index README partageable.
  const familleVerdicts = (r: Row): string => {
    const fam = r.report.sections.find((s) => s.id === 'familles-metiers')?.familles ?? [];
    return fam.map((f) => `${f.famille} → **${f.exposition}** (confiance ${f.confiance})`).join(' · ');
  };
  const firstMsg = (r: Row): string => {
    const s = r.report.sections.find((x) => x.id === 'synthese-strategique');
    return s?.contenu?.[0]?.paragraphes?.[0] ?? '';
  };

  let md = `# Pré-rapports d'exemple — entreprises réelles\n\n`;
  md += `> Générés par [\`scripts/generate-samples.ts\`](../../scripts/generate-samples.ts) sur de **vraies entreprises**, avec leurs **vraies données** d'enrichissement (INSEE Sirene) et un **vrai appel OpenAI** (modèle \`${model}\`). Régénérer : \`npx tsx scripts/generate-samples.ts\`.\n\n`;
  md += `Chaque rapport est rendu en HTML (ouvrir dans un navigateur, imprimable en PDF) + le JSON structuré brut.\n\n`;
  md += `## Récapitulatif\n\n`;
  md += `| Entreprise | Catégorie | NAF | Effectif | Localisation | Citations | Inventées | Hors-grille |\n`;
  md += `|---|---|---|---|---|---|---|---|\n`;
  for (const r of rows) {
    md += `| **${r.c.nom}** | ${r.enr.categorieEntreprise ?? '—'} | ${r.enr.nafCode ?? '—'} | ${r.enr.effectifTranche ?? '—'} | ${r.enr.localisation ?? '—'} | ${r.a.total} | ${r.a.invented.length} | ${r.a.outOfGrid.length} |\n`;
  }
  md += `\n**Garde-fou « zéro chiffre inventé »** : "Inventées" = id de stat inexistant ; "Hors-grille" = stat citée hors de sa section autorisée. Objectif : **0 / 0** partout.\n\n`;
  for (const r of rows) {
    md += `## ${r.c.nom}\n\n`;
    md += `- **Données réelles** : catégorie ${r.enr.categorieEntreprise ?? '—'}, NAF ${r.enr.nafCode ?? '—'}, effectif « ${r.enr.effectifTranche ?? '—'} », ${r.enr.localisation ?? '—'}, créée en ${r.enr.anneeCreation ?? '—'}, active : ${r.enr.actif ?? '—'}.\n`;
    md += `- **Familles déclarées** : ${r.c.familles.join(', ')}.\n`;
    md += `- **§3 — verdict par famille** : ${familleVerdicts(r)}\n`;
    md += `- **Audit citations** : ${r.a.total} citées, ${r.a.invented.length} inventées, ${r.a.outOfGrid.length} hors-grille.\n`;
    md += `- **Message clé (extrait §1)** : ${firstMsg(r).slice(0, 320)}…\n`;
    md += `- 📄 [Rapport HTML](${r.c.slug}.html) · [JSON](${r.c.slug}.report.json)\n\n`;
  }
  writeFileSync(`${OUT_DIR}/README.md`, md, 'utf8');
  console.log(`\nÉcrit : ${OUT_DIR}/README.md + ${rows.length} rapports (html + json).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
