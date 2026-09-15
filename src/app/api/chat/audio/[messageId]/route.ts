import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'credichat-private'
const SIGNED_URL_TTL = 60 * 60
const USER_PATH = /^[0-9a-f-]{36}\/[^/]+$/i

export async function GET(_request: Request, context: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await context.params
  if (!/^[0-9a-f-]{36}$/i.test(messageId)) return NextResponse.json({ error: 'INVALID_MESSAGE_ID' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { data: message, error: messageError } = await supabase
    .from('messages')
    .select('id,conversation_id,message_type,metadata,deleted_at')
    .eq('id', messageId)
    .maybeSingle()
  if (messageError) return NextResponse.json({ error: 'MESSAGE_LOOKUP_FAILED' }, { status: 500 })
  if (!message || message.deleted_at || message.message_type !== 'audio') return NextResponse.json({ error: 'AUDIO_NOT_FOUND' }, { status: 404 })

  const { data: membership, error: membershipError } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('conversation_id', message.conversation_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (membershipError) return NextResponse.json({ error: 'MEMBERSHIP_LOOKUP_FAILED' }, { status: 500 })
  if (!membership) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const metadata = message.metadata && typeof message.metadata === 'object' ? message.metadata as Record<string, unknown> : {}
  const path = typeof metadata.storage_path === 'string' ? metadata.storage_path : null
  const bucket = typeof metadata.bucket === 'string' ? metadata.bucket : BUCKET
  if (!path || bucket !== BUCKET || !USER_PATH.test(path)) return NextResponse.json({ error: 'AUDIO_PATH_INVALID' }, { status: 422 })

  const { data, error: signError } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL)
  if (signError || !data?.signedUrl) return NextResponse.json({ error: 'AUDIO_URL_FAILED' }, { status: 500 })

  return NextResponse.json({ url: data.signedUrl, expiresIn: SIGNED_URL_TTL }, { headers: { 'cache-control': 'private, max-age=30' } })
}
