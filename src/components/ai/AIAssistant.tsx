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

type AiResponse = { text?: unknown; error?: unknown; code?: unknown }

const SUGGESTIONS = [
  'Encuentra oportunidades B2B para mi negocio',
  'Ayúdame a redactar una oferta comercial',
  'Analiza una oportunidad B2C y dime los próximos pasos',
  'Diseña una estrategia para entrar en un nuevo mercado',
]

const AI_TIMEOUT_MS = 18_000

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', content: 'Hola. Soy Credi AI, tu copiloto comercial. Puedo ayudarte a explorar mercados, detectar oportunidades, preparar ofertas, analizar escenarios y convertir una idea en acciones concretas para B2B y B2C.', timestamp: 'Ahora' },
  ])
  const [loading, setLoading] = useState(false)

  async function sendMessage(text: string) {
    const prompt = text.trim()
    if (!prompt || loading) return

    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', content: prompt, timestamp: 'Ahora' }])
    setLoading(true)

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), AI_TIMEOUT_MS)

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          prompt: `Eres Credi AI, copiloto comercial de Credi Marketplace. Responde en español claro, directo y accionable. Prioriza operaciones B2B y B2C, proveedores, ventas, negociación, catálogo, inventario, expansión, abastecimiento y estrategia. No inventes datos. Cuando falte un dato, dilo y pide solo lo mínimo necesario. Solicitud: ${prompt}`,
        }),
      })

      let result: AiResponse = {}
      try { result = (await response.json()) as AiResponse } catch { result = {} }

      const generatedText = typeof result.text === 'string' ? result.text.trim() : ''
      const apiError = typeof result.error === 'string' ? result.error : ''
      if (!response.ok || !generatedText) throw new Error(apiError || `No fue posible obtener una respuesta de Credi AI (HTTP ${response.status}).`)

      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', content: generatedText, timestamp: 'Ahora' }])
    } catch (error: unknown) {
      const message = error instanceof DOMException && error.name === 'AbortError'
        ? 'Credi AI superó el tiempo de respuesta. La solicitud se cerró para no bloquear tu operación.'
        : error instanceof Error ? error.message : 'No fue posible procesar la solicitud.'
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', content: message, timestamp: 'Ahora' }])
    } finally {
      window.clearTimeout(timeout)
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
    <section className="marketplace-card mx-auto flex min-h-[640px] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)] px-5 py-5 sm:px-7">
        <div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-lg"><Bot className="size-6" /></span><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[var(--primary)]">Credi AI · Copiloto comercial</p><h2 className="text-2xl font-black text-[var(--foreground)] sm:text-3xl">Inteligencia para vender, negociar y crecer</h2></div><span className="ml-auto hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[var(--muted)] sm:inline-flex"><Sparkles className="size-3.5" /> Respuesta rápida</span></div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">Explora mercados, prepara ofertas, analiza oportunidades y convierte decisiones comerciales en acciones B2B y B2C.</p>
      </header>
      <div className="flex-1 space-y-4 overflow-y-auto bg-[var(--surface-secondary)] p-5 sm:p-7" aria-live="polite">{messages.map((message) => <AIChatMessage key={message.id} {...message} />)}{loading ? <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]"><Loader2 className="size-4 animate-spin" /> Credi AI está procesando…</div> : null}</div>
      <div className="border-t border-[var(--border)] bg-[var(--surface)] px-5 py-4 sm:px-7"><div className="mb-3 flex gap-2 overflow-x-auto pb-1">{SUGGESTIONS.map((suggestion) => <button key={suggestion} type="button" disabled={loading} onClick={() => void sendMessage(suggestion)} className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2 text-xs font-bold text-[var(--foreground)] hover:bg-[var(--surface-tertiary)] disabled:cursor-wait disabled:opacity-50">{suggestion}</button>)}</div><form onSubmit={submit} className="flex gap-2"><input name="prompt" autoComplete="off" disabled={loading} placeholder="Pregúntale a Credi AI…" className="min-h-12 flex-1 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none disabled:opacity-70" /><button type="submit" disabled={loading} aria-label="Enviar a Credi AI" className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-lg transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-40"><Send className="size-5" /></button></form></div>
    </section>
  )
}
