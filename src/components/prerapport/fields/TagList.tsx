import { useId, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FieldLabel, FieldMessage } from './fieldParts';

interface TagListProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  max?: number;
  autoFocus?: boolean;
}

/** Saisie de listes courtes (familles de métiers). Ajout à Entrée ou virgule,
 *  dédoublonnage insensible à la casse, suppression au clic. */
export default function TagList({
  label,
  values,
  onChange,
  placeholder,
  hint,
  error,
  max = 6,
  autoFocus,
}: TagListProps) {
  const id = useId();
  const [draft, setDraft] = useState('');
  const full = values.length >= max;

  const add = () => {
    const v = draft.trim().replace(/,$/, '').trim();
    if (!v) return;
    const exists = values.some((t) => t.toLowerCase() === v.toLowerCase());
    if (!exists && !full) onChange([...values, v]);
    setDraft('');
  };

  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    } else if (e.key === 'Backspace' && !draft && values.length) {
      remove(values.length - 1);
    }
  };

  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>

      {values.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          <AnimatePresence initial={false}>
            {values.map((tag, i) => (
              <motion.span
                key={tag}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'var(--violet-100)', color: 'var(--violet-700)',
                  border: '1px solid var(--violet-300)', borderRadius: 999,
                  padding: '7px 8px 7px 14px', fontSize: 14, fontWeight: 500,
                }}
              >
                {tag}
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label={`Retirer ${tag}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 20, height: 20, borderRadius: '50%', border: 'none',
                    background: 'rgba(53,19,125,.12)', color: 'var(--violet-700)',
                    fontSize: 14, lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      )}

      <input
        id={id}
        autoFocus={autoFocus}
        value={draft}
        placeholder={full ? `Maximum ${max} familles` : placeholder}
        disabled={full}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
        aria-invalid={!!error}
        className={`pr-field${error ? ' pr-field--error' : ''}`}
      />
      <FieldMessage error={error} hint={full ? undefined : hint} />
    </div>
  );
}
