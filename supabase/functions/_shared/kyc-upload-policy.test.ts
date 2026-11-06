import {
  isAllowedKycDocumentType,
  isAllowedKycMimeType,
  isValidKycFileSize,
  KYC_MAX_BYTES,
  sanitizeKycFileName,
} from './kyc-upload-policy.ts'

Deno.test('KYC accepts PDF only for identity documents', () => {
  if (!isAllowedKycMimeType('id_front', 'application/pdf')) throw new Error('front PDF should be accepted')
  if (!isAllowedKycMimeType('id_back', 'application/pdf')) throw new Error('back PDF should be accepted')
  if (isAllowedKycMimeType('profile_photo', 'application/pdf')) throw new Error('profile PDF must be rejected')
  if (isAllowedKycMimeType('left_photo', 'application/pdf')) throw new Error('left photo PDF must be rejected')
})

Deno.test('KYC accepts supported raster images for all required document types', () => {
  for (const type of ['id_front', 'id_back', 'profile_photo', 'left_photo', 'right_photo']) {
    for (const mime of ['image/jpeg', 'image/png', 'image/webp']) {
      if (!isAllowedKycMimeType(type, mime)) throw new Error(`expected ${mime} for ${type}`)
    }
  }
})

Deno.test('KYC rejects unknown document types and MIME types', () => {
  if (isAllowedKycDocumentType('passport_scan')) throw new Error('unknown document type accepted')
  if (isAllowedKycMimeType('id_front', 'image/svg+xml')) throw new Error('SVG must be rejected')
  if (isAllowedKycMimeType('unknown', 'image/png')) throw new Error('unknown type must be rejected')
})

Deno.test('KYC enforces the 10 MB private bucket limit', () => {
  if (!isValidKycFileSize(1)) throw new Error('positive file should be accepted')
  if (!isValidKycFileSize(KYC_MAX_BYTES)) throw new Error('10 MB boundary should be accepted')
  if (isValidKycFileSize(KYC_MAX_BYTES + 1)) throw new Error('oversized file accepted')
  if (isValidKycFileSize(0) || isValidKycFileSize(-1) || isValidKycFileSize(Number.NaN)) throw new Error('invalid size accepted')
})

Deno.test('KYC filename sanitization removes unsafe path characters', () => {
  const actual = sanitizeKycFileName('../../My ID?.PDF')
  if (actual.includes('/') || actual.includes('..') || actual.includes('?')) throw new Error(`unsafe filename returned: ${actual}`)
})
