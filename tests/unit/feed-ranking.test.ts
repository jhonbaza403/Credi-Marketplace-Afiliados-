import { describe, expect, it } from 'vitest'
import { rankFeedItemsForUser } from '@/lib/social/feed-ranking'

const items = [
  { id: 'recent-unrelated', title: 'Oferta de moda urbana', body: 'Nueva colección de ropa.', created_at: '2026-10-31T12:00:00.000Z' },
  { id: 'older-match', title: 'Herramientas de software para comercios', body: 'Tecnología para pequeños negocios.', created_at: '2026-10-30T12:00:00.000Z' },
  { id: 'middle-match', title: 'Curso de programación', body: 'Aprende tecnología digital.', created_at: '2026-10-31T10:00:00.000Z' },
]

describe('Credi explicit social-feed preferences', () => {
  it('ranks posts with declared interest matches ahead of unrelated posts', () => {
    const ranked = rankFeedItemsForUser(items, { interests: ['technology'], mode: 'interests' })
    expect(ranked.map(entry => entry.item.id)).toEqual(['middle-match', 'older-match', 'recent-unrelated'])
    expect(ranked[0].matchedInterests).toContain('Tecnología')
  })

  it('keeps chronological order when the user chooses the recent mode', () => {
    const ranked = rankFeedItemsForUser(items, { interests: ['technology'], mode: 'chronological' })
    expect(ranked.map(entry => entry.item.id)).toEqual(['recent-unrelated', 'middle-match', 'older-match'])
  })

  it('falls back to chronological order with no selected interests', () => {
    const ranked = rankFeedItemsForUser(items, { interests: [], mode: 'interests' })
    expect(ranked.map(entry => entry.item.id)).toEqual(['recent-unrelated', 'middle-match', 'older-match'])
  })

  it('ignores unknown or untrusted topic identifiers', () => {
    const ranked = rankFeedItemsForUser(items, { interests: ['politics', 'technology'], mode: 'interests' })
    expect(ranked[0].matchedInterests).toEqual(['Tecnología'])
  })
})
