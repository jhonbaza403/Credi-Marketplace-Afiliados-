import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isOfficialCloudflareStreamManifestUrl,
  syncLatestReplay,
} from '@/lib/cloudflare/stream'

const inputId = 'live-input-test-123'
const startedAt = '2026-11-04T10:00:00.000Z'
const endedAt = '2026-11-04T10:10:00.000Z'

function recording(overrides: Record<string, unknown> = {}) {
  return {
    uid: 'video-current-001',
    liveInput: inputId,
    created: '2026-11-04T10:04:00.000Z',
    readyToStream: true,
    status: { state: 'ready' },
    playback: {
      hls: 'https://customer-test.cloudflarestream.com/video-current-001/manifest/video.m3u8',
      dash: 'https://customer-test.cloudflarestream.com/video-current-001/manifest/video.mpd',
    },
    ...overrides,
  }
}

function mockVideos(videos: unknown[]) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({
    success: true,
    result: videos,
  }), { status: 200, headers: { 'content-type': 'application/json' } }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('Cloudflare LIVE replay association and time-window contracts', () => {
  beforeEach(() => {
    vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', 'test-account-id')
    vi.stubEnv('CLOUDFLARE_API_TOKEN', 'test-only-api-token')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('selects only the ready recording for the input and current broadcast window', async () => {
    const fetchMock = mockVideos([
      recording({ uid: 'video-previous-broadcast', created: '2026-11-04T09:30:00.000Z' }),
      recording({ uid: 'video-other-input', liveInput: 'different-input-0001' }),
      recording({ uid: 'video-after-window', created: '2026-11-04T10:20:00.000Z' }),
      recording({ uid: 'video-current-001', created: '2026-11-04T10:04:00.000Z' }),
    ])

    const result = await syncLatestReplay(inputId, startedAt, endedAt)

    expect(result).toEqual({
      state: 'ready',
      inputId,
      videoId: 'video-current-001',
      createdAt: '2026-11-04T10:04:00.000Z',
      playbackUrl: 'https://customer-test.cloudflarestream.com/video-current-001/manifest/video.m3u8',
      dashUrl: 'https://customer-test.cloudflarestream.com/video-current-001/manifest/video.mpd',
    })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(String(fetchMock.mock.calls[0][0])).toContain(`/stream/live_inputs/${inputId}/videos`)
  })

  it('does not associate a ready recording whose playback URL points to another video', async () => {
    mockVideos([recording({
      playback: {
        hls: 'https://customer-test.cloudflarestream.com/video-foreign-999/manifest/video.m3u8',
        dash: null,
      },
    })])

    await expect(syncLatestReplay(inputId, startedAt, endedAt)).resolves.toEqual({
      state: 'invalid_playback',
      inputId,
      videoId: 'video-current-001',
      createdAt: '2026-11-04T10:04:00.000Z',
    })
  })

  it('returns processing only for a recording inside the requested time window', async () => {
    mockVideos([recording({
      readyToStream: false,
      status: { state: 'inprogress' },
      created: '2026-11-04T10:06:00.000Z',
    })])

    await expect(syncLatestReplay(inputId, startedAt, endedAt)).resolves.toEqual({
      state: 'processing',
      inputId,
      videoId: 'video-current-001',
      createdAt: '2026-11-04T10:06:00.000Z',
    })
  })

  it('fails closed when the start timestamp is missing or no recording matches the window', async () => {
    mockVideos([
      recording({ uid: 'video-before', created: '2026-11-04T09:20:00.000Z' }),
      recording({ uid: 'video-no-time', created: undefined }),
    ])

    await expect(syncLatestReplay(inputId, null, endedAt)).resolves.toEqual({
      state: 'not_found',
      inputId,
      videoId: null,
      createdAt: null,
    })
    await expect(syncLatestReplay(inputId, startedAt, 'invalid-end')).resolves.toEqual({
      state: 'not_found',
      inputId,
      videoId: null,
      createdAt: null,
    })
  })

  it('accepts only HTTPS HLS and DASH URLs on official Cloudflare Stream hosts with the exact video ID', () => {
    expect(isOfficialCloudflareStreamManifestUrl(
      'https://customer-test.cloudflarestream.com/video-current-001/manifest/video.m3u8',
      'video-current-001',
      'hls',
    )).toBe(true)
    expect(isOfficialCloudflareStreamManifestUrl(
      'https://videodelivery.net/video-current-001/manifest/video.m3u8',
      'video-current-001',
      'hls',
    )).toBe(true)
    expect(isOfficialCloudflareStreamManifestUrl(
      'https://customer-test.cloudflarestream.com/video-foreign-999/manifest/video.m3u8',
      'video-current-001',
      'hls',
    )).toBe(false)
    expect(isOfficialCloudflareStreamManifestUrl(
      'http://customer-test.cloudflarestream.com/video-current-001/manifest/video.m3u8',
      'video-current-001',
      'hls',
    )).toBe(false)
    expect(isOfficialCloudflareStreamManifestUrl(
      'https://example.invalid/video-current-001/manifest/video.m3u8',
      'video-current-001',
      'hls',
    )).toBe(false)
  })
})
