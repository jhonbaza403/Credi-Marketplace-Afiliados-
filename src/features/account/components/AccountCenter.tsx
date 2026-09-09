"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AccountCenter() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!active) return;
        if (userError || !user) {
          setLoading(false);
          return;
        }
        setUserEmail(user.email ?? "");
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
        if (!active) return;
        setName(profile?.full_name ?? user.user_metadata?.full_name ?? "");
      } catch (error: unknown) {
        console.error("[AccountCenter] account load error", error);
        if (active) setMessage("No fue posible cargar la cuenta. Revisa la configuración pública de Supabase.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

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
      const { error } = await supabase.from("profiles").update({ full_name: name.trim() || null }).eq("id", user.id);
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

  if (loading) {
    return <main className="mx-auto max-w-5xl px-4 py-16 text-center text-sm text-muted-foreground">Cargando tu cuenta...</main>;
  }

  if (!userEmail) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <section className="rounded-3xl border border-border bg-card p-8 text-center shadow-sm sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Acceso al portal</p>
          <h1 className="mt-3 text-3xl font-black text-foreground">Inicia sesión con tu correo electrónico</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Tu cuenta es independiente. Tu perfil, pedidos, productos y publicaciones quedan separados del resto de usuarios.</p>
          <Link href="/login?next=/account" className="mt-7 inline-flex rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground">Ingresar con mi correo</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="rounded-3xl border border-border bg-card p-7 shadow-sm sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Cuenta independiente</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">Tu espacio privado</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Aquí gestionas tus datos personales y accedes a las herramientas que pertenecen exclusivamente a tu cuenta.</p>
        </header>

        <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/products/create" className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"><span className="text-2xl">🛍️</span><h2 className="mt-4 font-black">Publicar producto</h2><p className="mt-2 text-sm text-muted-foreground">Crea tu propia publicación comercial.</p></Link>
          <Link href="/publish" className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"><span className="text-2xl">✍️</span><h2 className="mt-4 font-black">Publicar contenido</h2><p className="mt-2 text-sm text-muted-foreground">Historias, reels, publicaciones y publicidad.</p></Link>
          <Link href="/social" className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"><span className="text-2xl">📣</span><h2 className="mt-4 font-black">Comunidad</h2><p className="mt-2 text-sm text-muted-foreground">Consulta el contenido público del ecosistema.</p></Link>
          <Link href="/orders" className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"><span className="text-2xl">📦</span><h2 className="mt-4 font-black">Mis pedidos</h2><p className="mt-2 text-sm text-muted-foreground">Solo ves las operaciones relacionadas con tu cuenta.</p></Link>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-black text-foreground">Datos de la cuenta</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-semibold">Correo electrónico<input readOnly value={userEmail} className="mt-2 w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm" aria-label="Correo electrónico de la cuenta" /></label>
            <label className="block text-sm font-semibold">Nombre público<input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30" aria-label="Nombre del perfil" /></label>
          </div>
          {message && <p role="status" aria-live="polite" className="mt-5 rounded-xl bg-muted p-3 text-sm">{message}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" disabled={saving} onClick={() => void saveProfile()} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving ? "Guardando..." : "Guardar cambios"}</button>
            <button type="button" onClick={() => void signOut()} className="rounded-xl border border-border bg-background px-5 py-3 text-sm font-bold text-foreground hover:bg-muted">Cerrar sesión</button>
          </div>
        </section>
      </div>
    </main>
  );
}
