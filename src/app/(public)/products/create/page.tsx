import { redirect } from "next/navigation";

import CreateProductForm from "@/features/marketplace/components/CreateProductForm";
import { getDatabaseServerClient } from "@/lib/database/server";

export const metadata = {
  title: "Publicar producto | Credi Marketplace",
  description: "Publica un producto desde tu cuenta independiente.",
  robots: { index: false, follow: false },
};

export default async function CreateProductPage() {
  const supabase = await getDatabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/products/create");

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Vender</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">Publicar tu producto</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Tu publicación queda asociada únicamente a tu cuenta y a tu tienda personal. Otros usuarios no pueden modificarla ni verla mientras no esté publicada.
        </p>
        <div className="mt-8">
          <CreateProductForm />
        </div>
      </section>
    </main>
  );
}
