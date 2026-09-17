import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Social | Credi Marketplace',
  description: 'Acceso compatible al Feed social de Credi Marketplace.',
}

export default function SocialLegacyRoute() {
  redirect('/feed')
}
