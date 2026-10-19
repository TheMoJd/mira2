import { useState } from 'react';
import type { FormEvent } from 'react';
import WizardButton from '../prerapport/WizardButton';
import { Field, Notice, useDirtyTracking } from './adminUi';
import { NATURES, firstIssue, sourceInputSchema, type GridSection, type StatSourceRow } from '../../data/statbankSchema';

interface SourceFormProps {
  /** Document édité ; absent = création. */
  initial?: StatSourceRow;
  /** Codes déjà pris (archivés compris), pour proposer le suivant libre. */
  takenCodes: string[];
  gridSections: GridSection[];
  onSubmit: (data: unknown) => Promise<void>;
  onCancel: () => void;
  /** Prévenu quand la saisie diverge (ou plus) de l'état initial. */
  onDirtyChange?: (dirty: boolean) => void;
}

/**
 * Code suivant d'une série (`S` sur deux chiffres, `FR` sans zéro) : le plus grand
 * numéro pris + 1. On ne comble pas les trous : S03, S09 ou S11 sont des sources du
 * blueprint écartées, réutiliser leur code prêterait à confusion.
 */
export function nextFreeCode(prefix: 'S' | 'FR', taken: string[]): string {
  const re = prefix === 'S' ? /^S(\d{2})$/ : /^FR(\d{1,2})$/;
  const max = Math.max(0, ...taken.map((c) => Number(re.exec(c)?.[1] ?? 0)));
  return prefix === 'S' ? `S${String(max + 1).padStart(2, '0')}` : `FR${max + 1}`;
}

export default function SourceForm({ initial, takenCodes, gridSections, onSubmit, onCancel, onDirtyChange }: SourceFormProps) {
  const editing = !!initial;
  const [code, setCode] = useState(initial?.code ?? nextFreeCode('S', takenCodes));
  const [nature, setNature] = useState(initial?.nature ?? 'recherche');
  const [report, setReport] = useState(initial?.report ?? '');
  const [org, setOrg] = useState(initial?.org ?? '');
  const [year, setYear] = useState(String(initial?.year ?? new Date().getFullYear()));
  const [sections, setSections] = useState<string[]>(initial?.sections ?? []);
  const [note, setNote] = useState(initial?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useDirtyTracking({ code, nature, report, org, year, sections, note }, onDirtyChange);

  const toggleSection = (id: string) =>
    setSections((cur) => (cur.includes(id) ? cur.filter((s) => s !== id) : [...cur, id]));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const data = { code, nature, report, org, year, sections, note };
    const parsed = sourceInputSchema(gridSections.map((g) => g.id)).safeParse(data);
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
      <div className="adm-grid-2">
        <Field
          label="Code"
          hint={editing ? 'Le code ne change pas : il est repris dans la grille et dans les rapports.' : 'S + deux chiffres pour le socle (ex. S18), FR + un chiffre pour la couche France (ex. FR6).'}
        >
          {(id) => (
            <div style={{ display: 'flex', gap: 8 }}>
              <input id={id} className="pr-field" value={code} disabled={editing} onChange={(e) => setCode(e.target.value.toUpperCase())} />
              {!editing && (
                <select className="pr-field pr-select" style={{ width: 'auto' }} aria-label="Série" value="" onChange={(e) => e.target.value && setCode(nextFreeCode(e.target.value as 'S' | 'FR', takenCodes))}>
                  <option value="">Série…</option>
                  <option value="S">Socle (S)</option>
                  <option value="FR">France (FR)</option>
                </select>
              )}
            </div>
          )}
        </Field>
        <Field label="Nature de l’éditeur" hint="Reportée dans les « Sources de référence » du rapport.">
          {(id) => (
            <select id={id} className="pr-field pr-select" value={nature} onChange={(e) => setNature(e.target.value)}>
              {NATURES.map((n) => (
                <option key={n} value={n}>{n === 'recherche' ? 'Recherche (institution, organisation internationale)' : 'Commerciale (éditeur, cabinet, plateforme)'}</option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <Field label="Titre du document" hint="Tel qu’il apparaîtra dans les sources du rapport (ex. « OCDE, Employment Outlook 2026 »).">
        {(id) => <input id={id} className="pr-field" value={report} onChange={(e) => setReport(e.target.value)} />}
      </Field>

      <div className="adm-grid-2">
        <Field label="Organisation émettrice">
          {(id) => <input id={id} className="pr-field" value={org} onChange={(e) => setOrg(e.target.value)} />}
        </Field>
        <Field label="Année">
          {(id) => <input id={id} className="pr-field" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} />}
        </Field>
      </div>

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 8 }}>
          Sections du rapport autorisées à citer ce document
        </legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {gridSections.map((g) => (
            <label key={g.id} className={`adm-chip${sections.includes(g.id) ? ' adm-chip--on' : ''}`}>
              <input type="checkbox" checked={sections.includes(g.id)} onChange={() => toggleSection(g.id)} />
              {g.label}
            </label>
          ))}
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
          La synthèse (§1) reprend ce que citent les sections cochées. Sans aucune section cochée, les statistiques de ce document ne seront jamais citées.
        </p>
      </fieldset>

      <Field label="Note interne (facultatif)" hint="Contexte, réserves, date de vérification. Jamais montrée dans le rapport.">
        {(id) => <textarea id={id} className="pr-field" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />}
      </Field>

      {sections.length === 0 && <Notice tone="warn">Aucune section cochée : ce document ne pourra pas être cité.</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <WizardButton variant="ghost" onClick={onCancel}>Annuler</WizardButton>
        <WizardButton type="submit" disabled={saving}>{saving ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Ajouter le document'}</WizardButton>
      </div>
    </form>
  );
}
