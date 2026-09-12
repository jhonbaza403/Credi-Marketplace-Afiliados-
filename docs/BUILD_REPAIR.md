# Build repair

The reported Turbopack parser failures came from fragile compressed JSX/object-literal code in the developer and commerce-studio pages. Those files were rewritten into explicit multiline JSX with balanced tags and escaped template literals.

The CI workflow remains the final build authority: it runs lint, TypeScript, unit tests, Playwright E2E and `npm run build` on pushes to `main`.
