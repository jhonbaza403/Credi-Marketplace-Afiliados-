import Link from 'next/link'

interface AuthErrorPageProps {
  searchParams: Promise<{
    error?: string
    error_code?: string
    error_description?: string
    code?: string
  }>
}

const ERROR_MESSAGES: Record<string, string> = {
  access_denied:
    'La operación de autenticación fue rechazada.',
  invalid_request:
    'La solicitud de autenticación no es válida.',
  server_error:
    'El servicio de autenticación encontró un problema temporal.',
  temporarily_unavailable:
    'El servicio de autenticación no está disponible temporalmente.',
  otp_expired:
    'El enlace de verificación ha expirado. Solicita uno nuevo.',
  access_token_expired:
    'La sesión o el enlace de acceso ha expirado.',
  unauthorized:
    'No tienes autorización para realizar esta operación.',
}

function getSafeMessage(
  error?: string,
  description?: string,
): string {
  if (error && ERROR_MESSAGES[error]) {
    return ERROR_MESSAGES[error]
  }

  /*
   * No mostramos directamente error_description.
   *
   * Los proveedores externos pueden devolver información
   * técnica que no debe convertirse automáticamente en
   * contenido visible para el usuario.
   */
  if (description) {
    const normalized = description.toLowerCase()

    if (normalized.includes('expired')) {
      return 'El enlace de autenticación ha expirado. Solicita uno nuevo.'
    }

    if (normalized.includes('invalid')) {
      return 'El enlace de autenticación no es válido.'
    }

    if (normalized.includes('denied')) {
      return 'La operación de autenticación fue rechazada.'
    }
  }

  return 'No fue posible completar la operación de autenticación.'
}

export default async function AuthErrorPage({
  searchParams,
}: AuthErrorPageProps) {
  const params = await searchParams

  const message = getSafeMessage(
    params.error ?? params.code,
    params.error_description,
  )

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-12">
      <section
        aria-labelledby="auth-error-title"
        className="w-full max-w-lg rounded-[2rem] border border-border bg-card p-8 shadow-2xl sm:p-10"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 text-2xl text-destructive">
          !
        </div>

        <span className="mt-6 inline-flex rounded-full border border-border bg-muted px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          Autenticación
        </span>

        <h1
          id="auth-error-title"
          className="mt-4 text-3xl font-black tracking-tight text-foreground"
        >
          No pudimos completar la operación
        </h1>

        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {message}
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3.5 text-sm font-black text-primary-foreground shadow-lg shadow-primary/10 transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Iniciar sesión
          </Link>

          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-5 py-3.5 text-sm font-bold text-foreground transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Crear cuenta
          </Link>
        </div>

        <Link
          href="/"
          className="mt-6 block text-center text-xs font-semibold text-muted-foreground transition hover:text-foreground"
        >
          ← Volver al inicio
        </Link>
      </section>
    </main>
  )
}
