export type WorkMode = 'remote' | 'hybrid' | 'on_site'
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'temporary' | 'internship' | 'freelance'

export interface CreateJobInput {
  title: string
  company: string
  description: string
  category: string | null
  employment_type: EmploymentType
  work_mode: WorkMode
  country: string | null
  location: string | null
  salary: string | null
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

function optionalText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

function optionalAmount(value: unknown): number | null | undefined {
  if (value === null || value === undefined || value === '') return null
  const amount = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000) return undefined
  return Math.round(amount * 100) / 100
}

const workModes: readonly WorkMode[] = ['remote', 'hybrid', 'on_site']
const employmentTypes: readonly EmploymentType[] = [
  'full_time', 'part_time', 'contract', 'temporary', 'internship', 'freelance',
]

export function validateCreateJobInput(input: unknown): ValidationResult<CreateJobInput> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Los datos de la vacante no son válidos.' }
  }

  const body = input as Record<string, unknown>
  const title = optionalText(body.title, 150) ?? ''
  const company = optionalText(body.company, 150) ?? ''
  const description = optionalText(body.description, 5000) ?? ''
  if (title.length < 3) return { ok: false, error: 'El título debe tener entre 3 y 150 caracteres.' }
  if (company.length < 2) return { ok: false, error: 'El nombre de la empresa debe tener entre 2 y 150 caracteres.' }
  if (description.length < 30) return { ok: false, error: 'La descripción debe tener entre 30 y 5.000 caracteres.' }

  const workMode = typeof body.work_mode === 'string' && workModes.includes(body.work_mode as WorkMode)
    ? body.work_mode as WorkMode
    : 'on_site'
  const employmentType = typeof body.employment_type === 'string' && employmentTypes.includes(body.employment_type as EmploymentType)
    ? body.employment_type as EmploymentType
    : 'full_time'
  const salaryMin = optionalAmount(body.salary_min)
  const salaryMax = optionalAmount(body.salary_max)
  if (salaryMin === undefined || salaryMax === undefined) {
    return { ok: false, error: 'El rango salarial debe contener importes válidos y positivos.' }
  }
  if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
    return { ok: false, error: 'El salario mínimo no puede superar el máximo.' }
  }

  const currency = typeof body.salary_currency === 'string'
    ? body.salary_currency.trim().toUpperCase()
    : 'USD'
  if (!/^[A-Z]{3}$/.test(currency)) return { ok: false, error: 'La moneda salarial debe ser un código de tres letras.' }

  return {
    ok: true,
    value: {
      title,
      company,
      description,
      category: optionalText(body.category, 80),
      employment_type: employmentType,
      work_mode: workMode,
      country: optionalText(body.country, 100),
      location: optionalText(body.location, 180),
      salary: optionalText(body.salary, 100),
      salary_min: salaryMin,
      salary_max: salaryMax,
      salary_currency: currency,
    },
  }
}

export function validateJobApplicationInput(input: unknown): ValidationResult<{ cover_letter: string | null }> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Los datos de postulación no son válidos.' }
  }
  const body = input as Record<string, unknown>
  const coverLetter = optionalText(body.cover_letter, 5000)
  if (typeof body.cover_letter === 'string' && body.cover_letter.trim().length > 5000) {
    return { ok: false, error: 'La carta de presentación no puede superar 5.000 caracteres.' }
  }
  return { ok: true, value: { cover_letter: coverLetter } }
}
