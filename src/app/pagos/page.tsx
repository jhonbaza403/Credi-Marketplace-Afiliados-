import { Coins } from 'lucide-react'
import { ModuleShell } from '@/components/advanced/ModuleShell'
import PaymentRailPanel from '@/components/checkout/PaymentRailPanel'

export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-slate-900 dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <ModuleShell
          eyebrow="Payments"
          title="Payment Orchestrator"
          description="Cinco rails en un único flujo: Stripe, Crypto, Bank transfer, Credi Wallet y Manual, con idempotencia, trazabilidad y liquidación segura."
          icon={<Coins className="size-7" />}
          endpoint="/api/payments/rails"
        >
          <div className="sr-only">Los métodos de pago se seleccionan en el panel de pagos inferior.</div>
        </ModuleShell>
        <PaymentRailPanel />
      </div>
    </main>
  )
}
