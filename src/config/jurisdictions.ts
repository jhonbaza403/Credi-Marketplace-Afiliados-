export type JurisdictionCode =
  | "EU"
  | "US-CA"
  | "US-FED"
  | "BR"
  | "CO"
  | "MX"
  | "AR"
  | "CL"
  | "CA"
  | "AU"
  | "VE"
  | "GLOBAL";

export interface JurisdictionPolicy {
  code: JurisdictionCode;
  name: string;
  privacyFramework: string[];
  marketplaceRequirements: string[];
  marketingRequirements: string[];
  consumerRequirements: string[];
  internationalTransferControl: boolean;
  cookieConsentRequired: boolean;
  sellerIdentityDisclosure: boolean;
  rightToDeletion: boolean;
  rightToAccess: boolean;
  optOutMarketing: boolean;
  notes: string;
}

export const JURISDICTION_POLICIES: Record<JurisdictionCode, JurisdictionPolicy> = {
  EU: {
    code: "EU",
    name: "Unión Europea / EEE",
    privacyFramework: ["GDPR"],
    marketplaceRequirements: ["DSA marketplace transparency", "seller/trader status disclosure", "ranking transparency"],
    marketingRequirements: ["consent or other lawful basis", "affiliate/material-connection disclosure"],
    consumerRequirements: ["pre-contract information", "delivery information", "withdrawal rights where applicable"],
    internationalTransferControl: true,
    cookieConsentRequired: true,
    sellerIdentityDisclosure: true,
    rightToDeletion: true,
    rightToAccess: true,
    optOutMarketing: true,
    notes: "La legislación nacional puede añadir requisitos al marco europeo.",
  },
  "US-CA": {
    code: "US-CA",
    name: "California, Estados Unidos",
    privacyFramework: ["CCPA/CPRA"],
    marketplaceRequirements: ["seller information and marketplace disclosures as applicable"],
    marketingRequirements: ["clear advertising/affiliate disclosures", "opt-out of sale/sharing where applicable"],
    consumerRequirements: ["clear pricing and business practices", "consumer complaint pathways"],
    internationalTransferControl: true,
    cookieConsentRequired: true,
    sellerIdentityDisclosure: true,
    rightToDeletion: true,
    rightToAccess: true,
    optOutMarketing: true,
    notes: "El alcance depende de umbrales y del tratamiento concreto de datos.",
  },
  "US-FED": {
    code: "US-FED",
    name: "Estados Unidos — federal",
    privacyFramework: ["FTC Act / sectoral privacy laws"],
    marketplaceRequirements: ["seller verification/disclosure where applicable", "recordkeeping for covered sellers"],
    marketingRequirements: ["truthful advertising", "endorsement and affiliate disclosure"],
    consumerRequirements: ["fair/deceptive practices controls"],
    internationalTransferControl: true,
    cookieConsentRequired: true,
    sellerIdentityDisclosure: true,
    rightToDeletion: false,
    rightToAccess: false,
    optOutMarketing: true,
    notes: "Estados y sectores pueden imponer requisitos adicionales.",
  },
  BR: {
    code: "BR",
    name: "Brasil",
    privacyFramework: ["LGPD"],
    marketplaceRequirements: ["platform transparency", "seller information"],
    marketingRequirements: ["lawful basis", "clear commercial communication"],
    consumerRequirements: ["consumer information", "complaints and cancellation controls"],
    internationalTransferControl: true,
    cookieConsentRequired: true,
    sellerIdentityDisclosure: true,
    rightToDeletion: true,
    rightToAccess: true,
    optOutMarketing: true,
    notes: "Las transferencias internacionales deben usar un mecanismo válido bajo la LGPD y reglas ANPD.",
  },
  CO: {
    code: "CO",
    name: "Colombia",
    privacyFramework: ["Ley 1581", "Habeas Data"],
    marketplaceRequirements: ["electronic commerce information duties", "proof of acceptance"],
    marketingRequirements: ["marketing consent/preferences", "truthful advertising"],
    consumerRequirements: ["electronic-commerce disclosures", "consumer rights and withdrawal where applicable"],
    internationalTransferControl: true,
    cookieConsentRequired: true,
    sellerIdentityDisclosure: true,
    rightToDeletion: true,
    rightToAccess: true,
    optOutMarketing: true,
    notes: "Debe revisarse también la normativa nacional aplicable al producto/sector.",
  },
  MX: {
    code: "MX",
    name: "México",
    privacyFramework: ["LFPDPPP"],
    marketplaceRequirements: ["privacy notice", "seller/business disclosures"],
    marketingRequirements: ["commercial communication controls"],
    consumerRequirements: ["consumer information and cancellation rules"],
    internationalTransferControl: true,
    cookieConsentRequired: true,
    sellerIdentityDisclosure: true,
    rightToDeletion: true,
    rightToAccess: true,
    optOutMarketing: true,
    notes: "La ley y sus disposiciones vigentes deben revisarse según el tratamiento y sector.",
  },
  AR: {
    code: "AR",
    name: "Argentina",
    privacyFramework: ["Ley 25.326"],
    marketplaceRequirements: ["consumer and seller transparency"],
    marketingRequirements: ["direct-marketing controls", "data rights"],
    consumerRequirements: ["electronic commerce consumer information"],
    internationalTransferControl: true,
    cookieConsentRequired: true,
    sellerIdentityDisclosure: true,
    rightToDeletion: true,
    rightToAccess: true,
    optOutMarketing: true,
    notes: "Revisar requisitos registrales y sectoriales cuando correspondan.",
  },
  CL: {
    code: "CL",
    name: "Chile",
    privacyFramework: ["Ley 19.628 / normativa de protección de datos vigente"],
    marketplaceRequirements: ["consumer information", "seller transparency"],
    marketingRequirements: ["marketing preference controls"],
    consumerRequirements: ["electronic consumer information"],
    internationalTransferControl: true,
    cookieConsentRequired: true,
    sellerIdentityDisclosure: true,
    rightToDeletion: true,
    rightToAccess: true,
    optOutMarketing: true,
    notes: "Aplicar la normativa vigente a la fecha de operación y su régimen transitorio.",
  },
  CA: {
    code: "CA",
    name: "Canadá",
    privacyFramework: ["PIPEDA", "provincial privacy laws where applicable"],
    marketplaceRequirements: ["accountability", "purpose disclosure"],
    marketingRequirements: ["CASL consent/opt-out controls"],
    consumerRequirements: ["clear commercial information"],
    internationalTransferControl: true,
    cookieConsentRequired: true,
    sellerIdentityDisclosure: true,
    rightToDeletion: false,
    rightToAccess: true,
    optOutMarketing: true,
    notes: "Las obligaciones varían por provincia y actividad.",
  },
  AU: {
    code: "AU",
    name: "Australia",
    privacyFramework: ["Privacy Act 1988"],
    marketplaceRequirements: ["business/seller transparency", "consumer safeguards"],
    marketingRequirements: ["spam/marketing controls"],
    consumerRequirements: ["Australian Consumer Law where applicable"],
    internationalTransferControl: true,
    cookieConsentRequired: true,
    sellerIdentityDisclosure: true,
    rightToDeletion: false,
    rightToAccess: true,
    optOutMarketing: true,
    notes: "Aplicar también leyes estatales y sectoriales cuando correspondan.",
  },
  VE: {
    code: "VE",
    name: "Venezuela",
    privacyFramework: ["protección de datos y derechos constitucionales aplicables"],
    marketplaceRequirements: ["seller identification", "consumer information"],
    marketingRequirements: ["truthful advertising", "user preference controls"],
    consumerRequirements: ["consumer and electronic transaction controls"],
    internationalTransferControl: true,
    cookieConsentRequired: true,
    sellerIdentityDisclosure: true,
    rightToDeletion: true,
    rightToAccess: true,
    optOutMarketing: true,
    notes: "Debe completarse con revisión local especializada según la actividad y sector.",
  },
  GLOBAL: {
    code: "GLOBAL",
    name: "Global",
    privacyFramework: ["data minimization", "purpose limitation", "security by design"],
    marketplaceRequirements: ["seller identification", "transparent ranking and offers"],
    marketingRequirements: ["truthful advertising", "affiliate disclosure", "opt-out"],
    consumerRequirements: ["clear price", "seller identity", "delivery", "complaints", "returns where applicable"],
    internationalTransferControl: true,
    cookieConsentRequired: true,
    sellerIdentityDisclosure: true,
    rightToDeletion: true,
    rightToAccess: true,
    optOutMarketing: true,
    notes: "GLOBAL es la línea base; la política final se determina por país, consumidor, vendedor y producto.",
  },
};

export function getJurisdictionPolicy(code?: string | null): JurisdictionPolicy {
  const normalized = (code ?? "GLOBAL").toUpperCase() as JurisdictionCode;
  return JURISDICTION_POLICIES[normalized] ?? JURISDICTION_POLICIES.GLOBAL;
}
