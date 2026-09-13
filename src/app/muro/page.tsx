import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Muro | Credi Marketplace',
  description: 'Muro personal de Credi Marketplace: tu perfil, publicaciones y actividad.',
  robots: { index: false, follow: false },
}

export default function MuroPage() {
  redirect('/account')
}
