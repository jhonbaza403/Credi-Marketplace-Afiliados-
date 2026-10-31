import type { Metadata } from 'next'
import DomainBridge from '@/components/portal/DomainBridge'
import CrediBusinessChat from '@/components/chat/CrediBusinessChat'
import CrediContactDirectory from '@/components/chat/CrediContactDirectory'
import CrediLiveChatPanel from '@/components/chat/CrediLiveChatPanel'
import AIAssistant from '@/components/ai/AIAssistant'

export const metadata: Metadata = {
  title: 'Credi Chat | Mensajería instantánea',
  description: 'Mensajería privada en tiempo real de Credi: conversaciones, grupos, canales, archivos, notas de voz y llamadas.',
  robots: { index: false, follow: false },
}

export default function ChatPage() {
  return (
    <main className="min-h-screen bg-[#040b20] text-white">
      <DomainBridge context="chat" />
      <CrediBusinessChat />
      <div className="mx-auto max-w-[1900px] space-y-3 px-3 pb-8 sm:px-5">
        <details className="rounded-2xl border border-blue-300/15 bg-[#071332] p-4">
          <summary className="cursor-pointer text-sm font-bold text-cyan-100">Directorio de contactos Credi</summary>
          <div className="pt-4"><CrediContactDirectory /></div>
        </details>
        <details className="rounded-2xl border border-blue-300/15 bg-[#071332] p-4">
          <summary className="cursor-pointer text-sm font-bold text-cyan-100">Herramientas Credi LIVE y asistente IA</summary>
          <div className="space-y-4 pt-4"><CrediLiveChatPanel /><AIAssistant /></div>
        </details>
      </div>
    </main>
  )
}
