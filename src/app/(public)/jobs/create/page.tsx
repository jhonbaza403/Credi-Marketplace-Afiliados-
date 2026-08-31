'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface JobFormData {
  title: string;
  company: string;
  location: string;
  salary: string;
  description: string;
}

const INITIAL_FORM: JobFormData = {
  title: '',
  company: '',
  location: '',
  salary: '',
  description: '',
};

export default function CreateJobPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState<JobFormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const updateField = (
    field: keyof JobFormData,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (error) {
      setError('');
    }

    if (success) {
      setSuccess('');
    }
  };

  const validateForm = (): string | null => {
    const title = form.title.trim();
    const company = form.company.trim();
    const location = form.location.trim();
    const salary = form.salary.trim();
    const description = form.description.trim();

    if (title.length < 3) {
      return 'El título del puesto debe tener al menos 3 caracteres.';
    }

    if (title.length > 150) {
      return 'El título del puesto no puede superar los 150 caracteres.';
    }

    if (company.length < 2) {
      return 'Indica el nombre de la empresa o institución.';
    }

    if (company.length > 150) {
      return 'El nombre de la empresa es demasiado largo.';
    }

    if (location.length > 150) {
      return 'La ubicación o modalidad es demasiado larga.';
    }

    if (salary.length > 100) {
      return 'La información salarial es demasiado larga.';
    }

    if (description.length < 30) {
      return 'La descripción debe contener al menos 30 caracteres.';
    }

    if (description.length > 5000) {
      return 'La descripción no puede superar los 5000 caracteres.';
    }

    return null;
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (authLoading) {
      return;
    }

    if (!user) {
      router.push('/login?redirect=/jobs/create');
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const { error: insertError } = await supabase
        .from('jobs')
        .insert({
          title: form.title.trim(),
          company: form.company.trim(),
          description: form.description.trim(),
          location: form.location.trim() || null,
          salary: form.salary.trim() || null,
          employer_id: user.id,
        });

      if (insertError) {
        throw insertError;
      }

      setForm(INITIAL_FORM);
      setSuccess(
        'La oferta de empleo fue publicada correctamente.'
      );

      /*
       * Dejamos un pequeño margen para que el usuario
       * pueda ver el mensaje de confirmación.
       */
      window.setTimeout(() => {
        router.push('/jobs');
        router.refresh();
      }, 700);
    } catch (submissionError: unknown) {
      console.error(
        '[CreateJobPage] Error al publicar empleo:',
        submissionError
      );

      if (
        submissionError &&
        typeof submissionError === 'object' &&
        'message' in submissionError
      ) {
        const message = String(
          (submissionError as { message?: unknown }).message
        );

        setError(
          message ||
            'No fue posible publicar la oferta de empleo.'
        );
      } else {
        setError(
          'No fue posible publicar la oferta de empleo. Inténtalo nuevamente.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const isDisabled =
    loading || authLoading || !user;

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Encabezado */}
        <header className="mb-8">
          <div className="mb-3 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            Credi Marketplace · Empleo
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Publicar oferta de empleo
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Conecta tu empresa con profesionales cualificados y
            publica una oportunidad laboral de forma clara,
            profesional y confiable.
          </p>
        </header>

        {/* Formulario */}
        <section
          aria-labelledby="job-form-title"
          className="overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-sm"
        >
          <div className="border-b border-border px-6 py-5 sm:px-8">
            <h2
              id="job-form-title"
              className="text-lg font-bold text-foreground"
            >
              Información de la vacante
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Completa los datos principales de la oportunidad.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6 px-6 py-6 sm:px-8 sm:py-8"
            noValidate
          >
            {/* Mensaje de error */}
            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
              >
                <p className="font-semibold">
                  No se pudo publicar la oferta
                </p>

                <p className="mt-1">
                  {error}
                </p>
              </div>
            )}

            {/* Mensaje de éxito */}
            {success && (
              <div
                role="status"
                className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400"
              >
                <p className="font-semibold">
                  Publicación realizada
                </p>

                <p className="mt-1">
                  {success}
                </p>
              </div>
            )}

            {/* Título */}
            <div>
              <label
                htmlFor="job-title"
                className="block text-sm font-semibold text-foreground"
              >
                Título del puesto
              </label>

              <p className="mt-1 text-xs text-muted-foreground">
                Utiliza un título específico y profesional.
              </p>

              <input
                id="job-title"
                name="title"
                type="text"
                required
                maxLength={150}
                value={form.title}
                onChange={(event) =>
                  updateField(
                    'title',
                    event.target.value
                  )
                }
                placeholder="Ej. Desarrollador Full Stack Senior"
                autoComplete="organization-title"
                className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>

            {/* Empresa */}
            <div>
              <label
                htmlFor="company"
                className="block text-sm font-semibold text-foreground"
              >
                Empresa o institución
              </label>

              <input
                id="company"
                name="company"
                type="text"
                required
                maxLength={150}
                value={form.company}
                onChange={(event) =>
                  updateField(
                    'company',
                    event.target.value
                  )
                }
                placeholder="Ej. Innovación Tecnológica C.A."
                autoComplete="organization"
                className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>

            {/* Ubicación + salario */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-semibold text-foreground"
                >
                  Ubicación / modalidad
                </label>

                <input
                  id="location"
                  name="location"
                  type="text"
                  maxLength={150}
                  value={form.location}
                  onChange={(event) =>
                    updateField(
                      'location',
                      event.target.value
                    )
                  }
                  placeholder="Ej. Remoto / Caracas, Venezuela"
                  className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>

              <div>
                <label
                  htmlFor="salary"
                  className="block text-sm font-semibold text-foreground"
                >
                  Remuneración
                </label>

                <input
                  id="salary"
                  name="salary"
                  type="text"
                  maxLength={100}
                  value={form.salary}
                  onChange={(event) =>
                    updateField(
                      'salary',
                      event.target.value
                    )
                  }
                  placeholder="Ej. USD 1,500 - 2,000 / mes"
                  className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>

            {/* Descripción */}
            <div>
              <div className="flex items-center justify-between gap-4">
                <label
                  htmlFor="description"
                  className="block text-sm font-semibold text-foreground"
                >
                  Descripción y requisitos
                </label>

                <span className="text-xs text-muted-foreground">
                  {form.description.length}/5000
                </span>
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                Describe responsabilidades, requisitos,
                experiencia, beneficios y cualquier información
                relevante.
              </p>

              <textarea
                id="description"
                name="description"
                required
                rows={8}
                maxLength={5000}
                value={form.description}
                onChange={(event) =>
                  updateField(
                    'description',
                    event.target.value
                  )
                }
                placeholder="Describe las responsabilidades, requisitos, experiencia requerida, beneficios y condiciones de la posición..."
                className="mt-3 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>

            {/* Información de seguridad */}
            <div className="rounded-2xl border border-border bg-muted/40 px-4 py-4">
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  ✓
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Publicación segura
                  </p>

                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    La oferta quedará asociada a tu cuenta.
                    Las reglas de acceso y modificación deben
                    estar protegidas mediante las políticas RLS
                    de Supabase.
                  </p>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => router.push('/jobs')}
                disabled={loading}
                className="rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isDisabled}
                className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? 'Publicando oferta...'
                  : authLoading
                    ? 'Verificando sesión...'
                    : 'Publicar oferta'}
              </button>
            </div>
          </form>
        </section>

        {/* Nota inferior */}
        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
          Al publicar una oferta confirmas que la información
          proporcionada es correcta y corresponde a una
          oportunidad laboral legítima.
        </p>
      </div>
    </main>
  );
}
