// ==========================================================
// Database Configuration
// Supabase
// ==========================================================


export const DATABASE_CONFIG = {


 provider:
  'supabase',


 url:

  process.env
  .NEXT_PUBLIC_SUPABASE_URL
  ??
  '',


 maxConnections:

  20,


} as const;
