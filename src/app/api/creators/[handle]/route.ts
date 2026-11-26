import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_: Request, context: { params: Promise<{ handle: string }> }) {
  const { handle: rawHandle } = await context.params
  const handle = rawHandle.trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9_]{2,29}$/.test(handle)) {
    return NextResponse.json({ error: 'INVALID_CREATOR_HANDLE' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('creator_profiles')
    .select('handle,display_name,bio,category,avatar_url,cover_url,website_url,links,visibility,allow_followers,created_at')
    .eq('handle', handle)
    .eq('is_published', true)
    .maybeSingle()

  if (error) {
    console.error('[creators][GET]', error)
    return NextResponse.json({ error: 'CREATOR_PROFILE_UNAVAILABLE' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'CREATOR_NOT_FOUND' }, { status: 404 })

  return NextResponse.json({ profile: data }, { headers: { 'Cache-Control': 'no-store' } })
}
