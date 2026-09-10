import { createClient } from "@/lib/supabase/server";

export type CommercialPlan = {
  id: string;
  code: "free" | "creator" | "business" | "enterprise";
  name: string;
  description: string;
  audience: "all" | "creator" | "vendor" | "business" | "enterprise";
  is_free: boolean;
  is_active: boolean;
  is_public: boolean;
  monthly_price_minor: number;
  yearly_price_minor: number;
  currency: string;
  trial_days: number;
  sort_order: number;
  limits: Record<string, number>;
};

const fallbackPlans: CommercialPlan[] = [
  {
    id: "fallback-free",
    code: "free",
    name: "Free",
    description: "Acceso gratuito al ecosistema social y marketplace esencial.",
    audience: "all",
    is_free: true,
    is_active: true,
    is_public: true,
    monthly_price_minor: 0,
    yearly_price_minor: 0,
    currency: "USD",
    trial_days: 0,
    sort_order: 10,
    limits: { products: 25, storage_mb: 250, social_posts_month: 20, team_members: 1 },
  },
  {
    id: "fallback-creator",
    code: "creator",
    name: "Creator",
    description: "Más alcance y herramientas para creadores, afiliados y vendedores independientes.",
    audience: "creator",
    is_free: false,
    is_active: true,
    is_public: true,
    monthly_price_minor: 900,
    yearly_price_minor: 9000,
    currency: "USD",
    trial_days: 0,
    sort_order: 20,
    limits: { products: 100, storage_mb: 2048, social_posts_month: 100, team_members: 1 },
  },
  {
    id: "fallback-business",
    code: "business",
    name: "Business",
    description: "Herramientas comerciales para tiendas y negocios con mayor capacidad operativa.",
    audience: "business",
    is_free: false,
    is_active: true,
    is_public: true,
    monthly_price_minor: 2900,
    yearly_price_minor: 29000,
    currency: "USD",
    trial_days: 0,
    sort_order: 30,
    limits: { products: 1000, storage_mb: 10240, social_posts_month: 500, team_members: 5 },
  },
  {
    id: "fallback-enterprise",
    code: "enterprise",
    name: "Enterprise",
    description: "Capacidades avanzadas, equipos, automatización e integraciones empresariales.",
    audience: "enterprise",
    is_free: false,
    is_active: true,
    is_public: true,
    monthly_price_minor: 9900,
    yearly_price_minor: 99000,
    currency: "USD",
    trial_days: 0,
    sort_order: 40,
    limits: { products: 10000, storage_mb: 102400, social_posts_month: 5000, team_members: 25 },
  },
];

export async function getPublicCommercialPlans(): Promise<CommercialPlan[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("plans")
      .select(
        "id,code,name,description,audience,is_free,is_active,is_public,monthly_price_minor,yearly_price_minor,currency,trial_days,sort_order,limits",
      )
      .eq("is_public", true)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data?.length) return fallbackPlans;
    return data as unknown as CommercialPlan[];
  } catch {
    return fallbackPlans;
  }
}

export function formatPlanPrice(plan: CommercialPlan, interval: "monthly" | "yearly"): string {
  const minor = interval === "monthly" ? plan.monthly_price_minor : plan.yearly_price_minor;
  if (minor === 0) return "Gratis";

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: plan.currency,
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

export const commercialPlanFeatures: Record<CommercialPlan["code"], string[]> = {
  free: [
    "Perfil social y presencia en Credi Marketplace",
    "Acceso al marketplace",
    "Afiliación básica",
    "Hasta 25 productos",
    "Hasta 20 publicaciones sociales al mes",
  ],
  creator: [
    "Todo lo incluido en Free",
    "Analítica social avanzada",
    "Impulso de contenido",
    "Hasta 100 productos",
    "Hasta 100 publicaciones sociales al mes",
  ],
  business: [
    "Todo lo incluido en Creator",
    "Analítica comercial",
    "Programación de publicaciones",
    "Hasta 1.000 productos",
    "Hasta 5 miembros de equipo",
  ],
  enterprise: [
    "Todo lo incluido en Business",
    "API e integraciones avanzadas",
    "Automatización avanzada",
    "Hasta 10.000 productos",
    "Soporte prioritario y hasta 25 miembros",
  ],
};
