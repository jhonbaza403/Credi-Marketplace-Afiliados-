import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TURN_TTL_SECONDS = 3600

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim()
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim()

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: 'El servicio de llamadas no está configurado en el servidor.' },
        { status: 503 },
      )
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Tokens.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ Ttl: String(TURN_TTL_SECONDS) }),
        cache: 'no-store',
      },
    )

    if (!response.ok) {
      console.error('[CrediBusinessCall] No fue posible obtener credenciales TURN:', response.status)
      return NextResponse.json(
        { error: 'No fue posible preparar la conexión segura de la llamada.' },
        { status: 502 },
      )
    }

    const data = await response.json() as {
      username?: string
      password?: string
      ice_servers?: Array<{
        urls: string | string[]
        username?: string
        credential?: string
      }>
    }

    if (!data.username || !data.password || !Array.isArray(data.ice_servers) || data.ice_servers.length === 0) {
      return NextResponse.json(
        { error: 'El proveedor TURN devolvió una configuración inválida.' },
        { status: 502 },
      )
    }

    const iceServers = data.ice_servers.map((server) => ({
      urls: server.urls,
      username: server.username ?? data.username,
      credential: server.credential ?? data.password,
    }))

    return NextResponse.json(
      { iceServers, ttl: TURN_TTL_SECONDS },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
        },
      },
    )
  } catch (error) {
    console.error('[CrediBusinessCall] Error inesperado al solicitar TURN:', error)
    return NextResponse.json(
      { error: 'No fue posible preparar la conexión de la llamada.' },
      { status: 500 },
    )
  }
}
