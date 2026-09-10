import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variants = {
  primary: 'bg-[var(--primary)] text-white shadow-sm hover:bg-[var(--primary-hover)]',
  secondary: 'border border-[var(--border-strong)] bg-[var(--surface-secondary)] text-[var(--foreground)] hover:bg-[var(--surface-tertiary)]',
  danger: 'bg-[var(--danger)] text-white shadow-sm hover:brightness-95',
  ghost: 'bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-secondary)]',
} as const;

const sizes = {
  sm: 'min-h-9 px-3 py-2 text-sm',
  md: 'min-h-11 px-4 py-2.5 text-base',
  lg: 'min-h-12 px-6 py-3 text-lg',
} as const;

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center rounded-xl font-semibold transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? <span>Procesando...</span> : children}
    </button>
  );
}
