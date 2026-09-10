import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export default function Input({
  label,
  error,
  helperText,
  id,
  className = '',
  ...props
}: InputProps) {
  const inputId = id ?? props.name;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={inputId} className="text-sm font-semibold text-[var(--foreground)]">
          {label}
        </label>
      )}

      <input
        id={inputId}
        className={`w-full rounded-xl border bg-[var(--surface)] px-4 py-3 text-[var(--foreground)] shadow-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60 ${
          error ? 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-red-500/20' : 'border-[var(--border-strong)]'
        } ${className}`}
        {...props}
      />

      {error && <p className="text-sm font-medium text-[var(--danger)]">{error}</p>}
      {!error && helperText && <p className="text-sm text-[var(--muted)]">{helperText}</p>}
    </div>
  );
}
