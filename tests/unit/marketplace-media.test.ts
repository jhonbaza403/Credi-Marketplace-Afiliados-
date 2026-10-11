import { describe, expect, it } from 'vitest'
import { resolveMarketplaceMediaKind, validateMarketplaceMedia } from '@/lib/storage/marketplace-media'

describe('marketplace media upload kinds', () => {
  it('keeps image uploads as image when the uploader accepts mixed media', () => {
    const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' })
    expect(resolveMarketplaceMediaKind(file, 'mixed')).toBe('image')
    expect(() => validateMarketplaceMedia(file, 'mixed')).not.toThrow()
  })

  it('keeps video uploads as video when the uploader accepts mixed media', () => {
    const file = new File(['video'], 'clip.mp4', { type: 'video/mp4' })
    expect(resolveMarketplaceMediaKind(file, 'mixed')).toBe('video')
    expect(() => validateMarketplaceMedia(file, 'mixed')).not.toThrow()
  })

  it('does not return the UI-only mixed kind as publish metadata', () => {
    const photo = new File(['image'], 'photo.webp', { type: 'image/webp' })
    const video = new File(['video'], 'clip.webm', { type: 'video/webm' })
    expect(['image', 'video']).toContain(resolveMarketplaceMediaKind(photo, 'mixed'))
    expect(['image', 'video']).toContain(resolveMarketplaceMediaKind(video, 'mixed'))
  })

  it('rejects a media type outside the supported image and video formats', () => {
    const file = new File(['data'], 'unknown.bin', { type: 'application/octet-stream' })
    expect(() => validateMarketplaceMedia(file, 'mixed')).toThrow(/Formato de imagen no compatible/)
  })
})
