import type { ReactNode } from 'react';

/** Libellé de champ partagé (la question elle-même). */
export function FieldLabel({ htmlFor, children, optional }: { htmlFor?: string; children: ReactNode; optional?: boolean }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{ display: 'block', fontSize: 15.5, fontWeight: 600, lineHeight: 1.45, color: 'var(--ink)', marginBottom: 10 }}
    >
      {children}
      {optional && <span style={{ fontWeight: 500, color: 'var(--ink-3)' }}> · optionnel</span>}
    </label>
  );
}

/** Message sous le champ : erreur (prioritaire) sinon aide. */
export function FieldMessage({ error, hint }: { error?: string; hint?: string }) {
  if (!error && !hint) return null;
  return (
    <p
      role={error ? 'alert' : undefined}
      style={{ margin: '8px 2px 0', fontSize: 13, lineHeight: 1.45, color: error ? 'var(--risk)' : 'var(--ink-3)' }}
    >
      {error || hint}
    </p>
  );
}
