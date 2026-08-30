'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

interface AffiliateCopyButtonProps {
  /**
   * Ruta relativa del enlace de afiliado.
   *
   * Ejemplo:
   * /ref/123456
   */
  affiliatePath: string
}

export default function AffiliateCopyButton({
  affiliatePath,
}: AffiliateCopyButtonProps) {
  const [fullUrl, setFullUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /**
   * Construye la URL absoluta utilizando el origen
   * real de la aplicación.
   *
   * Se ejecuta únicamente en el cliente.
   */
  useEffect(() => {
    if (!affiliatePath?.trim()) {
      setFullUrl('')
      return
    }

    const path = affiliatePath.trim()

    // Si ya es una URL absoluta, se conserva.
    if (/^https?:\/\//i.test(path)) {
      setFullUrl(path)
      return
    }

    setFullUrl(
      `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`,
    )
  }, [affiliatePath])

  /**
   * Limpieza del temporizador cuando el componente
   * desaparece del árbol de React.
   */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  /**
   * Copia el enlace de afiliado al portapapeles.
   */
  const handleCopy = useCallback(async () => {
    const urlToCopy = fullUrl || affiliatePath?.trim()

    if (!urlToCopy) {
      return
    }

    setCopyError(false)

    try {
      await navigator.clipboard.writeText(urlToCopy)

      setCopied(true)

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (error) {
      console.error(
        'Error al copiar el enlace de afiliado:',
        error,
      )

      setCopied(false)
      setCopyError(true)

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        setCopyError(false)
      }, 3000)
    }
  }, [affiliatePath, fullUrl])

  const displayUrl = fullUrl || affiliatePath || ''

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={displayUrl}
          aria-label="Enlace de afiliado"
          title={displayUrl}
          onFocus={(event) => event.currentTarget.select()}
          className="
            min-w-0
            flex-1
            rounded-lg
            border
            border-border
            bg-muted
            px-2.5
            py-2
            text-[11px]
            text-muted-foreground
            font-mono
            select-all
            focus:outline-none
            focus:ring-2
            focus:ring-primary/40
          "
        />

        <button
          type="button"
          onClick={handleCopy}
          disabled={!displayUrl}
          aria-label={
            copied
              ? 'Enlace copiado'
              : 'Copiar enlace de afiliado'
          }
          className={`
            shrink-0
            rounded-lg
            px-3
            py-2
            text-[11px]
            font-semibold
            transition-all
            focus:outline-none
            focus:ring-2
            focus:ring-primary/40
            ${
              copied
                ? 'bg-emerald-600 text-white'
                : copyError
                  ? 'bg-destructive text-destructive-foreground'
                  : 'bg-primary text-primary-foreground hover:opacity-90'
            }
            disabled:cursor-not-allowed
            disabled:opacity-50
          `}
        >
          {copied
            ? '✓ Copiado'
            : copyError
              ? 'Error'
              : 'Copiar'}
        </button>
      </div>

      {/* Mensaje accesible para lectores de pantalla */}
      <span
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {copied
          ? 'El enlace de afiliado fue copiado al portapapeles.'
          : copyError
            ? 'No fue posible copiar el enlace de afiliado.'
            : ''}
      </span>
    </div>
  )
}
