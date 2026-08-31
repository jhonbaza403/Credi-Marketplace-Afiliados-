"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem, clearCart } = useCart();
  const total = useMemo(() => Number(subtotal.toFixed(2)), [subtotal]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold text-brand-600">Compra</p><h1 className="mt-1 text-4xl font-black">Tu carrito</h1></div>{items.length > 0 && <button onClick={clearCart} className="text-sm font-semibold text-red-600">Vaciar</button>}</div>
      {items.length === 0 ? <section className="mt-10 rounded-3xl border border-marketplace-border bg-white p-10 text-center"><p className="text-neutral-600">Tu carrito está vacío.</p><Link href="/marketplace" className="mt-5 inline-flex rounded-xl bg-brand-600 px-5 py-3 font-bold text-white">Explorar marketplace</Link></section> : <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]"><section className="space-y-4">{items.map((item) => <article key={item.id} className="flex gap-4 rounded-2xl border border-marketplace-border bg-white p-5"><div className="min-w-0 flex-1"><h2 className="font-bold">{item.name}</h2><p className="mt-1 text-sm text-neutral-500">{item.currency ?? "USD"} {item.price.toFixed(2)}</p><div className="mt-4 flex items-center gap-3"><button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="rounded-lg border px-3 py-1" aria-label="Disminuir cantidad">−</button><span className="min-w-6 text-center">{item.quantity}</span><button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="rounded-lg border px-3 py-1" aria-label="Aumentar cantidad">+</button><button onClick={() => removeItem(item.id)} className="ml-auto text-sm font-semibold text-red-600">Eliminar</button></div></div></article>)}</section><aside className="h-fit rounded-3xl border border-marketplace-border bg-white p-6 shadow-marketplace"><h2 className="text-xl font-black">Resumen</h2><div className="mt-6 flex justify-between border-t pt-5 font-black"><span>Total</span><span>{total.toFixed(2)}</span></div><Link href="/checkout" className="mt-6 block rounded-xl bg-brand-600 px-5 py-3 text-center font-bold text-white">Continuar al checkout</Link></aside></div>}
    </main>
  );
}
