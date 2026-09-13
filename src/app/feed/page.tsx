import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Feed | Credi Marketplace',
  description: 'Feed principal de Credi Marketplace con publicaciones, historias, reels y contenido comercial.',
}

export default function FeedPage() {
  redirect('/social')
}
