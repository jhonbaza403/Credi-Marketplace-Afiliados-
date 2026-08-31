// ==========================================================
// ARCHIVO: src/types/jobs.ts
// Tipos de datos para Ofertas de Empleo y Postulaciones
// Credi Marketplace
// ==========================================================

/**
 * Modalidad de trabajo.
 */
export type JobLocationType =
  | 'remote'
  | 'on_site'
  | 'hybrid';

/**
 * Estado de una oferta de empleo.
 */
export type JobStatus =
  | 'draft'
  | 'active'
  | 'closed';

/**
 * Estado de una postulación.
 */
export type JobApplicationStatus =
  | 'pending'
  | 'reviewed'
  | 'accepted'
  | 'rejected';

/**
 * Oferta de empleo publicada en Credi Marketplace.
 *
 * IMPORTANTE:
 * Los nombres utilizan camelCase porque estos son
 * los tipos consumidos por la aplicación Next.js.
 *
 * La base de datos puede utilizar snake_case.
 */
export interface JobOffer {
  /** UUID de la oferta */
  id: string;

  /** UUID del usuario/empresa que publica la oferta */
  companyId: string;

  /** Título de la posición */
  title: string;

  /** Descripción completa del empleo */
  description: string;

  /** Categoría profesional o laboral */
  category: string;

  /** Modalidad de trabajo */
  locationType: JobLocationType;

  /** País donde se encuentra la oportunidad */
  country: string;

  /** Ubicación específica opcional */
  location?: string | null;

  /** Salario mínimo */
  salaryMin?: number | null;

  /** Salario máximo */
  salaryMax?: number | null;

  /** Moneda del salario */
  currency: string;

  /** Estado de la oferta */
  status: JobStatus;

  /** Fecha de publicación */
  createdAt: string;

  /** Fecha de última actualización */
  updatedAt: string;
}

/**
 * Postulación de un candidato a una oferta laboral.
 */
export interface JobApplication {
  /** UUID de la postulación */
  id: string;

  /** UUID de la oferta de empleo */
  jobId: string;

  /** UUID del candidato */
  candidateId: string;

  /** Carta de presentación */
  coverLetter?: string | null;

  /** URL del currículum */
  resumeUrl?: string | null;

  /** Estado de la postulación */
  status: JobApplicationStatus;

  /** Fecha de creación */
  createdAt: string;

  /** Fecha de última actualización */
  updatedAt: string;
}

/**
 * Versión resumida de una oferta laboral.
 *
 * Útil para tarjetas, búsquedas y listados.
 */
export interface JobOfferSummary {
  id: string;
  companyId: string;
  title: string;
  category: string;
  locationType: JobLocationType;
  country: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency: string;
  status: JobStatus;
  createdAt: string;
}

/**
 * Información resumida de una postulación.
 *
 * Útil para paneles administrativos y del candidato.
 */
export interface JobApplicationSummary {
  id: string;
  jobId: string;
  candidateId: string;
  status: JobApplicationStatus;
  createdAt: string;
}

/**
 * Oferta laboral junto con sus postulaciones.
 */
export interface JobOfferWithApplications extends JobOffer {
  applications?: JobApplication[];
}
