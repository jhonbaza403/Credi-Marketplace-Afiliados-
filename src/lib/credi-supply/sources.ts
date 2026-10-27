import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  assertSafeAdapterConfig,
  assertSourceAuthorized,
  type SupplyComplianceStatus,
  type SupplyMode,
  type SupplySource,
  type SupplySourceKind,
  type SupplySourceStatus,
} from "@/lib/credi-supply/registry";

const SOURCE_KINDS = new Set<SupplySourceKind>([
  "supplier_api",
  "product_feed",
  "webhook",
  "manual",
  "marketplace_api",
]);
const SOURCE_STATUSES = new Set<SupplySourceStatus>(["draft", "active", "suspended", "disabled"]);
const COMPLIANCE_STATUSES = new Set<SupplyComplianceStatus>([
  "pending",
  "approved",
  "rejected",
  "review_required",
]);
const SUPPLY_MODES = new Set<SupplyMode>(["direct", "wholesale", "dropship", "cross_dock"]);

type SupplySourceRow = {
  source_code: string;
  provider_name: string;
  adapter_key: string;
  source_kind: string;
  status: string;
  compliance_status: string;
  supported_modes: string[];
  allowed_countries: string[];
  terms_url: string | null;
  credential_env_var: string | null;
  adapter_config: Record<string, unknown>;
  attribution_policy: Record<string, unknown>;
};

function mapSource(row: SupplySourceRow): SupplySource {
  if (!SOURCE_KINDS.has(row.source_kind as SupplySourceKind)) {
    throw new Error("Stored supply source has an unsupported source kind.");
  }
  if (!SOURCE_STATUSES.has(row.status as SupplySourceStatus)) {
    throw new Error("Stored supply source has an unsupported status.");
  }
  if (!COMPLIANCE_STATUSES.has(row.compliance_status as SupplyComplianceStatus)) {
    throw new Error("Stored supply source has an unsupported compliance status.");
  }

  const supportedModes = row.supported_modes.filter(
    (mode): mode is SupplyMode => SUPPLY_MODES.has(mode as SupplyMode),
  );
  if (supportedModes.length !== row.supported_modes.length) {
    throw new Error("Stored supply source has an unsupported commercial mode.");
  }

  return {
    sourceCode: row.source_code,
    providerName: row.provider_name,
    adapterKey: row.adapter_key,
    sourceKind: row.source_kind as SupplySourceKind,
    status: row.status as SupplySourceStatus,
    complianceStatus: row.compliance_status as SupplyComplianceStatus,
    supportedModes,
    allowedCountries: row.allowed_countries,
    termsUrl: row.terms_url,
    credentialEnvVar: row.credential_env_var,
    adapterConfig: row.adapter_config ?? {},
    attributionPolicy: row.attribution_policy ?? {},
  };
}

/**
 * Returns one Credi-owned source definition only after a server-only database
 * lookup and country/compliance gate. Caller must still resolve a registered
 * adapter; this function never calls an external provider or returns secrets.
 */
export async function loadAuthorizedSupplySource(
  sourceCode: string,
  countryCode: string,
): Promise<SupplySource> {
  const code = sourceCode.trim().toUpperCase();
  if (!code) throw new Error("Supply source code is required.");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("credi_supply_sources")
    .select(
      "source_code,provider_name,adapter_key,source_kind,status,compliance_status,supported_modes,allowed_countries,terms_url,credential_env_var,adapter_config,attribution_policy",
    )
    .eq("source_code", code)
    .maybeSingle();

  if (error) throw new Error("Could not load Credi supply source.");
  if (!data) throw new Error("Credi supply source not found.");

  const source = mapSource(data as SupplySourceRow);
  assertSourceAuthorized(source, countryCode);
  return source;
}
