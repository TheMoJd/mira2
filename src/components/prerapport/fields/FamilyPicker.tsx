import { useId, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { famillesParDomaine, domainesOrdre, famillesMetiers } from '../../../data/famillesMetiers';
import { FieldLabel, FieldMessage } from './fieldParts';

interface FamilyPickerProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  hint?: string;
  error?: string;
  max?: number;
}

/**
 * Sélection guidée des familles de métiers (Q4). Au lieu d'une saisie libre
 * (peu intuitive, ISCO souvent non mappé), on propose les ~28 familles connues
 * regroupées par domaine : un tap (dé)sélectionne. Stocke les **libellés
 * canoniques**, donc `mapFamilles` retrouve toujours les codes ISCO. Un champ
 * « Autre » couvre les cas hors liste.
 */
export default function FamilyPicker({
  label,
  values,
  onChange,
  hint,
  error,
  max = 6,
}: FamilyPickerProps) {
  const otherId = useId();
  const groups = useMemo(() => famillesParDomaine(), []);
  const knownLabels = useMemo(() => new Set(famillesMetiers.map((fm) => fm.label)), []);
  const selected = useMemo(() => new Set(values), [values]);
  const full = values.length >= max;

  const [draft, setDraft] = useState('');

  const toggle = (lbl: string) => {
    if (selected.has(lbl)) onChange(values.filter((v) => v !== lbl));
    else if (!full) onChange([...values, lbl]);
  };

  const addCustom = () => {
    const t = draft.trim();
    setDraft('');
    if (!t || full) return;
    if (!values.some((v) => v.toLowerCase() === t.toLowerCase())) onChange([...values, t]);
  };

  const onDraftKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // ne pas soumettre le formulaire
      addCustom();
    }
  };

  // Familles ajoutées à la main (hors liste connue) → chips supprimables dédiés.
  const customValues = values.filter((v) => !knownLabels.has(v));
  const countTone = values.length >= 3 ? 'var(--violet)' : 'var(--ink-3)';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <FieldLabel>{label}</FieldLabel>
        <span aria-live="polite" style={{ flexShrink: 0, fontSize: 13, fontWeight: 600, color: countTone }}>
          {values.length}/{max}
        </span>
      </div>

      <div role="group" aria-label={label} style={{ display: 'grid', gap: 16, marginTop: 4 }}>
        {domainesOrdre.map((domaine) => (
          <div key={domaine}>
            <div className="kicker" style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 8 }}>{domaine}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(groups[domaine] ?? []).map((fam) => {
                const on = selected.has(fam.label);
                const disabled = !on && full;
                return (
                  <button
                    key={fam.id}
                    type="button"
                    onClick={() => toggle(fam.label)}
                    disabled={disabled}
                    aria-pressed={on}
                    className={`fam-chip${on ? ' fam-chip--on' : ''}`}
                  >
                    {on && <span aria-hidden="true" style={{ marginRight: 6, fontWeight: 700 }}>✓</span>}
                    {fam.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Échappatoire : une famille manque dans la liste. */}
      <div style={{ marginTop: 18 }}>
        <label htmlFor={otherId} className="kicker" style={{ display: 'block', fontSize: 11, color: 'var(--ink-3)', marginBottom: 8 }}>
          Une famille manque ?
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            id={otherId}
            value={draft}
            placeholder="Ajouter une famille…"
            disabled={full}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onDraftKeyDown}
            onBlur={addCustom}
            className="pr-field"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={full || !draft.trim()}
            className="fam-add"
          >
            + Ajouter
          </button>
        </div>

        {customValues.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            <AnimatePresence initial={false}>
              {customValues.map((tag) => (
                <motion.span
                  key={tag}
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="fam-chip fam-chip--on"
                  style={{ cursor: 'default' }}
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => onChange(values.filter((v) => v !== tag))}
                    aria-label={`Retirer ${tag}`}
                    className="fam-chip__remove"
                  >
                    ×
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <FieldMessage error={error} hint={full ? `Maximum ${max} familles atteint.` : hint} />
    </div>
  );
}
