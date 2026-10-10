import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Acceso administrativo | Credi Marketplace",
  description: "Acceso privado del equipo de administración de Credi Marketplace.",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto mb-6 max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 text-slate-100">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Credi Marketplace · Administración</p>
        <h1 className="mt-2 text-2xl font-black">Acceso administrativo independiente</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Este acceso es exclusivo para cuentas autorizadas por la plataforma. Una cuenta de consumidor o vendedor no obtiene privilegios administrativos por entrar aquí.
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
