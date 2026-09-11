import type { Metadata } from 'next'
import CrediBusinessChat from '@/components/chat/CrediBusinessChat'
import CrediContactDirectory from '@/components/chat/CrediContactDirectory'
import CrediLiveChatPanel from '@/components/chat/CrediLiveChatPanel'
import AIAssistant from '@/components/ai/AIAssistant'

export const metadata: Metadata = {
  title: 'Credi Business Chat | Credi Marketplace',
  description: 'Canal oficial de mensajería comercial, negociación, multimedia, llamadas, Credi LIVE y copiloto IA de Credi Marketplace.',
  robots: { index: false, follow: false },
}

export default function ChatPage() {
  return (
    <main className="bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-[1600px] space-y-6 px-3 py-4 sm:px-6 sm:py-8">
        <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-marketplace-lg sm:p-8">
          <p className="text-xs font-black uppercase tracking-[.18em] text-brand-600 dark:text-brand-400">Credi Commerce Network</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-5xl">Comunicación comercial inteligente</h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-[var(--muted)]">Conecta con vendedores y proveedores mediante Credi Business Chat, trabaja sobre operaciones reales y utiliza Credi AI como copiloto para preparar consultas, ofertas y estrategias comerciales.</p>
        </section>
        <CrediContactDirectory />
        <CrediBusinessChat />
        <CrediLiveChatPanel />
        <AIAssistant />
      </div>
    </main>
  )
}
