import type { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export default function Card({
  interactive = false,
  className = '',
  ...props
}: CardProps) {
  const classes = [
    'rounded-2xl border border-border bg-card text-card-foreground shadow-sm',
    interactive ? 'transition-shadow hover:shadow-md' : '',
    className,
  ].filter(Boolean).join(' ');

  return <div className={classes} {...props} />;
}
