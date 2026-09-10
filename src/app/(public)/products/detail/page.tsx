import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ id?: string; ref?: string }>;
};

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Producto | Credi Marketplace",
  robots: { index: false, follow: false },
};

export default async function LegacyProductDetailPage({ searchParams }: Props) {
  const params = await searchParams;
  const id = params.id?.trim();

  if (!id) {
    redirect("/products");
  }

  const query = params.ref?.trim()
    ? `?ref=${encodeURIComponent(params.ref.trim())}`
    : "";

  redirect(`/products/${encodeURIComponent(id)}${query}`);
}
