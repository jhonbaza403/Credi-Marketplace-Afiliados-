'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, Instagram, Mail, Send, Share2 } from 'lucide-react';

import { CANONICAL_APP_URL } from '@/lib/app-url';

interface ProductShareProps {
  productId: string;
  title: string;
  description?: string | null;
  affiliateRef?: string | null;
}

type ShareTarget =
  | 'whatsapp'
  | 'facebook'
  | 'x'
  | 'telegram'
  | 'pinterest'
  | 'email'
  | 'instagram'
  | 'tiktok';

function buildProductUrl(productId: string, affiliateRef?: string | null): string {
  const url = new URL(`/products/${encodeURIComponent(productId)}`, CANONICAL_APP_URL);
  const ref = affiliateRef?.trim();
  if (ref) url.searchParams.set('ref', ref);
  return url.toString();
}

export default function ProductShare({
  productId,
  title,
  description,
  affiliateRef,
}: ProductShareProps) {
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const shareUrl = useMemo(
    () => buildProductUrl(productId, affiliateRef),
    [productId, affiliateRef],
  );

  const shareText = useMemo(() => {
    const cleanDescription = description?.trim();
    return cleanDescription ? `${title} — ${cleanDescription}` : title;
  }, [title, description]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setMessage('Enlace copiado. Ahora puedes pegarlo en Instagram, TikTok, Facebook, WhatsApp o cualquier red.');
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setMessage(`Copia este enlace: ${shareUrl}`);
    }
  }

  async function nativeShare() {
    if (!navigator.share) {
      await copyLink();
      return;
    }

    try {
      await navigator.share({ title, text: shareText, url: shareUrl });
      setMessage('Producto compartido.');
    } catch {
      setMessage('El panel de compartir fue cerrado.');
    }
  }

  function openShare(target: ShareTarget) {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);
    const encodedTitle = encodeURIComponent(title);

    const targets: Record<ShareTarget, string> = {
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      pinterest: `https://www.pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedText}`,
      email: `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`,
      instagram: shareUrl,
      tiktok: shareUrl,
    };

    if (target === 'instagram' || target === 'tiktok') {
      void copyLink();
      return;
    }

    window.open(targets[target], '_blank', 'noopener,noreferrer,width=760,height=720');
  }

  return (
    <section
      aria-labelledby="product-share-title"
      className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
          <Share2 aria-hidden="true" className="size-5" />
        </div>
        <div className="min-w-0">
          <h2 id="product-share-title" className="text-sm font-black text-[var(--foreground)]">
            Haz viral este producto
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Un enlace único para compartirlo en redes sociales, mensajería y comunidades.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button type="button" onClick={() => openShare('whatsapp')} aria-label="Compartir por WhatsApp" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs font-bold text-[var(--foreground)] hover:bg-[var(--surface-secondary)]">WhatsApp</button>
        <button type="button" onClick={() => openShare('facebook')} aria-label="Compartir en Facebook" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs font-bold text-[var(--foreground)] hover:bg-[var(--surface-secondary)]">Facebook</button>
        <button type="button" onClick={() => openShare('x')} aria-label="Compartir en X" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs font-bold text-[var(--foreground)] hover:bg-[var(--surface-secondary)]">X</button>
        <button type="button" onClick={() => openShare('telegram')} aria-label="Compartir en Telegram" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs font-bold text-[var(--foreground)] hover:bg-[var(--surface-secondary)]">Telegram</button>
        <button type="button" onClick={() => openShare('pinterest')} aria-label="Compartir en Pinterest" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs font-bold text-[var(--foreground)] hover:bg-[var(--surface-secondary)]">Pinterest</button>
        <button type="button" onClick={() => openShare('instagram')} aria-label="Preparar enlace para Instagram" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs font-bold text-[var(--foreground)] hover:bg-[var(--surface-secondary)]"><Instagram aria-hidden="true" className="size-4" />Instagram</button>
        <button type="button" onClick={() => openShare('tiktok')} aria-label="Preparar enlace para TikTok" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs font-bold text-[var(--foreground)] hover:bg-[var(--surface-secondary)]">TikTok</button>
        <button type="button" onClick={() => openShare('email')} aria-label="Compartir por correo electrónico" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs font-bold text-[var(--foreground)] hover:bg-[var(--surface-secondary)]"><Mail aria-hidden="true" className="size-4" />Correo</button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => void nativeShare()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-black text-white hover:opacity-90">
          <Send aria-hidden="true" className="size-4" />Compartir ahora
        </button>
        <button type="button" onClick={() => void copyLink()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-bold text-[var(--foreground)] hover:bg-[var(--surface-secondary)]">
          {copied ? <Check aria-hidden="true" className="size-4 text-emerald-500" /> : <Copy aria-hidden="true" className="size-4" />}
          {copied ? 'Enlace copiado' : 'Copiar enlace viral'}
        </button>
      </div>

      {message && (
        <p role="status" aria-live="polite" className="mt-3 break-words rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs leading-5 text-[var(--muted)]">
          {message}
        </p>
      )}
    </section>
  );
}
