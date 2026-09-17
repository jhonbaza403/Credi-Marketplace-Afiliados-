import { describe, expect, it } from 'vitest'
import { audioMimeTypeSupported, CREDICHAT_AUDIO_MAX_SIZE, validateCrediChatAudio } from '@/lib/storage/credichat-audio'

describe('CrediChat audio', () => {
  it('accepts MediaRecorder WebM/Opus MIME variants', () => {
    expect(audioMimeTypeSupported('audio/webm')).toBe(true)
    expect(audioMimeTypeSupported('audio/webm;codecs=opus')).toBe(true)
    expect(audioMimeTypeSupported('audio/ogg;codecs=opus')).toBe(true)
  })

  it('rejects non-audio media', () => {
    expect(audioMimeTypeSupported('video/webm')).toBe(false)
    expect(audioMimeTypeSupported('image/png')).toBe(false)
  })

  it('enforces the 15 MB voice-message limit', () => {
    const valid = new File([new Uint8Array([1, 2, 3])], 'voice.webm', { type: 'audio/webm' })
    expect(() => validateCrediChatAudio(valid)).not.toThrow()

    const oversized = new File([new Uint8Array(16 * 1024 * 1024)], 'voice.webm', { type: 'audio/webm' })
    expect(oversized.size).toBeGreaterThan(CREDICHAT_AUDIO_MAX_SIZE)
    expect(() => validateCrediChatAudio(oversized)).toThrow('15 MB')
  })
})
