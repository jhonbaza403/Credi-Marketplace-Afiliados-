import { Coins } from 'lucide-react'
import { ModuleShell } from '@/components/advanced/ModuleShell'
import PaymentRailPanel from '@/components/checkout/PaymentRailPanel'

export const dynamic = 'force-dynamic'

export default function Page() {
  return <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><ModuleShell eyebrow="Payments" title="Payment Orchestrator" description="Cinco Rails en un único flujo: Stripe, Crypto, Bank transfer, Credi Wallet y Manual, con idempotencia, trazabilidad y liquidación segura." icon={<Coins className="size-7" />} endpoint="/api/payments/rails"><div className="grid gap-4 md:grid-cols-5">{[['Stripe','Checkout automático'],['Crypto','Verificación blockchain'],['Bank transfer','Verificación bancaria'],['Wallet','Liquidación interna'],['Manual','Confirmación administrativa']].map(([name,detail])=><div key={name} className="rounded-2xl border border-border bg-muted/20 p-4 text-sm font-black">{name}<p className="mt-1 text-xs font-medium text-muted-foreground">{detail}</p></div>)}</div></ModuleShell><PaymentRailPanel /></div></main>
}
