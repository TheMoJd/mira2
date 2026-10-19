import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import WizardButton from '../prerapport/WizardButton';
import { Badge, Field, Notice } from './adminUi';
import {
  CLAIM_FORBIDDEN_RE,
  ISCO_CODES,
  PROVENANCES,
  SCOPES,
  SCOPE_LABELS,
  THEMES,
  THEME_LABELS,
  firstIssue,
  statInputSchema,
  statRowToInput,
  statWarnings,
  type GridSection,
  type StatRow,
  type StatSourceRow,
} from '../../data/statbankSchema';
import { famillesMetiers } from '../../data/famillesMetiers';

interface StatFormProps {
  /** Statistique éditée ; absente = création. */
  initial?: StatRow;
  /** Document présélectionné à la création. */
  defaultSourceCode?: string;
  /** Documents actifs (on ne rattache pas une stat à un document archivé). */
  sources: StatSourceRow[];
  gridSections: GridSection[];
  onSubmit: (data: unknown) => Promise<void>;
  onCancel: () => void;
}

/** Libellés des familles par code ISCO (un code peut couvrir plusieurs familles). */
const ISCO_LABELS: Record<string, string> = Object.fromEntries(
  ISCO_CODES.map((code) => [code, famillesMetiers.filter((f) => f.isco.includes(code)).map((f) => f.label).join(' / ')]),
);

const UNITS = ['%', 'pts', 'x', 'M', 'Md', 'Md$', ''];

/** Proposition d'identifiant à partir de l'organisation et de l'année du document. */
function suggestId(source: StatSourceRow | undefined): string {
  if (!source) return '';
  const org = source.org
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)[0];
  return org ? `${org}-${source.year}-` : '';
}

export default function StatForm({ initial, defaultSourceCode, sources, gridSections, onSubmit, onCancel }: StatFormProps) {
  const editing = !!initial;
  const start = initial ? statRowToInput(initial) : null;
  const firstSource = sources.find((s) => s.code === defaultSourceCode) ?? sources[0];

  const [sourceCode, setSourceCode] = useState(String(start?.sourceCode ?? firstSource?.code ?? ''));
  const [id, setId] = useState(String(start?.id ?? suggestId(firstSource)));
  const [value, setValue] = useState(start ? String(start.value).replace('.', ',') : '');
  const [unit, setUnit] = useState(String(start?.unit ?? '%'));
  const [claim, setClaim] = useState(String(start?.claim ?? ''));
  const [verbatim, setVerbatim] = useState(String(start?.verbatim ?? ''));
  const [theme, setTheme] = useState(String(start?.theme ?? 'exposition'));
  const [scope, setScope] = useState(String(start?.scope ?? 'monde'));
  const [provenance, setProvenance] = useState(String(start?.provenance ?? 'primaire'));
  const [projection, setProjection] = useState(Boolean(start?.projection));
  const [isco, setIsco] = useState<string[]>((start?.isco as string[]) ?? []);
  const [page, setPage] = useState(String(start?.page ?? ''));
  const [originalSource, setOriginalSource] = useState(String(start?.originalSource ?? ''));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const data = { id, sourceCode, value, unit, claim, verbatim, theme, scope, provenance, projection, isco, page, originalSource };
  const parsed = statInputSchema.safeParse(data);
  const warnings = parsed.success ? statWarnings(parsed.data) : [];
  const claimHasForbidden = CLAIM_FORBIDDEN_RE.test(claim);

  const source = sources.find((s) => s.code === sourceCode);
  const citedIn = useMemo(
    () => gridSections.filter((g) => source?.sections.includes(g.id)),
    [gridSections, source],
  );

  const onSourceChange = (code: string) => {
    // L'id suggéré suit le document tant qu'on ne l'a pas personnalisé.
    if (!editing && (id === '' || id === suggestId(source))) setId(suggestId(sources.find((s) => s.code === code)));
    setSourceCode(code);
  };

  const toggleIsco = (code: string) =>
    setIsco((cur) => (cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code]));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!parsed.success) return setError(firstIssue(parsed.error));
    setError(null);
    setSaving(true);
    try {
      await onSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate style={{ display: 'grid', gap: 18 }}>
      <Field
        label="Document source"
        hint={
          citedIn.length > 0 ? (
            <>Citable en {citedIn.map((g) => g.label).join(', ')} (et en synthèse §1 par reprise).</>
          ) : (
            'Ce document n’est autorisé dans aucune section : la statistique ne sera pas citée tant que la grille du document n’est pas complétée.'
          )
        }
      >
        {(fid) => (
          <select id={fid} className="pr-field pr-select" value={sourceCode} onChange={(e) => onSourceChange(e.target.value)}>
            {sources.map((s) => (
              <option key={s.code} value={s.code}>{s.code} · {s.report}</option>
            ))}
          </select>
        )}
      </Field>

      <div className="adm-grid-3">
        <Field label="Valeur" hint="Le chiffre cité (virgule acceptée).">
          {(fid) => <input id={fid} className="pr-field" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />}
        </Field>
        <Field label="Unité" hint="%, pts, x, M, Md… ou vide pour un effectif.">
          {(fid) => (
            <>
              <input id={fid} className="pr-field" list="adm-units" value={unit} onChange={(e) => setUnit(e.target.value)} />
              <datalist id="adm-units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
            </>
          )}
        </Field>
        <Field
          label="Identifiant"
          hint={editing ? 'Ne change plus : il est cité dans les rapports envoyés.' : 'Minuscules et tirets, ex. ocde-2026-emplois-exposes-27.'}
        >
          {(fid) => <input id={fid} className="pr-field" value={id} disabled={editing} onChange={(e) => setId(e.target.value.toLowerCase())} />}
        </Field>
      </div>

      <Field
        label="Formulation citable (claim)"
        hint={`Phrase française autonome, reprise telle quelle dans le rapport et dans ses notes. ${claim.length} / 600 caractères.`}
        error={claimHasForbidden ? 'Ni tiret cadratin, ni demi-cadratin, ni point-virgule : reformuler avec une virgule ou un point.' : undefined}
      >
        {(fid) => (
          <textarea id={fid} className={`pr-field${claimHasForbidden ? ' pr-field--error' : ''}`} rows={3} value={claim} onChange={(e) => setClaim(e.target.value)} />
        )}
      </Field>

      <Field label="Citation d’origine (verbatim)" hint="Copiée exactement depuis le document, pour vérification. Jamais montrée au prospect.">
        {(fid) => <textarea id={fid} className="pr-field" rows={3} value={verbatim} onChange={(e) => setVerbatim(e.target.value)} />}
      </Field>

      <div className="adm-grid-3">
        <Field label="Thème">
          {(fid) => (
            <select id={fid} className="pr-field pr-select" value={theme} onChange={(e) => setTheme(e.target.value)}>
              {THEMES.map((t) => <option key={t} value={t}>{THEME_LABELS[t]}</option>)}
            </select>
          )}
        </Field>
        <Field label="Périmètre">
          {(fid) => (
            <select id={fid} className="pr-field pr-select" value={scope} onChange={(e) => setScope(e.target.value)}>
              {SCOPES.map((s) => <option key={s} value={s}>{SCOPE_LABELS[s]}</option>)}
            </select>
          )}
        </Field>
        <Field label="Page ou repère" hint="Ex. p.12, ch.3, Figure A.">
          {(fid) => <input id={fid} className="pr-field" value={page} onChange={(e) => setPage(e.target.value)} />}
        </Field>
      </div>

      <div className="adm-grid-2">
        <Field label="Provenance" hint="Secondaire = chiffre repris d’un tiers dans le document.">
          {(fid) => (
            <select id={fid} className="pr-field pr-select" value={provenance} onChange={(e) => setProvenance(e.target.value)}>
              {PROVENANCES.map((p) => <option key={p} value={p}>{p === 'primaire' ? 'Primaire (donnée propre au document)' : 'Secondaire (reprise d’un tiers)'}</option>)}
            </select>
          )}
        </Field>
        <Field label="Source d’origine" hint="Pour une donnée secondaire, ex. « Cedefop, 2025 ».">
          {(fid) => <input id={fid} className="pr-field" value={originalSource} onChange={(e) => setOriginalSource(e.target.value)} />}
        </Field>
      </div>

      <label className={`adm-chip${projection ? ' adm-chip--on' : ''}`} style={{ justifySelf: 'start' }}>
        <input type="checkbox" checked={projection} onChange={(e) => setProjection(e.target.checked)} />
        Projection ou prospective (formulée au conditionnel dans le rapport)
      </label>

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 6 }}>
          Familles de métiers éclairées directement (ISCO)
        </legend>
        <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
          Ne cocher que si la statistique porte précisément sur ces métiers : elle sera alors rattachée à ces familles en §3. Rien de coché = donnée générale.
        </p>
        <div className="adm-isco">
          {ISCO_CODES.map((code) => (
            <label key={code} className={`adm-chip${isco.includes(code) ? ' adm-chip--on' : ''}`} title={ISCO_LABELS[code]}>
              <input type="checkbox" checked={isco.includes(code)} onChange={() => toggleIsco(code)} />
              <strong style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{code}</strong>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ISCO_LABELS[code]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {parsed.success && claim && (
        <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-sm)', padding: '12px 14px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>APERÇU SIMPLIFIÉ DE LA NOTE</div>
          <div style={{ fontSize: 14, color: 'var(--ink-1)', lineHeight: 1.55 }}>
            {parsed.data.claim} <span style={{ color: 'var(--ink-3)' }}>{source?.report}{parsed.data.page ? `, ${parsed.data.page}` : ''}.</span>
            {parsed.data.projection && <> <Badge tone="amber">Projection</Badge></>}
          </div>
        </div>
      )}

      {warnings.map((w) => <Notice key={w} tone="warn">{w}</Notice>)}
      {error && <Notice tone="error">{error}</Notice>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <WizardButton variant="ghost" onClick={onCancel}>Annuler</WizardButton>
        <WizardButton type="submit" disabled={saving}>{saving ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Ajouter la statistique'}</WizardButton>
      </div>
    </form>
  );
}
