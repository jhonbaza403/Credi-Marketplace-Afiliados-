import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-static'

export async function GET() {
  return NextResponse.json({
    name: 'Credi Marketplace Agentic Commerce',
    version: '1.0',
    protocol: 'credi-agentic/v1',
    catalog: '/api/agentic/catalog',
    capabilities: {
      discovery: true,
      comparison: true,
      rfq: true,
      negotiation: true,
      checkout: true,
      payment_methods: ['stripe','crypto','bank_transfer','wallet','manual'],
    },
    human_confirmation_required_for: ['payments','order_creation','commercial_messages','publication'],
    security: ['authentication','idempotency','audit_log','least_privilege'],
  }, { headers: { 'Cache-Control': 'public, max-age=3600' } })
}
