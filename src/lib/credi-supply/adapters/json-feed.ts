import "server-only";

import {
  assertSafeAdapterConfig,
  assertSourceAuthorized,
  normalizeSupplyProduct,
  type NormalizedSupplyProduct,
  type SupplyAdapter,
  type SupplyPageRequest,
  type SupplySource,
} from "@/lib/credi-supply/registry";

const MAX_PAGE_SIZE = 100;
const MAX_RESPONSE_BYTES = 2_000_000;
const REQUEST_TIMEOUT_MS = 15_000;
const SECRET_QUERY_KEY = /(token|secret|password|api[_-]?key|signature|authorization)/i;

type JsonRecord = Record<string, unknown>;

function record(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(label + " must be a JSON object.");
  }
  return value as JsonRecord;
}

function stringConfig(config: JsonRecord, key: string, fallback: string): string {
  const value = config[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function fieldPath(config: JsonRecord, key: string, fallback: string): string {
  const fields = config.fields;
  if (fields && typeof fields === "object" && !Array.isArray(fields)) {
    const value = (fields as JsonRecord)[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

function valueAt(input: unknown, path: string): unknown {
  let current: unknown = input;
  for (const part of path.split(".")) {
    if (!part || part === "__proto__" || part === "prototype" || part === "constructor") {
      return undefined;
    }
    if (Array.isArray(current) && /^\d+$/.test(part)) {
      current = current[Number(part)];
    } else if (current && typeof current === "object" && !Array.isArray(current)) {
      current = (current as JsonRecord)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function safeEndpoint(source: SupplySource, request: SupplyPageRequest): URL {
  assertSourceAuthorized(source, request.countryCode);
  assertSafeAdapterConfig(source.adapterConfig);
  const config = record(source.adapterConfig, "Supply adapter configuration");
  const rawEndpoint = config.endpoint;
  if (typeof rawEndpoint !== "string") throw new Error("Supply JSON feed requires an endpoint.");

  let endpoint: URL;
  try {
    endpoint = new URL(rawEndpoint);
  } catch {
    throw new Error("Supply JSON feed endpoint must be an absolute HTTPS URL.");
  }
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password) {
    throw new Error("Supply JSON feed endpoint must use HTTPS without embedded credentials.");
  }

  const allowedHosts = config.allowed_hosts;
  if (!Array.isArray(allowedHosts) || allowedHosts.length === 0 || allowedHosts.some((host) => typeof host !== "string")) {
    throw new Error("Supply JSON feed requires an explicit hostname allowlist.");
  }
  const hostAllowlist = allowedHosts.map((host) => String(host).trim().toLowerCase());
  if (!hostAllowlist.includes(endpoint.hostname.toLowerCase())) {
    throw new Error("Supply JSON feed endpoint hostname is not allowlisted.");
  }

  for (const key of endpoint.searchParams.keys()) {
    if (SECRET_QUERY_KEY.test(key)) {
      throw new Error("Supply JSON feed endpoints cannot contain credentials in query parameters.");
    }
  }

  return endpoint;
}

function nextSignal(requestSignal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return requestSignal ? AbortSignal.any([requestSignal, timeout]) : timeout;
}

function stringOrEmpty(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function normalizeAvailability(value: unknown): NormalizedSupplyProduct["availability"] {
  if (value === "in_stock" || value === "out_of_stock" || value === "preorder") return value;
  return "unknown";
}

function normalizeRecord(value: unknown, source: SupplySource): NormalizedSupplyProduct {
  const config = record(source.adapterConfig, "Supply adapter configuration");
  const input = record(value, "Supply product record");
  const id = stringOrEmpty(valueAt(input, fieldPath(config, "id", "id"))).trim();
  const title = stringOrEmpty(valueAt(input, fieldPath(config, "title", "title"))).trim();
  const priceRaw = valueAt(input, fieldPath(config, "price_minor", "price_minor"));
  const priceMinor =
    typeof priceRaw === "number"
      ? priceRaw
      : typeof priceRaw === "string" && /^\d+$/.test(priceRaw.trim())
        ? Number(priceRaw.trim())
        : Number.NaN;
  const currency = stringOrEmpty(valueAt(input, fieldPath(config, "currency", "currency")));
  const description = stringOrEmpty(valueAt(input, fieldPath(config, "description", "description")));
  const sku = stringOrEmpty(valueAt(input, fieldPath(config, "sku", "sku")));
  const productUrlRaw = stringOrEmpty(valueAt(input, fieldPath(config, "product_url", "product_url")));
  const imagesRaw = valueAt(input, fieldPath(config, "image_urls", "image_urls"));
  const attributesRaw = valueAt(input, fieldPath(config, "attributes", "attributes"));
  const imageUrls = Array.isArray(imagesRaw) ? imagesRaw.filter((item): item is string => typeof item === "string") : [];
  const attributes: Record<string, string | number | boolean | null> = {};

  if (attributesRaw && typeof attributesRaw === "object" && !Array.isArray(attributesRaw)) {
    for (const [key, attribute] of Object.entries(attributesRaw as JsonRecord)) {
      if (/(secret|token|password|credential|api[_-]?key|private[_-]?key|authorization)/i.test(key)) continue;
      if (attribute === null || typeof attribute === "string" || typeof attribute === "boolean") {
        attributes[key] = attribute;
      } else if (typeof attribute === "number" && Number.isFinite(attribute)) {
        attributes[key] = attribute;
      }
    }
  }

  return normalizeSupplyProduct({
    sourceCode: source.sourceCode,
    externalProductId: id,
    sku: sku || null,
    title,
    description,
    currency,
    priceMinor,
    availability: normalizeAvailability(valueAt(input, fieldPath(config, "availability", "availability"))),
    productUrl: productUrlRaw || null,
    imageUrls,
    attributes,
  }, source);
}

export function createJsonFeedAdapter(): SupplyAdapter {
  return {
    key: "generic.json-feed",

    async fetchPage(request, source) {
      if (!Number.isInteger(request.pageSize) || request.pageSize < 1 || request.pageSize > MAX_PAGE_SIZE) {
        throw new Error("Supply page size must be an integer from 1 to 100.");
      }
      const config = record(source.adapterConfig, "Supply adapter configuration");
      const endpoint = safeEndpoint(source, request);
      const pageSizeParam = stringConfig(config, "page_size_param", "limit");
      const cursorParam = stringConfig(config, "cursor_param", "cursor");
      endpoint.searchParams.set(pageSizeParam, String(request.pageSize));
      if (request.cursor) endpoint.searchParams.set(cursorParam, request.cursor);

      const headers: Record<string, string> = { Accept: "application/json" };
      if (source.credentialEnvVar) {
        const credential = process.env[source.credentialEnvVar]?.trim();
        if (!credential) throw new Error("Supply source credential is not configured on the server.");
        headers.Authorization = "Bearer " + credential;
      }

      const response = await fetch(endpoint, {
        method: "GET",
        headers,
        redirect: "error",
        cache: "no-store",
        signal: nextSignal(request.signal),
      });
      if (!response.ok) throw new Error("Supply provider returned HTTP " + response.status + ".");
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.toLowerCase().includes("application/json")) {
        throw new Error("Supply provider response must be application/json.");
      }
      const declaredLength = Number(response.headers.get("content-length") ?? "0");
      if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
        throw new Error("Supply provider response exceeded the allowed size.");
      }

      const body = await response.text();
      if (Buffer.byteLength(body, "utf8") > MAX_RESPONSE_BYTES) {
        throw new Error("Supply provider response exceeded the allowed size.");
      }

      let payload: unknown;
      try {
        payload = JSON.parse(body);
      } catch {
        throw new Error("Supply provider returned invalid JSON.");
      }

      const recordsPath = stringConfig(config, "records_path", "items");
      const rawRecords = valueAt(payload, recordsPath);
      if (!Array.isArray(rawRecords)) throw new Error("Supply response did not contain the configured records array.");

      const nextCursorPath = stringConfig(config, "next_cursor_path", "nextCursor");
      const cursorValue = valueAt(payload, nextCursorPath);
      const nextCursor =
        typeof cursorValue === "string" || typeof cursorValue === "number"
          ? String(cursorValue).slice(0, 512) || null
          : null;

      return { records: rawRecords.slice(0, request.pageSize), nextCursor };
    },

    normalize(recordValue, source) {
      assertSourceAuthorized(source, source.allowedCountries[0] === "*" ? "US" : source.allowedCountries[0] ?? "");
      return normalizeRecord(recordValue, source);
    },
  };
}
