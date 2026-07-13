import { useId } from 'react';
import { FieldLabel, FieldMessage } from './fieldParts';

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  type?: 'text' | 'email' | 'url' | 'tel';
  inputMode?: 'text' | 'email' | 'url' | 'numeric' | 'tel';
  autoComplete?: string;
  autoFocus?: boolean;
  maxLength?: number;
}

export default function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  optional,
  type = 'text',
  inputMode,
  autoComplete,
  autoFocus,
  maxLength,
}: TextFieldProps) {
  const id = useId();
  return (
    <div>
      <FieldLabel htmlFor={id} optional={optional}>{label}</FieldLabel>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        maxLength={maxLength}
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
