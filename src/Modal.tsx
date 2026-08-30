// ==========================================================
// ARCHIVO: src/components/ui/Modal.tsx
// Credi Marketplace
//
// Modal reutilizable global
//
// Next.js 16.3 · React 19.2 · TypeScript
// ==========================================================

'use client';


import {
  useEffect,
  type ReactNode,
} from 'react';



interface ModalProps {

  open: boolean;

  onClose: () => void;

  title?: string;

  children: ReactNode;

  footer?: ReactNode;

  size?:
    | 'sm'
    | 'md'
    | 'lg'
    | 'xl';
}



const sizes = {

  sm:
    'max-w-sm',

  md:
    'max-w-md',

  lg:
    'max-w-lg',

  xl:
    'max-w-xl',

} as const;



export default function Modal({

  open,

  onClose,

  title,

  children,

  footer,

  size = 'md',

}: ModalProps) {


  useEffect(() => {

    function handleEscape(
      event: KeyboardEvent,
    ) {

      if (
        event.key === 'Escape'
      ) {
        onClose();
      }

    }


    if (open) {

      document.addEventListener(
        'keydown',
        handleEscape,
      );

    }


    return () => {

      document.removeEventListener(
        'keydown',
        handleEscape,
      );

    };

  }, [
    open,
    onClose,
  ]);



  if (!open) {
    return null;
  }



  return (

    <div

      role="dialog"

      aria-modal="true"

      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center

        bg-black/50

        p-4
      "

      onMouseDown={onClose}

    >

      <div

        className={`
          w-full

          ${sizes[size]}

          rounded-xl

          bg-white

          shadow-xl
        `}

        onMouseDown={
          (event) =>
            event.stopPropagation()
        }

      >


        <header

          className="
            flex
            items-center
            justify-between

            border-b
            px-6
            py-4
          "

        >

          {
            title && (

              <h2

                className="
                  text-lg
                  font-semibold
                  text-gray-900
                "

              >

                {title}

              </h2>

            )
          }


          <button

            type="button"

            onClick={onClose}

            aria-label="Cerrar"

            className="
              text-gray-500
              hover:text-gray-900
              text-xl
            "

          >

            ×

          </button>


        </header>



        <main

          className="
            px-6
            py-5
          "

        >

          {children}

        </main>



        {
          footer && (

            <footer

              className="
                border-t
                px-6
                py-4
              "

            >

              {footer}

            </footer>

          )
        }


      </div>


    </div>

  );
}
