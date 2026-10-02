/**
 * GABARIT HTML DU PRÉ-RAPPORT
 * ===========================
 *
 * `renderReportHtml(report, ctx)` transforme la sortie structurée du modèle
 * (`PreRapportOutput`) en un **document HTML autoportant** prêt à être imprimé en
 * PDF par Chromium (`netlify/functions/lib/pdf.ts`).
 *
 * Principes :
 *  - **Fonction pure, sans dépendance** (pas de React), testable au vitest.
 *  - **Zéro chiffre inventé au rendu** : on n'affiche que le texte de `report_json`.
 *    Les marqueurs `[[id]]` posés par le modèle deviennent des **appels de note
 *    numérotés**, et la section « Sources de référence » est construite ici, à
 *    partir de la stat-bank (cf. `reportCitations.ts`).
 *  - **Palette violet de la marque MIRA** centralisée dans `BRAND` (re-skinnable).
 *  - Polices de marque chargées via Google Fonts (le PDF est rendu avec accès réseau),
 *    avec une stack de secours système.
 *  - **Style de prose naturel** : aucun tiret cadratin ni point-virgule dans les
 *    textes codés en dur.
 *
 * Structure : page de garde (branding) → carte d'identité (page 2) → §0 → encart de
 * synthèse §1 → §2 à §8 (tableau récapitulatif en §3) → encart §8bis → méthode §9 →
 * « Sources de référence » → page de fin.
 *
 * Le gabarit ne lit pas la forme du modèle lui-même : chaque section passe par la
 * lecture (`reportLecture.ts`, `lireSection`), qui décide du titre d'affichage, de ce
 * qui s'imprime (le `contenu` d'une section à encart ne s'imprime pas), de la part de
 * tâches mise en forme et des appels de note à poser. Ici ne restent que la mise en
 * page, l'échappement et le style.
 */

import type { PreRapportOutput } from './reportSchema';
import type { ExpositionLevel } from './rapportStructure';
import { SOURCES_SECTION_TITLE, CONTACT_URL, COMMENT_UTILISER_CTA } from './rapportStructure';
import type { CitationIndex } from './reportCitations';
import { buildCitationIndex, tokenizeCitations, renderNoteText } from './reportCitations';
import { lireSection } from './reportLecture';
import type { LectureSection, Texte, BlocLu, EncartLu, FamilleLue } from './reportLecture';
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
  'MIRA est la plateforme d’accompagnement qui aide les organisations à anticiper, mesurer et piloter l’impact de l’IA sur leurs métiers et leurs compétences, du premier diagnostic jusqu’à la transformation. Ce pré-rapport offert applique l’état de l’art, recherche internationale de référence et données françaises, aux familles de métiers que vous avez déclarées, pour distinguer clairement ce qui s’automatise, ce qui s’augmente et ce qui se recompose. Chaque chiffre est sourcé. C’est une lecture externe, pas un audit de vos données internes. Voyez-le comme une invitation à un premier pas. La transformation commence par disposer des clés de lecture et se poser les bonnes questions, avant de passer à l’action.';

/**
 * Préfixe du bas de page répété sur chaque page du PDF (demande CEO). Le mois et
 * l’année du rapport sont ajoutés au moment du rendu (cf. `htmlToPdf` options.footer).
 * Style maison : séparateur « · » plutôt qu’un tiret.
 */
export const REPORT_PAGE_FOOTER_PREFIX =
  'MIRA Audit · Anticiper, mesurer et piloter l’impact de l’IA sur vos métiers et compétences';

/** Logo MIRA inliné (SVG autoportant, couleurs littérales pour le rendu PDF). */
const LOGO_SVG = `<svg width="30" height="30" viewBox="0 0 26 26" fill="none">
  <circle cx="13" cy="13" r="12" stroke="${BRAND.ink}" stroke-width="1.4" opacity=".25" />
  <circle cx="13" cy="13" r="3.4" fill="${BRAND.violet}" />
  <path d="M13 2.5 L15 11 L13 13 Z" fill="${BRAND.ink}" />
  <path d="M13 23.5 L11 15 L13 13 Z" fill="${BRAND.violet}" opacity=".5" />
</svg>`;

/** Couleur d'un niveau d'exposition (§3). */
function expositionColor(level: ExpositionLevel): string {
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
/** Échappe le texte (provient du modèle) avant insertion dans le HTML. */
function esc(input: string): string {
  return input.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

// --- Appels de note --------------------------------------------------------

/** Appel de note en exposant. Un id inconnu de la stat-bank n'affiche rien. */
function noteCall(n: number | undefined): string {
  if (n === undefined) return '';
  return `<sup style="font-size:8.5px;font-weight:600;color:${BRAND.violet};line-height:0">${n}</sup>`;
}

/**
 * Un texte lu : échappé, marqueurs `[[id]]` devenus appels de note numérotés, appel
 * rattaché (`source_id` sans marqueur dans le texte) posé en fin. C'est ici que la
 * traçabilité devient visible pour le lecteur.
 */
function prose(t: Texte, index: CitationIndex): string {
  const html = tokenizeCitations(t.texte)
    .map((tok) => (tok.type === 'text' ? esc(tok.value) : noteCall(index.numberById.get(tok.id))))
    .join('');
  return t.appelAjoute ? html + noteCall(index.numberById.get(t.appelAjoute)) : html;
}

// --- Blocs de contenu ------------------------------------------------------

/** Un bloc déjà nettoyé par la lecture : plus de paragraphe vide à filtrer. */
function renderBloc(bloc: BlocLu, index: CitationIndex): string {
  const titre = bloc.intertitre
    ? `<h3 style="font-size:14px;font-weight:600;color:${BRAND.violet700};margin:18px 0 6px">${prose(
        bloc.intertitre,
        index,
      )}</h3>`
    : '';
  const paras = bloc.paragraphes
    .map((p) => `<p style="margin:0 0 10px;line-height:1.6;color:${BRAND.ink}">${prose(p, index)}</p>`)
    .join('');
  return titre + paras;
}

// --- §1 : l'encart de synthèse exécutive -----------------------------------

/**
 * Encart de format fixe en première page : chapeau, chiffre-signal isolé, trois à
 * quatre points clés, puis les deux lignes figées injectées par le code (calibrage
 * et périmètre). Aucun chiffre neuf ici : tout vient déjà du corps du rapport. Les
 * appels de note à défaut de marqueur sont décidés par la lecture (`appelAjoute`).
 */
function renderEncart(encart: EncartLu, index: CitationIndex): string {
  const points = encart.points
    .map(
      (pt) => `<div style="padding:10px 0;border-top:1px solid ${BRAND.lineSoft}">
        <div style="font-size:12.5px;font-weight:600;color:${BRAND.violet700};margin:0 0 3px">${prose(
          pt.titre,
          index,
        )}</div>
        <div style="font-size:12.5px;line-height:1.55;color:${BRAND.ink}">${prose(pt.texte, index)}</div>
      </div>`,
    )
    .join('');

  return `<div style="border:1px solid ${BRAND.line};border-top:4px solid ${BRAND.violet};border-radius:14px;padding:18px 20px;background:${BRAND.bgSoft}">
    <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:${BRAND.ink}">${prose(
      encart.chapeau,
      index,
    )}</p>
    <div style="display:flex;align-items:baseline;gap:14px;padding:14px 16px;margin:0 0 12px;background:${BRAND.paper};border-radius:10px;border-left:4px solid ${BRAND.violet}">
      <span style="font-family:var(--serif);font-size:34px;font-weight:500;color:${BRAND.violet};line-height:1;white-space:nowrap">${prose(
        encart.signal.valeur,
        index,
      )}</span>
      <span style="font-size:13.5px;line-height:1.45;color:${BRAND.ink}">${prose(
        encart.signal.phrase,
        index,
      )}</span>
    </div>
    ${points}
    <p style="margin:14px 0 0;font-size:11px;line-height:1.5;color:${BRAND.ink3}">${esc(
      encart.calibrageCourt.texte,
    )}</p>
    <p style="margin:6px 0 0;font-size:11px;line-height:1.5;color:${BRAND.ink3}">${esc(
      encart.lignePerimetre.texte,
    )}</p>
  </div>`;
}

// --- §3 : les familles de métiers ------------------------------------------

/**
 * Carte de caractérisation d'une famille de métiers (§3). La part de tâches arrive
 * déjà mise en forme par la lecture : « des tâches » n'est accolé qu'à une part au
 * format court, une phrase écrite par le modèle s'affiche telle quelle (Q4).
 *
 * Le nom passe par `prose`, comme la valeur du chiffre-signal : un libellé est numéroté
 * par la lecture s'il porte un marqueur, donc il doit aussi le transformer en appel de
 * note. Aucun texte rendu ne laisse de marqueur brut au lecteur.
 */
function renderFamille(fam: FamilleLue, index: CitationIndex): string {
  const color = expositionColor(fam.exposition);
  const natures = fam.natures
    .map(
      (n) =>
        `<span style="display:inline-block;font-size:11px;color:${BRAND.violet700};background:${BRAND.violet100};border-radius:999px;padding:2px 9px;margin:0 6px 4px 0">${esc(natureLabel(n))}</span>`,
    )
    .join('');
  const part = fam.part ? `<span style="color:${BRAND.ink2}"> · ${esc(fam.part.affichage)}</span>` : '';
  return `<div style="border:1px solid ${BRAND.line};border-left:4px solid ${color};border-radius:10px;padding:14px 16px;margin:0 0 12px;background:${BRAND.paper}">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap">
      <strong style="font-size:14px;color:${BRAND.ink}">${prose(fam.nom, index)}</strong>
      <span style="font-size:12px;font-weight:600;color:${color}">Exposition ${esc(fam.exposition)}${part}</span>
    </div>
    <div style="margin:8px 0 4px">${natures}</div>
    <p style="margin:6px 0 0;line-height:1.55;color:${BRAND.ink}">${prose(fam.explication, index)}</p>
  </div>`;
}

/**
 * Tableau récapitulatif des familles (§3) : Famille / Exposition / Nature de l'impact.
 * Casse l'aspect textuel et donne une lecture « en un coup d'œil » avant les fiches.
 * Même règle que la fiche pour le nom : `prose`, jamais de marqueur brut.
 */
function renderRecapTable(familles: readonly FamilleLue[], index: CitationIndex): string {
  const th = `padding:7px 9px;border-bottom:2px solid ${BRAND.line};color:${BRAND.ink3};text-transform:uppercase;font-size:10px;letter-spacing:.04em;text-align:left`;
  const td = `padding:7px 9px;border-bottom:1px solid ${BRAND.lineSoft};vertical-align:top`;
  const rows = familles
    .map((f) => {
      const color = expositionColor(f.exposition);
      const natures = f.natures.map((n) => esc(natureLabel(n))).join(', ');
      return `<tr>
        <td style="${td};color:${BRAND.ink};font-weight:600">${prose(f.nom, index)}</td>
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

// --- §8bis : la prise de parole de MIRA ------------------------------------

/**
 * Encart §8bis « Comment utiliser ce rapport ». Visuellement encadré et distinct du
 * corps analytique : c'est une prise de parole de MIRA, pas une analyse. Le
 * « contactez-nous ! » de clôture est un lien.
 */
function renderEncadre(lecture: LectureSection): string {
  const paragraphes = lecture.blocs
    .flatMap((b) => b.paragraphes)
    .map((p) => {
      const isCta = p.texte.trim() === COMMENT_UTILISER_CTA;
      const html = isCta
        ? esc(p.texte).replace(
            esc('contactez-nous !'),
            `<a href="${CONTACT_URL}" style="color:${BRAND.violet};font-weight:600;text-decoration:underline">contactez-nous !</a>`,
          )
        : esc(p.texte);
      return `<p style="margin:0 0 10px;line-height:1.6;color:${BRAND.ink}${
        isCta ? ';font-weight:500' : ''
      }">${html}</p>`;
    })
    .join('');
  return `<section style="margin:0 0 26px;page-break-inside:avoid">
    <div style="border:1px solid ${BRAND.violet};border-radius:14px;padding:18px 20px;background:${BRAND.bgSoft}">
      <h2 style="font-family:var(--serif);font-size:18px;font-weight:500;color:${BRAND.violet};margin:0 0 12px">${esc(
        lecture.titre,
      )}</h2>
      ${paragraphes}
    </div>
  </section>`;
}

// --- Sections --------------------------------------------------------------

/**
 * Une section lue. Le titre est le titre canonique de la lecture (Q3 : « §6 · Le
 * facteur humain » une seule fois), et `blocs` est vide sous un encart (Q1 : la §1
 * ne s'imprime qu'une fois, même sur un `report_json` dont le `contenu` est rempli).
 */
function renderSection(lecture: LectureSection, index: CitationIndex): string {
  if (lecture.id === 'comment-utiliser') return renderEncadre(lecture);

  const prefix = lecture.numero !== null ? `§${lecture.numero} · ` : '';
  const recap = lecture.familles.length > 0 ? renderRecapTable(lecture.familles, index) : '';
  const familles =
    lecture.familles.length > 0
      ? `<div style="margin-top:14px">${lecture.familles.map((f) => renderFamille(f, index)).join('')}</div>`
      : '';
  const encart = lecture.encart ? renderEncart(lecture.encart, index) : '';
  return `<section style="margin:0 0 26px;page-break-inside:avoid">
    <h2 style="font-family:var(--serif);font-size:19px;font-weight:500;color:${BRAND.violet};margin:0 0 12px;padding-bottom:6px;border-bottom:1px solid ${BRAND.lineSoft}">
      <span style="font-size:13px;color:${BRAND.ink3};font-family:var(--sans)">${prefix}</span>${esc(lecture.titre)}
    </h2>
    ${encart}
    ${recap}
    ${lecture.blocs.map((b) => renderBloc(b, index)).join('')}
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
 * Section « Sources de référence », construite intégralement par le code à partir
 * des marqueurs du texte. Regroupement par section dans l'ordre d'apparition,
 * numérotation continue sur tout le rapport. Une entrée donne l'organisation,
 * l'année, la page, la formulation complète, le périmètre, et le cas échéant le
 * caractère de projection, la nature commerciale de la source et la recréditation
 * d'une donnée secondaire.
 */
function renderReferences(index: CitationIndex): string {
  if (index.groups.length === 0) return '';
  const groups = index.groups
    .map((g) => {
      // Titre canonique et numéro venus de la lecture : jamais « §6 · §6. … ».
      const titre = g.numero !== null ? `§${g.numero} · ${g.sectionTitle}` : g.sectionTitle;
      const items = g.notes
        .map(
          (note) => `<li style="margin:0 0 6px;line-height:1.5;color:${BRAND.ink2}">
            <span style="font-weight:600;color:${BRAND.violet}">${note.n}.</span> ${esc(
              renderNoteText(note.entry),
            )}
          </li>`,
        )
        .join('');
      return `<div style="margin:0 0 12px">
        <h3 style="font-size:11.5px;font-weight:600;color:${BRAND.ink3};text-transform:uppercase;letter-spacing:.04em;margin:0 0 6px">${esc(
          titre,
        )}</h3>
        <ul style="margin:0;padding:0;list-style:none;font-size:11.5px">${items}</ul>
      </div>`;
    })
    .join('');
  return `<section style="margin:0 0 26px">
    <h2 style="font-family:var(--serif);font-size:19px;font-weight:500;color:${BRAND.violet};margin:0 0 12px;padding-bottom:6px;border-bottom:1px solid ${BRAND.lineSoft}">${esc(
      SOURCES_SECTION_TITLE,
    )}</h2>
    ${groups}
  </section>`;
}

/**
 * Filigrane « Mira Audit » répété sur chaque page (demande CEO 10/07).
 * En impression Chromium, un élément `position:fixed` est re-peint sur chaque
 * page du PDF : c'est le seul moyen de couvrir toutes les pages sans connaître
 * les sauts de page à l'avance (vérifié sur PDF généré en local).
 * `z-index:10` le place AU-DESSUS du contenu : les cartes (§3, carte d'identité)
 * ont des fonds opaques qui l'occulteraient sinon ; à 5 % d'opacité il ne gêne
 * pas la lecture.
 */
function renderWatermark(): string {
  return `<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:10">
    <span style="font-family:var(--serif);font-size:92px;font-weight:500;letter-spacing:.08em;color:${BRAND.violet};opacity:.05;transform:rotate(-32deg);white-space:nowrap">MIRA AUDIT</span>
  </div>`;
}

/** Page de fin : transparence sur la génération par IA et mention RGPD. */
function renderClosing(): string {
  return `<div style="page-break-before:always;padding-top:30px">
    <h2 style="font-family:var(--serif);font-size:22px;font-weight:500;color:${BRAND.violet};margin:0 0 14px">Transparence et mentions</h2>
    <p style="font-size:13px;line-height:1.7;color:${BRAND.ink};margin:0 0 18px">Ce pré-rapport a été généré avec l’aide de l’intelligence artificielle, à partir de sources publiques de référence. Il constitue une lecture indicative et ne remplace pas un audit de vos données internes.</p>
    <div style="font-size:10.5px;line-height:1.5;color:${BRAND.ink3};border-top:1px solid ${BRAND.lineSoft};padding-top:12px">${esc(RGPD_PDF_FOOTER)}</div>
  </div>`;
}

// --- Document complet ------------------------------------------------------

/**
 * Rend le document HTML complet du pré-rapport. Le résultat est autoportant
 * (styles inline + `<link>` Google Fonts) et destiné à `htmlToPdf`.
 */
export function renderReportHtml(report: PreRapportOutput, ctx: ReportRenderContext): string {
  // La numérotation des notes suit l'ordre d'apparition dans le document : on la
  // calcule une fois, puis chaque marqueur devient un appel de note.
  const index = buildCitationIndex(report);
  const cover = renderCover(ctx);
  const identity = renderIdentity(ctx);
  const sections = report.sections.map((s) => renderSection(lireSection(s), index)).join('');
  const references = renderReferences(index);
  const closing = renderClosing();
  const watermark = renderWatermark();

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pré-rapport MIRA${ctx.nomEntreprise ? ` · ${esc(ctx.nomEntreprise)}` : ''}</title>
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
    ${references}
    ${closing}
  </div>
</body>
</html>`;
}
