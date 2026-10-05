import type { Metadata } from "next";
import AccountCenter from "@/features/account/components/AccountCenter";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Mi perfil | Credi Marketplace",
  description: "Una identidad para tu vida social, comercio, reputación, afiliación, B2B y LIVE.",
  robots: { index: false, follow: false },
};

type ProfileSnapshot = {
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
};

type IdentityStats = {
  stores: number;
  affiliate: number;
  reputation: number;
  b2b: number;
  live: number;
  social: number;
};

async function countOwned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  column: string,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, userId);

  if (error) {
    console.warn("[AccountPage] identity metric unavailable", { table, message: error.message });
    return 0;
  }

  return count ?? 0;
}

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) {
    return <AccountCenter userEmail="" initialName="" loadError="No fue posible validar la sesión. Inténtalo nuevamente." />;
  }

  if (!user) {
    return <AccountCenter userEmail="" initialName="" />;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  const row = (profile ?? null) as ProfileSnapshot | null;

  const [stores, affiliate, reputation, b2b, live, feed, stories, reels] = await Promise.all([
    countOwned(supabase, "stores", "vendor_id", user.id),
    countOwned(supabase, "affiliates", "user_id", user.id),
    countOwned(supabase, "transaction_ratings", "reviewee_id", user.id),
    countOwned(supabase, "b2b_products", "supplier_id", user.id),
    countOwned(supabase, "chat_live_rooms", "host_user_id", user.id),
    countOwned(supabase, "feed_posts", "owner_id", user.id),
    countOwned(supabase, "stories", "owner_id", user.id),
    countOwned(supabase, "reels", "owner_id", user.id),
  ]);

  const stats: IdentityStats = {
    stores,
    affiliate,
    reputation,
    b2b,
    live,
    social: feed + stories + reels,
  };

  return (
    <AccountCenter
      userEmail={user.email ?? ""}
      initialName={row?.full_name ?? user.user_metadata?.full_name ?? ""}
      avatarUrl={row?.avatar_url ?? null}
      role={row?.role ?? "customer"}
      isActive={row?.is_active ?? true}
      stats={stats}
      loadError={profileError ? "No fue posible cargar los datos del perfil." : null}
    />
  );
}
