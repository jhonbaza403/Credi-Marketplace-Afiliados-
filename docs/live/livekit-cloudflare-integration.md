# Credi LIVE — LiveKit + Cloudflare Stream

## Architecture

- **LiveKit WebRTC** provides the interactive room, participant audio/video, and low-latency publishing.
- **LiveKit Egress** composites the room and sends its RTMPS output to the Cloudflare Stream Live Input provisioned for that Credi room.
- **Cloudflare Stream** performs live ingest, encoding, playback, and replay delivery.
- **Credi Next.js APIs** authenticate the Supabase user, authorize host/viewer roles, mint short-lived LiveKit JWTs, and keep provider secrets server-side.

The browser never receives `LIVEKIT_API_SECRET`, the Cloudflare API token, or the Cloudflare RTMPS stream key.

## Server environment

Configure these variables in the intended Vercel environment (Preview first):

- `LIVEKIT_URL` — `wss://credimarketplace-f8e677hx.livekit.cloud`. This endpoint is not secret.
- `LIVEKIT_API_KEY` — the project API key.
- `LIVEKIT_API_SECRET` — the project API secret.
- `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` — existing Stream API credentials.
- `CLOUDFLARE_STREAM_WEBHOOK_SECRET` — existing Cloudflare webhook signing secret.
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` — existing server-only key for verified provider webhooks.

Do not put any of these values in `NEXT_PUBLIC_*`, source files, GitHub Actions logs, or browser code.

## Webhook configuration

In LiveKit Cloud, configure a webhook to:

`https://<credi-preview-domain>/api/live/livekit-webhook`

Subscribe to `participant_joined`, `participant_left`, `egress_started`, and `egress_ended`. The endpoint verifies the LiveKit bearer JWT and raw-body SHA-256 claim before using the server-only Supabase admin client. When the host leaves, it requests Egress shutdown; Cloudflare's signed `live_input.connected` and `live_input.disconnected` events remain the source of truth for public LIVE state and replay finalization.

Keep the existing Cloudflare Stream webhook pointed at:

`https://<credi-preview-domain>/api/live/cloudflare-webhook`

## Preview verification sequence

1. Set `LIVEKIT_URL` to the Credi project endpoint and add `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` as encrypted server-only Vercel Preview variables. Never copy secrets into GitHub.
2. Create a scheduled Credi LIVE room and provision its Cloudflare Live Input.
3. Connect the host in the LiveKit Studio and grant camera/microphone access.
4. Start the emission. Confirm LiveKit Egress reaches an active state and Cloudflare reports the Live Input connected.
5. Open the room from a second authenticated account and confirm the viewer token is receive-only and remote audio/video arrive.
6. Stop the emission, confirm Cloudflare disconnect/replay events, and confirm the Credi room and replay state synchronize.
7. Repeat with host disconnect/reconnect and inspect webhook retries and Egress cleanup.

## Security and release gates

- Tokens are scoped to a single Credi room, host/viewer permissions, and a 10-minute lifetime.
- Only the room owner can start or stop Egress; only active rooms issue viewer tokens.
- API routes enforce same-origin requests and account access.
- LiveKit and Cloudflare webhooks verify signatures before privileged database writes.
- The LiveKit browser SDK is pinned to `livekit-client@2.23.0` and loaded from jsDelivr; the CSP explicitly allows that origin and the LiveKit Cloud WebSocket host.
- Keep PR #103 in draft until current-head CI, Preview WebRTC, Egress-to-Cloudflare, second-client playback, and replay tests all pass. No Production deployment is implied by this implementation.