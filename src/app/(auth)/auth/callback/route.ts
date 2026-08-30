import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export const dynamic = 'force-dynamic'

function getSafeRedirectPath(value: string | null): string {
  if (!value) {
    return '/dashboard'
  }

  const normalized = value.trim()

  /*
   * Solo permitimos rutas internas.
   *
   * Se rechazan:
   * https://example.com
   * //example.com
   * javascript:...
   */
  if (
    !normalized.startsWith('/') ||
    normalized.startsWith('//') ||
    normalized.includes('\\')
  ) {
    return '/dashboard'
  }

  return normalized
}

export async function GET(request: Request) {
  const url = new URL(request.url)

  const code = url.searchParams.get('code')
  const next = getSafeRedirectPath(
    url.searchParams.get('next'),
  )

  /*
   * En algunos flujos de autenticación Supabase puede devolver
   * parámetros adicionales. No debemos utilizarlos para construir
   * redirects externos.
   */

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=auth_callback_failed', url.origin),
    )
  }

  try {
    const supabase = await createClient()

    const { error } =
      await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error(
        'Supabase auth callback error:',
        error,
      )

      return NextResponse.redirect(
        new URL(
          '/login?error=auth_callback_failed',
          url.origin,
        ),
      )
    }

    return NextResponse.redirect(
      new URL(next, url.origin),
    )
  } catch (error: unknown) {
    console.error(
      'Unexpected authentication callback error:',
      error,
    )

    return NextResponse.redirect(
      new URL(
        '/login?error=auth_callback_failed',
        url.origin,
      ),
    )
  }
}
