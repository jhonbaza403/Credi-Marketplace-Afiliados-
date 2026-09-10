"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, ShieldCheck } from "lucide-react";

type VerificationContext = {
  allowed: boolean;
  can_sell: boolean;
  email_confirmed: boolean;
  kyc_status: string;
  kyb_status: string;
  store_verified: boolean;
  risk_blocked: boolean;
  role: string;
  plan_code: string;
  next_action: string;
};

const labels: Record<string, string> = {
  not_started: "No iniciada",
  pending: "Pendiente",
  submitted: "Enviada",
  in_review: "En revisión",
  additional_information: "Información adicional requerida",
  approved: "Aprobada",
  rejected: "Rechazada",
  expired: "Vencida",
  suspended: "Suspendida",
};

export default function VerificationCenter() {
  const [data, setData] = useState<VerificationContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/b2b/access", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("No fue posible consultar tu estado de verificación.");
        return (await response.json()) as VerificationContext;
      })
      .then(setData)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "No fue posible consultar el estado."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <main className="mx-auto max-w-4xl px-4 py-12"><div className="h-48 animate-pulse rounded-3xl bg-muted" /></main>;
  if (error || !data) return <main className="mx-auto max-w-4xl px-4 py-12"><div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-muted-foreground">{error ?? "Estado no disponible."}</div></main>;

  const seller = ["vendor", "company", "professional", "admin"].includes(data.role);
  const identityOk = data.email_confirmed && data.kyc_status === "approved";
  const businessOk = !seller || (data.kyb_status === "approved" && data.store_verified);

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-[2rem] border border-border bg-card p-7 shadow-sm sm:p-10">
          <p className="text-xs font-black uppercase tracking-[.18em] text-primary">Credi Trust Center</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-5xl">Centro de verificación</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">Credi separa la cuenta real, la identidad verificada y la empresa verificada. El objetivo es reducir suplantaciones, cuentas falsas, abuso comercial y fraude dentro de Marketplace y B2B.</p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-3xl border border-border bg-card p-6 shadow-sm"><div className="flex items-center gap-3"><ShieldCheck className="size-6 text-primary" /><h2 className="text-lg font-black text-foreground">Identidad</h2></div><p className="mt-3 text-sm text-muted-foreground">Correo confirmado + verificación KYC aprobada.</p><div className="mt-5 flex items-center gap-2 text-sm font-bold">{identityOk ? <CheckCircle2 className="size-5 text-emerald-500" /> : <CircleAlert className="size-5 text-amber-500" />} {data.email_confirmed ? "Correo confirmado" : "Correo pendiente"} · {labels[data.kyc_status] ?? data.kyc_status}</div></article>
          <article className="rounded-3xl border border-border bg-card p-6 shadow-sm"><div className="flex items-center gap-3"><ShieldCheck className="size-6 text-primary" /><h2 className="text-lg font-black text-foreground">Empresa</h2></div><p className="mt-3 text-sm text-muted-foreground">Los vendedores B2B requieren KYB aprobado y una tienda verificada.</p><div className="mt-5 flex items-center gap-2 text-sm font-bold">{businessOk ? <CheckCircle2 className="size-5 text-emerald-500" /> : <CircleAlert className="size-5 text-amber-500" />} {seller ? `${labels[data.kyb_status] ?? data.kyb_status} · ${data.store_verified ? "Tienda verificada" : "Tienda pendiente"}` : "No requerida para esta cuenta"}</div></article>
        </section>

        <section className={`rounded-3xl border p-6 shadow-sm ${data.risk_blocked ? "border-destructive/20 bg-destructive/5" : "border-emerald-200 bg-emerald-50"}`}>
          <h2 className="text-lg font-black text-foreground">Monitoreo de riesgo</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Credi puede poner una operación en revisión cuando los controles de riesgo, AML, PEP o sanciones detecten una señal que requiera validación humana.</p>
          <p className="mt-4 text-sm font-black">Estado: {data.risk_blocked ? "REVISIÓN REQUERIDA" : "SIN ALERTAS ACTIVAS"}</p>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href="/compras-mayoristas" className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground">Volver a B2B</Link>
          <Link href="/pricing" className="rounded-xl border border-border px-5 py-3 text-sm font-black text-foreground">Ver planes</Link>
        </div>
      </div>
    </main>
  );
}
