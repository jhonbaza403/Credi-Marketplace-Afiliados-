import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Compatibility shim for legacy server imports.
 *
 * The privileged Supabase implementation lives exclusively in admin.ts.
 * Keep this alias temporarily so older API modules and deployment builds do
 * not fail while those imports are being consolidated.
 */
export function createServiceClient() {
  return createAdminClient();
}
