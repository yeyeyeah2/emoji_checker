import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, required, children }: FieldProps) {
  return (
    <div className={`field${error ? ' field-has-error' : ''}`}>
      <div className="field-head">
        <label htmlFor={htmlFor}>
          {label}
          {required && <span className="field-required">*</span>}
        </label>
        {hint && <span className="field-hint">{hint}</span>}
      </div>
      {children}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
