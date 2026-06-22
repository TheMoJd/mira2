/**
 * GABARIT HTML DU PRÉ-RAPPORT (Tranche 4b)
 * =========================================
 *
 * `renderReportHtml(report, ctx)` transforme la sortie structurée du LLM
 * (`PreRapportOutput`) en un **document HTML autoportant** prêt à être imprimé en
 * PDF par Chromium (`netlify/functions/lib/pdf.ts`).
 *
 * Principes :
 *  - **Fonction pure, sans dépendance** (pas de React) — testable au vitest.
 *  - **Zéro chiffre inventé au rendu** : on n'affiche que le texte de `report_json` ;
 *    les références §9 sont **résolues depuis `statbank`** par leur `id` (`sources_citees`).
 *  - **Palette violet de la marque MIRA** centralisée dans `BRAND` (re-skinnable).
 *  - Polices de marque chargées via Google Fonts (le PDF est rendu avec accès réseau),
 *    avec une stack de secours système.
 */

import type { PreRapportOutput, ReportSectionOutput, ReportBloc, ReportFamille } from './reportSchema';
import { reportSections } from './rapportStructure';
import { statbank } from './statbank';
import type { StatEntry } from './statbank';
import { RGPD_PDF_FOOTER } from './rgpd';

/** Contexte de l'entreprise pour la page de garde et l'entête (issu du lead + enrichissement). */
export interface ReportRenderContext {
  nomEntreprise?: string;
  secteurDeclare: string;
  nafLibelle?: string;
  nafCode?: string;
  effectifTranche?: string;
  /** Libellés lisibles des familles déclarées (Q4). */
  famillesLabels: string[];
  /** Date du rapport, déjà formatée (ex. « 22 juin 2026 »). */
  dateRapport: string;
}

/** Jetons de marque MIRA (alignés sur `src/styles/globals.css`). */
const BRAND = {
  violet: '#35137d',
  violet700: '#29105f',
  violet100: '#ebe4ff',
  ink: '#160f2e',
  ink2: '#5b5478',
  ink3: '#8a83a6',
  line: 'rgba(22,15,46,0.12)',
  lineSoft: 'rgba(22,15,46,0.06)',
  paper: '#ffffff',
  bgSoft: '#f5f3fb',
  risk: '#ef6c4d',
  amber: '#f3b13f',
  opp: '#2cc18f',
  cyan: '#43c6e8',
} as const;

/** Couleur d'un niveau d'exposition (§3). */
function expositionColor(level: ReportFamille['exposition']): string {
  switch (level) {
    case 'élevée':
      return BRAND.risk;
    case 'modérée':
      return BRAND.amber;
    case 'faible':
      return BRAND.opp;
    default:
      return BRAND.ink3; // « à confirmer »
  }
}

// --- Échappement HTML ------------------------------------------------------

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
/** Échappe le texte (provient du LLM) avant insertion dans le HTML. */
function esc(input: string): string {
  return input.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

// --- Résolution des sources citées ----------------------------------------

const STAT_BY_ID: Map<string, StatEntry> = new Map(statbank.map((s) => [s.id, s]));

/** Numéro de section (§N) par id, dérivé de la structure de référence. */
const SECTION_NUM_BY_ID: Map<string, number> = new Map(reportSections.map((s) => [s.id, s.num]));

/** Citation lisible d'une statistique pour la bibliographie §9. */
function renderCitation(stat: StatEntry): string {
  const origin =
    stat.provenance === 'secondaire' && stat.source.originalSource
      ? ` — source d'origine : ${esc(stat.source.originalSource)}, citée par ${esc(stat.source.org)}`
      : '';
  const flags = [stat.projection ? 'projection' : null, `périmètre ${esc(stat.scope)}`]
    .filter(Boolean)
    .join(' · ');
  return `<li style="margin:0 0 10px;line-height:1.5">
    <span style="font-weight:600;color:${BRAND.ink}">${esc(stat.claim)}</span>
    <span style="color:${BRAND.ink2}"> (${esc(stat.source.org)}, ${stat.source.year}${
      stat.source.page ? `, ${esc(stat.source.page)}` : ''
    })${origin}</span>
    <span style="display:block;font-size:11px;color:${BRAND.ink3};margin-top:2px">[${esc(stat.id)}] ${flags}</span>
  </li>`;
}

// --- Blocs de contenu ------------------------------------------------------

function renderBloc(bloc: ReportBloc): string {
  const titre = bloc.intertitre
    ? `<h3 style="font-size:14px;font-weight:600;color:${BRAND.violet700};margin:18px 0 6px">${esc(
        bloc.intertitre,
      )}</h3>`
    : '';
  const paras = bloc.paragraphes
    .map((p) => `<p style="margin:0 0 10px;line-height:1.6;color:${BRAND.ink}">${esc(p)}</p>`)
    .join('');
  return titre + paras;
}

/** Carte de caractérisation d'une famille de métiers (§3). */
function renderFamille(fam: ReportFamille): string {
  const color = expositionColor(fam.exposition);
  const natures = fam.natures
    .map(
      (n) =>
        `<span style="display:inline-block;font-size:11px;color:${BRAND.violet700};background:${BRAND.violet100};border-radius:999px;padding:2px 9px;margin:0 6px 4px 0">${esc(
          n,
        )}</span>`,
    )
    .join('');
  const part = fam.part_taches
    ? `<span style="color:${BRAND.ink2}"> · ${esc(fam.part_taches)} des tâches</span>`
    : '';
  const transpo = fam.transposable_france
    ? ''
    : `<div style="font-size:11px;color:${BRAND.ink3};margin-top:6px;font-style:italic">Donnée non directement transposable à une PME française.</div>`;
  return `<div style="border:1px solid ${BRAND.line};border-left:4px solid ${color};border-radius:10px;padding:14px 16px;margin:0 0 12px;background:${BRAND.paper}">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap">
      <strong style="font-size:14px;color:${BRAND.ink}">${esc(fam.famille)}</strong>
      <span style="font-size:12px;font-weight:600;color:${color}">Exposition ${esc(fam.exposition)}${part}</span>
    </div>
    <div style="margin:8px 0 4px">${natures}</div>
    <p style="margin:6px 0 0;line-height:1.55;color:${BRAND.ink}">${esc(fam.explication)}</p>
    <div style="font-size:11px;color:${BRAND.ink3};margin-top:6px">Confiance : ${esc(fam.confiance)}</div>
    ${transpo}
  </div>`;
}

function renderSection(section: ReportSectionOutput): string {
  const num = SECTION_NUM_BY_ID.get(section.id);
  const prefix = num !== undefined ? `§${num} · ` : '';
  const familles =
    section.familles && section.familles.length > 0
      ? `<div style="margin-top:14px">${section.familles.map(renderFamille).join('')}</div>`
      : '';
  return `<section style="margin:0 0 26px;page-break-inside:avoid">
    <h2 style="font-family:var(--serif);font-size:19px;font-weight:500;color:${BRAND.violet};margin:0 0 12px;padding-bottom:6px;border-bottom:1px solid ${BRAND.lineSoft}">
      <span style="font-size:13px;color:${BRAND.ink3};font-family:var(--sans)">${prefix}</span>${esc(section.titre)}
    </h2>
    ${section.contenu.map(renderBloc).join('')}
    ${familles}
  </section>`;
}

// --- Page de garde + bibliographie ----------------------------------------

function renderCover(ctx: ReportRenderContext): string {
  const rows: [string, string | undefined][] = [
    ['Entreprise', ctx.nomEntreprise],
    ['Secteur déclaré', ctx.secteurDeclare],
    ['Secteur normalisé (NAF)', ctx.nafLibelle ? `${ctx.nafLibelle}${ctx.nafCode ? ` [${ctx.nafCode}]` : ''}` : undefined],
    ['Effectif', ctx.effectifTranche],
    ['Familles de métiers analysées', ctx.famillesLabels.join(', ') || undefined],
    ['Date du rapport', ctx.dateRapport],
  ];
  const dl = rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) => `<div style="display:flex;gap:12px;padding:9px 0;border-bottom:1px solid ${BRAND.lineSoft}">
        <span style="flex:0 0 200px;font-size:12px;color:${BRAND.ink3};text-transform:uppercase;letter-spacing:.04em">${esc(
          k,
        )}</span>
        <span style="font-size:14px;color:${BRAND.ink}">${esc(v as string)}</span>
      </div>`,
    )
    .join('');
  return `<div style="page-break-after:always;padding-top:40px">
    <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:${BRAND.violet};font-weight:600">MIRA · Pré-rapport</div>
    <h1 style="font-family:var(--serif);font-size:34px;font-weight:500;color:${BRAND.ink};line-height:1.15;margin:14px 0 10px">L'impact de l'IA sur vos familles de métiers</h1>
    <p style="font-size:15px;color:${BRAND.ink2};line-height:1.6;max-width:520px;margin:0 0 34px">Diagnostic gratuit appliquant l'état de l'art public aux métiers que vous avez déclarés. Chaque chiffre est sourcé ; aucune donnée interne de votre entreprise n'est utilisée.</p>
    <div style="background:${BRAND.bgSoft};border:1px solid ${BRAND.line};border-radius:14px;padding:8px 22px">${dl}</div>
  </div>`;
}

/** Bibliographie §9 : sources effectivement citées dans le rapport, résolues depuis la stat-bank. */
function renderBibliography(report: PreRapportOutput): string {
  const citedIds = new Set<string>();
  for (const section of report.sections) {
    for (const id of section.sources_citees) citedIds.add(id);
  }
  const stats = [...citedIds]
    .map((id) => STAT_BY_ID.get(id))
    .filter((s): s is StatEntry => Boolean(s))
    .sort((a, b) => a.source.org.localeCompare(b.source.org) || a.source.year - b.source.year);
  if (stats.length === 0) return '';
  return `<section style="margin:0 0 26px">
    <h2 style="font-family:var(--serif);font-size:19px;font-weight:500;color:${BRAND.violet};margin:0 0 12px;padding-bottom:6px;border-bottom:1px solid ${BRAND.lineSoft}">Références citées</h2>
    <ul style="list-style:none;padding:0;margin:0">${stats.map(renderCitation).join('')}</ul>
  </section>`;
}

// --- Document complet ------------------------------------------------------

/**
 * Rend le document HTML complet du pré-rapport. Le résultat est autoportant
 * (styles inline + `<link>` Google Fonts) et destiné à `htmlToPdf`.
 */
export function renderReportHtml(report: PreRapportOutput, ctx: ReportRenderContext): string {
  const cover = renderCover(ctx);
  const sections = report.sections.map(renderSection).join('');
  const bibliography = renderBibliography(report);

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pré-rapport MIRA${ctx.nomEntreprise ? ` — ${esc(ctx.nomEntreprise)}` : ''}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --serif:"Newsreader",Georgia,"Times New Roman",serif;
    --sans:"Hanken Grotesk",system-ui,-apple-system,"Segoe UI",sans-serif;
  }
  @page{ size:A4; }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; }
  body{
    font-family:var(--sans);
    color:${BRAND.ink};
    font-size:13px;
    -webkit-print-color-adjust:exact;
    print-color-adjust:exact;
  }
  .doc{ padding:0 4mm; }
  .rgpd{
    margin-top:18px;
    padding-top:12px;
    border-top:1px solid ${BRAND.lineSoft};
    font-size:10.5px;
    line-height:1.5;
    color:${BRAND.ink3};
  }
</style>
</head>
<body>
  <div class="doc">
    ${cover}
    ${sections}
    ${bibliography}
    <div class="rgpd">${esc(RGPD_PDF_FOOTER)}</div>
  </div>
</body>
</html>`;
}
