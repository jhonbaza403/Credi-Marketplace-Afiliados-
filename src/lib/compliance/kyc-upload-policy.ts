export const KYC_MAX_BYTES = 10 * 1024 * 1024

const ID_DOCUMENT_TYPES = new Set(['id_front', 'id_back', 'passport', 'drivers_license', 'address_proof', 'other'])
const ALL_KYC_DOCUMENT_TYPES = new Set([
  'id_front', 'id_back', 'passport', 'drivers_license', 'selfie',
  'profile_photo', 'left_photo', 'right_photo', 'address_proof', 'other',
])
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ALL_ALLOWED_MIME = new Set([...IMAGE_TYPES, 'application/pdf'])

export function isAllowedKycDocumentType(value: string): boolean {
  return ALL_KYC_DOCUMENT_TYPES.has(value)
}

export function isAllowedKycMimeType(documentType: string, contentType: string): boolean {
  if (!isAllowedKycDocumentType(documentType) || !ALL_ALLOWED_MIME.has(contentType)) return false
  if (IMAGE_TYPES.has(contentType)) return true
  return ID_DOCUMENT_TYPES.has(documentType) && contentType === 'application/pdf'
}

export function isValidKycFileSize(size: number): boolean {
  return Number.isSafeInteger(size) && size > 0 && size <= KYC_MAX_BYTES
}

export function isAllowedComplianceUpload(
  caseType: 'kyc' | 'kyb',
  documentType: string,
  contentType: string,
  size: number,
): boolean {
  if (!isValidKycFileSize(size)) return false
  if (caseType === 'kyc') return isAllowedKycMimeType(documentType, contentType)
  return ALL_ALLOWED_MIME.has(contentType)
}

export function sanitizeKycFileName(fileName: string): string {
  return fileName.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').slice(-100)
}
