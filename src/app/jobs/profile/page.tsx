import type { Metadata } from 'next'
import ProfessionalProfilePortal from '@/components/jobs/ProfessionalProfilePortal'

export const metadata: Metadata = {
  title: 'Mi perfil profesional | Credi',
  robots: { index: false, follow: false },
}
export default function ProfessionalProfilePage() {
  return <ProfessionalProfilePortal />
}
