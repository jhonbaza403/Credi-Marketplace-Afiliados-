"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 8;
type PublicRole = "customer" | "vendor";

type SignupErrorDetails = {
  code?: unknown;
  message?: unknown;
  status?: unknown;
};

function getSignupErrorMessage(error: unknown): string {
  const details = (error && typeof error === "object"
    ? error
    : {}) as SignupErrorDetails;
  const code = typeof details.code === "string" ? details.code.toLowerCase() : "";
  const message = typeof details.message === "string" ? details.message.toLowerCase() : "";
  const status = typeof details.status === "number" ? details.status : 0;

  if (code === "weak_password" || message.includes("password should be")) {
    return "La contraseña no cumple los requisitos de seguridad. Usa al menos 8 caracteres y vuelve a intentarlo.";
  }

  if (code === "email_address_invalid" || message.includes("email address") && message.includes("invalid")) {
    return "El correo electrónico no es válido. Comprueba la dirección e inténtalo nuevamente.";
  }

  if (code === "signup_disabled") {
    return "El registro está deshabilitado en este entorno. No se creó ninguna cuenta.";
  }

  if (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    status === 429
  ) {
    return "Se alcanzó el límite temporal de registros o correos de confirmación. Espera un momento y vuelve a intentarlo.";
  }

  if (
    code === "email_exists" ||
    code === "user_already_exists" ||
    message.includes("already registered") ||
    message.includes("already exists")
  ) {
    return "No fue posible usar ese correo para crear una cuenta. Prueba iniciar sesión o recuperar la contraseña.";
  }

  if (
    code === "unexpected_failure" ||
    message.includes("database error saving new user") ||
    message.includes("gen_random_bytes")
  ) {
    return "El servicio no pudo guardar el perfil de la cuenta. No se completó el registro. Inténtalo nuevamente; si persiste, contacta al Centro de Atención con el código AUTH_PROFILE_SETUP_FAILED.";
  }

  return "No se pudo completar el registro. Comprueba el correo, el teléfono y la contraseña e inténtalo nuevamente.";
}

export function normalizePhone(value: string) {
  const compact = value.trim().replace(/[\s().-]/g, "");
  if (!/^\+[1-9]\d{6,14}$/.test(compact)) return null;
  return compact;
}

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
    const normalizedPhone = normalizePhone(phone);

    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Introduce un nombre y un correo electrónico válidos.");
      return;
    }
    if (!normalizedPhone) {
      setError("Introduce el número con código de país, por ejemplo +58 412 1234567.");
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
        options: { data: { full_name: name, requested_role: role, phone_e164: normalizedPhone } }
      });

      if (signUpError) {
        setError(getSignupErrorMessage(signUpError));
        return;
      }

      if (!data.user) {
        setError("No recibimos la confirmación de creación de la cuenta. No se inició sesión; inténtalo nuevamente.");
        return;
      }

      // The auth.users trigger creates the profile and stores phone_e164 in the
      // same transaction. Do not perform a second client-side profile write here.
      if (!data.session) {
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
          <label className="block text-sm font-semibold">Número telefónico internacional<input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 w-full rounded-xl border p-3" placeholder="+58 412 1234567" autoComplete="tel" inputMode="tel" pattern={"\\+[1-9][0-9\\s().-]{6,20}"} title="Incluye el código de país, por ejemplo +58 412 1234567." /></label>
          <p className="-mt-3 text-xs text-neutral-500">Usa el código de país. Ejemplo: +58 Venezuela, +34 España, +1 EE. UU./Canadá.</p>
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
