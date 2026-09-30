import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DomainBridge from "@/components/portal/DomainBridge";
import MarketingStudio from "@/features/marketing/MarketingStudio";

export const metadata={title:"Marketing Studio | Credi Marketplace",description:"Campañas, audiencias, creatividades y medición de Credi.",robots:{index:false,follow:false}};

export default async function MarketingPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect("/login?next=/marketing");
  return <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><DomainBridge context="marketing"/><MarketingStudio/></div></main>;
}
