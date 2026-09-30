import { redirect } from "next/navigation";

import { getDatabaseServerClient } from "@/lib/database/server";

export default async function VenderAlias() {
  const supabase = await getDatabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/publish");
  }

  redirect("/publish");
}
