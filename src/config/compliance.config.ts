// ==========================================================
// Credi Marketplace — Compliance Guardrails
// ==========================================================
// This is an application control layer, not legal advice.
// Jurisdiction-specific obligations must be reviewed by qualified
// counsel before enabling a market, payment rail or seller program.

export const COMPLIANCE_DEFAULTS = {
  sellerVerificationRequired: true,
  taxInformationRequiredForPayouts: true,
  ageEligibilityRequired: true,
  consentLoggingRequired: true,
  privacyRequestWorkflowEnabled: true,
  sanctionsScreeningRequiredForCrossBorder: true,
  productSafetyChecksEnabled: true,
  prohibitedGoodsPolicyEnabled: true,
  disputeWorkflowEnabled: true,
  refundWorkflowEnabled: true,
  auditTrailEnabled: true,
} as const;

export const SUPPORTED_MARKET_CONTROLS = {
  US: {
    privacy: ["CCPA_CPRA"],
    marketplace: ["FTC_ADVERTISING_DISCLOSURE"],
    payments: ["PCI_SCOPE_REDUCTION", "PROVIDER_KYC"],
  },
  EU: {
    privacy: ["GDPR"],
    marketplace: ["DSA", "CONSUMER_RIGHTS"],
    payments: ["PSD2_PROVIDER_CONTROLS", "VAT_OSS_WHERE_APPLICABLE"],
  },
  UK: {
    privacy: ["UK_GDPR"],
    marketplace: ["CONSUMER_PROTECTION"],
    payments: ["PROVIDER_KYC"],
  },
  DEFAULT: {
    privacy: ["LOCAL_PRIVACY_LAW_REVIEW"],
    marketplace: ["LOCAL_CONSUMER_LAW_REVIEW"],
    payments: ["LOCAL_PAYMENT_LAW_REVIEW"],
  },
} as const;

export function isCountrySupported(countryCode: string) {
  return /^[A-Z]{2}$/.test(countryCode.toUpperCase());
}
