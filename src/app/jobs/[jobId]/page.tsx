import type { Metadata } from 'next'
import JobDetailPortal from '@/components/jobs/JobDetailPortal'

export const metadata: Metadata = {
  title: 'Oportunidad profesional | Credi',
  robots: { index: false, follow: false },
}
export default async function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  return <JobDetailPortal jobId={jobId} />
}
