import { describe, expect, it } from "vitest";
import {
  assertSafeAdapterConfig,
  assertSourceAuthorized,
  createSupplyAdapterRegistry,
  normalizeSupplyProduct,
  type SupplyAdapter,
  type SupplySource,
} from "@/lib/credi-supply/registry";

const source: SupplySource = {
  sourceCode: "AUTHORIZED_SOURCE",
  providerName: "Example supplier",
  adapterKey: "example.supplier",
  sourceKind: "supplier_api",
  status: "active",
  complianceStatus: "approved",
  supportedModes: ["direct", "dropship"],
  allowedCountries: ["US", "VE"],
  termsUrl: "https://supplier.example/terms",
  credentialEnvVar: "CREDI_SUPPLIER_API_KEY",
  attributionPolicy: { disclosureRequired: true, policyVersion: "v1" },
};

const adapter: SupplyAdapter<{ id: string }> = {
  key: "example.supplier",
  async fetchPage() {
    return { records: [{ id: "p-1" }], nextCursor: null };
  },
  normalize(record, selectedSource) {
    return normalizeSupplyProduct({
      externalProductId: record.id,
      sku: null,
      title: "  Product name ",
      description: "",
      currency: "usd",
      priceMinor: 1299,
      availability: "in_stock",
      productUrl: "https://supplier.example/products/p-1",
      imageUrls: ["https://cdn.supplier.example/p-1.jpg"],
      attributes: {},
    }, selectedSource);
  },
};

describe("Credi Supply adapter governance", () => {
  it("allows an approved active source in an explicitly allowed country", () => {
    expect(() => assertSourceAuthorized(source, "us")).not.toThrow();
  });

  it("rejects a source that is not compliance-approved", () => {
    expect(() => assertSourceAuthorized({ ...source, complianceStatus: "pending" }, "US")).toThrow(/not active and compliance-approved/i);
  });

  it("rejects a country that is not on the source allowlist", () => {
    expect(() => assertSourceAuthorized(source, "CA")).toThrow(/not authorized for the destination country/i);
  });

  it("rejects secret-like keys in adapter configuration", () => {
    expect(() => assertSafeAdapterConfig({ catalog: { api_key: "must-not-be-stored" } })).toThrow(/Secret-like configuration key/i);
    expect(() => assertSafeAdapterConfig({ pageSize: 100, currency: "USD" })).not.toThrow();
  });

  it("registers adapters once and returns normalized Credi-owned product data", async () => {
    const registry = createSupplyAdapterRegistry([adapter]);
    const selected = registry.resolve(source, "US");
    const page = await selected.fetchPage({ countryCode: "US", pageSize: 25 });
    const product = selected.normalize(page.records[0], source);

    expect(product.sourceCode).toBe("AUTHORIZED_SOURCE");
    expect(product.title).toBe("Product name");
    expect(product.currency).toBe("USD");
    expect(product.priceMinor).toBe(1299);
    expect(product.attribution.disclosureRequired).toBe(true);
  });

  it("rejects duplicate adapter keys", () => {
    expect(() => createSupplyAdapterRegistry([adapter, adapter])).toThrow(/Duplicate supply adapter key/i);
  });

  it("rejects insecure URLs and invalid amounts during normalization", () => {
    expect(() => normalizeSupplyProduct({
      externalProductId: "p-1",
      sku: null,
      title: "Product",
      description: "",
      currency: "USD",
      priceMinor: -1,
      availability: "unknown",
      productUrl: null,
      imageUrls: [],
      attributes: {},
    }, source)).toThrow(/non-negative integer/i);

    expect(() => normalizeSupplyProduct({
      externalProductId: "p-1",
      sku: null,
      title: "Product",
      description: "",
      currency: "USD",
      priceMinor: 100,
      availability: "unknown",
      productUrl: "http://supplier.example/product",
      imageUrls: [],
      attributes: {},
    }, source)).toThrow(/must use HTTPS/i);
  });
});
