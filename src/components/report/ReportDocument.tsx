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
import type { CSSProperties, ReactNode } from 'react';
import type {
  PreRapportOutput,
  ReportSectionOutput,
  ReportBloc,
  ReportFamille,
  ReportEncart,
} from '../../data/reportSchema';
import type { ReportRenderContext } from '../../data/reportHtml';
import { SLOGAN, VALUE_PROP } from '../../data/reportHtml';
import {
  reportSections,
  SOURCES_SECTION_TITLE,
  CONTACT_URL,
  COMMENT_UTILISER_CTA,
} from '../../data/rapportStructure';
import type { CitationIndex } from '../../data/reportCitations';
import {
  buildCitationIndex,
  tokenizeCitations,
  markersIn,
  renderNoteText,
} from '../../data/reportCitations';
import { RGPD_PDF_FOOTER } from '../../data/rgpd';

interface ReportDocumentProps {
  report: PreRapportOutput;
  context: ReportRenderContext;
}

const SECTION_LABEL_BY_ID = new Map(reportSections.map((s) => [s.id, s.numLabel]));

/** Appel de note en exposant. Un id inconnu de la stat-bank n'affiche rien. */
function NoteCall({ n }: { n: number | undefined }) {
  if (n === undefined) return null;
  return <sup style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--violet)', lineHeight: 0 }}>{n}</sup>;
}

/**
 * Prose du modèle avec ses marqueurs `[[id]]` remplacés par des appels de note
 * numérotés (pendant React de `escWithNotes` dans `reportHtml.ts`).
 */
function Prose({ text, index }: { text: string; index: CitationIndex }): ReactNode {
  return (
    <>
      {tokenizeCitations(text).map((t, i) =>
        t.type === 'text' ? (
          <span key={i}>{t.value}</span>
        ) : (
          <NoteCall key={i} n={index.numberById.get(t.id)} />
        ),
      )}
    </>
  );
}

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

function Bloc({ bloc, index }: { bloc: ReportBloc; index: CitationIndex }) {
  return (
    <>
      {bloc.intertitre && (
        <h3 style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--violet-700)', margin: '18px 0 6px' }}>
          <Prose text={bloc.intertitre} index={index} />
        </h3>
      )}
      {bloc.paragraphes
        .filter((p) => p.trim() !== '')
        .map((p, i) => (
          <p key={i} style={{ margin: '0 0 10px', lineHeight: 1.65, color: 'var(--ink)', fontSize: 15 }}>
            <Prose text={p} index={index} />
          </p>
        ))}
    </>
  );
}

/**
 * Encart de synthèse exécutive §1 : chapeau, chiffre-signal isolé, points clés,
 * puis les deux lignes figées injectées par le code (calibrage et périmètre).
 */
function Encart({ encart, index }: { encart: ReportEncart; index: CitationIndex }) {
  const petite: CSSProperties = { margin: '6px 0 0', fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-3)' };
  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderTop: '4px solid var(--violet)',
        borderRadius: 14,
        padding: '18px 20px',
        background: 'var(--bg-soft)',
        margin: '0 0 16px',
      }}
    >
      <p style={{ margin: '0 0 14px', fontSize: 15, lineHeight: 1.6, color: 'var(--ink)' }}>
        <Prose text={encart.chapeau} index={index} />
      </p>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: 14,
          padding: '14px 16px',
          margin: '0 0 12px',
          background: 'var(--paper)',
          borderRadius: 10,
          borderLeft: '4px solid var(--violet)',
        }}
      >
        <span style={{ ...serif, fontSize: 'clamp(28px,6vw,34px)', fontWeight: 500, color: 'var(--violet)', lineHeight: 1 }}>
          {encart.chiffre_signal.valeur}
        </span>
        <span style={{ fontSize: 14, lineHeight: 1.45, color: 'var(--ink)' }}>
          <Prose text={encart.chiffre_signal.phrase} index={index} />
          {/* Marqueur déjà dans la phrase (format du prompt) : ne pas doubler l'appel de note. */}
          {markersIn(encart.chiffre_signal.phrase).includes(encart.chiffre_signal.source_id) ? null : (
            <NoteCall n={index.numberById.get(encart.chiffre_signal.source_id)} />
          )}
        </span>
      </div>
      {encart.points_cles.map((pt, i) => (
        <div key={i} style={{ padding: '10px 0', borderTop: '1px solid var(--line-soft)' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--violet-700)', margin: '0 0 3px' }}>
            <Prose text={pt.titre} index={index} />
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink)' }}>
            <Prose text={pt.texte} index={index} />
            {markersIn(pt.texte).includes(pt.source_id) ? null : (
              <NoteCall n={index.numberById.get(pt.source_id)} />
            )}
          </div>
        </div>
      ))}
      <p style={{ ...petite, marginTop: 14 }}>{encart.calibrage_court}</p>
      <p style={petite}>{encart.perimetre}</p>
    </div>
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

function FamilleCard({ fam, index }: { fam: ReportFamille; index: CitationIndex }) {
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
      <p style={{ margin: '6px 0 0', lineHeight: 1.55, color: 'var(--ink)', fontSize: 14.5 }}>
        <Prose text={fam.explication} index={index} />
      </p>
    </div>
  );
}

/**
 * Encart §8bis « Comment utiliser ce rapport » : prise de parole de MIRA,
 * visuellement encadrée et distincte du corps analytique. Le « contactez-nous ! »
 * de clôture est un lien.
 */
function Encadre({ section }: { section: ReportSectionOutput }) {
  const paragraphes = section.contenu.flatMap((b) => b.paragraphes).filter((p) => p.trim() !== '');
  return (
    <section style={{ margin: '0 0 28px' }}>
      <div style={{ border: '1px solid var(--violet)', borderRadius: 14, padding: '18px 20px', background: 'var(--bg-soft)' }}>
        <h2 style={{ ...serif, fontSize: 'clamp(17px,3.4vw,19px)', fontWeight: 500, color: 'var(--violet)', margin: '0 0 12px' }}>
          {section.titre}
        </h2>
        {paragraphes.map((p, i) =>
          p.trim() === COMMENT_UTILISER_CTA ? (
            <p key={i} style={{ margin: '0 0 10px', lineHeight: 1.65, color: 'var(--ink)', fontSize: 15, fontWeight: 500 }}>
              {p.replace('contactez-nous !', '')}
              <a href={CONTACT_URL} style={{ color: 'var(--violet)', fontWeight: 600 }}>
                contactez-nous !
              </a>
            </p>
          ) : (
            <p key={i} style={{ margin: '0 0 10px', lineHeight: 1.65, color: 'var(--ink)', fontSize: 15 }}>
              {p}
            </p>
          ),
        )}
      </div>
    </section>
  );
}

function Section({ section, index }: { section: ReportSectionOutput; index: CitationIndex }) {
  if (section.id === 'comment-utiliser') return <Encadre section={section} />;
  const label = SECTION_LABEL_BY_ID.get(section.id);
  const hasFamilles = section.familles && section.familles.length > 0;
  return (
    <section style={{ margin: '0 0 28px' }}>
      <h2 style={sectionTitle}>
        {label !== undefined && (
          <span style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--sans, sans-serif)' }}>§{label} · </span>
        )}
        {section.titre}
      </h2>
      {section.encart && <Encart encart={section.encart} index={index} />}
      {hasFamilles && <RecapTable familles={section.familles!} />}
      {section.contenu.map((b, i) => (
        <Bloc key={i} bloc={b} index={index} />
      ))}
      {hasFamilles && (
        <div style={{ marginTop: 14 }}>
          {section.familles!.map((f, i) => (
            <FamilleCard key={i} fam={f} index={index} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Section « Sources de référence », construite par le code à partir des marqueurs
 * du texte : regroupement par section dans l'ordre d'apparition, numérotation
 * continue sur tout le rapport.
 */
function References({ index }: { index: CitationIndex }) {
  if (index.groups.length === 0) return null;
  return (
    <section style={{ margin: '0 0 28px' }}>
      <h2 style={sectionTitle}>{SOURCES_SECTION_TITLE}</h2>
      {index.groups.map((g) => {
        const label = SECTION_LABEL_BY_ID.get(g.sectionId);
        return (
          <div key={g.sectionId} style={{ margin: '0 0 14px' }}>
            <h3
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: 'var(--ink-3)',
                textTransform: 'uppercase',
                letterSpacing: '.04em',
                margin: '0 0 6px',
              }}
            >
              {label !== undefined ? `§${label} · ${g.sectionTitle}` : g.sectionTitle}
            </h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 12.5 }}>
              {g.notes.map((note) => (
                <li key={note.id} style={{ margin: '0 0 6px', lineHeight: 1.5, color: 'var(--ink-2)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--violet)' }}>{note.n}. </span>
                  {renderNoteText(note.entry)}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

/** Page de fin : transparence sur la génération par IA + mention RGPD. */
function Closing() {
  return (
    <section style={{ margin: '0 0 8px' }}>
      <h2 style={sectionTitle}>Transparence et mentions</h2>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink)', margin: 0 }}>
        Ce pré-rapport a été généré avec l’aide de l’intelligence artificielle, à partir de sources publiques de
        référence. Il constitue une lecture indicative et ne remplace pas un audit de vos données internes.
      </p>
    </section>
  );
}

export default function ReportDocument({ report, context }: ReportDocumentProps) {
  // La numérotation des notes suit l'ordre d'apparition dans le document.
  const index = buildCitationIndex(report);
  return (
    <article style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(20px,4vw,40px) clamp(16px,4vw,28px)', overflowWrap: 'anywhere' }}>
      <Cover />
      <Identity context={context} />
      {report.sections.map((s) => (
        <Section key={s.id} section={s} index={index} />
      ))}
      <References index={index} />
      <Closing />
      <p style={{ marginTop: 18, paddingTop: 12, borderTop: '1px solid var(--line-soft)', fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-3)' }}>
        {RGPD_PDF_FOOTER}
      </p>
    </article>
  );
}
