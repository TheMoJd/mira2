/**
 * ReportDocument — rendu web responsive du pré-rapport (phase 1)
 * =============================================================
 * Rend la sortie structurée du LLM (`PreRapportOutput`) en React, pour la page
 * `/rapport/:leadId`. Pendant compatible web de `reportHtml.ts` (qui, lui, vise le
 * PDF print A4) : mobile-friendly, aux tokens de marque de `globals.css`.
 *
 * Toute modif de contenu/structure doit rester en phase avec `reportHtml.ts`
 * (page de garde, carte d'identité, tableau récap, sources allégées, page de fin).
 * Le slogan et la proposition de valeur sont importés depuis `reportHtml.ts`
 * (source unique). Style : pas de tiret cadratin ni de point-virgule (consigne CEO).
 *
 * Imports type-only pour `PreRapportOutput`/`ReportRenderContext` → zod/openai ne
 * partent jamais dans le bundle client. Seules les données pures (`statbank`,
 * `reportSections`, RGPD, copie de marque) sont importées au runtime.
 */
import type { CSSProperties } from 'react';
import type { PreRapportOutput, ReportSectionOutput, ReportBloc, ReportFamille } from '../../data/reportSchema';
import type { ReportRenderContext } from '../../data/reportHtml';
import { SLOGAN, VALUE_PROP } from '../../data/reportHtml';
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
const sectionTitle: CSSProperties = {
  ...serif,
  fontSize: 'clamp(18px,3.5vw,20px)',
  fontWeight: 500,
  color: 'var(--violet)',
  margin: '0 0 12px',
  paddingBottom: 6,
  borderBottom: '1px solid var(--line-soft)',
};

/** Page de garde (branding) : logo, titre, slogan, proposition de valeur (intro fixe). */
function Cover() {
  return (
    <header style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 22 }}>
        <svg width="30" height="30" viewBox="0 0 26 26" fill="none" aria-hidden="true">
          <circle cx="13" cy="13" r="12" stroke="var(--ink)" strokeWidth="1.4" opacity=".25" />
          <circle cx="13" cy="13" r="3.4" fill="var(--violet)" />
          <path d="M13 2.5 L15 11 L13 13 Z" fill="var(--ink)" />
          <path d="M13 23.5 L11 15 L13 13 Z" fill="var(--violet)" opacity=".5" />
        </svg>
        <span style={{ ...serif, fontSize: 26, fontWeight: 500, letterSpacing: '.02em', color: 'var(--ink)' }}>MIRA</span>
      </div>
      <div className="kicker" style={{ color: 'var(--violet)', fontSize: 12, marginBottom: 10 }}>
        Votre pré-diagnostic
      </div>
      <h1 style={{ ...serif, fontSize: 'clamp(26px,5vw,38px)', fontWeight: 500, color: 'var(--ink)', lineHeight: 1.14, margin: '0 0 14px' }}>
        L’exposition de vos métiers à l’intelligence artificielle
      </h1>
      <p style={{ ...serif, fontSize: 'clamp(16px,3vw,18px)', fontStyle: 'italic', color: 'var(--violet-700)', lineHeight: 1.5, margin: '0 0 22px' }}>
        {SLOGAN}
      </p>
      <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink-2)', margin: 0 }}>{VALUE_PROP}</p>
    </header>
  );
}

/** Carte d'identité de l'entreprise analysée (page 2 du PDF, bloc dédié en web). */
function Identity({ context: c }: { context: ReportRenderContext }) {
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
    <section style={{ margin: '0 0 32px' }}>
      <h2 style={sectionTitle}>Carte d’identité</h2>
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
    </section>
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

/** Tableau récapitulatif des familles (§3) : Famille / Exposition / Nature de l'impact. */
function RecapTable({ familles }: { familles: ReportFamille[] }) {
  const th: CSSProperties = {
    padding: '7px 9px',
    borderBottom: '2px solid var(--line)',
    color: 'var(--ink-3)',
    textTransform: 'uppercase',
    fontSize: 10.5,
    letterSpacing: '.04em',
    textAlign: 'left',
  };
  const td: CSSProperties = { padding: '7px 9px', borderBottom: '1px solid var(--line-soft)', verticalAlign: 'top' };
  return (
    <div style={{ margin: '6px 0 16px' }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--violet-700)', margin: '0 0 8px' }}>En un coup d’œil</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={th}>Famille de métiers</th>
              <th style={th}>Exposition</th>
              <th style={th}>Nature de l’impact</th>
            </tr>
          </thead>
          <tbody>
            {familles.map((f, i) => (
              <tr key={i}>
                <td style={{ ...td, color: 'var(--ink)', fontWeight: 600 }}>{f.famille}</td>
                <td style={{ ...td, color: expositionColor(f.exposition), fontWeight: 600, whiteSpace: 'nowrap' }}>{f.exposition}</td>
                <td style={{ ...td, color: 'var(--ink-2)' }}>{f.natures.map(natureLabel).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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
  const hasFamilles = section.familles && section.familles.length > 0;
  return (
    <section style={{ margin: '0 0 28px' }}>
      <h2 style={sectionTitle}>
        {num !== undefined && (
          <span style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--sans, sans-serif)' }}>§{num} · </span>
        )}
        {section.titre}
      </h2>
      {hasFamilles && <RecapTable familles={section.familles!} />}
      {section.contenu.map((b, i) => (
        <Bloc key={i} bloc={b} />
      ))}
      {hasFamilles && (
        <div style={{ marginTop: 14 }}>
          {section.familles!.map((f, i) => (
            <FamilleCard key={i} fam={f} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Section « Sources » allégée (refonte CEO B5) : titres des documents mobilisés
 * (organisation + année), dédupliqués, sans l'appareil de références détaillé.
 */
function Sources({ report }: { report: PreRapportOutput }) {
  const citedIds = new Set<string>();
  for (const s of report.sections) for (const id of s.sources_citees) citedIds.add(id);
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
  if (titres.length === 0) return null;
  return (
    <section style={{ margin: '0 0 28px' }}>
      <h2 style={sectionTitle}>Sources mobilisées</h2>
      <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13 }}>
        {titres.map((t) => (
          <li key={t} style={{ margin: '0 0 5px', lineHeight: 1.5, color: 'var(--ink-2)' }}>
            {t}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Page de fin : transparence IA + lien MIRA (placeholders légal Victor / domaine). */
function Closing() {
  return (
    <section style={{ margin: '0 0 8px' }}>
      <h2 style={sectionTitle}>Transparence et mentions</h2>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink)', margin: '0 0 12px' }}>
        Ce pré-rapport a été généré avec l’aide de l’intelligence artificielle, à partir de sources publiques de
        référence. Il constitue une lecture indicative et ne remplace pas un audit de vos données internes.
      </p>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink-2)', margin: '0 0 12px' }}>
        Mentions légales et de transparence en cours de validation.
      </p>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink-2)', margin: 0 }}>
        Pour en savoir plus sur MIRA, rendez-vous sur notre site officiel (adresse à confirmer).
      </p>
    </section>
  );
}

export default function ReportDocument({ report, context }: ReportDocumentProps) {
  return (
    <article style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(20px,4vw,40px) clamp(16px,4vw,28px)', overflowWrap: 'anywhere' }}>
      <Cover />
      <Identity context={context} />
      {report.sections.map((s) => (
        <Section key={s.id} section={s} />
      ))}
      <Sources report={report} />
      <Closing />
      <p style={{ marginTop: 18, paddingTop: 12, borderTop: '1px solid var(--line-soft)', fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-3)' }}>
        {RGPD_PDF_FOOTER}
      </p>
    </article>
  );
}
