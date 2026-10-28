# CREDI-SUPPLY AI: authorized source adapters

CREDI-SUPPLY AI does not depend on a single provider. Each source is registered in `public.credi_supply_sources` and has a unique `source_code`, adapter key, commercial modes, country allowlist, compliance approval, terms URL, and attribution policy.

## Generic JSON feed adapter

`createJsonFeedAdapter()` supports HTTPS JSON feeds that use bearer-token authentication. Register it under `generic.json-feed` only when the provider's API contract permits this authentication model. Providers requiring a different signature, OAuth flow, or custom request protocol must have their own adapter implementation; do not fake compatibility by weakening validation.

Non-secret `adapter_config` supports:

- `endpoint`: exact HTTPS endpoint.
- `allowed_hosts`: required list containing the exact hostname; redirects are rejected.
- `records_path`: dot-separated path to an array, default `items`.
- `next_cursor_path`: dot-separated cursor path, default `nextCursor`.
- `page_size_param` and `cursor_param`: query parameter names, default `limit` and `cursor`.
- `fields`: optional mapping for `id`, `title`, `price_minor`, `currency`, `description`, `sku`, `availability`, `product_url`, `image_urls`, and `attributes`.

The provider's credential belongs only in the server-side environment variable named by `credential_env_var`. Its value is never written to PostgreSQL or returned to callers. The generic adapter caps page size, response body size and request duration; rejects non-HTTPS endpoints, disallowed hosts, redirects and credentials in query parameters; and normalizes provider records into Credi's product contract.

All sources must be active, compliance-approved, and authorized for the target country before the adapter can run. Provider listings are inputs only: product identity, offers, inventory, attribution and transactions remain governed by Credi.
