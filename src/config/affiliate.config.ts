// ==========================================================
// Credi Marketplace — External Affiliate Providers
// ==========================================================
// These URLs are configured as outbound affiliate destinations.
// Provider commissions are paid according to each provider's
// own affiliate agreement. Do not promise downstream commissions
// unless the provider explicitly permits that model.

export const AFFILIATE_PROVIDERS = {
  amazon: {
    id: "amazon",
    name: "Amazon",
    url: "https://amzn.to/4bJJq22",
    disclosure: "Enlace de afiliado. Credi Marketplace puede recibir una comisión por compras que califiquen.",
  },
  shein: {
    id: "shein",
    name: "SHEIN",
    url: "https://onelink.shein.com/44/5wyleaujbj2iI",
    disclosure: "Enlace de afiliado. Credi Marketplace puede recibir una comisión por compras que califiquen.",
  },
  aliexpress: {
    id: "aliexpress",
    name: "AliExpress",
    url: "https://s.click.aliexpress.com/e/_c33p0iw",
    disclosure: "Enlace de afiliado. Credi Marketplace puede recibir una comisión por compras que califiquen.",
  },
  alibaba: {
    id: "alibaba",
    name: "Alibaba.com",
    url: "https://offer.alibaba.com/cps/t9vapivb?bm=cps&src=saf",
    disclosure: "Enlace de afiliado. Credi Marketplace puede recibir una comisión por compras que califiquen.",
  },
} as const;

export type AffiliateProviderId = keyof typeof AFFILIATE_PROVIDERS;

export function getAffiliateProvider(id: string) {
  if (!(id in AFFILIATE_PROVIDERS)) return null;
  return AFFILIATE_PROVIDERS[id as AffiliateProviderId];
}
