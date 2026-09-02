'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface AffiliateCopyButtonProps {
  affiliatePath?: string;
  url?: string;
}

export default function AffiliateCopyButton({
  affiliatePath,
  url,
}: AffiliateCopyButtonProps) {
  const source = (url ?? affiliatePath ?? '').trim();
  const [fullUrl, setFullUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!source) {
      setFullUrl('');
      return;
    }

    if (/^https?:\/\//i.test(source)) {
      setFullUrl(source);
      return;
    }

    setFullUrl(`${window.location.origin}${source.startsWith('/') ? source : `/${source}`}`);
  }, [source]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    const value = fullUrl || source;
    if (!value) return;

    setCopyError(false);
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('[AffiliateCopyButton] Error al copiar:', error);
      setCopied(false);
      setCopyError(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopyError(false), 3000);
    }
  }, [fullUrl, source]);

  const displayUrl = fullUrl || source;

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
          className="min-w-0 flex-1 rounded-lg border border-border bg-muted px-2.5 py-2 text-[11px] font-mono text-muted-foreground select-all focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="button"
          onClick={handleCopy}
          disabled={!displayUrl}
          className="shrink-0 rounded-lg bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copied ? '✓ Copiado' : copyError ? 'Error' : 'Copiar'}
        </button>
      </div>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? 'El enlace de afiliado fue copiado al portapapeles.' : copyError ? 'No fue posible copiar el enlace de afiliado.' : ''}
      </span>
    </div>
  );
}
