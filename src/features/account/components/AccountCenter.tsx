"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type IdentityStats = {
  stores: number;
  affiliate: number;
  reputation: number;
  b2b: number;
  live: number;
  social: number;
};

interface AccountCenterProps {
  userEmail: string;
  initialName: string;
  avatarUrl?: string | null;
  role?: string;
  isActive?: boolean;
  stats?: IdentityStats;
  loadError?: string | null;
}

const emptyStats: IdentityStats = {
  stores: 0,
  affiliate: 0,
  reputation: 0,
  b2b: 0,
  live: 0,
  social: 0,
};

const roleLabels: Record<string, string> = {
  customer: "Cliente",
  vendor: "Vendedor",
  professional: "Profesional",
  company: "Empresa",
  admin: "Administrador",
};

export default function AccountCenter({
  userEmail,
  initialName,
  avatarUrl = null,
  role = "customer",
  isActive = true,
  stats = emptyStats,
  loadError = null,
}: AccountCenterProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function saveProfile() {
    setSaving(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login?next=/account");
        return;
      }

      const normalizedName = name.trim();
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: normalizedName || null })
        .eq("id", user.id);

      if (error) throw error;
      setMessage("Perfil actualizado correctamente.");
    } catch (error: unknown) {
      console.error("[AccountCenter] profile update error", error);
      setMessage(error instanceof Error ? error.message : "No fue posible actualizar el perfil.");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      router.replace("/");
      router.refresh();
    }
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <section className="rounded-3xl border border-border bg-card p-8 text-center shadow-sm sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-destructive">Perfil</p>
          <h1 className="mt-3 text-3xl font-black text-foreground">No fue posible cargar tu perfil</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{loadError}</p>
        </section>
      </main>
    );
  }

  if (!userEmail) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <section className="rounded-3xl border border-border bg-card p-8 text-center shadow-sm sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Identidad Credi</p>
          <h1 className="mt-3 text-3xl font-black text-foreground">Inicia sesión para acceder a tu perfil</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Una sola identidad conecta tu actividad social y comercial, reputación, afiliación, B2B y LIVE.</p>
          <Link href="/login?next=/account" className="mt-7 inline-flex rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground">Ingresar con mi correo</Link>
        </section>
      </main>
    );
  }

  const displayName = name.trim() || "Usuario Credi";
  const initials = displayName.slice(0, 1).toUpperCase();

  const domains = [
    { href: "/social", icon: "📣", title: "Social", text: `${stats.social} publicaciones, historias o reels` },
    { href: "/marketplace", icon: "🛍️", title: "Comercio", text: `${stats.stores} tienda(s) asociada(s)` },
    { href: "/dashboard/reputation", icon: "⭐", title: "Reputación", text: `${stats.reputation} valoración(es) recibida(s)` },
    { href: "/affiliate", icon: "🔗", title: "Afiliación", text: `${stats.affiliate} perfil(es) de afiliado` },
    { href: "/b2b", icon: "🏢", title: "B2B", text: `${stats.b2b} oferta(s) B2B` },
    { href: "/live", icon: "🔴", title: "LIVE Commerce", text: `${stats.live} sala(s) LIVE` },
  ];

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-primary/80 px-7 py-8 text-white sm:px-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/30 bg-white/10 text-2xl font-black">
                  {avatarUrl ? <img src={avatarUrl} alt="" className="size-full object-cover" /> : initials}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Una identidad · un perfil</p>
                  <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{displayName}</h1>
                  <p className="mt-1 text-sm text-white/75">{userEmail}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-white/15 px-3 py-2">{roleLabels[role] ?? role}</span>
                <span className="rounded-full bg-white/15 px-3 py-2">{isActive ? "Cuenta activa" : "Cuenta restringida"}</span>
              </div>
            </div>
            <p className="mt-7 max-w-3xl text-sm leading-6 text-white/80">
              Tu identidad Credi es la misma en la red social de comercio, marketplace, reputación, afiliación, B2B y LIVE. Las capacidades se activan sobre este perfil; no necesitas cuentas paralelas.
            </p>
          </div>

          <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Social", stats.social],
              ["Tiendas", stats.stores],
              ["Reputación", stats.reputation],
              ["Afiliación", stats.affiliate],
              ["B2B", stats.b2b],
              ["LIVE", stats.live],
            ].map(([label, value]) => (
              <div key={label} className="p-4">
                <p className="text-2xl font-black text-foreground">{value}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </header>

        <section>
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Perfil 360°</p>
            <h2 className="mt-1 text-2xl font-black text-foreground">Una identidad, todo Credi</h2>
            <p className="mt-2 text-sm text-muted-foreground">Cada dominio reutiliza tu identidad y tu historial de confianza, sin separar lo personal de lo comercial.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {domains.map((domain) => (
              <Link key={domain.href} href={domain.href} className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <span className="text-2xl">{domain.icon}</span>
                <h3 className="mt-3 font-black text-foreground">{domain.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{domain.text}</p>
                <span className="mt-4 inline-flex text-sm font-bold text-primary group-hover:underline">Abrir →</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Link href="/products/create" className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <span className="text-2xl">🛍️</span><h2 className="mt-4 font-black">Publicar producto</h2><p className="mt-2 text-sm text-muted-foreground">Publica desde la misma identidad que participa en la comunidad.</p>
          </Link>
          <Link href="/publish" className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <span className="text-2xl">✍️</span><h2 className="mt-4 font-black">Publicar contenido</h2><p className="mt-2 text-sm text-muted-foreground">Historias, reels y publicaciones conectadas al comercio.</p>
          </Link>
          <Link href="/orders" className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <span className="text-2xl">📦</span><h2 className="mt-4 font-black">Mis pedidos</h2><p className="mt-2 text-sm text-muted-foreground">Consulta tus operaciones comerciales desde la misma cuenta.</p>
          </Link>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Identidad editable</p>
          <h2 className="mt-2 text-xl font-black text-foreground">Datos públicos del perfil</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-semibold">Correo electrónico<input readOnly value={userEmail} className="mt-2 w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm" aria-label="Correo electrónico de la cuenta" /></label>
            <label className="block text-sm font-semibold">Nombre público<input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30" aria-label="Nombre del perfil" /></label>
          </div>
          {message && <p role="status" aria-live="polite" className="mt-5 rounded-xl bg-muted p-3 text-sm">{message}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" disabled={saving} onClick={() => void saveProfile()} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving ? "Guardando..." : "Guardar cambios"}</button>
            <Link href="/security" className="rounded-xl border border-border bg-background px-5 py-3 text-sm font-bold text-foreground hover:bg-muted">Seguridad</Link>
            <button type="button" onClick={() => void signOut()} className="rounded-xl border border-border bg-background px-5 py-3 text-sm font-bold text-foreground hover:bg-muted">Cerrar sesión</button>
          </div>
        </section>
      </div>
    </main>
  );
}
