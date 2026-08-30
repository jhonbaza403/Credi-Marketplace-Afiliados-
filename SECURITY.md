# Security Policy

## Reporting

Do not publish credentials, private keys, payment secrets, service-role keys, or other sensitive material in issues or pull requests.

## Rules

- Server secrets must never use `NEXT_PUBLIC_` prefixes.
- Payment confirmation must be server-side and webhook-backed.
- Supabase Row Level Security is required for protected data.
- CI must pass lint, typecheck, tests, build, and high-severity npm audit checks before release.
