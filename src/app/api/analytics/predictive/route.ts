import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
function round(value: number) { return Math.round(value * 100) / 100 }

export async function GET() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { data: orders, error } = await supabase.from('orders').select('id,total_amount,status,created_at').eq('buyer_id', auth.user.id).gte('created_at', since).order('created_at',{ascending:true}).limit(5000)
  if (error) return NextResponse.json({ error: 'ANALYTICS_UNAVAILABLE' }, { status: 500 })

  const daily = new Map<string, { orders: number; volume: number }>()
  for (const order of orders ?? []) {
    const day = new Date(order.created_at).toISOString().slice(0,10)
    const current = daily.get(day) ?? { orders: 0, volume: 0 }
    current.orders += 1
    current.volume += Math.max(0, Number(order.total_amount ?? 0))
    daily.set(day, current)
  }
  const points = Array.from(daily.entries()).sort(([a],[b]) => a.localeCompare(b)).map(([,v]) => v.volume)
  const n = points.length
  let slope = 0
  if (n >= 2) {
    const meanX = (n - 1) / 2
    const meanY = points.reduce((a,b)=>a+b,0) / n
    const num = points.reduce((s,y,x)=>s+(x-meanX)*(y-meanY),0)
    const den = points.reduce((s,_,x)=>s+(x-meanX)**2,0)
    slope = den ? num/den : 0
  }
  const last7 = points.slice(-7)
  const avg7 = last7.length ? last7.reduce((a,b)=>a+b,0)/last7.length : 0
  const forecast7 = n >= 2 ? Math.max(0, avg7 * 7 + slope * 7) : 0
  const total = points.reduce((a,b)=>a+b,0)
  const completed = (orders ?? []).filter((o)=>['paid','completed','fulfilled','delivered'].includes(String(o.status).toLowerCase())).length
  const dataState = n === 0 ? 'no_history' : n < 2 ? 'insufficient_history' : 'available'
  return NextResponse.json({
    period_days: 90,
    data_state: dataState,
    sample_points: n,
    observed_volume: round(total),
    observed_orders: orders?.length ?? 0,
    completed_orders: completed,
    average_daily_volume: round(n ? total/n : 0),
    forecast_next_7_days_volume: round(forecast7),
    trend_daily: round(slope),
    confidence: n >= 21 ? 'moderate' : 'low',
    methodology: 'Tendencia lineal descriptiva sobre volumen histórico; no constituye una predicción financiera garantizada. Sin historial suficiente, no se fabrica una predicción.',
    daily: Array.from(daily.entries()).map(([date, value]) => ({ date, orders: value.orders, volume: round(value.volume) })),
  }, { headers: { 'Cache-Control': 'no-store' } })
}
