import crypto from 'node:crypto'

export type RiskBand = 'A' | 'B' | 'C' | 'D' | 'E'

export type CreditFeature = {
  key: string
  value: number
  source: string
}

export type CreditDecision = {
  decision: 'approved' | 'review' | 'declined'
  score: number
  riskBand: RiskBand
  suggestedLimit: number
  reasons: string[]
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function hashInput(input: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex')
}

export function scoreCredit(features: CreditFeature[]): CreditDecision {
  const map = new Map(features.map((f) => [f.key, Number.isFinite(f.value) ? f.value : 0]))
  const repayment = clamp(map.get('repayment_ratio') ?? 0.5, 0, 1)
  const recency = clamp(map.get('account_recency_months') ?? 1, 0, 120) / 120
  const orders = clamp(map.get('completed_orders_90d') ?? 0, 0, 50) / 50
  const disputes = clamp(map.get('dispute_rate') ?? 0, 0, 1)
  const returns = clamp(map.get('return_rate') ?? 0, 0, 1)
  const verified = clamp(map.get('identity_verified') ?? 0, 0, 1)

  const score = clamp(
    0.45 * repayment +
      0.15 * recency +
      0.15 * orders +
      0.15 * verified +
      0.10 * (1 - disputes) -
      0.08 * returns,
    0,
    1,
  )

  const riskBand: RiskBand = score >= 0.85 ? 'A' : score >= 0.7 ? 'B' : score >= 0.55 ? 'C' : score >= 0.4 ? 'D' : 'E'
  const decision = score >= 0.7 ? 'approved' : score >= 0.45 ? 'review' : 'declined'
  const suggestedLimit = Math.round(clamp(score * 1000, 0, 1000) * 100) / 100
  const reasons: string[] = []
  if (repayment < 0.8) reasons.push('Historial de pago insuficientemente sólido')
  if (disputes > 0.1) reasons.push('Tasa de disputas elevada')
  if (returns > 0.15) reasons.push('Tasa de devoluciones elevada')
  if (orders < 0.1) reasons.push('Actividad transaccional reciente limitada')
  if (verified < 1) reasons.push('Identidad no verificada')
  if (reasons.length === 0) reasons.push('Comportamiento transaccional consistente')

  return { decision, score, riskBand, suggestedLimit, reasons }
}

export function calculateReputation(events: Array<{ weight: number }>): number {
  const value = events.reduce((sum, event) => sum + Number(event.weight || 0), 50)
  return Math.round(clamp(value, 0, 100) * 100) / 100
}

export type RoutePoint = { id: string; lat: number; lng: number; priority?: number }

export function estimateRoute(points: RoutePoint[]) {
  const ordered = [...points].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
  const distanceKm = ordered.slice(1).reduce((sum, point, index) => {
    const prev = ordered[index]
    const dx = (point.lat - prev.lat) * 111
    const dy = (point.lng - prev.lng) * 95
    return sum + Math.sqrt(dx * dx + dy * dy)
  }, 0)
  return {
    ordered,
    distanceKm: Math.round(distanceKm * 1000) / 1000,
    etaMinutes: Math.ceil(distanceKm * 4),
  }
}

export function shouldReleaseEscrow(params: { delivered: boolean; disputeOpen: boolean; disputeDeadline: string | null; now?: Date }) {
  if (!params.delivered || params.disputeOpen) return false
  if (!params.disputeDeadline) return true
  return (params.now ?? new Date()).getTime() >= new Date(params.disputeDeadline).getTime()
}
