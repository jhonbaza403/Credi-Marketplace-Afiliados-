import { describe, expect, it } from 'vitest'
import { resolveMarketplaceMediaKind, validateMarketplaceMedia } from '@/lib/storage/marketplace-media'

describe('marketplace mixed-media uploads', () => {
  it('resolves mixed mode to the actual image type', () => {
    expect(resolveMarketplaceMediaKind({ type: 'image/jpeg' }, 'mixed')).toBe('image')
  })

  it('resolves mixed mode to the actual video type', () => {
    expect(resolveMarketplaceMediaKind({ type: 'video/mp4' }, 'mixed')).toBe('video')
  })

  it('does not persist the UI-only mixed type', () => {
    const image = resolveMarketplaceMediaKind({ type: 'image/webp' }, 'mixed')
    const video = resolveMarketplaceMediaKind({ type: 'video/webm' }, 'mixed')
    expect(['image', 'video']).toContain(image)
    expect(['image', 'video']).toContain(video)
  })

  it('validates mixed uploads against the actual file MIME type', () => {
    expect(() => validateMarketplaceMedia({ type: 'image/jpeg', size: 1024 } as File, 'mixed')).not.toThrow()
    expect(() => validateMarketplaceMedia({ type: 'video/mp4', size: 1024 } as File, 'mixed')).not.toThrow()
  })

  it('rejects an unsupported file type in mixed mode', () => {
    expect(() => validateMarketplaceMedia({ type: 'application/pdf', size: 1024 } as File, 'mixed')).toThrow()
  })
})
