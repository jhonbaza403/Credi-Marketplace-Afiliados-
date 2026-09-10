import type { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export default function Card({ interactive = false, className = '', ...props }: CardProps) {
  const classes = [
    'rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 text-[var(--foreground)] shadow-[0_18px_50px_rgba(2,8,28,.14)] backdrop-blur-xl',
    interactive ? 'transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(2,8,28,.20)]' : '',
    className,
  ].filter(Boolean).join(' ');

  return <div className={classes} {...props} />;
}
