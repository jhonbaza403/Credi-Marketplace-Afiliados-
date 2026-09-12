import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const { data: rooms, error } = await supabase.from('chat_live_rooms').select('id,title,status,viewer_count,started_at').eq('host_user_id', user.id).order('started_at', { ascending: false }).limit(50)
  if (error) return NextResponse.json({ error: 'LIVE_ROOMS_UNAVAILABLE' }, { status: 500 })
  return NextResponse.json({ rooms: rooms ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const body = await request.json().catch(() => null) as { title?: unknown } | null
  const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 160) : ''
  if (title.length < 3) return NextResponse.json({ error: 'INVALID_TITLE' }, { status: 400 })
  const { data: room, error } = await supabase.from('chat_live_rooms').insert({ host_user_id: user.id, title, status: 'live', metadata: { module: 'CREDI-LIVE' } }).select('id,title,status,viewer_count,started_at').single()
  if (error || !room) return NextResponse.json({ error: 'LIVE_ROOM_CREATE_FAILED' }, { status: 500 })
  return NextResponse.json({ room }, { status: 201 })
}
