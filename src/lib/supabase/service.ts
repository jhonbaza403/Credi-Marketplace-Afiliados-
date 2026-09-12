import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!url) throw new Error('Falta NEXT_PUBLIC_SUPABASE_URL.')
  if (!serviceRoleKey) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY.')

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
