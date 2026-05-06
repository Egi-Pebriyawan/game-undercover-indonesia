import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock browser Audio API menggunakan function constructor (bukan arrow function)
// Arrow function tidak bisa dipakai sebagai constructor dengan 'new'
function createAudioMock() {
  return {
    play: vi.fn(() => Promise.resolve()),
    currentTime: 0,
  }
}

global.Audio = vi.fn(createAudioMock)

describe('SFXManager', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.resetModules()
    global.Audio = vi.fn(() => ({
      play: vi.fn(() => Promise.resolve()),
      currentTime: 0,
    }))
  })

  it('memutar audio saat tidak di-mute', async () => {
    const { sfx } = await import('../sfx')
    sfx.muted = false
    sfx.audioCache = {}
    sfx.play('click')
    expect(global.Audio).toHaveBeenCalled()
  })

  it('TIDAK memutar audio saat di-mute', async () => {
    const { sfx } = await import('../sfx')
    sfx.muted = true
    sfx.audioCache = {}
    sfx.play('click')
    expect(global.Audio).not.toHaveBeenCalled()
  })

  it('toggleMute membalik state dari false ke true', async () => {
    const { sfx } = await import('../sfx')
    sfx.muted = false
    const result = sfx.toggleMute()
    expect(result).toBe(true)
    expect(sfx.isMuted()).toBe(true)
  })

  it('toggleMute membalik state dari true ke false', async () => {
    const { sfx } = await import('../sfx')
    sfx.muted = true
    const result = sfx.toggleMute()
    expect(result).toBe(false)
    expect(sfx.isMuted()).toBe(false)
  })

  it('state mute tersimpan di localStorage setelah toggle', async () => {
    const { sfx } = await import('../sfx')
    sfx.muted = false
    sfx.toggleMute()
    expect(localStorage.getItem('sfx_muted')).toBe('true')
  })

  it('state unmute tersimpan di localStorage setelah toggle balik', async () => {
    const { sfx } = await import('../sfx')
    sfx.muted = true
    sfx.toggleMute()
    expect(localStorage.getItem('sfx_muted')).toBe('false')
  })

  it('isMuted() mengembalikan state saat ini', async () => {
    const { sfx } = await import('../sfx')
    sfx.muted = true
    expect(sfx.isMuted()).toBe(true)
    sfx.muted = false
    expect(sfx.isMuted()).toBe(false)
  })

  it('tidak crash untuk tipe suara yang tidak dikenal', async () => {
    const { sfx } = await import('../sfx')
    sfx.muted = false
    expect(() => sfx.play('suara_tidak_ada_123')).not.toThrow()
  })

  it('tidak crash saat tipe suara undefined', async () => {
    const { sfx } = await import('../sfx')
    sfx.muted = false
    expect(() => sfx.play(undefined)).not.toThrow()
  })

  it('tidak crash saat tipe suara null', async () => {
    const { sfx } = await import('../sfx')
    sfx.muted = false
    expect(() => sfx.play(null)).not.toThrow()
  })

  it('menggunakan audio yang sudah di-cache (tidak buat Audio baru)', async () => {
    const { sfx } = await import('../sfx')
    sfx.muted = false

    // Pre-populate cache dengan fake audio object
    const fakeAudio = { play: vi.fn(() => Promise.resolve()), currentTime: 0 }
    sfx.audioCache = { click: fakeAudio }

    // Reset mock counter SETELAH setup cache
    global.Audio.mockClear()

    // Play — seharusnya pakai cache, bukan buat Audio baru
    sfx.play('click')

    // Audio constructor TIDAK boleh dipanggil karena cache sudah ada
    expect(global.Audio).not.toHaveBeenCalled()
    // Tapi audio yang di-cache harus di-play
    expect(fakeAudio.play).toHaveBeenCalled()
  })
})
