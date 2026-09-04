# Credi Marketplace — Compliance baseline

Credi Marketplace is designed with configurable compliance controls, but software configuration is not a legal opinion or a substitute for local counsel.

## Marketplace baseline

Before activating a country or product category, the operator must verify the applicable:

- consumer-protection and distance-selling rules;
- privacy/data-protection rules;
- seller identity and tax requirements;
- product-safety and traceability requirements;
- advertising and affiliate disclosure rules;
- sanctions/export controls;
- VAT/GST/sales-tax obligations;
- payment-service, AML/KYC and reporting requirements where applicable;
- accessibility requirements;
- dispute, refund and chargeback requirements.

## European Union

The platform should support seller identity/contact transparency, product traceability controls, illegal-goods reporting, moderation/appeals and other Digital Services Act obligations where the service is in scope. VAT/OSS treatment must be configured separately according to the seller, buyer and transaction facts.

## United States

Affiliate disclosures, consumer-protection requirements, state privacy laws, sales-tax nexus and payment-provider onboarding must be handled according to the applicable state and federal rules.

## Cross-border payments and crypto

The platform must not operate as an exchange, custodian or money transmitter merely because the product UI says "crypto". Payment processing must be delegated to an appropriately onboarded provider and restricted by supported jurisdictions.

The current stablecoin integration is intentionally limited to provider-hosted checkout and does not store private keys or customer wallet credentials. Production activation requires the merchant/payment provider to be eligible and approved for the relevant service.

## Affiliate programs

External affiliate programs remain subject to their own contracts. Credi Marketplace may record outbound attribution and platform analytics, but it must not claim or distribute a provider's commission to downstream affiliates unless that provider's written program terms expressly permit the model.

Internal Credi Marketplace sales can use the platform's own affiliate ledger, subject to seller terms, fraud controls, refunds/reversals, tax reporting and payout eligibility.

## Account eligibility

Seller, affiliate, payout and payment-provider onboarding must enforce the legal eligibility requirements of the applicable provider and jurisdiction. The platform must never bypass age, identity, sanctions or KYC controls.
