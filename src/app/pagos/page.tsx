import { Coins } from 'lucide-react'
import { ModuleShell } from '@/components/advanced/ModuleShell'
import StripeCheckoutForm from '@/components/checkout/StripeCheckoutForm'
export const dynamic = 'force-dynamic'
export default function Page() {
  return <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl">
      <ModuleShell eyebrow="Payments" title="Payment Orchestrator" description="Una única intención de pago para Stripe, cripto, transferencias bancarias, Credi Wallet y confirmación manual. Cada intento tiene idempotencia, estado y trazabilidad." icon={<Coins className="size-7" />} endpoint="/api/payments/orchestrator">
        <div className="grid gap-4 md:grid-cols-5">{['Stripe','Crypto','Bank transfer','Wallet','Manual'].map((x)=><div key={x} className="rounded-2xl border border-border bg-muted/20 p-4 text-sm font-black">{x}<p className="mt-1 text-xs font-medium text-muted-foreground">Rail configurado</p></div>)}</div>
      </ModuleShell>
      <section id="stripe-checkout" className="scroll-mt-24 pt-8"><StripeCheckoutForm /></section>
    </div>
  </main>
}
