import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isCrediAgentAction, getAgentAuthorizationLevel } from '@/lib/ai/agent-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const action = body.action
  if (!isCrediAgentAction(action)) return NextResponse.json({ error: 'ACCION_NO_PERMITIDA', allowed_actions: ['inventory_summary','b2b_pipeline','prepare_rfq_followup','publish_offer','send_commercial_message','create_payment'] }, { status: 400 })

  const level = getAgentAuthorizationLevel(action)
  const approved = body.approved === true
  const requestId = crypto.randomUUID()

  await supabase.from('agent_action_audit').insert({
    owner_id: auth.user.id,
    agent_name: 'credi-ai',
    action,
    authorization_level: level,
    status: level === 'read' ? 'executed' : approved ? 'authorized' : 'proposed',
    request_id: requestId,
    input: { action, approved },
  })

  if (level !== 'read' && !approved) {
    return NextResponse.json({
      ok: true,
      request_id: requestId,
      status: 'approval_required',
      action,
      authorization_level: level,
      message: 'La acción está preparada, pero requiere autorización explícita antes de ejecutarse.',
    }, { status: 202 })
  }

  if (action === 'inventory_summary') {
    const { data: store } = await supabase.from('stores').select('id').eq('vendor_id', auth.user.id).maybeSingle()
    if (!store) return NextResponse.json({ ok: true, action, request_id: requestId, summary: { products: 0, stock: 0, low_stock: 0 } })
    const { data: products, error } = await supabase.from('products').select('stock,is_active').eq('store_id', store.id).limit(1000)
    if (error) return NextResponse.json({ error: 'No fue posible consultar el inventario.', request_id: requestId }, { status: 500 })
    const rows = products ?? []
    const stock = rows.reduce((sum, row) => sum + Math.max(0, Number(row.stock)), 0)
    const lowStock = rows.filter((row) => Number(row.stock) > 0 && Number(row.stock) <= 5).length
    return NextResponse.json({ ok: true, action, request_id: requestId, summary: { products: rows.length, active_products: rows.filter((row) => row.is_active).length, stock, low_stock: lowStock } }, { headers: { 'Cache-Control': 'no-store' } })
  }

  if (action === 'b2b_pipeline') {
    const [{ count: openRfqs }, { count: activeAutomations }] = await Promise.all([
      supabase.from('business_rfqs').select('id', { count: 'exact', head: true }).eq('buyer_id', auth.user.id).in('status', ['open','quoted']),
      supabase.from('business_automation_rules').select('id', { count: 'exact', head: true }).eq('owner_id', auth.user.id).eq('enabled', true),
    ])
    return NextResponse.json({ ok: true, action, request_id: requestId, summary: { open_rfqs: openRfqs ?? 0, active_automations: activeAutomations ?? 0 } })
  }

  return NextResponse.json({ ok: true, action, request_id: requestId, status: approved ? 'authorized' : 'proposed', authorization_level: level, message: 'La capacidad de ejecución está protegida por autorización explícita. La operación concreta se integra por módulo.' })
}
