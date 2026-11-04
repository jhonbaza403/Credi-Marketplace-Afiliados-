import { expect, test, type Browser, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const releaseEnabled = process.env.CREDI_LIVE_RELEASE_E2E === 'true'
const roomId = process.env.E2E_LIVE_ROOM_ID
const previewUrl = process.env.PLAYWRIGHT_BASE_URL

type LiveEvent = { type: string; inputId: string; occurredAt: string }

type LiveEvidence = {
  success: boolean
  room: {
    id: string
    status: string
    startedAt: string | null
    endedAt: string | null
    currentBroadcastStartedAt: string | null
  }
  input: {
    inputId: string
    enabled: boolean
    providerStatus: string
    statusCategory: string
    recordingMode: string
    playback: { hls: string | null; dash: string | null }
  }
  events: LiveEvent[]
  replay: {
    state: string
    inputId: string | null
    videoId: string | null
    createdAt: string | null
    playbackUrl: string | null
    dashUrl: string | null
    checkedAt: string | null
  }
}

function officialManifest(urlValue: string, videoId: string, extension: 'm3u8' | 'mpd') {
  const url = new URL(urlValue)
  const host = url.hostname.toLowerCase()
  const officialHost = host === 'videodelivery.net' || host.endsWith('.cloudflarestream.com')
  const parts = url.pathname.split('/').filter(Boolean)
  return url.protocol === 'https:'
    && officialHost
    && parts.includes(videoId)
    && parts.slice(parts.indexOf(videoId) + 1).join('/') === `manifest/video.${extension}`
}

function orderedTransitionSequence(events: LiveEvent[]) {
  const required = [
    'live_input.connected',
    'live_input.disconnected',
    'live_input.connected',
    'live_input.disconnected',
  ]
  let position = 0
  for (const event of events) {
    if (event.type === required[position]) position += 1
    if (position === required.length) return true
  }
  return false
}

async function waitForDecodedPlayback(page: Page) {
  const video = page.locator('video').first()
  await video.waitFor({ state: 'attached', timeout: 90_000 })
  await video.evaluate(async (element) => {
    const player = element as HTMLVideoElement
    player.muted = true
    try {
      await player.play()
    } catch {
      // The assertion below still requires actual decoded playback progress.
    }
  })
  await expect.poll(async () => video.evaluate((element) => {
    const player = element as HTMLVideoElement
    return player.readyState >= 2 && player.currentTime > 0 && !player.error
  }), {
    timeout: 90_000,
    message: 'The official Cloudflare player did not decode and advance video frames',
  }).toBe(true)
}

async function openIndependentViewer(browser: Browser, watchUrl: string) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(watchUrl, { waitUntil: 'domcontentloaded', timeout: 90_000 })
  await waitForDecodedPlayback(page)
  return { context, page }
}

test.describe('Credi LIVE release — real Preview transport and replay', () => {
  test.skip(!releaseEnabled, 'Manual release workflow only; requires a real Vercel Preview session and LIVE room.')

  test.use({ storageState: process.env.E2E_STORAGE_STATE_PATH || undefined })

  test('proves connected → disconnected → reconnected → ended → replay ready with two independent viewers', async ({ page, browser }) => {
    test.setTimeout(300_000)

    expect(previewUrl, 'The manual release run must target a Vercel Preview URL').toBeTruthy()
    expect(roomId, 'E2E_LIVE_ROOM_ID is required for a real Preview room').toBeTruthy()

    const preview = new URL(previewUrl!)
    expect(preview.protocol).toBe('https:')
    expect(preview.hostname).toMatch(/^credi-marketplace-afiliados-.+\.vercel\.app$/)
    expect(preview.hostname).not.toBe('credi-marketplace-afiliados.vercel.app')

    let evidence!: LiveEvidence
    await expect.poll(async () => {
      const syncResponse = await page.request.post('/api/live/stream', {
        headers: { Origin: preview.origin },
        data: { roomId, action: 'sync-replay' },
      })
      expect(syncResponse.status(), 'Preview must reach the authenticated Cloudflare replay endpoint').toBe(200)

      const evidenceResponse = await page.request.post('/api/live/stream', {
        headers: { Origin: preview.origin },
        data: { roomId, action: 'evidence' },
      })
      expect(evidenceResponse.status(), 'Preview must return sanitized LIVE release evidence').toBe(200)
      evidence = await evidenceResponse.json() as LiveEvidence
      return evidence.replay.state
    }, {
      timeout: 180_000,
      intervals: [5_000, 10_000, 15_000],
      message: 'Cloudflare must finish the recording and publish the replay for this input/window',
    }).toBe('ready')
    expect(evidence.success).toBe(true)
    expect(evidence.room.id).toBe(roomId)
    expect(evidence.room.status).toBe('ended')
    expect(evidence.room.startedAt).toBeTruthy()
    expect(evidence.room.endedAt).toBeTruthy()

    const events = [...evidence.events].sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt))
    expect(orderedTransitionSequence(events), 'Missing real connected → disconnected → reconnected → disconnected webhook history')
      .toBe(true)
    for (const event of events) {
      expect(event.inputId).toBe(evidence.input.inputId)
      expect(Number.isFinite(Date.parse(event.occurredAt))).toBe(true)
    }

    expect(evidence.input.inputId).toBeTruthy()
    expect(evidence.input.recordingMode).toBe('automatic')
    expect(evidence.replay.state).toBe('ready')
    expect(evidence.replay.inputId).toBe(evidence.input.inputId)
    expect(evidence.replay.videoId).toBeTruthy()
    expect(evidence.replay.createdAt).toBeTruthy()
    expect(evidence.replay.playbackUrl).toBeTruthy()
    expect(evidence.replay.dashUrl).toBeTruthy()

    const windowStart = Date.parse(evidence.room.currentBroadcastStartedAt || evidence.room.startedAt!)
    const windowEnd = Date.parse(evidence.room.endedAt!)
    const replayCreated = Date.parse(evidence.replay.createdAt!)
    expect(Number.isFinite(windowStart) && Number.isFinite(windowEnd) && Number.isFinite(replayCreated)).toBe(true)
    expect(replayCreated).toBeGreaterThanOrEqual(windowStart - 120_000)
    expect(replayCreated).toBeLessThanOrEqual(windowEnd + 120_000)

    const videoId = evidence.replay.videoId!
    const hlsUrl = evidence.replay.playbackUrl!
    const dashUrl = evidence.replay.dashUrl!
    expect(officialManifest(hlsUrl, videoId, 'm3u8'), 'Replay HLS must be the official Cloudflare manifest for the verified videoId').toBe(true)
    expect(officialManifest(dashUrl, videoId, 'mpd'), 'Replay DASH must be the official Cloudflare manifest for the verified videoId').toBe(true)

    const hlsResponse = await page.request.get(hlsUrl)
    expect(hlsResponse.status(), 'Cloudflare HLS manifest must be readable').toBe(200)
    expect(await hlsResponse.text()).toContain('#EXTM3U')

    const dashResponse = await page.request.get(dashUrl)
    expect(dashResponse.status(), 'Cloudflare DASH manifest must be readable').toBe(200)
    expect(await dashResponse.text()).toMatch(/<MPD(?:\s|>)/)

    const hls = new URL(hlsUrl)
    const watchUrl = `${hls.origin}/${videoId}/watch`
    const [viewerOne, viewerTwo] = await Promise.all([
      openIndependentViewer(browser, watchUrl),
      openIndependentViewer(browser, watchUrl),
    ])

    try {
      // Confirm both independent browser contexts can also retrieve the same
      // official HLS and DASH manifests without sharing a session or cookies.
      const [viewerOneHls, viewerTwoDash] = await Promise.all([
        viewerOne.page.request.get(hlsUrl),
        viewerTwo.page.request.get(dashUrl),
      ])
      expect(viewerOneHls.status()).toBe(200)
      expect(viewerTwoDash.status()).toBe(200)

      const releaseEvidence = {
        verifiedAt: new Date().toISOString(),
        target: 'Vercel Preview',
        roomId: evidence.room.id,
        inputId: evidence.input.inputId,
        videoId,
        roomStartedAt: evidence.room.startedAt,
        broadcastStartedAt: evidence.room.currentBroadcastStartedAt,
        roomEndedAt: evidence.room.endedAt,
        replayCreatedAt: evidence.replay.createdAt,
        replayState: evidence.replay.state,
        events: events.map((event) => ({ type: event.type, inputId: event.inputId, occurredAt: event.occurredAt })),
        hlsUrl,
        dashUrl,
        viewers: [
          { id: 'viewer-1', decodedPlayback: true, hlsManifestStatus: viewerOneHls.status() },
          { id: 'viewer-2', decodedPlayback: true, dashManifestStatus: viewerTwoDash.status() },
        ],
        finalRoomStatus: evidence.room.status,
      }

      fs.mkdirSync(path.dirname('test-results/live-release-evidence.json'), { recursive: true })
      fs.writeFileSync('test-results/live-release-evidence.json', JSON.stringify(releaseEvidence, null, 2), { mode: 0o600 })
    } finally {
      await Promise.all([viewerOne.context.close(), viewerTwo.context.close()])
    }
  })
})
