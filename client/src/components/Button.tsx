import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'soft' | 'danger';
  block?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = 'primary',
  block = false,
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`btn btn-${variant}${block ? ' btn-block' : ''}${className ? ` ${className}` : ''}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : icon}
      <span>{children}</span>
    </button>
  );
}
