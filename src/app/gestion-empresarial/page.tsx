import type { Metadata } from 'next'
import BusinessControlCenter from '@/components/dashboard/BusinessControlCenter'

export const metadata: Metadata = {
  title: 'Gestión empresarial | Credi Marketplace',
  description: 'Centro privado para administrar inventario, catálogos, B2B, publicaciones, historias y operaciones comerciales en Credi Marketplace.',
  robots: { index: false, follow: false },
}

export default function BusinessManagementPage() {
  return <BusinessControlCenter />
}
