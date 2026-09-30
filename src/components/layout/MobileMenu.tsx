'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Sparkles, MessageCircle } from 'lucide-react';
import { CAPABILITY_DOMAINS, PRIMARY_DOMAINS } from '@/config/portal';

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
        <div className="absolute left-0 right-0 top-full z-[100] border-t border-white/10 bg-[#07101f]/98 p-4 shadow-2xl backdrop-blur-xl">
          <nav aria-label="Navegación móvil Credi" className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {PRIMARY_DOMAINS.map(({ label, href }) => (
                <Link key={href} href={href} onClick={close} className="rounded-xl bg-white/5 px-3 py-3 text-sm font-black text-white/90">
                  {label}
                </Link>
              ))}
            </div>

            <div>
              <p className="px-1 pb-2 text-[10px] font-black uppercase tracking-[.18em] text-white/50">Capacidades</p>
              <div className="grid grid-cols-2 gap-2">
                {CAPABILITY_DOMAINS.map(({ label, href }) => (
                  <Link key={href} href={href} onClick={close} className="rounded-xl bg-white/5 px-3 py-3 text-sm font-semibold text-white/80">
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Link href="/publish" onClick={close} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-3 text-sm font-black text-white">
                <Sparkles className="size-4" /> Publicar
              </Link>
              <Link href="/chat" onClick={close} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 py-3 text-sm font-black text-white">
                <MessageCircle className="size-4" /> Chat
              </Link>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
