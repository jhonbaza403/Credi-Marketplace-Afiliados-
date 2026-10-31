import { describe, expect, it } from 'vitest'
import { validateCreateJobInput, validateJobApplicationInput } from '@/lib/jobs/validation'

const validJob = {
  title: 'Diseñador de producto digital',
  company: 'Credi Labs',
  description: 'Diseñar experiencias accesibles, colaborar con ingeniería y documentar decisiones de producto.',
  work_mode: 'remote',
  employment_type: 'full_time',
  salary_min: 1500,
  salary_max: 2500,
  salary_currency: 'USD',
}

describe('Credi professional network input validation', () => {
  it('accepts valid job posts and normalizes currency', () => {
    const result = validateCreateJobInput(validJob)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.salary_currency).toBe('USD')
      expect(result.value.work_mode).toBe('remote')
    }
  })

  it('rejects a missing or too-short job description', () => {
    expect(validateCreateJobInput({ ...validJob, description: 'Muy corto' })).toMatchObject({ ok: false })
  })

  it('rejects a salary minimum greater than the maximum', () => {
    expect(validateCreateJobInput({ ...validJob, salary_min: 3000, salary_max: 2000 })).toMatchObject({ ok: false })
  })

  it('rejects malformed currency', () => {
    expect(validateCreateJobInput({ ...validJob, salary_currency: 'US dollars' })).toMatchObject({ ok: false })
  })

  it('accepts an optional cover letter and rejects oversized text', () => {
    expect(validateJobApplicationInput({ cover_letter: 'Experiencia relevante para esta oportunidad.' }).ok).toBe(true)
    expect(validateJobApplicationInput({ cover_letter: 'x'.repeat(5001 })).ok).toBe(false)
  })
})
