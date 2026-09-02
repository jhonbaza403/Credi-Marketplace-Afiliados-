export type SupportedLocale = 'es' | 'en' | 'pt' | 'fr';

export interface LocalizedText {
  es: string;
  en: string;
  pt: string;
  fr: string;
}

export interface AffiliateProduct {
  id: string;
  name: string;
  partner: {
    id: string;
    name: string;
  };
  category: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  affiliateUrl: string;
  url?: string;
  buttonText: LocalizedText;
  icon: string;
  badge: string;
  badgeColor?: string;
  badgeVariant:
    | 'primary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info';
  tracking: {
    enabled: boolean;
    campaign?: string;
    source?: string;
  };
  availability: {
    active: boolean;
    countries?: string[];
  };
}
