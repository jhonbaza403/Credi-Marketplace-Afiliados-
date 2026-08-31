'use client';

// ==========================================================
// ARCHIVO: src/features/auth/components/LoginForm.tsx
// Credi Marketplace
//
// Formulario profesional de autenticación.
// - React 19
// - Next.js 16.3
// - Supabase SSR
// - TypeScript estricto
// - Accesibilidad
// - Validación de entrada
// - Manejo seguro de errores
// ==========================================================

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { signInUser } from '@/features/auth/services/authService';
import { isValidEmail } from '@/lib/validation';

// ==========================================================
// TIPOS
// ==========================================================

interface LoginFormState {
  email: string;
  password: string;
}

// ==========================================================
// COMPONENTE
// ==========================================================

export function LoginForm() {
  const router = useRouter();

  const [form, setForm] = useState<LoginFormState>({
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ========================================================
  // MANEJO DE CAMBIOS
  // ========================================================

  const handleChange = (
    field: keyof LoginFormState,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (errorMsg) {
      setErrorMsg(null);
    }
  };

  // ========================================================
  // SUBMIT
  // ========================================================

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setErrorMsg(null);

    const email = form.email.trim();
    const password = form.password;

    // ------------------------------------------------------
    // Validación del correo
    // ------------------------------------------------------

    if (!isValidEmail(email)) {
      setErrorMsg('Introduce un correo electrónico válido.');
      return;
    }

    // ------------------------------------------------------
    // Validación básica de contraseña
    // ------------------------------------------------------

    if (!password) {
      setErrorMsg('Introduce tu contraseña.');
      return;
    }

    setLoading(true);

    try {
      const { session } = await signInUser(email, password);

      // ----------------------------------------------------
      // Seguridad: verificar que Supabase haya establecido
      // realmente una sesión.
      // ----------------------------------------------------

      if (!session) {
        throw new Error(
          'No fue posible establecer la sesión de usuario.'
        );
      }

      // ----------------------------------------------------
      // Redirección después de autenticación exitosa
      // ----------------------------------------------------

      router.replace('/marketplace');
      router.refresh();
    } catch (error: unknown) {
      // ----------------------------------------------------
      // No exponemos internamente información sensible.
      // ----------------------------------------------------

      const message =
        error instanceof Error
          ? error.message
          : 'No fue posible iniciar sesión. Verifica tus credenciales.';

      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // RENDER
  // ========================================================

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
      {/* -------------------------------------------------- */}
      {/* ENCABEZADO */}
      {/* -------------------------------------------------- */}

      <div className="mb-8 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
          Bienvenido a Credi Marketplace
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Inicia sesión para gestionar tus compras, servicios o tienda.
        </p>
      </div>

      {/* -------------------------------------------------- */}
      {/* ERROR */}
      {/* -------------------------------------------------- */}

      {errorMsg && (
        <div
          id="login-error"
          role="alert"
          aria-live="assertive"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {errorMsg}
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* FORMULARIO */}
      {/* -------------------------------------------------- */}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-6"
      >
        {/* ------------------------------------------------ */}
        {/* EMAIL */}
        {/* ------------------------------------------------ */}

        <div>
          <label
            htmlFor="login-email"
            className="block text-sm font-medium text-gray-700"
          >
            Correo electrónico
          </label>

          <input
            id="login-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            disabled={loading}
            value={form.email}
            onChange={(event) =>
              handleChange('email', event.target.value)
            }
            aria-invalid={Boolean(errorMsg)}
            aria-describedby={
              errorMsg ? 'login-error' : undefined
            }
            className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-100"
            placeholder="tu@correo.com"
          />
        </div>

        {/* ------------------------------------------------ */}
        {/* PASSWORD */}
        {/* ------------------------------------------------ */}

        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-gray-700"
            >
              Contraseña
            </label>

            <a
              href="/forgot-password"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={loading}
            value={form.password}
            onChange={(event) =>
              handleChange('password', event.target.value)
            }
            aria-invalid={Boolean(errorMsg)}
            aria-describedby={
              errorMsg ? 'login-error' : undefined
            }
            className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-100"
            placeholder="••••••••"
          />
        </div>

        {/* ------------------------------------------------ */}
        {/* SUBMIT */}
        {/* ------------------------------------------------ */}

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <span
                aria-hidden="true"
                className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              />

              Iniciando sesión...
            </>
          ) : (
            'Iniciar sesión'
          )}
        </button>
      </form>

      {/* -------------------------------------------------- */}
      {/* REGISTRO */}
      {/* -------------------------------------------------- */}

      <div className="mt-6 text-center text-sm text-gray-500">
        ¿No tienes una cuenta?{' '}
        <a
          href="/auth/register"
          className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
        >
          Crear cuenta
        </a>
      </div>
    </div>
  );
}
