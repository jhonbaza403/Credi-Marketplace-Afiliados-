import type { Metadata } from 'next'
import CrediBusinessChat from '@/components/chat/CrediBusinessChat'
import CrediContactDirectory from '@/components/chat/CrediContactDirectory'
import CrediChatInteractionLayer from '@/components/chat/CrediChatInteractionLayer'

export const metadata: Metadata = {
  title: 'Credi Business Chat | Credi Marketplace',
  description: 'Canal oficial de mensajería, negociación comercial, multimedia y llamadas de Credi Marketplace.',
  robots: { index: false, follow: false },
}

export default function ChatPage() {
  return (
    <>
      <CrediContactDirectory />
      <CrediBusinessChat />
      <CrediChatInteractionLayer />
    </>
  )
}
