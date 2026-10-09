import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import SecuritySettings from '@/features/auth/components/SecuritySettings';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Seguridad de la cuenta | Credi Marketplace',
  description: 'Administra la autenticación en dos pasos y las llaves de acceso de tus dispositivos.',
  robots: { index: false, follow: false },
};

export default async function SecurityPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error && error.name !== 'AuthSessionMissingError') {
    throw error;
  }

  if (!user) {
    redirect('/login?next=/security');
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <SecuritySettings />
      <div className="mx-auto mt-6 w-full max-w-5xl rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-black">Observabilidad de operaciones</h2>
        <p className="mt-1 text-sm text-muted-foreground">Reconstruye una operación completa con su operation_id: pago, webhook, comisión, settlement, Wallet y notificaciones.</p>
        <Link href="/security/operations" className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground">Abrir trazabilidad operativa</Link>
      </div>
    </main>
  );
}
