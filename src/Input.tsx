// ==========================================================
// ARCHIVO: src/components/ui/Input.tsx
// Credi Marketplace
//
// Campo de entrada reutilizable global
//
// Next.js 16.3 · React 19.2 · TypeScript
// ==========================================================

import type {
  InputHTMLAttributes,
} from 'react';


interface InputProps
  extends InputHTMLAttributes<HTMLInputElement> {

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


  const inputId =
    id ?? props.name;


  return (
    <div
      className="
        flex
        flex-col
        gap-2
      "
    >

      {label && (
        <label
          htmlFor={inputId}
          className="
            text-sm
            font-medium
            text-gray-700
          "
        >
          {label}
        </label>
      )}


      <input
        id={inputId}

        className={`
          w-full
          rounded-lg
          border
          px-4
          py-3
          text-gray-900
          outline-none
          transition

          placeholder:text-gray-400

          focus:ring-2
          focus:ring-blue-500

          ${
            error
              ? `
                border-red-500
                focus:ring-red-500
              `
              : `
                border-gray-300
              `
          }

          ${className}
        `}

        {...props}
      />


      {error && (
        <p
          className="
            text-sm
            text-red-600
          "
        >
          {error}
        </p>
      )}


      {!error && helperText && (
        <p
          className="
            text-sm
            text-gray-500
          "
        >
          {helperText}
        </p>
      )}

    </div>
  );
}
