import type { Metadata } from 'next'
import DomainBridge from "@/components/portal/DomainBridge"
import CrediBusinessChat from '@/components/chat/CrediBusinessChat'
import CrediContactDirectory from '@/components/chat/CrediContactDirectory'
import CrediLiveChatPanel from '@/components/chat/CrediLiveChatPanel'
import AIAssistant from '@/components/ai/AIAssistant'

export const metadata: Metadata = {
  title: 'Credi Chat | Mensajería instantánea y comercial',
  description: 'Mensajería privada, grupos, canales, archivos, notas de voz, llamadas y conversaciones comerciales de Credi Marketplace.',
  robots: { index: false, follow: false },
}

export default function ChatPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-[1760px] space-y-4 px-2 py-3 sm:px-5 sm:py-6">
        <DomainBridge context="chat" />
        <CrediContactDirectory />
        <CrediBusinessChat />
        <div className="grid gap-4 2xl:grid-cols-2">
          <CrediLiveChatPanel />
          <AIAssistant />
        </div>
      </div>
    </main>
  )
}
