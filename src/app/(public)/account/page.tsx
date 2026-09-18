import type { Metadata } from "next";
import AccountCenter from "@/features/account/components/AccountCenter";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Mi cuenta | Credi Marketplace",
  description: "Gestiona tu cuenta, privacidad, productos y publicaciones.",
  robots: { index: false, follow: false },
};

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
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <AccountCenter
      userEmail={user.email ?? ""}
      initialName={profile?.full_name ?? user.user_metadata?.full_name ?? ""}
      loadError={profileError ? "No fue posible cargar los datos del perfil." : null}
    />
  );
}
