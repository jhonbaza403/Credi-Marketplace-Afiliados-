import { createHash } from 'node:crypto'

export function createPkceS256Challenge(codeVerifier: string): string {
  return createHash('sha256').update(codeVerifier).digest('base64url')
}

export function verifyPkceS256(codeVerifier: string, codeChallenge: string): boolean {
  if (!codeVerifier || !codeChallenge) return false
  return createPkceS256Challenge(codeVerifier) === codeChallenge
}
