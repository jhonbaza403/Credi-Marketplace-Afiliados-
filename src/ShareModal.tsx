'use client';

// ==========================================================
// ARCHIVO: src/components/ShareModal.tsx
// Credi Marketplace
//
// COMPONENTE: Sistema avanzado de compartición
//
// NIVEL:
// - Producción
// - Responsive
// - Accesibilidad avanzada
// - SSR / Next.js compatible
// - Web Share API
// - WhatsApp
// - Telegram
// - Facebook
// - X
// - Copia de enlace con fallback
// - Escape
// - Backdrop
// - Gestión de foco
// - Prevención de scroll del body
// - Estados visuales de éxito/error
//
// IMPORTANTE:
// Este componente NO gestiona:
// - autenticación;
// - Supabase;
// - pagos;
// - afiliados;
// - analítica.
//
// Su responsabilidad es exclusivamente gestionar la
// experiencia de compartir contenido.
// ==========================================================

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

// ==========================================================
// TIPOS
// ==========================================================

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  description?: string;
}

type ShareStatus =
  | 'idle'
  | 'sharing'
  | 'copied'
  | 'error';

// ==========================================================
// ICONOS
// ==========================================================

function ShareIcon({
  className = 'h-5 w-5',
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function CopyIcon({
  className = 'h-5 w-5',
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({
  className = 'h-5 w-5',
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.5 3.5A11.9 11.9 0 0 0 12 0C5.4 0 .1 5.3.1 11.9c0 2.1.5 4.1 1.6 5.9L0 24l6.4-1.7c1.7.9 3.6 1.4 5.6 1.4h.1c6.6 0 11.9-5.3 11.9-11.9 0-3.2-1.2-6.1-3.5-8.3ZM12.1 21.7c-1.8 0-3.5-.5-5-1.3l-.4-.2-3.8 1 1-3.7-.2-.4c-1-1.6-1.5-3.4-1.5-5.2C2.2 6.2 6.6 1.9 12 1.9c2.6 0 5.1 1 7 2.9 1.9 1.9 2.9 4.3 2.9 7 0 5.4-4.4 9.9-9.8 9.9Zm5.4-7.4c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-1.6-.8-2.7-1.4-3.8-3.2-.3-.5.3-.5.8-1.7.1-.2 0-.4-.1-.6-.1-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9 0 1.7 1.2 3.3 1.4 3.5.2.2 2.3 3.5 5.6 4.9 2.1.9 2.9 1 3.9.8.6-.1 1.9-.8 2.2-1.6.3-.8.3-1.5.2-1.6-.1-.1-.3-.2-.6-.4Z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M21.9 3.2 18.6 20c-.2 1.2-.9 1.5-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.2-8.3c.4-.4-.1-.6-.6-.2L6 13.6l-5-1.6c-1.1-.3-1.1-1.1.2-1.6L20.7 2c.9-.3 1.7.2 1.2 1.2Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.4l-5-6.5L6.1 22H3l7.3-8.4L2.4 2h6.5l4.5 5.9L18.9 2Zm-1.1 17.7h1.7L7.9 4.2H6.1l11.7 15.5Z" />
    </svg>
  );
}

// ==========================================================
// COMPONENTE
// ==========================================================

export default function ShareModal({
  isOpen,
  onClose,
  url,
  title,
  description,
}: ShareModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [hasNativeShare, setHasNativeShare] = useState(false);
  const [status, setStatus] =
    useState<ShareStatus>('idle');

  // ========================================================
  // URL SEGURA
  // ========================================================

  const normalizedUrl = useMemo(() => {
    return url?.trim() || '';
  }, [url]);

  const normalizedTitle = useMemo(() => {
    return title?.trim() || 'Credi Marketplace';
  }, [title]);

  const normalizedDescription = useMemo(() => {
    return (
      description?.trim() ||
      'Descubre este contenido en Credi Marketplace.'
    );
  }, [description]);

  // ========================================================
  // DETECTAR WEB SHARE API
  // ========================================================

  useEffect(() => {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function'
    ) {
      setHasNativeShare(true);
    } else {
      setHasNativeShare(false);
    }
  }, []);

  // ========================================================
  // BLOQUEAR SCROLL DEL BODY
  // ========================================================

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow =
        originalOverflow;
    };
  }, [isOpen]);

  // ========================================================
  // ESCAPE + FOCO
  // ========================================================

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === 'Escape') {
        onClose();
      }

      if (
        event.key === 'Tab' &&
        modalRef.current
      ) {
        const focusableElements =
          modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], input:not([disabled])',
          );

        if (!focusableElements.length) {
          return;
        }

        const first =
          focusableElements[0];

        const last =
          focusableElements[
            focusableElements.length - 1
          ];

        if (
          event.shiftKey &&
          document.activeElement === first
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === last
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener(
      'keydown',
      handleKeyDown,
    );

    window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown,
      );
    };
  }, [isOpen, onClose]);

  // ========================================================
  // RESET
  // ========================================================

  useEffect(() => {
    if (!isOpen) {
      setStatus('idle');
    }
  }, [isOpen]);

  // ========================================================
  // ENLACES SOCIALES
  // ========================================================

  const shareLinks = useMemo(() => {
    const encodedUrl =
      encodeURIComponent(normalizedUrl);

    const encodedTitle =
      encodeURIComponent(normalizedTitle);

    return [
      {
        name: 'WhatsApp',
        href: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
        icon: <WhatsAppIcon />,
        className:
          'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500',
      },
      {
        name: 'Telegram',
        href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
        icon: <TelegramIcon />,
        className:
          'bg-sky-500 hover:bg-sky-600 focus-visible:ring-sky-500',
      },
      {
        name: 'Facebook',
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        icon: <FacebookIcon />,
        className:
          'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500',
      },
      {
        name: 'X',
        href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
        icon: <XIcon />,
        className:
          'bg-slate-950 hover:bg-black focus-visible:ring-slate-500',
      },
    ];
  }, [normalizedTitle, normalizedUrl]);

  // ========================================================
  // SHARE NATIVO
  // ========================================================

  const handleNativeShare =
    useCallback(async () => {
      if (
        !normalizedUrl ||
        typeof navigator === 'undefined' ||
        typeof navigator.share !== 'function'
      ) {
        return;
      }

      setStatus('sharing');

      try {
        await navigator.share({
          title: normalizedTitle,
          text: normalizedDescription,
          url: normalizedUrl,
        });

        setStatus('idle');
        onClose();
      } catch (error: unknown) {
        if (
          error instanceof DOMException &&
          error.name === 'AbortError'
        ) {
          setStatus('idle');
          return;
        }

        console.error(
          'Error al compartir contenido:',
          error,
        );

        setStatus('error');
      }
    }, [
      normalizedDescription,
      normalizedTitle,
      normalizedUrl,
      onClose,
    ]);

  // ========================================================
  // COPIAR ENLACE
  // ========================================================

  const handleCopyLink =
    useCallback(async () => {
      if (!normalizedUrl) {
        return;
      }

      try {
        if (
          typeof navigator !== 'undefined' &&
          navigator.clipboard &&
          typeof navigator.clipboard.writeText ===
            'function'
        ) {
          await navigator.clipboard.writeText(
            normalizedUrl,
          );

          setStatus('copied');

          window.setTimeout(() => {
            setStatus('idle');
          }, 2500);

          return;
        }

        // --------------------------------------------------
        // FALLBACK LEGACY
        // --------------------------------------------------

        const textarea =
          document.createElement('textarea');

        textarea.value = normalizedUrl;
        textarea.setAttribute(
          'readonly',
          '',
        );

        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';

        document.body.appendChild(textarea);

        textarea.focus();
        textarea.select();

        const successful =
          document.execCommand('copy');

        textarea.remove();

        if (!successful) {
          throw new Error(
            'No fue posible copiar el enlace.',
          );
        }

        setStatus('copied');

        window.setTimeout(() => {
          setStatus('idle');
        }, 2500);
      } catch (error: unknown) {
        console.error(
          'Error al copiar enlace:',
          error,
        );

        setStatus('error');
      }
    }, [normalizedUrl]);

  // ========================================================
  // BACKDROP
  // ========================================================

  const handleBackdropMouseDown = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (
      event.target === event.currentTarget
    ) {
      onClose();
    }
  };

  // ========================================================
  // NO RENDER
  // ========================================================

  if (!isOpen) {
    return null;
  }

  // ========================================================
  // RENDER
  // ========================================================

  return (
    <div
      className="
        fixed
        inset-0
        z-[100]
        flex
        items-center
        justify-center
        bg-black/75
        p-4
        backdrop-blur-md
        animate-in
        fade-in
        duration-200
      "
      role="presentation"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        aria-describedby="share-modal-description"
        className="
          relative
          w-full
          max-w-md
          overflow-hidden
          rounded-3xl
          border
          border-border
          bg-card
          text-card-foreground
          shadow-2xl
          animate-in
          zoom-in-95
          slide-in-from-bottom-3
          duration-200
        "
      >
        {/* ==================================================
            DECORACIÓN SUPERIOR
        ================================================== */}

        <div
          className="
            absolute
            inset-x-0
            top-0
            h-1
            bg-gradient-to-r
            from-primary
            via-amber-500
            to-primary
          "
          aria-hidden="true"
        />

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="border-b border-border px-6 pb-5 pt-7">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana de compartir"
            className="
              absolute
              right-4
              top-5
              inline-flex
              h-9
              w-9
              items-center
              justify-center
              rounded-full
              text-muted-foreground
              transition-all
              hover:bg-muted
              hover:text-foreground
              focus:outline-none
              focus-visible:ring-2
              focus-visible:ring-primary
            "
          >
            <CloseIcon />
          </button>

          <div className="flex items-start gap-4 pr-8">
            <div
              className="
                flex
                h-12
                w-12
                shrink-0
                items-center
                justify-center
                rounded-2xl
                bg-primary/10
                text-primary
              "
              aria-hidden="true"
            >
              <ShareIcon className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <h2
                id="share-modal-title"
                className="
                  text-xl
                  font-black
                  tracking-tight
                  text-foreground
                "
              >
                Compartir contenido
              </h2>

              <p
                id="share-modal-description"
                className="
                  mt-1
                  line-clamp-2
                  text-sm
                  leading-relaxed
                  text-muted-foreground
                "
              >
                {normalizedTitle}
              </p>
            </div>
          </div>
        </div>

        {/* ==================================================
            CONTENIDO
        ================================================== */}

        <div className="space-y-6 p-6">
          {/* ==================================================
              SHARE NATIVO
          ================================================== */}

          {hasNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              disabled={
                status === 'sharing'
              }
              className="
                flex
                w-full
                items-center
                justify-center
                gap-3
                rounded-2xl
                bg-primary
                px-5
                py-3.5
                text-sm
                font-black
                text-primary-foreground
                shadow-lg
                shadow-primary/20
                transition-all
                hover:-translate-y-0.5
                hover:opacity-95
                focus:outline-none
                focus-visible:ring-2
                focus-visible:ring-primary
                focus-visible:ring-offset-2
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              <ShareIcon />

              {status === 'sharing'
                ? 'Abriendo opciones...'
                : 'Compartir con mis aplicaciones'}
            </button>
          )}

          {/* ==================================================
              REDES
          ================================================== */}

          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                Compartir directamente
              </span>

              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid grid-cols-4 gap-3">
              {shareLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Compartir en ${link.name}`}
                  title={`Compartir en ${link.name}`}
                  className={`
                    group
                    flex
                    aspect-square
                    items-center
                    justify-center
                    rounded-2xl
                    text-white
                    shadow-md
                    transition-all
                    hover:-translate-y-1
                    hover:shadow-xl
                    focus:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-offset-2
                    ${link.className}
                  `}
                >
                  <span className="transition-transform group-hover:scale-110">
                    {link.icon}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* ==================================================
              COPIAR URL
          ================================================== */}

          <div>
            <label
              htmlFor="share-url"
              className="
                mb-2
                block
                text-[11px]
                font-black
                uppercase
                tracking-[0.15em]
                text-muted-foreground
              "
            >
              Enlace para compartir
            </label>

            <div
              className="
                flex
                items-center
                gap-2
                rounded-2xl
                border
                border-border
                bg-muted/50
                p-1.5
                transition
                focus-within:border-primary
                focus-within:ring-2
                focus-within:ring-primary/10
              "
            >
              <input
                id="share-url"
                type="text"
                readOnly
                value={normalizedUrl}
                aria-label="Enlace para compartir"
                onFocus={(event) =>
                  event.currentTarget.select()
                }
                className="
                  min-w-0
                  flex-1
                  bg-transparent
                  px-3
                  py-2
                  text-xs
                  text-muted-foreground
                  outline-none
                "
              />

              <button
                type="button"
                onClick={handleCopyLink}
                disabled={!normalizedUrl}
                className={`
                  inline-flex
                  shrink-0
                  items-center
                  gap-2
                  rounded-xl
                  px-4
                  py-2.5
                  text-xs
                  font-black
                  transition-all
                  focus:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-primary
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  ${
                    status === 'copied'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-primary text-primary-foreground hover:opacity-90'
                  }
                `}
              >
                {status === 'copied' ? (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    Copiado
                  </>
                ) : (
                  <>
                    <CopyIcon className="h-4 w-4" />
                    Copiar
                  </>
                )}
              </button>
            </div>

            {/* =================================================
                ESTADO
            ================================================== */}

            {status === 'copied' && (
              <p
                className="
                  mt-2
                  flex
                  items-center
                  gap-1.5
                  text-xs
                  font-semibold
                  text-emerald-600
                  dark:text-emerald-400
                "
                role="status"
                aria-live="polite"
              >
                <CheckIcon className="h-4 w-4" />
                El enlace fue copiado correctamente.
              </p>
            )}

            {status === 'error' && (
              <p
                className="
                  mt-2
                  text-xs
                  font-medium
                  text-destructive
                "
                role="alert"
              >
                No fue posible completar la acción.
                Puedes seleccionar el enlace y copiarlo
                manualmente.
              </p>
            )}
          </div>
        </div>

        {/* ==================================================
            FOOTER
        ================================================== */}

        <div
          className="
            border-t
            border-border
            bg-muted/20
            px-6
            py-4
          "
        >
          <p
            className="
              text-center
              text-[10px]
              leading-relaxed
              text-muted-foreground
            "
          >
            Comparte contenido de forma rápida y segura
            desde <strong>Credi Marketplace</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
