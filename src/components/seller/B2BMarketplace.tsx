"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, Store, UserRoundCheck } from "lucide-react";

import { useAuth } from "@/i18n/hooks/use-auth";
import { useCart } from "@/i18n/hooks/use-cart";
import { useProducts } from "@/i18n/hooks/use-products";
import { useUser } from "@/i18n/hooks/use-user";


type B2BContext = {
  allowed: boolean;
  can_sell: boolean;
  active: boolean;
  email_confirmed: boolean;
  kyc_status: string;
  kyb_status: string;
  store_verified: boolean;
  risk_blocked: boolean;
  role: string;
  plan_code: string;
  next_action: string;
};

const statusText: Record<string, string> = {
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

function StatusRow({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card/70 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {ok ? <CheckCircle2 className="size-5 shrink-0 text-emerald-500" /> : <ShieldCheck className="size-5 shrink-0 text-amber-500" />}
        <span className="truncate text-sm font-semibold text-foreground">{label}</span>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${ok ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}>
        {value}
      </span>
    </div>
  );
}

export default function B2BMarketplace() {
  const { profile, isAdmin, loading: authLoading } = useAuth();
  const { user, isAuthenticated } = useUser();
  const { products, loading, error, refresh } = useProducts();
  const { addToCart, totalItems } = useCart();
  const [verification, setVerification] = useState<B2BContext | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(true);

  const loadVerification = useCallback(async () => {
    if (!user?.id) return;
    setVerificationLoading(true);
    const response = await fetch("/api/b2b/access", { cache: "no-store" });
    if (response.ok) setVerification((await response.json()) as B2BContext);
    setVerificationLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void loadVerification();
  }, [loadVerification]);

  const displayName = profile?.fullName ?? profile?.full_name ?? user?.email ?? "Cliente";
  const role = verification?.role ?? profile?.role ?? "customer";
  const isSellerRole = ["vendor", "company", "professional", "admin"].includes(role) || isAdmin;
  const b2bAllowed = Boolean(verification?.allowed);

  if (authLoading || verificationLoading) {
    return (
      <section aria-busy="true" className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-24 animate-pulse rounded-xl bg-muted/70" />
        <div className="h-52 animate-pulse rounded-2xl bg-muted/50" />
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="rounded-3xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-black text-foreground">Espacio empresarial B2B</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Inicia sesión para activar tu espacio y comenzar la verificación de confianza.</p>
        <Link href="/login?next=/compras-mayoristas" className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground">Iniciar sesión</Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-primary"><Store className="size-4" /> Credi Business Space</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-5xl">Hola, {displayName}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">Tu espacio empresarial B2B está habilitado como área de trabajo. Para comprar y vender dentro del canal empresarial, Credi valida identidad, empresa y señales de riesgo antes de liberar las operaciones.</p>
          </div>
          <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm font-bold text-foreground">Plan: <span className="uppercase">{verification?.plan_code ?? "free"}</span></div>
        </div>
      </header>

      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-primary">Trust & Safety</p>
            <h2 className="mt-1 text-2xl font-black text-foreground">Verificación obligatoria para operar</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">La etiqueta de confianza no se concede por un simple campo de perfil: requiere controles de autenticación, KYC, KYB para vendedores y detección de señales de riesgo.</p>
          </div>
          <Link href="/account/verificacion" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-black text-foreground hover:bg-muted"><UserRoundCheck className="size-4" /> Centro de verificación</Link>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <StatusRow label="Correo electrónico confirmado" ok={Boolean(verification?.email_confirmed)} value={verification?.email_confirmed ? "Verificado" : "Pendiente"} />
          <StatusRow label="Identidad (KYC)" ok={verification?.kyc_status === "approved"} value={statusText[verification?.kyc_status ?? "not_started"] ?? verification?.kyc_status ?? "No iniciada"} />
          {isSellerRole && <StatusRow label="Empresa (KYB)" ok={verification?.kyb_status === "approved"} value={statusText[verification?.kyb_status ?? "not_started"] ?? verification?.kyb_status ?? "No iniciada"} />}
          {isSellerRole && <StatusRow label="Tienda verificada" ok={Boolean(verification?.store_verified)} value={verification?.store_verified ? "Verificada" : "Pendiente"} />}
          <StatusRow label="Control de riesgo" ok={!verification?.risk_blocked} value={verification?.risk_blocked ? "Bloqueado / revisión" : "Sin alertas"} />
        </div>

        {!b2bAllowed ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
            <strong>Operaciones B2B aún no liberadas.</strong> Tu espacio ya existe, pero Credi mantendrá bloqueados los pedidos empresariales hasta completar los controles de confianza. Esto reduce el riesgo de cuentas falsas, suplantaciones y vendedores fraudulentos.
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/account/verificacion" className="rounded-xl bg-amber-900 px-4 py-2.5 text-xs font-black text-white">Completar verificación</Link>
              <Link href="/pricing" className="rounded-xl border border-amber-300 px-4 py-2.5 text-xs font-black text-amber-950">Ver planes</Link>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-950"><strong>Cuenta habilitada para operar B2B.</strong> Las publicaciones de proveedores siguen sujetas a KYC + KYB + tienda verificada y a los controles continuos de riesgo.</div>
        )}
      </section>

      {b2bAllowed && (
        <>
          <header className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-foreground">Productos disponibles</h2>
              <p className="text-sm text-muted-foreground">Precios y stock según la respuesta actual del marketplace.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-full border border-border bg-muted px-4 py-2 text-sm font-bold text-foreground">Carrito: {totalItems}</div>
              <button type="button" onClick={() => void refresh()} disabled={loading} className="rounded-xl border border-border px-3 py-2 text-sm font-bold text-foreground disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Actualizando…" : "Actualizar"}</button>
            </div>
          </header>

          {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}

          {loading && products.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Cargando productos…</div>
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center"><h3 className="font-bold text-foreground">No hay productos disponibles</h3><p className="mt-1 text-sm text-muted-foreground">El catálogo B2B no tiene productos verificados para mostrar en este momento.</p></div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => {
                const image = product.images?.[0] ?? null;
                const canAdd = product.isActive && product.stock > 0;
                return (
                  <article key={product.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    {image ? <img src={image} alt={product.title} loading="lazy" className="aspect-video w-full object-cover" /> : <div className="aspect-video w-full bg-muted" />}
                    <div className="space-y-3 p-5">
                      <div><h3 className="font-black text-foreground">{product.title}</h3><p className="mt-1 text-lg font-black text-foreground">{new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(product.price)}</p></div>
                      <p className="text-xs text-muted-foreground">Stock disponible: {Math.max(0, product.stock)}</p>
                      <button type="button" disabled={!canAdd} onClick={() => addToCart({ id: product.id, name: product.title, price: product.price, quantity: 1, image })} className="w-full rounded-xl bg-foreground px-4 py-2.5 text-sm font-black text-background disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground">{canAdd ? "Añadir al carrito" : "No disponible"}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
