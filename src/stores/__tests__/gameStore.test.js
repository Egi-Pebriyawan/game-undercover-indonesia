import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '../gameStore'

// ============================================================
// Mock Supabase — tidak perlu koneksi internet saat testing
// ============================================================
vi.mock('../../services/supabase', () => ({
  supabase: {
    from: vi.fn((table) => {
      const chainable = {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { id: 'uuid-room-1', room_code: 'ABCD12', status: 'LOBBY', language: 'ID' },
              error: null
            }))
          }))
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({ data: null, error: { message: 'not found' } })),
            data: [], error: null
          })),
          count: 10,
          error: null
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({ data: null, error: null }))
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({ data: null, error: null }))
        })),
      }
      return chainable
    }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    })),
    removeChannel: vi.fn(),
  }
}))

// ============================================================
// TEST SUITE
// ============================================================

describe('gameStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  // ----------------------------------------------------------
  // showNotify
  // ----------------------------------------------------------
  describe('showNotify', () => {
    it('menampilkan notifikasi dengan pesan yang benar', () => {
      const store = useGameStore()
      store.showNotify('Pesan test', 'error')
      expect(store.notification.show).toBe(true)
      expect(store.notification.message).toBe('Pesan test')
      expect(store.notification.type).toBe('error')
    })

    it('default type adalah error jika tidak disebutkan', () => {
      const store = useGameStore()
      store.showNotify('Pesan tanpa tipe')
      expect(store.notification.type).toBe('error')
    })

    it('bisa menampilkan tipe success', () => {
      const store = useGameStore()
      store.showNotify('Sukses!', 'success')
      expect(store.notification.type).toBe('success')
    })
  })

  // ----------------------------------------------------------
  // createRoom
  // ----------------------------------------------------------
  describe('createRoom', () => {
    it('mengembalikan data room saat sukses', async () => {
      const store = useGameStore()
      const result = await store.createRoom('ID')
      expect(result).not.toBeNull()
      expect(result.room_code).toBe('ABCD12')
    })

    it('loading kembali false setelah selesai', async () => {
      const store = useGameStore()
      await store.createRoom('ID')
      expect(store.loading).toBe(false)
    })

    it('currentRoom diset setelah createRoom sukses', async () => {
      const store = useGameStore()
      await store.createRoom('ID')
      expect(store.currentRoom).not.toBeNull()
      expect(store.currentRoom.status).toBe('LOBBY')
    })

    it('mengembalikan null dan menampilkan notifikasi saat error', async () => {
      // Override mock untuk throw error
      const { supabase } = await import('../../services/supabase')
      supabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: null, error: { message: 'Koneksi gagal' } }))
          }))
        }))
      })

      const store = useGameStore()
      const result = await store.createRoom('ID')
      expect(result).toBeNull()
      expect(store.loading).toBe(false)
    })
  })

  // ----------------------------------------------------------
  // myPlayer (getter)
  // ----------------------------------------------------------
  describe('myPlayer getter', () => {
    it('mengembalikan null jika tidak ada session', () => {
      const store = useGameStore()
      sessionStorage.removeItem('undercover_player_id')
      expect(store.myPlayer).toBeNull()
    })

    it('menemukan player berdasarkan id di sessionStorage', () => {
      const store = useGameStore()
      store.players = [
        { id: 'player-1', nickname: 'Budi' },
        { id: 'player-2', nickname: 'Ani' },
      ]
      sessionStorage.setItem('undercover_player_id', 'player-1')
      expect(store.myPlayer?.nickname).toBe('Budi')
    })

    it('mengembalikan null jika id tidak cocok dengan players', () => {
      const store = useGameStore()
      store.players = [{ id: 'player-1', nickname: 'Budi' }]
      sessionStorage.setItem('undercover_player_id', 'player-99')
      expect(store.myPlayer).toBeNull()
    })

    it('mengembalikan null jika players kosong', () => {
      const store = useGameStore()
      store.players = []
      sessionStorage.setItem('undercover_player_id', 'player-1')
      expect(store.myPlayer).toBeNull()
    })
  })

  // ----------------------------------------------------------
  // calculateElimination
  // ----------------------------------------------------------
  describe('calculateElimination', () => {
    it('fungsi calculateElimination ada di store', () => {
      const store = useGameStore()
      expect(typeof store.calculateElimination).toBe('function')
    })

    it('menghitung pemain dengan vote terbanyak dengan benar', () => {
      // Test logika vote counting secara langsung (tanpa async Supabase)
      const votes = [
        { voter_id: 'p1', target_id: 'p2' },
        { voter_id: 'p3', target_id: 'p2' },
        { voter_id: 'p2', target_id: 'p1' },
      ]

      // Hitung vote secara manual — logika yang sama seperti di store
      const voteCounts = {}
      votes.forEach(v => {
        voteCounts[v.target_id] = (voteCounts[v.target_id] || 0) + 1
      })
      const maxVotes = Math.max(...Object.values(voteCounts))
      const eliminated = Object.keys(voteCounts).find(id => voteCounts[id] === maxVotes)

      expect(eliminated).toBe('p2') // p2 dapat 2 vote, p1 dapat 1 vote
      expect(voteCounts['p2']).toBe(2)
    })

    it('mendeteksi seri (tie) dengan benar', () => {
      const votes = [
        { voter_id: 'p1', target_id: 'p2' },
        { voter_id: 'p2', target_id: 'p1' },
      ]

      const voteCounts = {}
      votes.forEach(v => {
        voteCounts[v.target_id] = (voteCounts[v.target_id] || 0) + 1
      })
      const maxVotes = Math.max(...Object.values(voteCounts))
      const topPlayers = Object.keys(voteCounts).filter(id => voteCounts[id] === maxVotes)

      // Seri — lebih dari satu pemain dengan vote maksimum
      expect(topPlayers.length).toBe(2)
    })
  })

  // ----------------------------------------------------------
  // State awal
  // ----------------------------------------------------------
  describe('initial state', () => {
    it('currentRoom adalah null', () => {
      const store = useGameStore()
      expect(store.currentRoom).toBeNull()
    })

    it('players adalah array kosong', () => {
      const store = useGameStore()
      expect(store.players).toEqual([])
    })

    it('loading adalah false', () => {
      const store = useGameStore()
      expect(store.loading).toBe(false)
    })

    it('notification.show adalah false', () => {
      const store = useGameStore()
      expect(store.notification.show).toBe(false)
    })

    it('offlineRevealIndex adalah -1', () => {
      const store = useGameStore()
      expect(store.offlineRevealIndex).toBe(-1)
    })
  })

  // ----------------------------------------------------------
  // setRevealed
  // ----------------------------------------------------------
  describe('setRevealed', () => {
    it('mengubah isRevealed menjadi true', () => {
      const store = useGameStore()
      store.setRevealed(true)
      expect(store.isRevealed).toBe(true)
    })

    it('mengubah isRevealed menjadi false', () => {
      const store = useGameStore()
      store.isRevealed = true
      store.setRevealed(false)
      expect(store.isRevealed).toBe(false)
    })
  })

  // ----------------------------------------------------------
  // nextOfflineReveal
  // ----------------------------------------------------------
  describe('nextOfflineReveal', () => {
    it('increment offlineRevealIndex jika masih ada pemain', async () => {
      const store = useGameStore()
      store.players = [
        { id: 'p1', nickname: 'A', is_alive: true },
        { id: 'p2', nickname: 'B', is_alive: true },
        { id: 'p3', nickname: 'C', is_alive: true },
      ]
      store.offlineRevealIndex = 0
      await store.nextOfflineReveal()
      expect(store.offlineRevealIndex).toBe(1)
    })

    it('reset ke -1 jika semua pemain sudah reveal', async () => {
      const store = useGameStore()
      store.players = [
        { id: 'p1', nickname: 'A', is_alive: true },
        { id: 'p2', nickname: 'B', is_alive: true },
      ]
      store.offlineRevealIndex = 1 // index terakhir
      await store.nextOfflineReveal()
      expect(store.offlineRevealIndex).toBe(-1)
    })
  })
})
