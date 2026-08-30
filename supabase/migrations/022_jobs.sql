```sql
-- ============================================================
-- CREDI MARKETPLACE
-- MIGRATION 022
-- JOBS / EMPLOYMENT MARKETPLACE
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. ESTADOS
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'job_status'
    ) THEN
        CREATE TYPE job_status AS ENUM (
            'draft',
            'published',
            'paused',
            'closed',
            'expired',
            'cancelled'
        );
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'job_application_status'
    ) THEN
        CREATE TYPE job_application_status AS ENUM (
            'submitted',
            'reviewing',
            'shortlisted',
            'interview',
            'accepted',
            'rejected',
            'withdrawn'
        );
    END IF;
END
$$;

-- ============================================================
-- 2. COMPANIES
-- ============================================================

CREATE TABLE IF NOT EXISTS companies (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    owner_id UUID NOT NULL,

    name VARCHAR(200) NOT NULL,

    slug VARCHAR(220) NOT NULL,

    description TEXT NULL,

    logo_url TEXT NULL,

    website_url TEXT NULL,

    industry VARCHAR(150) NULL,

    location VARCHAR(200) NULL,

    is_verified BOOLEAN
        NOT NULL DEFAULT FALSE,

    is_active BOOLEAN
        NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    CONSTRAINT companies_name_not_empty
        CHECK (char_length(trim(name)) > 0),

    CONSTRAINT companies_slug_unique
        UNIQUE (slug)
);

-- ============================================================
-- 3. JOBS
-- ============================================================

CREATE TABLE IF NOT EXISTS jobs (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL,

    created_by UUID NOT NULL,

    title VARCHAR(200) NOT NULL,

    slug VARCHAR(240) NOT NULL,

    description TEXT NOT NULL,

    location VARCHAR(200) NULL,

    employment_type VARCHAR(50) NULL,

    seniority VARCHAR(50) NULL,

    salary_min NUMERIC(18,2) NULL,

    salary_max NUMERIC(18,2) NULL,

    currency VARCHAR(3)
        NOT NULL DEFAULT 'USD',

    remote_allowed BOOLEAN
        NOT NULL DEFAULT FALSE,

    status job_status
        NOT NULL DEFAULT 'draft',

    application_deadline TIMESTAMPTZ NULL,

    published_at TIMESTAMPTZ NULL,

    created_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    CONSTRAINT jobs_title_not_empty
        CHECK (char_length(trim(title)) > 0),

    CONSTRAINT jobs_salary_valid
        CHECK (
            salary_min IS NULL
            OR salary_min >= 0
        ),

    CONSTRAINT jobs_salary_range_valid
        CHECK (
            salary_max IS NULL
            OR salary_min IS NULL
            OR salary_max >= salary_min
        ),

    CONSTRAINT jobs_slug_unique
        UNIQUE (slug)
);

-- ============================================================
-- 4. JOB APPLICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS job_applications (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    job_id UUID NOT NULL,

    applicant_id UUID NOT NULL,

    cover_letter TEXT NULL,

    resume_url TEXT NULL,

    status job_application_status
        NOT NULL DEFAULT 'submitted',

    notes TEXT NULL,

    submitted_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    CONSTRAINT job_applications_unique
        UNIQUE (job_id, applicant_id)
);

-- ============================================================
-- 5. FOREIGN KEYS
-- ============================================================

DO $$
BEGIN

    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'profiles'
    ) THEN

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'companies_owner_fk'
        ) THEN
            ALTER TABLE companies
            ADD CONSTRAINT companies_owner_fk
            FOREIGN KEY (owner_id)
            REFERENCES profiles(id)
            ON DELETE RESTRICT;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'jobs_created_by_fk'
        ) THEN
            ALTER TABLE jobs
            ADD CONSTRAINT jobs_created_by_fk
            FOREIGN KEY (created_by)
            REFERENCES profiles(id)
            ON DELETE RESTRICT;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'job_applications_applicant_fk'
        ) THEN
            ALTER TABLE job_applications
            ADD CONSTRAINT job_applications_applicant_fk
            FOREIGN KEY (applicant_id)
            REFERENCES profiles(id)
            ON DELETE CASCADE;
        END IF;

    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'jobs_company_fk'
    ) THEN
        ALTER TABLE jobs
        ADD CONSTRAINT jobs_company_fk
        FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'job_applications_job_fk'
    ) THEN
        ALTER TABLE job_applications
        ADD CONSTRAINT job_applications_job_fk
        FOREIGN KEY (job_id)
        REFERENCES jobs(id)
        ON DELETE CASCADE;
    END IF;

END
$$;

-- ============================================================
-- 6. ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS
    companies_owner_idx
ON companies(owner_id);

CREATE INDEX IF NOT EXISTS
    companies_active_idx
ON companies(is_active);

CREATE INDEX IF NOT EXISTS
    jobs_company_idx
ON jobs(company_id);

CREATE INDEX IF NOT EXISTS
    jobs_status_idx
ON jobs(status);

CREATE INDEX IF NOT EXISTS
    jobs_location_idx
ON jobs(location);

CREATE INDEX IF NOT EXISTS
    jobs_published_idx
ON jobs(published_at DESC)
WHERE status = 'published';

CREATE INDEX IF NOT EXISTS
    jobs_deadline_idx
ON jobs(application_deadline)
WHERE status = 'published';

CREATE INDEX IF NOT EXISTS
    job_applications_job_idx
ON job_applications(job_id);

CREATE INDEX IF NOT EXISTS
    job_applications_applicant_idx
ON job_applications(applicant_id);

CREATE INDEX IF NOT EXISTS
    job_applications_status_idx
ON job_applications(status);

-- ============================================================
-- 7. RLS
-- ============================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS companies_public_read
ON companies;

CREATE POLICY companies_public_read
ON companies
FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);

DROP POLICY IF EXISTS jobs_public_read
ON jobs;

CREATE POLICY jobs_public_read
ON jobs
FOR SELECT
TO anon, authenticated
USING (
    status = 'published'
    AND (
        application_deadline IS NULL
        OR application_deadline > NOW()
    )
);

DROP POLICY IF EXISTS applications_select_own
ON job_applications;

CREATE POLICY applications_select_own
ON job_applications
FOR SELECT
TO authenticated
USING (applicant_id = auth.uid());

DROP POLICY IF EXISTS applications_insert_own
ON job_applications;

CREATE POLICY applications_insert_own
ON job_applications
FOR INSERT
TO authenticated
WITH CHECK (applicant_id = auth.uid());

-- ============================================================
-- 8. UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS
    companies_updated_at
ON companies;

CREATE TRIGGER
    companies_updated_at
BEFORE UPDATE ON companies
FOR EACH ROW
EXECUTE FUNCTION update_jobs_updated_at();

DROP TRIGGER IF EXISTS
    jobs_updated_at
ON jobs;

CREATE TRIGGER
    jobs_updated_at
BEFORE UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION update_jobs_updated_at();

DROP TRIGGER IF EXISTS
    job_applications_updated_at
ON job_applications;

CREATE TRIGGER
    job_applications_updated_at
BEFORE UPDATE ON job_applications
FOR EACH ROW
EXECUTE FUNCTION update_jobs_updated_at();

COMMIT;

-- ============================================================
-- FIN 022_jobs.sql
-- ============================================================
```
