import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /auth/logout
 *
 * Cierra la sesión autenticada actualmente.
 *
 * Principios:
 * - La identidad procede de la sesión Supabase.
 * - No se acepta user_id desde el cliente.
 * - La operación se ejecuta en servidor.
 * - Las cookies de sesión son actualizadas por Supabase SSR.
 * - No se exponen tokens ni información sensible.
 */
export async function POST() {
  const requestId = crypto.randomUUID()

  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error(
        `[auth:logout:${requestId}] Unable to resolve session:`,
        userError.message,
      )

      return NextResponse.json(
        {
          success: false,
          error: 'No fue posible verificar la sesión.',
          code: 'SESSION_LOOKUP_FAILED',
          requestId,
        },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store',
          },
        },
      )
    }

    /*
     * El logout debe ser idempotente.
     *
     * Si ya no existe una sesión, devolvemos éxito porque
     * el estado final deseado —usuario sin sesión— ya se cumple.
     */
    if (!user) {
      return NextResponse.json(
        {
          success: true,
          message: 'La sesión ya estaba cerrada.',
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-store',
          },
        },
      )
    }

    const { error: signOutError } = await supabase.auth.signOut()

    if (signOutError) {
      console.error(
        `[auth:logout:${requestId}] Sign out failed:`,
        signOutError.message,
      )

      return NextResponse.json(
        {
          success: false,
          error: 'No fue posible cerrar la sesión.',
          code: 'SIGN_OUT_FAILED',
          requestId,
        },
        {
          status: 500,
          headers: {
            'Cache-Control': 'no-store',
          },
        },
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Sesión cerrada correctamente.',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  } catch (error: unknown) {
    console.error(
      `[auth:logout:${requestId}] Unexpected error:`,
      error,
    )

    return NextResponse.json(
      {
        success: false,
        error: 'Ocurrió un error inesperado al cerrar la sesión.',
        code: 'INTERNAL_SERVER_ERROR',
        requestId,
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  }
}

/**
 * Evita aceptar métodos HTTP innecesarios.
 */
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Método no permitido.',
      code: 'METHOD_NOT_ALLOWED',
    },
    {
      status: 405,
      headers: {
        Allow: 'POST',
        'Cache-Control': 'no-store',
      },
    },
  )
}
