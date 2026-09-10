import { NextResponse } from 'next/server'
import { getDatabaseServerClient } from '@/lib/database/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const orderId = url.searchParams.get('order_id')?.trim()
    if (!orderId) return json({ error: 'ORDER_ID_REQUIRED' }, 400)

    const supabase = await getDatabaseServerClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return json({ error: 'UNAUTHORIZED' }, 401)

    const { data, error } = await supabase.rpc('get_transaction_rating_targets', { p_order_id: orderId })
    if (error) throw error

    return json({ targets: data ?? [] })
  } catch (error) {
    console.error('[ratings][GET]', error)
    return json({ error: 'RATINGS_UNAVAILABLE' }, 500)
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getDatabaseServerClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return json({ error: 'UNAUTHORIZED' }, 401)

    const body = await request.json() as Record<string, unknown>
    const orderId = typeof body.order_id === 'string' ? body.order_id.trim() : ''
    const storeId = typeof body.store_id === 'string' ? body.store_id.trim() : ''
    const score = Number(body.score)
    const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 1200) : null
    const dimensions = body.dimensions && typeof body.dimensions === 'object' ? body.dimensions : {}

    if (!orderId || !storeId) return json({ error: 'ORDER_AND_STORE_REQUIRED' }, 400)
    if (!Number.isInteger(score) || score < 1 || score > 5) return json({ error: 'INVALID_SCORE' }, 400)

    const { data, error } = await supabase.rpc('submit_transaction_rating', {
      p_order_id: orderId,
      p_store_id: storeId,
      p_score: score,
      p_comment: comment || null,
      p_dimensions: dimensions,
    })

    if (error) {
      const message = error.message ?? ''
      if (/ALREADY_RATED/i.test(message)) return json({ error: 'ALREADY_RATED' }, 409)
      if (/RATING_NOT_ELIGIBLE|INVALID_REVIEWEE/i.test(message)) return json({ error: 'RATING_NOT_ELIGIBLE' }, 403)
      throw error
    }

    return json({ success: true, rating: data }, 201)
  } catch (error) {
    console.error('[ratings][POST]', error)
    return json({ error: 'RATING_FAILED' }, 500)
  }
}
