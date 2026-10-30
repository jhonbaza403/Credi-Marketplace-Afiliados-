"use client";

import { FormEvent, useState } from "react";
import { BadgeCheck, Package, Sparkles } from "lucide-react";

interface B2BProductFormProps {
  onSubmit?: (data: { name: string; price: number; stock: number }) => void;
}

export default function B2BProductForm({ onSubmit }: B2BProductFormProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const numericPrice = Number(price);
    const numericStock = Number(stock);

    if (cleanName.length < 2) {
      setError("El nombre debe contener al menos 2 caracteres.");
      return;
    }
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setError("Introduce un precio válido mayor que cero.");
      return;
    }
    if (!Number.isInteger(numericStock) || numericStock < 0) {
      setError("El stock debe ser un número entero igual o mayor que cero.");
      return;
    }
    if (!onSubmit) {
      setError("El panel no ha configurado la acción para guardar este producto.");
      return;
    }

    onSubmit({ name: cleanName, price: numericPrice, stock: numericStock });
    setName("");
    setPrice("");
    setStock("");
  }

  return (
    <form onSubmit={submit} aria-label="Añadir producto B2B" className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-marketplace-xl)]">
      <header className="flex items-start gap-3 border-b border-[var(--border)] p-5 sm:p-6">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]"><Package className="size-5"/></span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-[var(--primary)]">Credi · Inventario B2B</p>
          <h2 className="mt-1 text-lg font-black">Añadir producto al inventario</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Registra los datos básicos. La publicación mayorista completa utiliza el proceso de verificación B2B.</p>
        </div>
      </header>

      <div className="space-y-4 p-5 sm:p-6">
        <label className="block text-sm font-semibold">
          Nombre del producto
          <input required minLength={2} maxLength={180} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Lote de accesorios electrónicos" className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]"/>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            Precio
            <input required type="number" min="0.01" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0.00" className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]"/>
          </label>
          <label className="block text-sm font-semibold">
            Stock
            <input required type="number" min="0" step="1" value={stock} onChange={(event) => setStock(event.target.value)} placeholder="0" className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]"/>
          </label>
        </div>

        {error && <p role="alert" className="rounded-xl border border-rose-300/40 bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}

        <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">
          <Sparkles className="size-4"/> Guardar en inventario
        </button>
        <p className="flex items-start gap-2 text-[11px] leading-5 text-[var(--muted)]"><BadgeCheck className="mt-0.5 size-3.5 shrink-0"/> La elegibilidad de venta B2B y la verificación de la empresa se controlan en el flujo mayorista.</p>
      </div>
    </form>
  );
}
