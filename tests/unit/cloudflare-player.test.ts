import { describe, expect, it } from 'vitest'
import { cloudflarePlayerUrl } from '@/lib/live/cloudflare-player'

describe('cloudflarePlayerUrl',()=>{
  it('maps a live input HLS manifest to the official Stream Player',()=>{
    expect(cloudflarePlayerUrl('https://customer-example.cloudflarestream.com/live-input-123/manifest/video.m3u8'))
      .toBe('https://customer-example.cloudflarestream.com/live-input-123/iframe')
  })

  it('maps a DASH manifest to the same player URL',()=>{
    expect(cloudflarePlayerUrl('https://customer-example.cloudflarestream.com/video-123/manifest/video.mpd'))
      .toBe('https://customer-example.cloudflarestream.com/video-123/iframe')
  })

  it('rejects non-HTTPS or unrelated URLs',()=>{
    expect(cloudflarePlayerUrl('http://customer-example.cloudflarestream.com/id/manifest/video.m3u8')).toBeNull()
    expect(cloudflarePlayerUrl('https://example.com/video.m3u8')).toBeNull()
    expect(cloudflarePlayerUrl(null)).toBeNull()
  })

  it('does not carry query strings or fragments into the player URL',()=>{
    expect(cloudflarePlayerUrl('https://customer-example.cloudflarestream.com/id/manifest/video.m3u8?token=secret#fragment'))
      .toBe('https://customer-example.cloudflarestream.com/id/iframe')
  })
})
