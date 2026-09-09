import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CANONICAL_APP_URL } from '@/lib/app-url'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getSafeRedirectPath(value: string | null): string {
  if (!value) return '/dashboard'

  const normalized = value.trim()

  if (
    !normalized.startsWith('/') ||
    normalized.startsWith('//') ||
    normalized.includes('\\')
  ) {
    return '/dashboard'
  }

  return normalized
}

function getRedirectOrigin(requestUrl: URL): string {
  return process.env.NODE_ENV === 'production'
    ? CANONICAL_APP_URL
    : requestUrl.origin
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const redirectOrigin = getRedirectOrigin(url)
  const code = url.searchParams.get('code')
  const next = getSafeRedirectPath(url.searchParams.get('next'))

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=auth_callback_failed', redirectOrigin),
    )
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Supabase auth callback error:', error)
      return NextResponse.redirect(
        new URL('/login?error=auth_callback_failed', redirectOrigin),
      )
    }

    return NextResponse.redirect(new URL(next, redirectOrigin))
  } catch (error: unknown) {
    console.error('Unexpected authentication callback error:', error)
    return NextResponse.redirect(
      new URL('/login?error=auth_callback_failed', redirectOrigin),
    )
  }
}
