'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { signInUser } from '@/features/auth/services/authService';
import { createClient } from '@/lib/supabase/client';
import { isValidEmail } from '@/lib/validation';

interface LoginFormState {
  email: string;
  password: string;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';
  const [form, setForm] = useState<LoginFormState>({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleChange = (field: keyof LoginFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (errorMsg) setErrorMsg(null);
  };

  const finishLogin = () => {
    router.replace(next.startsWith('/') ? next : '/dashboard');
    router.refresh();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || mfaLoading) return;
    setErrorMsg(null);

    const email = form.email.trim().toLowerCase();
    if (!isValidEmail(email)) {
      setErrorMsg('Introduce un correo electrónico válido.');
      return;
    }
    if (!form.password) {
      setErrorMsg('Introduce tu contraseña.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { session } = await signInUser(email, form.password);
      if (!session) throw new Error('No fue posible establecer la sesión.');

      const { data: factorData, error: factorError } = await supabase.auth.mfa.listFactors();
      if (factorError) throw factorError;
      const verifiedTotp = (factorData?.totp ?? []).find((factor) => factor.status === 'verified');

      if (verifiedTotp) {
        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: verifiedTotp.id });
        if (challengeError) throw challengeError;
        setMfaFactorId(verifiedTotp.id);
        setMfaChallengeId(challenge.id);
        setMfaCode('');
        return;
      }

      finishLogin();
    } catch (error: unknown) {
      console.error('[LoginForm] sign-in failed', error);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : 'No fue posible iniciar sesión. Verifica tus credenciales.',
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyMfa = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!mfaFactorId || !mfaChallengeId || !/^\d{6}$/.test(mfaCode) || mfaLoading) return;

    setMfaLoading(true);
    setErrorMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: mfaChallengeId,
        code: mfaCode,
      });
      if (error) throw error;
      setMfaFactorId(null);
      setMfaChallengeId(null);
      finishLogin();
    } catch (error: unknown) {
      console.error('[LoginForm] MFA verification failed', error);
      setErrorMsg(error instanceof Error ? error.message : 'El código de seguridad no es válido.');
    } finally {
      setMfaLoading(false);
    }
  };

  const signInWithPasskey = async () => {
    if (passkeyLoading) return;
    setPasskeyLoading(true);
    setErrorMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPasskey();
      if (error) throw error;
      finishLogin();
    } catch (error: unknown) {
      console.error('[LoginForm] passkey sign-in failed', error);
      setErrorMsg(error instanceof Error ? error.message : 'No fue posible iniciar con la llave de acceso.');
    } finally {
      setPasskeyLoading(false);
    }
  };

  if (mfaFactorId && mfaChallengeId) {
    return (
      <section aria-labelledby="mfa-login-title" className="mx-auto w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-xl sm:p-8">
        <div className="mb-8 text-center">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Segundo paso</p>
          <h1 id="mfa-login-title" className="mt-2 text-3xl font-black tracking-tight text-foreground">Confirma tu identidad</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Abre tu aplicación autenticadora e introduce el código temporal de 6 dígitos.</p>
        </div>

        {errorMsg && <div id="mfa-login-error" role="alert" aria-live="assertive" className="mb-5 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-600">{errorMsg}</div>}

        <form onSubmit={verifyMfa} className="space-y-5" aria-label="Verificación de dos pasos">
          <label htmlFor="login-mfa-code" className="block text-sm font-bold text-foreground">Código de seguridad<input id="login-mfa-code" name="mfa-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" required aria-required="true" aria-invalid={Boolean(errorMsg)} aria-describedby={errorMsg ? 'mfa-login-error' : undefined} value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="mt-2 block w-full rounded-xl border border-border bg-background px-4 py-4 text-center text-lg font-black tracking-[0.4em] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="000000" /></label>
          <button type="submit" disabled={mfaLoading || mfaCode.length !== 6} aria-busy={mfaLoading} className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{mfaLoading ? 'Verificando...' : 'Verificar y entrar'}</button>
        </form>
      </section>
    );
  }

  return (
    <section aria-labelledby="login-title" className="mx-auto w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-xl sm:p-8">
      <div className="mb-8 text-center">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Portal Credi Marketplace</p>
        <h1 id="login-title" className="mt-2 text-3xl font-black tracking-tight text-foreground">Accede a tu cuenta</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Ingresa tu correo electrónico y contraseña para entrar a tu espacio privado.</p>
      </div>

      {errorMsg && <div id="login-error" role="alert" aria-live="assertive" className="mb-5 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-600">{errorMsg}</div>}

      <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-label="Acceso al portal de Credi Marketplace">
        <div>
          <label htmlFor="login-email" className="block text-sm font-bold text-foreground">Correo electrónico</label>
          <input id="login-email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required aria-required="true" aria-invalid={Boolean(errorMsg)} aria-describedby={errorMsg ? 'login-error' : undefined} disabled={loading || passkeyLoading} value={form.email} onChange={(event) => handleChange('email', event.target.value)} className="mt-2 block w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50" placeholder="tu@correo.com" />
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="login-password" className="block text-sm font-bold text-foreground">Contraseña</label>
            <Link href="/forgot-password" className="text-xs font-bold text-primary hover:underline">¿Olvidaste tu contraseña?</Link>
          </div>
          <input id="login-password" name="password" type="password" autoComplete="current-password" required aria-required="true" aria-invalid={Boolean(errorMsg)} aria-describedby={errorMsg ? 'login-error' : undefined} disabled={loading || passkeyLoading} value={form.password} onChange={(event) => handleChange('password', event.target.value)} className="mt-2 block w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50" placeholder="Tu contraseña" />
        </div>

        <button type="submit" disabled={loading || passkeyLoading} aria-busy={loading} className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Accediendo...' : 'Ingresar al portal'}</button>
      </form>

      <div className="my-5 flex items-center gap-3" aria-hidden="true"><div className="h-px flex-1 bg-border" /><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">o</span><div className="h-px flex-1 bg-border" /></div>

      <button type="button" onClick={signInWithPasskey} disabled={loading || passkeyLoading} aria-busy={passkeyLoading} className="flex w-full items-center justify-center rounded-xl border border-border bg-background px-4 py-3 font-bold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">{passkeyLoading ? 'Esperando tu dispositivo...' : 'Entrar con llave de acceso'}</button>
      <p className="mt-2 text-center text-xs leading-5 text-muted-foreground">Usa la biometría, PIN del dispositivo o llave de seguridad registrada en tu cuenta.</p>

      <div className="mt-6 rounded-xl bg-muted p-4 text-center text-sm text-muted-foreground">¿Todavía no tienes una cuenta?{' '}<Link href="/register" className="font-bold text-primary hover:underline">Crear cuenta</Link></div>
    </section>
  );
}
