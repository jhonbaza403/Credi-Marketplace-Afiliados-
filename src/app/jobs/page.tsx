import type { Metadata } from 'next'
import JobsPortal from '@/components/jobs/JobsPortal'

export const metadata: Metadata = {
  title: 'Empleo y talento | Credi',
  description: 'Descubre oportunidades profesionales y conecta empresas con talento en Credi.',
}
export const dynamic = 'force-dynamic'

export default function JobsPage() {
  return <JobsPortal />
}
