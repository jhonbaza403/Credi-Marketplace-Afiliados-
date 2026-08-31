// ==========================================================
// ARCHIVO: src/components/ui/Spinner.tsx
// Credi Marketplace
//
// Indicador de carga reutilizable
//
// Next.js 16.3 · React 19.2 · TypeScript
// ==========================================================

interface SpinnerProps {

  size?:
    | 'sm'
    | 'md'
    | 'lg';

  className?: string;
}


const sizes = {

  sm:
    'h-4 w-4 border-2',

  md:
    'h-8 w-8 border-4',

  lg:
    'h-12 w-12 border-4',

} as const;



export default function Spinner({

  size = 'md',

  className = '',

}: SpinnerProps) {


  return (

    <span

      role="status"

      aria-label="Cargando"

      className={`
        inline-block
        animate-spin
        rounded-full
        border-gray-300
        border-t-blue-600

        ${sizes[size]}

        ${className}
      `}

    />

  );

}
