export const KYC_MAX_BYTES = 10 * 1024 * 1024

const ID_DOCUMENT_TYPES = new Set(['id_front', 'id_back'])
const ALL_DOCUMENT_TYPES = new Set([
  'id_front',
  'id_back',
  'profile_photo',
  'left_photo',
  'right_photo',
])
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function isAllowedKycDocumentType(value: string): boolean {
  return ALL_DOCUMENT_TYPES.has(value)
}

export function isAllowedKycMimeType(documentType: string, contentType: string): boolean {
  if (!isAllowedKycDocumentType(documentType)) return false
  if (IMAGE_TYPES.has(contentType)) return true
  return ID_DOCUMENT_TYPES.has(documentType) && contentType === 'application/pdf'
}

export function isValidKycFileSize(size: number): boolean {
  return Number.isSafeInteger(size) && size > 0 && size <= KYC_MAX_BYTES
}

export function sanitizeKycFileName(fileName: string): string {
  return fileName.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').slice(-100)
}
