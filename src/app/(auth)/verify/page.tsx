import Link from 'next/link'

interface VerifyEmailPageProps {
searchParams: Promise<{
email?: string
status?: string
}>
}

function maskEmail(email?: string): string | null {
if (!email || !email.includes('@')) {
return null
}

const [localPart, domain] = email.split('@')

if (!localPart || !domain) {
return null
}

const visibleCharacters =
localPart.length <= 2
? 1
: 2

const maskedLocal =
localPart.slice(0, visibleCharacters) +
'••••'

return `${maskedLocal}@${domain}`
}

export default async function VerifyEmailPage({
searchParams,
}: VerifyEmailPageProps) {
const params = await searchParams
const maskedEmail = maskEmail(params.email)

const isVerified =
params.status === 'verified' ||
params.status === 'success'

if (isVerified) {
return ( <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-12"> <section
       aria-labelledby="verified-title"
       className="w-full max-w-lg rounded-[2rem] border border-border bg-card p-8 text-center shadow-2xl sm:p-10"
     > <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 text-3xl text-emerald-500">
✓ </div>

      <span className="mt-6 inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">
        Cuenta verificada
      </span>

      <h1
        id="verified-title"
        className="mt-4 text-3xl font-black tracking-tight text-foreground"
      >
        Correo electrónico confirmado
      </h1>

      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        Tu dirección de correo electrónico ha sido verificada
        correctamente. Ya puedes continuar con tu cuenta.
      </p>

      <Link
        href="/dashboard"
        className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-primary px-5 py-4 text-sm font-black text-primary-foreground shadow-lg shadow-primary/10 transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        Ir a mi cuenta
      </Link>
    </section>
  </main>
)

}

return ( <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-12"> <section
     aria-labelledby="verify-email-title"
     className="w-full max-w-lg rounded-[2rem] border border-border bg-card p-8 text-center shadow-2xl sm:p-10"
   > <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-3xl text-primary">
@ </div>

    <span className="mt-6 inline-flex rounded-full border border-border bg-muted px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
      Verificación de cuenta
    </span>

    <h1
      id="verify-email-title"
      className="mt-4 text-3xl font-black tracking-tight text-foreground"
    >
      Verifica tu correo electrónico
    </h1>

    <p className="mt-4 text-sm leading-6 text-muted-foreground">
      Hemos enviado un enlace de confirmación a tu correo electrónico.
      Abre el mensaje y utiliza el enlace para activar tu cuenta.
    </p>

    {maskedEmail && (
      <div className="mt-6 rounded-2xl border border-border bg-muted/50 px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground">
          Correo registrado
        </p>

        <p className="mt-1 text-sm font-black text-foreground">
          {maskedEmail}
        </p>
      </div>
    )}

    <div className="mt-8 space-y-3">
      <Link
        href="/login"
        className="flex w-full items-center justify-center rounded-2xl bg-primary px-5 py-4 text-sm font-black text-primary-foreground shadow-lg shadow-primary/10 transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        Ir a iniciar sesión
      </Link>

      <Link
        href="/register"
        className="flex w-full items-center justify-center rounded-2xl border border-border bg-background px-5 py-3.5 text-sm font-bold text-foreground transition hover:bg-muted"
      >
        Crear otra cuenta
      </Link>
    </div>

    <p className="mt-6 text-[11px] leading-5 text-muted-foreground">
      Si no encuentras el mensaje, revisa las carpetas de spam,
      promociones o correo no deseado.
    </p>
  </section>
</main>

)
}
