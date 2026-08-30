# Credi Marketplace

Premium marketplace architecture for commerce, affiliates, B2B, services and payments.

## Runtime contract

- Node.js 24.20.0 LTS
- npm 11.19.0
- Next.js 16.3.3
- React 19.2.8
- TypeScript 7.0.2
- Tailwind CSS 4.3.3
- App Router
- Turbopack
- Supabase
- Vercel

## Quality gate

```text
Node 24 → npm 11 → package.json → package-lock.json → npm ci
→ lint → typecheck → unit → E2E/Playwright → Next build → security audit
```

## Vercel

The repository root must be the directory containing `package.json`. Do not configure an extra project root such as `credi-marketplace/credi-marketplace`.

Configure production secrets in Vercel. Never commit `.env.local`, Supabase secret/service-role keys, database credentials, or AI provider keys.
