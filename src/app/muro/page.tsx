import AccountCenter from '@/features/account/components/AccountCenter'

export const metadata = {
  title: 'Muro · Mi perfil | Credi Marketplace',
  description: 'Tu muro personal: perfil, publicaciones y actividad dentro de Credi Marketplace.',
  robots: { index: false, follow: false },
}

export default function MuroPage() {
  return (
    <main aria-label="Muro personal de Credi Marketplace">
      <AccountCenter />
    </main>
  )
}
