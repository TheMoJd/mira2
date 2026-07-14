/**
 * GABARIT HTML DU PRÉ-DIAGNOSTIC (Tranche 4b + refonte CEO Tranche B + site v2 13/07)
 * ===================================================================================
 *
 * `renderReportHtml(report, ctx)` transforme la sortie structurée du LLM
 * (`PreRapportOutput`) en un **document HTML autoportant** prêt à être imprimé en
 * PDF par Chromium (`netlify/functions/lib/pdf.ts`).
 *
 * Principes :
 *  - **Fonction pure, sans dépendance** (pas de React) — testable au vitest.
 *  - **Zéro chiffre inventé au rendu** : on n'affiche que le texte de `report_json` ;
 *    les sources sont **résolues depuis `statbank`** par leur `id` (`sources_citees`).
 *  - **Palette violet de la marque MIRA** centralisée dans `BRAND` (re-skinnable).
 *  - Polices de marque chargées via Google Fonts (le PDF est rendu avec accès réseau),
 *    avec une stack de secours système.
 *  - **Style de prose naturel** : aucun tiret cadratin ni point-virgule dans les
 *    textes codés en dur (consigne CEO : éviter ce qui « fait IA »).
 *  - **Sources en fin de document uniquement** (retours CEO 13/07) : les références
 *    inline « (Organisation, année) » écrites par le LLM sont retirées au rendu
 *    (`stripSourceRefs`) ; la traçabilité complète reste dans `report_json` et
 *    dans la section « Sources mobilisées pour votre pré-diagnostic ».
 *
 * Structure (refonte CEO) : page de garde (branding) → carte d'identité (page 2) →
 * sections §0..§9 (avec tableau récapitulatif en §3) → sources allégées → page de fin.
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
  /** Catégorie INSEE (PME / ETI / GE) si connue. */
  categorieEntreprise?: string;
  /** Localisation du siège (ex. « Lyon (69) ») si connue. */
  localisation?: string;
  /** Libellés lisibles des familles déclarées (Q4). */
  famillesLabels: string[];
  /** Date du rapport, déjà formatée (ex. « 22 juin 2026 »). */
  dateRapport: string;
  /** Date de GÉNÉRATION en ISO 8601 : alimente `reportFooterText` côté web pour
   *  afficher le même mois/année que le PDF. Absente → date de consultation. */
  dateGeneration?: string;
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

/**
 * Slogan et proposition de valeur (texte CEO, adapté pour respecter la consigne de
 * style : ni tiret cadratin ni point-virgule). Réutilisés page de garde + intro fixe.
 */
export const SLOGAN = 'L’IA redessine la carte des compétences, MIRA donne la boussole.';
export const VALUE_PROP =
  'MIRA est votre pré-diagnostic d’exposition à l’IA de votre organisation. Ce pré-diagnostic offert applique l’état de l’art, recherche internationale de référence et données françaises, aux familles de métiers que vous avez déclarées, pour distinguer clairement ce qui s’automatise, ce qui s’augmente et ce qui se recompose. Chaque chiffre est sourcé. C’est une lecture externe, pas un audit de vos données internes. Voyez-le comme une invitation à un premier pas. La transformation commence par disposer des clés de lecture et se poser les bonnes questions, avant de passer à l’action.';

/**
 * Ligne de bas de page du document (retours CEO 13/07), répétée sur chaque page
 * par le `footerTemplate` Chromium (`lib/pdf.ts`). Le mois et l'année sont ceux
 * de la GÉNÉRATION (dynamiques), en français. Séparateurs « · », jamais de
 * tiret cadratin (règle CTO 13/07).
 */
export function reportFooterText(now: Date): string {
  const moisAnnee = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return `Mira audit · Anticiper, mesurer et piloter l’impact de l’IA sur vos métiers et compétences · ${moisAnnee}`;
}

/** Logo MIRA inliné (SVG autoportant, couleurs littérales pour le rendu PDF). */
const LOGO_SVG = `<svg width="30" height="30" viewBox="0 0 26 26" fill="none">
  <circle cx="13" cy="13" r="12" stroke="${BRAND.ink}" stroke-width="1.4" opacity=".25" />
  <circle cx="13" cy="13" r="3.4" fill="${BRAND.violet}" />
  <path d="M13 2.5 L15 11 L13 13 Z" fill="${BRAND.ink}" />
  <path d="M13 23.5 L11 15 L13 13 Z" fill="${BRAND.violet}" opacity=".5" />
</svg>`;

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

/** Libellé d'affichage d'une nature d'impact : « augmentation » devient « augmentation/hybridation ». */
function natureLabel(nature: string): string {
  return nature === 'augmentation' ? 'augmentation/hybridation' : nature;
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

// --- Retrait des références sources inline (retours CEO 13/07) --------------

/**
 * Organisations émettrices connues de la stat-bank (+ sources d'origine des
 * données secondaires) : servent à reconnaître une référence « (Org, année) »
 * écrite par le LLM. Le prompt (module verrouillé) impose ces citations inline ;
 * on les retire donc AU RENDU uniquement, la traçabilité restant intacte dans
 * `report_json.sections[].sources_citees` et la section « Sources mobilisées ».
 */
const KNOWN_ORGS: string[] = [
  ...new Set([
    ...statbank.flatMap((s) => {
      const orgs: string[] = [];
      const push = (raw?: string) => {
        const clean = raw?.trim();
        if (!clean) return;
        orgs.push(clean);
        // Alias de sigle : « Organisation internationale du travail (OIT) » → « OIT »
        // et « Organisation internationale du travail » (le LLM cite l'une ou l'autre forme).
        const alias = /\(([^()]+)\)/.exec(clean)?.[1]?.trim();
        if (alias) orgs.push(alias);
        const sansAlias = clean.replace(/\s*\([^()]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
        if (sansAlias && sansAlias !== clean) orgs.push(sansAlias);
      };
      push(s.source.org);
      // « Crédoc · Baromètre du Numérique 2025 » → l'organisation est le 1er segment.
      push(s.source.originalSource?.split(/[·—]/)[0]);
      return orgs;
    }),
    // Alias courts que le LLM emploie spontanément : le nom exact de la
    // stat-bank ne suffit pas (« (WEF, 2025) », « (DARES, 2022) »…).
    'WEF', 'ILO', 'OIT', 'OCDE', 'OECD', 'MIT', 'PwC', 'McKinsey', 'Indeed',
    'Stanford HAI', 'Stanford AI Index', 'HAI', 'DARES', 'France Stratégie',
    'CIANum', 'CEGOS', 'Parlons RH', 'Neobrain', 'Sopra Steria', 'Crédoc',
  ]),
];

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Motifs « organisation » bornés par des non-lettres : un alias court ne doit
 *  pas matcher À L'INTÉRIEUR d'un mot français (« OIT » dans « droit », « HAI »
 *  dans « souhait »). Insensibles à la casse (le LLM écrit parfois « wef »). */
const ORG_RES: RegExp[] = KNOWN_ORGS.map(
  (org) => new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegExp(org)}(?:[^\\p{L}\\p{N}]|$)`, 'iu'),
);

/** Segment d'année de citation : « 2025 », « 2024b ». */
const YEAR_SEG_RE = /^(?:19|20)\d{2}[ab]?$/;

/** Segment « page » d'une citation : « p.11 », « pp. 4-5 », « page 12 ».
 *  Toléré dans la queue de citation (le LLM recopie parfois la page de la
 *  stat-bank), mais JAMAIS suffisant : la validité exige année + organisation. */
function isPageSegment(seg: string): boolean {
  return /^p(?:ages?|p)?\.?\s?\d+([-–]\d+)?$/i.test(seg);
}

/** Un segment de parenthèse est « organisation » s'il est court et nomme une
 *  organisation connue, ou s'il recrédite une source (« citée par X »). */
function isOrgSegment(seg: string): boolean {
  if (/cit[ée]e?s? par/i.test(seg)) return true;
  if (seg.split(/\s+/).length > 6) return false;
  return ORG_RES.some((re) => re.test(seg));
}

/**
 * Retire d'un texte LLM les parenthèses de référence source, ex.
 * « (World Economic Forum, 2025) », « (WEF, 2025) », « (WEF 2025) » ou
 * « (Crédoc, citée par Parlons RH, 2025, p.11) ». Analyse par segments
 * (virgules) depuis la fin :
 *  - parenthèse entièrement faite d'organisations/années/pages → supprimée
 *    (les pages sont tolérées en queue, jamais suffisantes) ;
 *  - parenthèse MIXTE « (83 %, Parlons RH, 2025) » → seule la queue de citation
 *    part, la donnée reste : « (83 %) » (un rapport chiffré ne perd jamais ses
 *    nombres) ;
 *  - « Selon (OCDE, 2024), … » → conservée (le retrait casserait la phrase) ;
 *  - parenthèses de contenu « (83 %) », « (EPP 2026) », caveats longs → intactes.
 * Le motif tolère un niveau d'imbrication (« (Organisation internationale du
 * travail (OIT), 2023) »).
 */
export function stripSourceRefs(text: string): string {
  return text
    .replace(
      /([^\s(]*)\s*\(((?:[^()]|\([^()]*\)){0,160}?)\)/g,
      (whole, avant: string, inner: string) => {
        // « Selon (OCDE, 2024), … » : retirer la référence casserait la phrase.
        if (/^(?:selon|d[’']après)[:,]?$/i.test(avant)) return whole;
        const segments = inner
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (segments.length === 0) return whole;
        // Citation sans virgule « (WEF 2025) » : segment unique qui se termine
        // par une année, court et nommant une organisation connue → citation
        // pure, supprimée. Sans organisation (« (estimations pour 2030) »,
        // « (réforme prévue pour 2026) »), la parenthèse reste intacte.
        if (segments.length === 1) {
          const seul = segments[0];
          const citation =
            /(?:19|20)\d{2}[ab]?$/.test(seul) &&
            seul.split(/\s+/).length <= 7 &&
            ORG_RES.some((re) => re.test(seul));
          return citation ? avant : whole;
        }
        // Queue de citation : on remonte depuis la fin tant que le segment est
        // une année, une organisation connue ou une page (« p.11 »).
        let cut = segments.length;
        while (
          cut > 0 &&
          (YEAR_SEG_RE.test(segments[cut - 1]) || isOrgSegment(segments[cut - 1]) || isPageSegment(segments[cut - 1]))
        )
          cut -= 1;
        const tail = segments.slice(cut);
        if (!tail.some((s) => YEAR_SEG_RE.test(s)) || !tail.some((s) => isOrgSegment(s))) {
          return whole; // pas une référence : il faut année ET organisation en queue
        }
        if (cut === 0) return avant; // parenthèse = pure citation → supprimée
        return `${avant} (${segments.slice(0, cut).join(', ')})`; // mixte → la donnée survit
      },
    )
    // Typographie française : « ... » tapés par le LLM → « … », AVANT les
    // nettoyages d'artefacts (le collapse de points ci-dessous les mangerait).
    .replace(/\.{3}/g, '…')
    .replace(/ {2,}/g, ' ')
    .replace(/\s+([.,])/g, '$1')
    // Artefacts de retrait : « augmente. (WEF, 2025). » → « augmente.. »,
    // « texte, (OCDE, 2024), suite » → « texte,, suite ».
    .replace(/,(\s*,)+/g, ',')
    .replace(/,\s*\./g, '.')
    .replace(/\.( *\.)+/g, '.')
    .trim();
}

/**
 * Prose LLM prête à afficher : filet de renommage hérité PUIS retrait des
 * références. Le SYSTEM_PROMPT dit désormais « pré-diagnostic » (corrigé en
 * 599e145) ; le filet reste en ceinture pour (a) les `report_json` historiques
 * générés avec l'ancien prompt et re-rendus tels quels, et (b) une éventuelle
 * désobéissance du modèle qui écrirait encore « pré-rapport » dans la prose.
 */
export function prepareProse(text: string): string {
  return stripSourceRefs(
    text.replace(/pré-rapport/giu, (m) => (m.startsWith('P') ? 'Pré-diagnostic' : 'pré-diagnostic')),
  );
}

// --- Blocs de contenu ------------------------------------------------------

function renderBloc(bloc: ReportBloc): string {
  const titre = bloc.intertitre
    ? `<h3 style="font-size:14px;font-weight:600;color:${BRAND.violet700};margin:18px 0 6px">${esc(
        prepareProse(bloc.intertitre),
      )}</h3>`
    : '';
  const paras = bloc.paragraphes
    .map((p) => prepareProse(p))
    // La sanitisation de style (reportSanitize) peut vider une chaîne réduite à
    // un tiret : ne pas rendre de <p> vide.
    .filter((p) => p.trim() !== '')
    .map((p) => `<p style="margin:0 0 10px;line-height:1.6;color:${BRAND.ink}">${esc(p)}</p>`)
    .join('');
  return titre + paras;
}

/**
 * Carte de caractérisation d'une famille de métiers (§3).
 * NB (retours CEO 13/07) : le niveau de confiance (`fam.confiance`) reste dans le
 * JSON du rapport (traçabilité) mais n'est PLUS affiché dans le document.
 */
function renderFamille(fam: ReportFamille): string {
  const color = expositionColor(fam.exposition);
  const natures = fam.natures
    .map(
      (n) =>
        `<span style="display:inline-block;font-size:11px;color:${BRAND.violet700};background:${BRAND.violet100};border-radius:999px;padding:2px 9px;margin:0 6px 4px 0">${esc(natureLabel(n))}</span>`,
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
    <p style="margin:6px 0 0;line-height:1.55;color:${BRAND.ink}">${esc(prepareProse(fam.explication))}</p>
    ${transpo}
  </div>`;
}

/**
 * Tableau récapitulatif des familles (§3) : Famille / Exposition / Nature de l'impact.
 * Casse l'aspect textuel et donne une lecture « en un coup d'œil » avant les fiches.
 */
function renderRecapTable(familles: ReportFamille[]): string {
  const th = `padding:7px 9px;border-bottom:2px solid ${BRAND.line};color:${BRAND.ink3};text-transform:uppercase;font-size:10px;letter-spacing:.04em;text-align:left`;
  const td = `padding:7px 9px;border-bottom:1px solid ${BRAND.lineSoft};vertical-align:top`;
  const rows = familles
    .map((f) => {
      const color = expositionColor(f.exposition);
      const natures = f.natures.map((n) => esc(natureLabel(n))).join(', ');
      return `<tr>
        <td style="${td};color:${BRAND.ink};font-weight:600">${esc(f.famille)}</td>
        <td style="${td};color:${color};font-weight:600;white-space:nowrap">${esc(f.exposition)}</td>
        <td style="${td};color:${BRAND.ink2}">${natures}</td>
      </tr>`;
    })
    .join('');
  return `<div style="margin:6px 0 16px">
    <h3 style="font-size:13px;font-weight:600;color:${BRAND.violet700};margin:0 0 8px">En un coup d’œil</h3>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr>
        <th style="${th}">Famille de métiers</th>
        <th style="${th}">Exposition</th>
        <th style="${th}">Nature de l’impact</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function renderSection(section: ReportSectionOutput): string {
  const num = SECTION_NUM_BY_ID.get(section.id);
  const prefix = num !== undefined ? `§${num} · ` : '';
  const hasFamilles = section.familles && section.familles.length > 0;
  const recap = hasFamilles ? renderRecapTable(section.familles!) : '';
  const familles = hasFamilles
    ? `<div style="margin-top:14px">${section.familles!.map(renderFamille).join('')}</div>`
    : '';
  return `<section style="margin:0 0 26px;page-break-inside:avoid">
    <h2 style="font-family:var(--serif);font-size:19px;font-weight:500;color:${BRAND.violet};margin:0 0 12px;padding-bottom:6px;border-bottom:1px solid ${BRAND.lineSoft}">
      <span style="font-size:13px;color:${BRAND.ink3};font-family:var(--sans)">${prefix}</span>${esc(prepareProse(section.titre))}
    </h2>
    ${recap}
    ${section.contenu.map(renderBloc).join('')}
    ${familles}
  </section>`;
}

// --- Page de garde (branding) + carte d'identité (page 2) ------------------

/** Page 1 : branding. Logo, titre, slogan, proposition de valeur (intro fixe). */
function renderCover(ctx: ReportRenderContext): string {
  const cible = ctx.nomEntreprise
    ? `<p style="font-size:14px;color:${BRAND.ink3};margin:22px 0 0">Préparé pour ${esc(ctx.nomEntreprise)} · ${esc(
        ctx.dateRapport,
      )}</p>`
    : `<p style="font-size:14px;color:${BRAND.ink3};margin:22px 0 0">${esc(ctx.dateRapport)}</p>`;
  return `<div style="page-break-after:always;min-height:235mm;display:flex;flex-direction:column;justify-content:center">
    <div style="display:flex;align-items:center;gap:11px;margin-bottom:30px">
      ${LOGO_SVG}
      <span style="font-family:var(--serif);font-size:28px;font-weight:500;letter-spacing:.02em;color:${BRAND.ink}">MIRA</span>
    </div>
    <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:${BRAND.violet};font-weight:600">Votre pré-diagnostic</div>
    <h1 style="font-family:var(--serif);font-size:40px;font-weight:500;color:${BRAND.ink};line-height:1.12;margin:12px 0 16px;max-width:560px">L’exposition de vos métiers à l’intelligence artificielle</h1>
    <p style="font-family:var(--serif);font-size:18px;font-style:italic;color:${BRAND.violet700};line-height:1.5;margin:0 0 26px;max-width:520px">${SLOGAN}</p>
    <p style="font-size:14.5px;line-height:1.7;color:${BRAND.ink2};max-width:560px;margin:0">${VALUE_PROP}</p>
    ${cible}
  </div>`;
}

/** Page 2 : carte d'identité de l'entreprise analysée. */
function renderIdentity(ctx: ReportRenderContext): string {
  const rows: [string, string | undefined][] = [
    ['Entreprise', ctx.nomEntreprise],
    ['Secteur déclaré', ctx.secteurDeclare],
    ['Secteur normalisé (NAF)', ctx.nafLibelle ? `${ctx.nafLibelle}${ctx.nafCode ? ` [${ctx.nafCode}]` : ''}` : undefined],
    ['Catégorie', ctx.categorieEntreprise],
    ['Effectif', ctx.effectifTranche],
    ['Localisation', ctx.localisation],
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
  return `<div style="page-break-after:always;padding-top:30px">
    <h2 style="font-family:var(--serif);font-size:22px;font-weight:500;color:${BRAND.violet};margin:0 0 14px">Carte d’identité</h2>
    <div style="background:${BRAND.bgSoft};border:1px solid ${BRAND.line};border-radius:14px;padding:8px 22px">${dl}</div>
  </div>`;
}

/**
 * Section « Sources mobilisées pour votre pré-diagnostic » (refonte CEO B5 +
 * retours 13/07) : seule trace visible des sources dans le document. On ne
 * conserve que les titres des documents mobilisés (organisation + année),
 * dédupliqués, sans l'appareil de références détaillé qui prenait plusieurs pages.
 */
function renderSources(report: PreRapportOutput): string {
  const citedIds = new Set<string>();
  for (const section of report.sections) {
    for (const id of section.sources_citees) citedIds.add(id);
  }
  const seen = new Set<string>();
  const titres: string[] = [];
  [...citedIds]
    .map((id) => STAT_BY_ID.get(id))
    .filter((s): s is StatEntry => Boolean(s))
    .sort((a, b) => a.source.org.localeCompare(b.source.org) || a.source.year - b.source.year)
    .forEach((s) => {
      const titre = `${s.source.org}, ${s.source.year}`;
      if (!seen.has(titre)) {
        seen.add(titre);
        titres.push(titre);
      }
    });
  if (titres.length === 0) return '';
  const items = titres
    .map((t) => `<li style="margin:0 0 5px;line-height:1.5;color:${BRAND.ink2}">${esc(t)}</li>`)
    .join('');
  return `<section style="margin:0 0 26px;page-break-inside:avoid">
    <h2 style="font-family:var(--serif);font-size:19px;font-weight:500;color:${BRAND.violet};margin:0 0 12px;padding-bottom:6px;border-bottom:1px solid ${BRAND.lineSoft}">Sources mobilisées pour votre pré-diagnostic</h2>
    <ul style="margin:0;padding:0 0 0 18px;font-size:12.5px">${items}</ul>
  </section>`;
}

/**
 * Filigrane « mira-audit.fr » répété sur chaque page (demande CEO 10/07,
 * texte revu retours 13/07 : mauve léger = violet de la palette à faible opacité).
 * En impression Chromium, un élément `position:fixed` est re-peint sur chaque
 * page du PDF : c'est le seul moyen de couvrir toutes les pages sans connaître
 * les sauts de page à l'avance (vérifié sur PDF généré en local).
 * `z-index:10` le place AU-DESSUS du contenu : les cartes (§3, carte d'identité)
 * ont des fonds opaques qui l'occulteraient sinon ; à 5 % d'opacité il ne gêne
 * pas la lecture. ⚠️ Ne pas retirer `position:fixed` ni le `z-index`.
 */
function renderWatermark(): string {
  return `<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:10">
    <span style="font-family:var(--serif);font-size:84px;font-weight:500;letter-spacing:.06em;color:${BRAND.violet};opacity:.05;transform:rotate(-32deg);white-space:nowrap">mira-audit.fr</span>
  </div>`;
}

/** Page de fin : transparence sur la génération par IA et mention RGPD. */
function renderClosing(): string {
  return `<div style="page-break-before:always;padding-top:30px">
    <h2 style="font-family:var(--serif);font-size:22px;font-weight:500;color:${BRAND.violet};margin:0 0 14px">Transparence et mentions</h2>
    <p style="font-size:13px;line-height:1.7;color:${BRAND.ink};margin:0 0 18px">Ce pré-diagnostic a été généré avec l’aide de l’intelligence artificielle, à partir de sources publiques de référence. Il constitue une lecture indicative et ne remplace pas un audit de vos données internes.</p>
    <div style="font-size:10.5px;line-height:1.5;color:${BRAND.ink3};border-top:1px solid ${BRAND.lineSoft};padding-top:12px">${esc(RGPD_PDF_FOOTER)}</div>
  </div>`;
}

// --- Document complet ------------------------------------------------------

/**
 * Rend le document HTML complet du pré-diagnostic. Le résultat est autoportant
 * (styles inline + `<link>` Google Fonts) et destiné à `htmlToPdf`.
 */
export function renderReportHtml(report: PreRapportOutput, ctx: ReportRenderContext): string {
  const cover = renderCover(ctx);
  const identity = renderIdentity(ctx);
  const sections = report.sections.map(renderSection).join('');
  const sources = renderSources(report);
  const closing = renderClosing();
  const watermark = renderWatermark();

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pré-diagnostic MIRA${ctx.nomEntreprise ? ` · ${esc(ctx.nomEntreprise)}` : ''}</title>
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
  /* En impression A4, la largeur imprimable (~182 mm) est < max-width → aucun effet
     sur le PDF. Hors impression (HTML ouvert dans un navigateur), borne la largeur
     pour que le document reste lisible et centré, fidèle au rendu A4. */
  .doc{ max-width:190mm; margin:0 auto; padding:0 4mm; }
</style>
</head>
<body>
  ${watermark}
  <div class="doc" style="position:relative">
    ${cover}
    ${identity}
    ${sections}
    ${sources}
    ${closing}
  </div>
</body>
</html>`;
}
