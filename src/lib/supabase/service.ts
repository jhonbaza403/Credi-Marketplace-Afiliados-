import 'server-only'

import { createAdminClient } from './admin'

/** @deprecated Use createAdminClient() directly. Compatibility shim while consumers are migrated. */
export function createServiceClient() {
  return createAdminClient()
}
