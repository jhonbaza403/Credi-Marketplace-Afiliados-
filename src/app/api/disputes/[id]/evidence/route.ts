import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return json({ error: 'UNAUTHORIZED' }, 401)

  const { id } = await context.params
  const { data, error } = await supabase
    .from('commerce_dispute_evidence')
    .select(
      'id,dispute_id,uploaded_by,evidence_type,storage_path,public_url,title,description,checksum,metadata,created_at',
    )
    .eq('dispute_id', id)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) return json({ error: 'DISPUTE_EVIDENCE_UNAVAILABLE' }, 500)
  return json({ evidence: data ?? [] })
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return json({ error: 'UNAUTHORIZED' }, 401)

  const { id } = await context.params

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'INVALID_JSON' }, 400)
  }

  const evidenceType =
    typeof body.evidence_type === 'string' ? body.evidence_type.trim() : ''
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 200) : ''
  const description =
    typeof body.description === 'string' ? body.description.trim().slice(0, 2000) : null
  const storagePath =
    typeof body.storage_path === 'string' ? body.storage_path.trim().slice(0, 2000) : null
  const publicUrl =
    typeof body.public_url === 'string' ? body.public_url.trim().slice(0, 4000) : null
  const checksum =
    typeof body.checksum === 'string' ? body.checksum.trim().slice(0, 256) : null

  if (!['image', 'video', 'document', 'link', 'text'].includes(evidenceType) || !title) {
    return json({ error: 'EVIDENCE_TYPE_AND_TITLE_REQUIRED' }, 400)
  }
  if (['image', 'video', 'document'].includes(evidenceType) && !storagePath && !publicUrl) {
    return json({ error: 'MEDIA_EVIDENCE_REQUIRES_STORAGE_OR_URL' }, 400)
  }
  if (evidenceType === 'link' && !publicUrl) {
    return json({ error: 'LINK_EVIDENCE_REQUIRES_URL' }, 400)
  }

  const { data: dispute } = await supabase
    .from('commerce_disputes')
    .select('id,status')
    .eq('id', id)
    .maybeSingle()

  if (!dispute) return json({ error: 'DISPUTE_NOT_FOUND' }, 404)
  if (['resolved', 'rejected', 'cancelled'].includes(dispute.status)) {
    return json({ error: 'DISPUTE_CLOSED' }, 409)
  }

  // Keep Supabase's response fields explicit: the previous implementation
  // accidentally referenced a non-existent response property named `e`.
  const { data, error } = await supabase
    .from('commerce_dispute_evidence')
    .insert({
      dispute_id: id,
      uploaded_by: auth.user.id,
      evidence_type: evidenceType,
      title,
      description,
      storage_path: storagePath,
      public_url: publicUrl,
      checksum,
      metadata: { source: 'credi-trust' },
    })
    .select(
      'id,dispute_id,uploaded_by,evidence_type,storage_path,public_url,title,description,checksum,metadata,created_at',
    )
    .single()

  if (error || !data) return json({ error: 'DISPUTE_EVIDENCE_CREATE_FAILED' }, 500)

  await supabase.from('commerce_dispute_events').insert({
    dispute_id: id,
    actor_id: auth.user.id,
    event_type: 'evidence_added',
    body: title,
    metadata: { evidence_id: data.id },
  })

  await supabase
    .from('commerce_disputes')
    .update({ status: 'under_review', updated_at: new Date().toISOString() })
    .eq('id', id)

  return json({ ok: true, evidence: data }, 201)
}
