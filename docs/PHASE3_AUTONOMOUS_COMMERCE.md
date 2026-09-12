# Credi Marketplace — Phase 3 Autonomous Commerce

## Scope
This phase adds an auditable foundation for Credi-Crédito AI, Credi-Dropshipping AI, Credi-Flex, Smart Lockers, Credi-Escrow, Credi-Live and unified reputation.

## Safety and governance
AI outputs are advisory and versioned. Inputs are hashed for auditability. Sensitive signals are not enabled by default. Financial state transitions remain deterministic and must be backed by payment-provider state and verified evidence.

## Implemented endpoints
- `POST /api/ai/credit`
- `POST /api/ai/credit-v2`
- `POST /api/ai/dropshipping`
- `POST /api/dropshipping/import`
- `POST /api/logistics/optimize`
- `GET/POST /api/smart-lockers`
- `POST /api/escrow/dispute`
- `POST /api/escrow/release`
- `GET/POST /api/live/sessions`
- `PATCH /api/live/sessions/:id`
- `POST /api/live/products`
- `POST /api/live/events`
- `GET/POST /api/reputation`

## External integrations intentionally left connector-gated
Live traffic routing, production AliExpress ingestion, Stripe Connect payouts, and real video transcoding require provider credentials/contracts and are not falsely represented as connected.

## Build discipline
The main CI workflow validates repository contract, dependency tree, lint, TypeScript, unit tests, Playwright E2E and production build. Deployment gate only authorizes a successful CI run on `main`.
