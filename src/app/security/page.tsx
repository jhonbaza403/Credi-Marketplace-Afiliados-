import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import SecuritySettings from '@/features/auth/components/SecuritySettings';
import { getCurrentUser } from '@/features/auth/services/authService';

export const metadata: Metadata = {
  title: 'Seguridad de la cuenta | Credi Marketplace',
  description: 'Administra la autenticación en dos pasos y las llaves de acceso de tus dispositivos.',
  robots: { index: false, follow: false },
};

export default async function SecurityPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?next=/security');
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <SecuritySettings />
    </main>
  );
}
