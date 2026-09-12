import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function isAllowedSource(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && ['aliexpress.com', 'www.aliexpress.com'].includes(parsed.hostname.toLowerCase())
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json().catch(() => null) as { source_url?: string; name?: string; description?: string; price?: number } | null
    const sourceUrl = typeof body?.source_url === 'string' ? body.source_url.trim() : ''
    if (!isAllowedSource(sourceUrl)) return NextResponse.json({ error: 'Only HTTPS AliExpress product URLs are accepted' }, { status: 400 })

    return NextResponse.json({
      imported: false,
      mode: 'connector-ready',
      source_url: sourceUrl,
      normalized_product: {
        name: typeof body?.name === 'string' ? body.name.slice(0, 160) : '',
        description: typeof body?.description === 'string' ? body.description.slice(0, 12000) : '',
        price: Number.isFinite(Number(body?.price)) ? Number(body?.price) : null,
      },
      next_step: 'Use the approved supplier connector to fetch verified source fields, then pass them to /api/ai/dropshipping.',
      provider_access_not_configured: true,
      user_id: user.id,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
