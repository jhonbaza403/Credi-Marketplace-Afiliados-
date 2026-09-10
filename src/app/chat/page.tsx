import type { Metadata } from 'next'
import CrediChat from '@/components/chat/CrediChat'

export const metadata: Metadata = {
  title: 'Credi Chat | Credi Marketplace',
  description: 'Comunicación comercial integrada entre compradores, vendedores, proveedores y empresas.',
  robots: { index: false, follow: false },
}

export default function ChatPage() {
  return <CrediChat />
}
