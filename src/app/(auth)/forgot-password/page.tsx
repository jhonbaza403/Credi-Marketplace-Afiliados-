'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      setError('Introduce tu correo electrónico.')
      setStatus('error')
      return
    }

    setStatus('loading')
    setError(null)

    try {
      const supabase = createClient()

      const origin = window.location.origin

      const redirectTo =
        `${origin}/auth/callback?next=/reset-password`

      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo,
          },
        )

      if (resetError) {
        throw resetError
      }

      setStatus('success')
    } catch (error: unknown) {
      console.error('Password reset error:', error)

      setError(
        'No fue posible procesar la solicitud. Verifica el correo e inténtalo nuevamente.',
      )

      setStatus('error')
    }
  }

  const isLoading = status === 'loading'

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-12 sm:px-6">
      <section
        aria-labelledby="forgot-password-title"
        className="w-full max-w-md"
      >
        <div className="rounded-[2rem] border border-border bg-card p-7 shadow-xl shadow-black/5 sm:p-9">
          <div className="mb-8">
            <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              Seguridad de cuenta
            </span>

            <h1
              id="forgot-password-title"
              className="mt-4 text-3xl font-black tracking-tight text-foreground"
            >
              Recuperar contraseña
            </h1>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Introduce el correo asociado a tu cuenta y te enviaremos
              instrucciones para establecer una nueva contraseña.
            </p>
          </div>

          {status === 'success' ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5"
            >
              <div className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"
                >
                  ✓
                </span>

                <div>
                  <h2 className="text-sm font-black text-foreground">
                    Solicitud procesada
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Si existe una cuenta asociada a ese correo, recibirás
                    un enlace para recuperar tu contraseña.
                  </p>
                </div>
              </div>

              <Link
                href="/login"
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Volver a iniciar sesión
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="space-y-6"
            >
              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs font-medium leading-5 text-destructive"
                >
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-xs font-black uppercase tracking-wider text-foreground"
                >
                  Correo electrónico
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)

                    if (status === 'error') {
                      setStatus('idle')
                      setError(null)
                    }
                  }}
                  placeholder="tu@correo.com"
                  disabled={isLoading}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3.5 text-sm font-black text-primary-foreground shadow-lg shadow-primary/10 transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                    />
                    Enviando instrucciones...
                  </>
                ) : (
                  'Enviar enlace de recuperación'
                )}
              </button>
            </form>
          )}

          {status !== 'success' && (
            <div className="mt-7 border-t border-border pt-6 text-center">
              <Link
                href="/login"
                className="text-xs font-bold text-primary transition hover:underline"
              >
                ← Volver a iniciar sesión
              </Link>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] leading-5 text-muted-foreground">
          Por seguridad, la plataforma no revela si un correo está
          registrado en el sistema.
        </p>
      </section>
    </main>
  )
}
