# Credi Marketplace — Social Premium Foundation

## Product rule

Credi is a social network for commerce. The social graph, feed, creator/business profiles, messaging, media, marketplace, affiliate offers, B2B and LIVE commerce must behave as one product. This work must consolidate existing capabilities, not create duplicate modules or remove established flows.

## Verified starting point (2026-10-10)

- `src/app/social/page.tsx` already renders public posts, stories, reels and active campaigns, plus entry points to Marketplace, LIVE, affiliates, B2B, services and chat.
- The feed query reads published public posts and reels, but the rendered cards currently do not expose reaction/comment controls or visible creator identity.
- Existing tables include `feed_posts`, `feed_post_likes`, `feed_post_comments`, `stories`, `reels`, `profiles` and `notifications`.
- Likes/comments have owner-based write policies and visibility-scoped read policies.
- `profiles` currently has a restricted read policy for self and chat participants. Do not broaden public SELECT on the full table: it contains private fields (email, phone and other account attributes). Public creator identity must be served through a least-privilege projection or another audited mechanism.
- The shared navigation and readability styles have already received a recent contrast pass. Preserve those improvements.

## Implementation sequence

### P0 — Safe social identity
- Define a public profile projection exposing only fields intentionally public (stable user ID, display name, avatar and public role/type).
- Confirm RLS/grants and ensure private profile fields never reach anonymous users.
- Resolve author identity for public posts, stories and reels using the approved projection.

### P1 — Real feed interactions
- Add reaction/like and comment controls backed by existing tables.
- Require authenticated identity from the session; never accept a client-supplied `user_id` as authority.
- Show accurate counts and loading, error, empty and retry states.
- Prevent duplicate likes and prevent interactions on unpublished, unapproved or non-visible content.
- Add keyboard support, accessible names and reduced-motion-safe feedback.

### P2 — Social graph and discovery
- Audit whether follow, save/bookmark, share and block/report tables or services already exist before implementing anything new.
- Use one profile identity across consumer, creator, seller and business contexts.
- Add feed filters only where data and authorization support them; do not fabricate engagement ranking.

### P3 — Commerce-native social
- Preserve product/affiliate context when navigating from a post to product, chat or checkout.
- Clearly label sponsored content and affiliate disclosures.
- Integrate LIVE/video experiences only with working media and moderation controls.

### P4 — Premium UI and quality
- Keep a readable light navigation, consistent spacing, high contrast, responsive cards and predictable loading states.
- Validate desktop and mobile, keyboard navigation, screen-reader labels and reduced-motion preferences.
- Run lint, typecheck, unit tests, route/menu audits and focused E2E tests. Do not merge or deploy while critical tests fail.

## Acceptance criteria

- A visitor can read only content that is public, published and approved.
- An authenticated user can like/unlike and comment only within permitted content; the database remains the source of truth.
- The feed identifies creators without exposing private profile fields.
- Counts and controls remain consistent after reload and handle network errors.
- Existing publishing, Marketplace, B2B, affiliate, chat, LIVE, auth and checkout flows continue to work.
- No production schema or deployment changes are made without a reviewed migration and verification evidence.

## Work discipline

Use an isolated feature branch and reviewable pull requests. Do not attempt to evade security monitoring or hide activity; use authorized, auditable changes and tests.
