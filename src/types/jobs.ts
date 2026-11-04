export type JobLocationType = 'remote' | 'on_site' | 'hybrid'
export type JobStatus = 'draft' | 'active' | 'closed'
export type JobEmploymentType = 'full_time' | 'part_time' | 'contract' | 'temporary' | 'internship' | 'freelance'
export type JobApplicationStatus = 'pending' | 'reviewed' | 'accepted' | 'rejected'

/** Shape returned by the Supabase jobs table (snake_case). */
export interface JobOffer {
  id: string
  employer_id: string
  company: string
  title: string
  description: string
  category: string | null
  employment_type: JobEmploymentType
  work_mode: JobLocationType
  country: string | null
  location: string | null
  salary: string | null
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  status: JobStatus
  created_at: string
  updated_at: string
}

export interface JobApplication {
  id: string
  job_id: string
  candidate_id: string
  cover_letter: string | null
  resume_path: string | null
  status: JobApplicationStatus
  created_at: string
  updated_at: string
}

export interface ProfessionalProfile {
  user_id: string
  full_name: string | null
  headline: string | null
  summary: string | null
  location: string | null
  skills: string[]
  experience: Array<Record<string, unknown>>
  education: Array<Record<string, unknown>>
  website_url: string | null
  portfolio_url: string | null
  visibility: 'private' | 'public'
  updated_at: string
}
