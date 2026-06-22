import { useId } from 'react';
import type { ReactNode } from 'react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  children: ReactNode;
}

/** Case à cocher custom (consentement RGPD). Le natif reste la source de vérité
 *  d'accessibilité ; on ne fait que le styliser. */
export default function Checkbox({ checked, onChange, error, children }: CheckboxProps) {
  const id = useId();
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ position: 'relative', flexShrink: 0, marginTop: 1 }}>
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            aria-invalid={!!error}
            style={{
              appearance: 'none', WebkitAppearance: 'none', margin: 0,
              width: 20, height: 20, borderRadius: 6,
              border: `1.5px solid ${error ? 'var(--risk)' : checked ? 'var(--violet)' : 'var(--line)'}`,
              background: checked ? 'var(--violet)' : 'var(--paper)',
              cursor: 'pointer', transition: 'background .15s, border-color .15s',
            }}
          />
          {checked && (
            <svg
              width="13" height="13" viewBox="0 0 13 13" fill="none"
              style={{ position: 'absolute', top: 4, left: 3.5, pointerEvents: 'none' }}
            >
              <path d="M1 6.5 L4.5 10 L12 1.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <label htmlFor={id} style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink-2)', cursor: 'pointer' }}>
          {children}
        </label>
      </div>
      {error && (
        <p role="alert" style={{ margin: '8px 0 0 32px', fontSize: 13, color: 'var(--risk)' }}>{error}</p>
      )}
    </div>
  );
}
