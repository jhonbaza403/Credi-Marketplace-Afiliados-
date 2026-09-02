'use client';

import Link from 'next/link';

const cards = [
  { href: '/admin/users', title: 'Usuarios', description: 'Gestiona usuarios y roles.' },
  { href: '/admin/products', title: 'Productos', description: 'Supervisa el catálogo.' },
  { href: '/admin/orders', title: 'Órdenes', description: 'Consulta operaciones y pedidos.' },
  { href: '/admin/payments', title: 'Pagos', description: 'Revisa estados de pago.' },
];

export default function AdminDashboard() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-sm font-bold uppercase tracking-wide text-primary">Administración</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">Centro administrativo</h1>
        <p className="mt-2 text-muted-foreground">Gestiona las áreas principales de Credi Marketplace.</p>
      </header>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <h2 className="font-bold text-foreground">{card.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
