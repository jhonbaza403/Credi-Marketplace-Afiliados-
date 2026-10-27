export type SupplySourceKind =
  | "supplier_api"
  | "product_feed"
  | "webhook"
  | "manual"
  | "marketplace_api";

export type SupplyMode = "direct" | "wholesale" | "dropship" | "cross_dock";

export type SupplySourceStatus = "draft" | "active" | "suspended" | "disabled";
export type SupplyComplianceStatus = "pending" | "approved" | "rejected" | "review_required";

export type SupplySource = {
  sourceCode: string;
  providerName: string;
  adapterKey: string;
  sourceKind: SupplySourceKind;
  status: SupplySourceStatus;
  complianceStatus: SupplyComplianceStatus;
  supportedModes: readonly SupplyMode[];
  allowedCountries: readonly string[];
  termsUrl: string | null;
  credentialEnvVar: string | null;
  attributionPolicy: Readonly<Record<string, unknown>>;
};

export type SupplyPageRequest = {
  countryCode: string;
  cursor?: string | null;
  pageSize: number;
  signal?: AbortSignal;
};

export type NormalizedSupplyProduct = {
  sourceCode: string;
  externalProductId: string;
  sku: string | null;
  title: string;
  description: string;
  currency: string;
  priceMinor: number;
  availability: "in_stock" | "out_of_stock" | "preorder" | "unknown";
  productUrl: string | null;
  imageUrls: readonly string[];
  attributes: Readonly<Record<string, string | number | boolean | null>>;
  attribution: {
    disclosureRequired: boolean;
    policyVersion: string;
  };
};

export type SupplyPage<TRecord> = {
  records: readonly TRecord[];
  nextCursor: string | null;
};

export interface SupplyAdapter {
  readonly key: string;
  fetchPage(request: SupplyPageRequest): Promise<SupplyPage<unknown>>;
  normalize(record: unknown, source: SupplySource): NormalizedSupplyProduct;
}

const SECRET_KEY_PATTERN = /(secret|token|password|credential|api[_-]?key|private[_-]?key|authorization)/i;
const SOURCE_CODE_PATTERN = /^[A-Z0-9][A-Z0-9._-]{1,63}$/;
const ADAPTER_KEY_PATTERN = /^[a-z][a-z0-9._-]{1,63}$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

export function assertSafeAdapterConfig(value: unknown, path = "config"): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertSafeAdapterConfig(entry, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, entry] of Object.entries(value)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      throw new Error(`Secret-like configuration key is not allowed at ${path}.`);
    }
    assertSafeAdapterConfig(entry, `${path}.${key}`);
  }
}

export function assertSourceAuthorized(source: SupplySource, countryCode: string): void {
  if (!SOURCE_CODE_PATTERN.test(source.sourceCode)) {
    throw new Error("Invalid Credi supply source code.");
  }
  if (!ADAPTER_KEY_PATTERN.test(source.adapterKey)) {
    throw new Error("Invalid Credi supply adapter key.");
  }
  if (source.status !== "active" || source.complianceStatus !== "approved") {
    throw new Error("Supply source is not active and compliance-approved.");
  }
  if (source.supportedModes.length === 0) {
    throw new Error("Supply source must declare at least one supported commercial mode.");
  }

  const country = countryCode.trim().toUpperCase();
  if (!COUNTRY_PATTERN.test(country)) throw new Error("A two-letter destination country is required.");
  if (!source.allowedCountries.some((allowed) => allowed === "*" || allowed.toUpperCase() === country)) {
    throw new Error("Supply source is not authorized for the destination country.");
  }
  if (source.termsUrl !== null) {
    const terms = new URL(source.termsUrl);
    if (terms.protocol !== "https:") throw new Error("Supply source terms must use HTTPS.");
  }
}

export function normalizeSupplyProduct(
  input: Omit<NormalizedSupplyProduct, "attribution"> & {
    attribution?: Partial<NormalizedSupplyProduct["attribution"]>;
  },
  source: SupplySource,
): NormalizedSupplyProduct {
  const externalProductId = input.externalProductId.trim();
  const title = input.title.trim();
  const currency = input.currency.trim().toUpperCase();

  if (!externalProductId) throw new Error("External product ID is required.");
  if (!title || title.length > 300) throw new Error("Product title must contain 1 to 300 characters.");
  if (!CURRENCY_PATTERN.test(currency)) throw new Error("A valid ISO-style currency code is required.");
  if (!Number.isSafeInteger(input.priceMinor) || input.priceMinor < 0) {
    throw new Error("Product price must be a non-negative integer in minor currency units.");
  }

  const productUrl = input.productUrl === null ? null : requireHttpsUrl(input.productUrl, "Product URL");
  const imageUrls = input.imageUrls.map((value) => requireHttpsUrl(value, "Product image URL"));

  return {
    sourceCode: source.sourceCode,
    externalProductId,
    sku: input.sku?.trim() || null,
    title,
    description: input.description.trim().slice(0, 10_000),
    currency,
    priceMinor: input.priceMinor,
    availability: input.availability,
    productUrl,
    imageUrls,
    attributes: input.attributes,
    attribution: {
      disclosureRequired: input.attribution?.disclosureRequired ?? true,
      policyVersion: input.attribution?.policyVersion?.trim() || "1",
    },
  };
}

function requireHttpsUrl(value: string, label: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be an absolute URL.`);
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error(`${label} must use HTTPS and cannot contain embedded credentials.`);
  }
  return url.toString();
}

export function createSupplyAdapterRegistry(adapters: readonly SupplyAdapter[]) {
  const byKey = new Map<string, SupplyAdapter>();

  for (const adapter of adapters) {
    if (!ADAPTER_KEY_PATTERN.test(adapter.key)) throw new Error("Invalid supply adapter key.");
    if (byKey.has(adapter.key)) throw new Error(`Duplicate supply adapter key: ${adapter.key}`);
    byKey.set(adapter.key, adapter);
  }

  return {
    keys(): string[] {
      return [...byKey.keys()].sort();
    },
    resolve(source: SupplySource, countryCode: string): SupplyAdapter {
      assertSourceAuthorized(source, countryCode);
      const adapter = byKey.get(source.adapterKey);
      if (!adapter) throw new Error(`No Credi supply adapter is registered for ${source.adapterKey}.`);
      return adapter;
    },
  };
}
