Deno.serve(() =>
  new Response(JSON.stringify({ status: 'ok', service: 'credi-marketplace-supabase' }), {
    headers: { 'content-type': 'application/json' },
  }),
)
