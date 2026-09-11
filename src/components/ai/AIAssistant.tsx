'use client'

import { FormEvent, useState } from 'react'
import { Bot, Loader2, Send, Sparkles } from 'lucide-react'
import AIChatMessage from './AIChatMessage'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const SUGGESTIONS = [
  'Encuentra oportunidades B2B para mi negocio',
  'Ayúdame a redactar una oferta comercial',
  '¿Cómo puedo mejorar mis ventas B2C?',
  'Prepara una estrategia para entrar en otro mercado',
]

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', content: 'Hola. Soy Credi AI, tu copiloto comercial. Puedo ayudarte a explorar mercados, preparar ofertas, analizar oportunidades y estructurar acciones B2B y B2C.', timestamp: 'Ahora' },
  ])
  const [loading, setLoading] = useState(false)

  async function sendMessage(text: string) {
    const prompt = text.trim()
    if (!prompt || loading) return
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', content: prompt, timestamp: 'Ahora' }])
    setLoading(true)
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt: `Eres Credi AI, copiloto comercial de Credi Marketplace. Responde en español con claridad y acciones concretas. Contexto: marketplace B2C, mercado B2B, afiliados, proveedores, Credi Business Chat y expansión internacional. Solicitud: ${prompt}` }),
      })
      const result = await response.json() as { text?: string; error?: string }
      if (!response.ok || !result.text) throw new Error(result.error || 'No fue posible obtener una respuesta de IA.')
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', content: result.text, timestamp: 'Ahora' }])
    } catch (error: unknown) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', content: error instanceof Error ? error.message : 'No fue posible procesar la solicitud.', timestamp: 'Ahora' }])
    } finally {
      setLoading(false)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const text = String(form.get('prompt') || '')
    event.currentTarget.reset()
    void sendMessage(text)
  }

  return (
    <section className="mx-auto flex min-h-[640px] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-marketplace-xl">
      <header className="border-b border-[var(--border)] bg-[var(--surface)] px-5 py-5 sm:px-7">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-lg"><Bot className="size-6" /></span>
          <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[var(--primary)]">Credi AI</p><h2 className="text-2xl font-black text-[var(--foreground)]">Copiloto comercial inteligente</h2></div>
          <span className="ml-auto hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[var(--muted)] sm:inline-flex"><Sparkles className="size-3.5" /> IA generativa</span>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">Genera respuestas en tiempo real para descubrir mercados, preparar negociaciones y tomar decisiones comerciales.</p>
      </header>
      <div className="flex-1 space-y-4 overflow-y-auto bg-[var(--surface-secondary)] p-5 sm:p-7">{messages.map((message) => <AIChatMessage key={message.id} {...message} />)}{loading ? <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]"><Loader2 className="size-4 animate-spin" /> Credi AI está analizando tu solicitud…</div> : null}</div>
      <div className="border-t border-[var(--border)] bg-[var(--surface)] px-5 py-4 sm:px-7">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">{SUGGESTIONS.map((suggestion) => <button key={suggestion} type="button" onClick={() => void sendMessage(suggestion)} className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2 text-xs font-bold text-[var(--foreground)] hover:bg-[var(--surface-tertiary)]">{suggestion}</button>)}</div>
        <form onSubmit={submit} className="flex gap-2">
          <input name="prompt" autoComplete="off" placeholder="Pregúntale a Credi AI…" className="min-h-12 flex-1 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" />
          <button type="submit" disabled={loading} aria-label="Enviar a Credi AI" className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-white disabled:opacity-40"><Send className="size-5" /></button>
        </form>
      </div>
    </section>
  )
}
