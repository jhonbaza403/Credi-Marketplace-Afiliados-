// ==========================================================
// ARCHIVO: src/components/ui/Button.tsx
// Credi Marketplace
//
// Botón reutilizable global
//
// Next.js 16.3 · React 19.2 · TypeScript
// ==========================================================

import type {
  ButtonHTMLAttributes,
  ReactNode,
} from 'react';


interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {

  children: ReactNode;

  variant?: 
    | 'primary'
    | 'secondary'
    | 'danger'
    | 'ghost';

  size?:
    | 'sm'
    | 'md'
    | 'lg';

  loading?: boolean;
}


const variants = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700',

  secondary:
    'bg-gray-200 text-gray-900 hover:bg-gray-300',

  danger:
    'bg-red-600 text-white hover:bg-red-700',

  ghost:
    'bg-transparent text-gray-700 hover:bg-gray-100',
} as const;


const sizes = {
  sm:
    'px-3 py-2 text-sm',

  md:
    'px-4 py-2 text-base',

  lg:
    'px-6 py-3 text-lg',
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
      disabled={
        disabled || loading
      }

      className={`
        inline-flex
        items-center
        justify-center
        rounded-lg
        font-semibold
        transition
        focus:outline-none
        focus:ring-2
        focus:ring-blue-500
        disabled:cursor-not-allowed
        disabled:opacity-50

        ${variants[variant]}

        ${sizes[size]}

        ${className}
      `}

      {...props}
    >

      {loading ? (
        <span>
          Procesando...
        </span>
      ) : (
        children
      )}

    </button>
  );
}
