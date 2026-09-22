# Credi Marketplace — API Security Matrix

This document is a living security contract. Every API route must be classified as public, authenticated, provider webhook, or developer API and must document authorization, ownership, rate limiting and idempotency requirements.

| Route family | Exposure | Authentication | Authorization | Ownership / scope | Rate limit | Idempotency |
|---|---|---|---|---|---|---|
| /api/health | public | none | none | none | low | n/a |
| /api/catalog | public | none | public data only | n/a | required | n/a |
| /api/agentic/catalog | public | none | public data only | n/a | required | n/a |
| /api/v1/catalog | API key | API key | catalog:read | app | required | n/a |
| /api/v1/checkout/intent | API key | API key | checkout:create | app | required | required |
| /api/developer/oauth/* | OAuth | OAuth/PKCE | registered app | app | required | token endpoints |
| /api/billing/webhook | provider | signature | provider signature | order/orchestration | replay protection | required |
| /api/payments/coinbase/webhook | provider | signature | provider signature | orchestration | replay protection | required |
| /api/payments/webhook | provider | signature | provider signature | order/orchestration | replay protection | required |
| /api/admin/* | authenticated | session | admin | tenant/resource | strict | where mutating |
| /api/orders | authenticated | session | role + ownership | buyer/seller | strict | required |
| /api/checkout | authenticated | session | buyer + ownership | cart/order | strict | required |
| /api/payments/* | authenticated/provider | session or signature | payment policy | order/orchestration | strict | required |
| /api/b2b/* | authenticated | session | role + ownership | company/order | strict | required |
| /api/compliance/* | authenticated | session | role + ownership | subject | strict | required |
| /api/developer/* | authenticated | session | app ownership/scope | app | strict | required |
| /api/social/* | authenticated | session | account ownership | social account | strict | required |
| /api/ai/* | authenticated or explicit public | session/API policy | feature entitlement | user/session | strict | n/a |
| /api/agent/* | API key / authenticated | app/session | scope + ownership | app | strict | n/a |

## Enforcement standard

Sensitive routes should use shared primitives in src/lib/auth/require.ts or an equivalent service-layer guard. Financial mutations and provider callbacks must also use validation, signature/replay protection and idempotency.

## Verification rule

A route is not considered verified merely because a downstream service appears to perform a check. CI must keep the route inventory and security audit synchronized.