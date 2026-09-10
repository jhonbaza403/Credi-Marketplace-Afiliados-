import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
};

export const dynamic = "force-dynamic";

async function resolveProductId(slug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data?.id) return null;
  return data.id;
}

export default async function LegacySlugProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { ref } = await searchParams;
  const id = await resolveProductId(slug);

  if (!id) redirect("/products");

  const query = ref?.trim() ? `?ref=${encodeURIComponent(ref.trim())}` : "";
  redirect(`/products/${encodeURIComponent(id)}${query}`);
}
