import { Coins } from 'lucide-react'
import { ModuleShell } from '@/components/advanced/ModuleShell'
import PaymentRailPanel from '@/components/checkout/PaymentRailPanel'

export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <ModuleShell
          eyebrow="Payments"
          title="Payment Orchestrator"
          description="Cinco rails en un único flujo: Stripe, Crypto, Bank transfer, Credi Wallet y Manual, con idempotencia, trazabilidad y liquidación segura."
          icon={<Coins className="size-7" />}
          endpoint="/api/payments/rails"
        >
          <p className="text-sm text-muted-foreground">
            Elige el método dentro del orquestador. Esta vista mantiene un único punto de acción para evitar controles de pago duplicados.
          </p>
        </ModuleShell>
        <PaymentRailPanel />
      </div>
    </main>
  )
}
