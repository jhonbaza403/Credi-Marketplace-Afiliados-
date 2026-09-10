import type { Metadata } from 'next'
import CrediBusinessChat from '@/components/chat/CrediBusinessChat'
import CrediContactDirectory from '@/components/chat/CrediContactDirectory'
import CrediLiveChatPanel from '@/components/chat/CrediLiveChatPanel'

export const metadata: Metadata = {
  title: 'Credi Business Chat | Credi Marketplace',
  description: 'Canal oficial de mensajería, negociación comercial, multimedia, llamadas y Credi LIVE de Credi Marketplace.',
  robots: { index: false, follow: false },
}

export default function ChatPage() {
  return (
    <>
      <CrediContactDirectory />
      <CrediBusinessChat />
      <CrediLiveChatPanel />
    </>
  )
}
