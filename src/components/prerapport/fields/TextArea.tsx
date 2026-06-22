import { useId } from 'react';
import { FieldLabel, FieldMessage } from './fieldParts';

interface TextAreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  rows?: number;
  autoFocus?: boolean;
}

export default function TextArea({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  optional,
  rows = 4,
  autoFocus,
}: TextAreaProps) {
  const id = useId();
  return (
    <div>
      <FieldLabel htmlFor={id} optional={optional}>{label}</FieldLabel>
      <textarea
        id={id}
        rows={rows}
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className={`pr-field${error ? ' pr-field--error' : ''}`}
      />
      <FieldMessage error={error} hint={hint} />
    </div>
  );
}
