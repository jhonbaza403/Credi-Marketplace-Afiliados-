import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { estimateRoute, type RoutePoint } from '@/lib/credi-autonomous'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => null) as { points?: RoutePoint[]; route_date?: string } | null
    const points = Array.isArray(body?.points) ? body.points.filter((p) => p && typeof p.id === 'string' && Number.isFinite(p.lat) && Number.isFinite(p.lng)) : []
    if (points.length === 0) return NextResponse.json({ error: 'At least one route point is required' }, { status: 400 })

    const result = estimateRoute(points)
    const { data, error } = await supabase.from('credi_logistics_routes').insert({
      carrier_id: user.id,
      route_date: body?.route_date ?? new Date().toISOString().slice(0, 10),
      status: 'planned',
      optimization_version: 'heuristic-v1',
      distance_km: result.distanceKm,
      eta_minutes: result.etaMinutes,
      demand_score: Math.min(1, points.length / 10),
      metadata: { points: result.ordered },
    }).select('id,status,distance_km,eta_minutes,optimization_version').single()
    if (error) return NextResponse.json({ error: 'Unable to save optimized route' }, { status: 500 })

    return NextResponse.json({ route: data, methodology: 'deterministic proximity/priority baseline; live traffic provider not connected' })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
