import 'server-only'

import { createAdminClient } from './admin'

/**
 * @deprecated Use createAdminClient() directly.
 * Compatibility shim while existing consumers are migrated incrementally.
 */
export function createServiceClient() {
  return createAdminClient()
}
