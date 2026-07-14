import { useId } from 'react';
import { FieldLabel, FieldMessage } from './fieldParts';

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Options proposées (la valeur EST le libellé — listes closes de `contact.ts`). */
  options: readonly string[];
  /** Texte affiché tant qu'aucune option n'est choisie (option vide, désactivée). */
  placeholder?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  autoFocus?: boolean;
}

/** Liste déroulante native stylée avec la même classe `.pr-field` que les autres
 *  champs du wizard (input/textarea). Le `<select>` natif reste la source de
 *  vérité d'accessibilité ; on ne fait que l'habiller et ajouter un chevron. */
export default function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Sélectionnez…',
  hint,
  error,
  optional,
  autoFocus,
}: SelectFieldProps) {
  const id = useId();
  return (
    <div>
      <FieldLabel htmlFor={id} optional={optional}>{label}</FieldLabel>
      <div style={{ position: 'relative' }}>
        <select
          id={id}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          className={`pr-field pr-select${error ? ' pr-field--error' : ''}`}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {/* Chevron décoratif : le select natif masque son propre marqueur via CSS. */}
        <svg
          width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden
          style={{ position: 'absolute', right: 15, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        >
          <path d="M1 1.5 L6 6.5 L11 1.5" stroke="var(--ink-3)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <FieldMessage error={error} hint={hint} />
    </div>
  );
}
