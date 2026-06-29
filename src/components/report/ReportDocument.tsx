/**
 * ReportDocument — rendu web responsive du pré-rapport (phase 1)
 * =============================================================
 * Rend la sortie structurée du LLM (`PreRapportOutput`) en React, pour la page
 * `/rapport/:leadId`. Pendant compatible web de `reportHtml.ts` (qui, lui, vise le
 * PDF print A4) : mobile-friendly, aux tokens de marque de `globals.css`.
 *
 * Imports type-only pour `PreRapportOutput`/`ReportRenderContext` → zod/openai ne
 * partent jamais dans le bundle client. Seules les données pures (`statbank`,
 * `reportSections`, RGPD) sont importées au runtime.
 */
import type { CSSProperties } from 'react';
import type { PreRapportOutput, ReportSectionOutput, ReportBloc, ReportFamille } from '../../data/reportSchema';
import type { ReportRenderContext } from '../../data/reportHtml';
import { reportSections } from '../../data/rapportStructure';
import { statbank } from '../../data/statbank';
import type { StatEntry } from '../../data/statbank';
import { RGPD_PDF_FOOTER } from '../../data/rgpd';

interface ReportDocumentProps {
  report: PreRapportOutput;
  context: ReportRenderContext;
}

const SECTION_NUM_BY_ID = new Map(reportSections.map((s) => [s.id, s.num]));
const STAT_BY_ID = new Map(statbank.map((s) => [s.id, s]));

/** Couleur d'un niveau d'exposition (§3). */
function expositionColor(level: ReportFamille['exposition']): string {
  switch (level) {
    case 'élevée':
      return 'var(--risk)';
    case 'modérée':
      return 'var(--amber)';
    case 'faible':
      return 'var(--opp)';
    default:
      return 'var(--ink-3)'; // « à confirmer »
  }
}

/** Libellé d'affichage d'une nature d'impact : « augmentation » → « augmentation/hybridation ». */
const natureLabel = (nature: string): string =>
  nature === 'augmentation' ? 'augmentation/hybridation' : nature;

const serif: CSSProperties = { fontFamily: 'var(--serif, Georgia, "Times New Roman", serif)' };

function Cover({ context: c }: { context: ReportRenderContext }) {
  const rows: [string, string | undefined][] = [
    ['Entreprise', c.nomEntreprise],
    ['Secteur déclaré', c.secteurDeclare],
    ['Secteur normalisé (NAF)', c.nafLibelle ? `${c.nafLibelle}${c.nafCode ? ` [${c.nafCode}]` : ''}` : undefined],
    ['Catégorie', c.categorieEntreprise],
    ['Effectif', c.effectifTranche],
    ['Localisation', c.localisation],
    ['Familles de métiers analysées', c.famillesLabels.join(', ') || undefined],
    ['Date du rapport', c.dateRapport],
  ];
  return (
    <header style={{ marginBottom: 36 }}>
      <div className="kicker" style={{ color: 'var(--violet)', fontSize: 12, marginBottom: 12 }}>
        MIRA · Pré-rapport
      </div>
      <h1 style={{ ...serif, fontSize: 'clamp(26px,5vw,34px)', fontWeight: 500, color: 'var(--ink)', lineHeight: 1.15, margin: '0 0 12px' }}>
        L’impact de l’IA sur vos familles de métiers
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: 560, margin: '0 0 24px' }}>
        Diagnostic gratuit appliquant l’état de l’art public aux métiers que vous avez déclarés. Chaque chiffre est sourcé ;
        aucune donnée interne de votre entreprise n’est utilisée.
      </p>
      <dl style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 'var(--r, 14px)', padding: '4px 18px', margin: 0 }}>
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 14px', padding: '9px 0', borderBottom: '1px solid var(--line-soft)' }}>
              <dt style={{ flex: '0 0 190px', fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{k}</dt>
              <dd style={{ flex: '1 1 200px', margin: 0, fontSize: 14, color: 'var(--ink)' }}>{v}</dd>
            </div>
          ))}
      </dl>
    </header>
  );
}

function Bloc({ bloc }: { bloc: ReportBloc }) {
  return (
    <>
      {bloc.intertitre && (
        <h3 style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--violet-700)', margin: '18px 0 6px' }}>{bloc.intertitre}</h3>
      )}
      {bloc.paragraphes.map((p, i) => (
        <p key={i} style={{ margin: '0 0 10px', lineHeight: 1.65, color: 'var(--ink)', fontSize: 15 }}>
          {p}
        </p>
      ))}
    </>
  );
}

function FamilleCard({ fam }: { fam: ReportFamille }) {
  const color = expositionColor(fam.exposition);
  return (
    <div style={{ border: '1px solid var(--line)', borderLeft: `4px solid ${color}`, borderRadius: 10, padding: '14px 16px', margin: '0 0 12px', background: 'var(--paper)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 15, color: 'var(--ink)' }}>{fam.famille}</strong>
        <span style={{ fontSize: 12.5, fontWeight: 600, color }}>
          Exposition {fam.exposition}
          {fam.part_taches ? <span style={{ color: 'var(--ink-2)' }}> · {fam.part_taches} des tâches</span> : null}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0 4px' }}>
        {fam.natures.map((n) => (
          <span key={n} style={{ fontSize: 11.5, color: 'var(--violet-700)', background: 'var(--violet-100)', borderRadius: 999, padding: '2px 10px' }}>
            {natureLabel(n)}
          </span>
        ))}
      </div>
      <p style={{ margin: '6px 0 0', lineHeight: 1.55, color: 'var(--ink)', fontSize: 14.5 }}>{fam.explication}</p>
      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 6 }}>Confiance : {fam.confiance}</div>
      {!fam.transposable_france && (
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 6, fontStyle: 'italic' }}>
          Donnée non directement transposable à une PME française.
        </div>
      )}
    </div>
  );
}

function Section({ section }: { section: ReportSectionOutput }) {
  const num = SECTION_NUM_BY_ID.get(section.id);
  return (
    <section style={{ margin: '0 0 28px' }}>
      <h2 style={{ ...serif, fontSize: 'clamp(18px,3.5vw,20px)', fontWeight: 500, color: 'var(--violet)', margin: '0 0 12px', paddingBottom: 6, borderBottom: '1px solid var(--line-soft)' }}>
        {num !== undefined && (
          <span style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--sans, sans-serif)' }}>§{num} · </span>
        )}
        {section.titre}
      </h2>
      {section.contenu.map((b, i) => (
        <Bloc key={i} bloc={b} />
      ))}
      {section.familles && section.familles.length > 0 && (
        <div style={{ marginTop: 14 }}>
          {section.familles.map((f, i) => (
            <FamilleCard key={i} fam={f} />
          ))}
        </div>
      )}
    </section>
  );
}

function Citation({ stat }: { stat: StatEntry }) {
  const origin =
    stat.provenance === 'secondaire' && stat.source.originalSource
      ? ` — source d’origine : ${stat.source.originalSource}, citée par ${stat.source.org}`
      : '';
  const flags = [stat.projection ? 'projection' : null, `périmètre ${stat.scope}`].filter(Boolean).join(' · ');
  return (
    <li style={{ margin: '0 0 10px', lineHeight: 1.5 }}>
      <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{stat.claim}</span>
      <span style={{ color: 'var(--ink-2)' }}>
        {' '}
        ({stat.source.org}, {stat.source.year}
        {stat.source.page ? `, ${stat.source.page}` : ''}){origin}
      </span>
      <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
        [{stat.id}] {flags}
      </span>
    </li>
  );
}

function Bibliography({ report }: { report: PreRapportOutput }) {
  const citedIds = new Set<string>();
  for (const s of report.sections) for (const id of s.sources_citees) citedIds.add(id);
  const stats = [...citedIds]
    .map((id) => STAT_BY_ID.get(id))
    .filter((s): s is StatEntry => Boolean(s))
    .sort((a, b) => a.source.org.localeCompare(b.source.org) || a.source.year - b.source.year);
  if (stats.length === 0) return null;
  return (
    <section style={{ margin: '0 0 28px' }}>
      <h2 style={{ ...serif, fontSize: 'clamp(18px,3.5vw,20px)', fontWeight: 500, color: 'var(--violet)', margin: '0 0 12px', paddingBottom: 6, borderBottom: '1px solid var(--line-soft)' }}>
        Références citées
      </h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {stats.map((s) => (
          <Citation key={s.id} stat={s} />
        ))}
      </ul>
    </section>
  );
}

export default function ReportDocument({ report, context }: ReportDocumentProps) {
  return (
    <article style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(20px,4vw,40px) clamp(16px,4vw,28px)', overflowWrap: 'anywhere' }}>
      <Cover context={context} />
      {report.sections.map((s) => (
        <Section key={s.id} section={s} />
      ))}
      <Bibliography report={report} />
      <p style={{ marginTop: 18, paddingTop: 12, borderTop: '1px solid var(--line-soft)', fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-3)' }}>
        {RGPD_PDF_FOOTER}
      </p>
    </article>
  );
}
