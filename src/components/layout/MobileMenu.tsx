'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Sparkles, MessageCircle, ChevronDown } from 'lucide-react';
import { PORTAL_DOMAINS, PORTAL_PILLARS, PRIMARY_DOMAINS } from '@/config/portal';

const PRIMARY_LINKS = PRIMARY_DOMAINS.filter((domain) => domain.key !== 'sell');

const PILLAR_GROUPS = PORTAL_PILLARS.map((pillar) => ({
  ...pillar,
  items: PORTAL_DOMAINS.filter((domain) => domain.pillar === pillar.key),
}));

function getPortalHref(key: string) {
  return PORTAL_DOMAINS.find((domain) => domain.key === key)?.href ?? '/';
}

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/10 p-2.5 text-white"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-[100] max-h-[calc(100dvh-72px)] overflow-y-auto border-t border-white/10 bg-[#07101f]/98 p-4 pb-6 shadow-2xl backdrop-blur-xl">
          <nav aria-label="Navegación móvil Credi" className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {PRIMARY_LINKS.map(({ key, label, href }) => (
                <Link
                  key={key}
                  href={href}
                  onClick={close}
                  className="rounded-xl bg-white/5 px-3 py-3 text-sm font-black text-white/90"
                >
                  {label}
                </Link>
              ))}
            </div>

            <div className="space-y-2">
              {PILLAR_GROUPS.map((pillar) => (
                <details key={pillar.key} className="group rounded-2xl border border-white/10 bg-white/5">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-black text-white [&::-webkit-details-marker]:hidden">
                    <span>
                      {pillar.title}
                      <span className="mt-1 block text-xs font-normal text-white/55">{pillar.description}</span>
                    </span>
                    <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="grid grid-cols-1 gap-1 px-2 pb-2 sm:grid-cols-2">
                    {pillar.items.map(({ key, label, href }) => (
                      <Link
                        key={key}
                        href={href}
                        onClick={close}
                        className="rounded-xl px-3 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10"
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                </details>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Link
                href={getPortalHref('sell')}
                onClick={close}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-3 text-sm font-black text-white"
              >
                <Sparkles className="size-4" /> Publicar
              </Link>
              <Link
                href={getPortalHref('chat')}
                onClick={close}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 py-3 text-sm font-black text-white"
              >
                <MessageCircle className="size-4" /> Chat
              </Link>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
