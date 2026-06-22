import { useId, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { FieldLabel, FieldMessage } from './fieldParts';

interface FileFieldProps {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  hint?: string;
  accept?: string;
  maxSizeMb?: number;
}

const ACCEPT = '.pdf,.ppt,.pptx,.doc,.docx';

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

export default function FileField({
  label,
  file,
  onChange,
  hint,
  accept = ACCEPT,
  maxSizeMb = 10,
}: FileFieldProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();

  const pick = (f: File | null) => {
    setError(undefined);
    if (!f) {
      onChange(null);
      return;
    }
    const okType = accept.split(',').some((ext) => f.name.toLowerCase().endsWith(ext.trim()));
    if (!okType) {
      setError('Format non supporté (PDF, PowerPoint ou Word).');
      return;
    }
    if (f.size > maxSizeMb * 1024 * 1024) {
      setError(`Fichier trop volumineux (max ${maxSizeMb} Mo).`);
      return;
    }
    onChange(f);
  };

  const onInput = (e: ChangeEvent<HTMLInputElement>) => pick(e.target.files?.[0] ?? null);

  return (
    <div>
      <FieldLabel optional>{label}</FieldLabel>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        onChange={onInput}
        style={{ display: 'none' }}
      />

      {file ? (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--bg-soft)', border: '1px solid var(--line)',
            borderRadius: 'var(--r-sm)', padding: '12px 14px',
          }}
        >
          <span aria-hidden style={{ fontSize: 18 }}>📄</span>
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, color: 'var(--ink-1)' }}>
            {file.name}
          </span>
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)', flexShrink: 0 }}>{formatSize(file.size)}</span>
          <button
            type="button"
            onClick={() => pick(null)}
            style={{ border: 'none', background: 'none', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, flexShrink: 0 }}
          >
            Retirer
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="pr-dropzone"
        >
          <span style={{ fontSize: 14.5, color: 'var(--ink-1)', fontWeight: 600 }}>Choisir un fichier</span>
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>PDF, PowerPoint ou Word · max {maxSizeMb} Mo</span>
        </button>
      )}

      <FieldMessage error={error} hint={file ? undefined : hint} />
    </div>
  );
}
