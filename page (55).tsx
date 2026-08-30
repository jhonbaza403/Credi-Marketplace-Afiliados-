"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 8;
type PublicRole = "customer" | "vendor";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<PublicRole>("customer");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const name = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Introduce un nombre y un correo electrónico válidos.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH || password !== confirmPassword) {
      setError("La contraseña debe tener al menos 8 caracteres y coincidir con la confirmación.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: { full_name: name, requested_role: role } }
      });

      if (signUpError) {
        setError("No fue posible crear la cuenta. Verifica los datos e inténtalo nuevamente.");
        return;
      }

      if (data.user && !data.session) {
        router.push(`/verify?email=${encodeURIComponent(normalizedEmail)}`);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-marketplace-background px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-marketplace-border bg-white p-8 shadow-marketplace-lg">
        <h1 className="text-3xl font-black tracking-tight text-neutral-950">Crear cuenta</h1>
        <p className="mt-2 text-sm text-neutral-600">Forma parte de Credi Marketplace.</p>
        {error && <p role="alert" className="mt-5 rounded-xl bg-danger-50 p-3 text-sm text-danger-700">{error}</p>}
        <form onSubmit={submit} className="mt-7 space-y-5">
          <label className="block text-sm font-semibold">Nombre completo<input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-2 w-full rounded-xl border p-3" autoComplete="name" /></label>
          <label className="block text-sm font-semibold">Correo<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border p-3" autoComplete="email" /></label>
          <label className="block text-sm font-semibold">Tipo de cuenta<select value={role} onChange={(e) => setRole(e.target.value as PublicRole)} className="mt-2 w-full rounded-xl border p-3"><option value="customer">Cliente</option><option value="vendor">Vendedor</option></select></label>
          <label className="block text-sm font-semibold">Contraseña<input required minLength={MIN_PASSWORD_LENGTH} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border p-3" autoComplete="new-password" /></label>
          <label className="block text-sm font-semibold">Confirmar contraseña<input required minLength={MIN_PASSWORD_LENGTH} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-2 w-full rounded-xl border p-3" autoComplete="new-password" /></label>
          <button disabled={pending} className="w-full rounded-xl bg-brand-600 px-5 py-3 font-bold text-white disabled:opacity-60">{pending ? "Creando…" : "Crear cuenta"}</button>
        </form>
        <p className="mt-6 text-center text-sm text-neutral-600">¿Ya tienes cuenta? <Link href="/login" className="font-bold text-brand-600">Iniciar sesión</Link></p>
      </section>
    </main>
  );
}
