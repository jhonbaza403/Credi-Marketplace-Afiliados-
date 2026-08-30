'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Status =
  | 'checking'
  | 'ready'
  | 'saving'
  | 'success'
  | 'error'

export default function UpdatePasswordPage() {
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<Status>('checking')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function verifyRecoverySession() {
      try {
        const supabase = createClient()

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (!mounted) {
          return
        }

        if (userError || !user) {
          setError(
            'La sesión de recuperación no es válida o ha expirado. Solicita un nuevo enlace.',
          )
          setStatus('error')
          return
        }

        setStatus('ready')
      } catch (error: unknown) {
        console.error(
          'Recovery session verification error:',
          error,
        )

        if (!mounted) {
          return
        }

        setError(
          'No fue posible verificar la sesión de recuperación.',
        )
        setStatus('error')
      }
    }

    void verifyRecoverySession()

    return () => {
      mounted = false
    }
  }, [])

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError(null)

    if (password.length < 8) {
      setError(
        'La contraseña debe contener al menos 8 caracteres.',
      )
      setStatus('error')
      return
    }

    if (password !== confirmPassword) {
      setError(
        'Las contraseñas no coinciden.',
      )
      setStatus('error')
      return
    }

    setStatus('saving')

    try {
      const supabase = createClient()

      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        })

      if (updateError) {
        throw updateError
      }

      setPassword('')
      setConfirmPassword('')
      setStatus('success')
    } catch (error: unknown) {
      console.error(
        'Password update error:',
        error,
      )

      setError(
        'No fue posible actualizar la contraseña. El enlace puede haber expirado.',
      )

      setStatus('error')
    }
  }

  if (status === 'checking') {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4">
        <section
          aria-live="polite"
          className="w-full max-w-md rounded-[2rem] border border-border bg-card p-8 text-center shadow-xl"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <span
              aria-hidden="true"
              className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
            />
          </div>

          <h1 className="mt-5 text-xl font-black text-foreground">
            Verificando sesión
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Estamos validando tu enlace de recuperación.
          </p>
        </section>
      </main>
    )
  }

  if (status === 'success') {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-12">
        <section
          aria-labelledby="password-updated-title"
          className="w-full max-w-md rounded-[2rem] border border-border bg-card p-8 text-center shadow-xl sm:p-10"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-2xl text-emerald-600">
            ✓
          </div>

          <h1
            id="password-updated-title"
            className="mt-6 text-2xl font-black tracking-tight text-foreground"
          >
            Contraseña actualizada
          </h1>

          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Tu contraseña fue actualizada correctamente. Ya puedes
            continuar utilizando tu cuenta.
          </p>

          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="mt-7 flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3.5 text-sm font-black text-primary-foreground shadow-lg shadow-primary/10 transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Ir a mi cuenta
            <span aria-hidden="true" className="ml-2">
              →
            </span>
          </button>
        </section>
      </main>
    )
  }

  if (status === 'error' && error) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-12">
        <section
          aria-labelledby="password-error-title"
          className="w-full max-w-md rounded-[2rem] border border-border bg-card p-8 text-center shadow-xl sm:p-10"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-2xl text-destructive">
            !
          </div>

          <h1
            id="password-error-title"
            className="mt-6 text-2xl font-black tracking-tight text-foreground"
          >
            No se pudo completar la operación
          </h1>

          <p
            role="alert"
            className="mt-3 text-sm leading-6 text-muted-foreground"
          >
            {error}
          </p>

          <Link
            href="/forgot-password"
            className="mt-7 flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3.5 text-sm font-black text-primary-foreground transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Solicitar nuevo enlace
          </Link>

          <Link
            href="/login"
            className="mt-3 flex w-full items-center justify-center rounded-xl border border-border px-5 py-3.5 text-sm font-bold text-foreground transition hover:bg-muted"
          >
            Volver a iniciar sesión
          </Link>
        </section>
      </main>
    )
  }

  const isSaving = status === 'saving'

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-12 sm:px-6">
      <section
        aria-labelledby="update-password-title"
        className="w-full max-w-md"
      >
        <div className="rounded-[2rem] border border-border bg-card p-7 shadow-xl shadow-black/5 sm:p-9">
          <div className="mb-8">
            <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              Seguridad
            </span>

            <h1
              id="update-password-title"
              className="mt-4 text-3xl font-black tracking-tight text-foreground"
            >
              Nueva contraseña
            </h1>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Establece una nueva contraseña segura para proteger tu
              cuenta.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs font-medium leading-5 text-destructive"
            >
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-xs font-black uppercase tracking-wider text-foreground"
              >
                Nueva contraseña
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)

                  if (status === 'error') {
                    setStatus('ready')
                    setError(null)
                  }
                }}
                disabled={isSaving}
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-xl border border-border bg-background px-4 py-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2 block text-xs font-black uppercase tracking-wider text-foreground"
              >
                Confirmar contraseña
              </label>

              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value)

                  if (status === 'error') {
                    setStatus('ready')
                    setError(null)
                  }
                }}
                disabled={isSaving}
                placeholder="Repite tu contraseña"
                className="w-full rounded-xl border border-border bg-background px-4 py-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-[11px] font-bold text-muted-foreground">
                Recomendación de seguridad
              </p>

              <ul className="mt-2 space-y-1 text-[11px] leading-5 text-muted-foreground">
                <li>• Utiliza al menos 8 caracteres.</li>
                <li>• Evita contraseñas reutilizadas.</li>
                <li>• No compartas tu contraseña con terceros.</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3.5 text-sm font-black text-primary-foreground shadow-lg shadow-primary/10 transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <span
                    aria-hidden="true"
                    className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  />
                  Actualizando contraseña...
                </>
              ) : (
                'Actualizar contraseña'
              )}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
