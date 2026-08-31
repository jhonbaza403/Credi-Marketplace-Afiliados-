// ==========================================================
// ARCHIVO: src/components/ui/Badge.tsx
// Credi Marketplace
//
// Etiqueta visual reutilizable
//
// Next.js 16.3 · React 19.2 · TypeScript
// ==========================================================

import type {
  ReactNode,
} from 'react';


interface BadgeProps {

  children: ReactNode;

  variant?:
    | 'primary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'neutral';

  size?:
    | 'sm'
    | 'md'
    | 'lg';

  className?: string;
}



const variants = {

  primary:
    'bg-blue-100 text-blue-700',

  success:
    'bg-green-100 text-green-700',

  warning:
    'bg-yellow-100 text-yellow-700',

  danger:
    'bg-red-100 text-red-700',

  info:
    'bg-cyan-100 text-cyan-700',

  neutral:
    'bg-gray-100 text-gray-700',

} as const;



const sizes = {

  sm:
    'px-2 py-0.5 text-xs',

  md:
    'px-3 py-1 text-sm',

  lg:
    'px-4 py-1.5 text-base',

} as const;



export default function Badge({

  children,

  variant = 'neutral',

  size = 'md',

  className = '',

}: BadgeProps) {


  return (

    <span

      className={`
        inline-flex
        items-center

        rounded-full

        font-medium

        ${variants[variant]}

        ${sizes[size]}

        ${className}
      `}

    >

      {children}

    </span>

  );

}
