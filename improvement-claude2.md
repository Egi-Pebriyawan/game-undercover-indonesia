# Improvement Plan v2 — Undercover Indonesia
> Dibuat berdasarkan **code review menyeluruh** semua file proyek.
> Ditujukan untuk: Junior Developer / AI Agent.
> Stack: Vue 3, Pinia, Supabase, TailwindCSS v4.

---

## STATUS SAAT INI

| Area | Status | Keterangan |
|---|---|---|
| API Key di `.env` | ✅ Selesai | |
| SEO & Meta Tags | ✅ Selesai | |
| PWA Manifest | ✅ Selesai | |
| Lazy Loading Router | ✅ Selesai | |
| SFX Audio | ✅ Selesai | |
| Custom Words | ✅ Selesai | |
| Ko-fi Support Menu | ✅ Selesai (HomeView) | Belum di FinishedView |
| Confetti Victory | ⚠️ Bug | Fungsi ada tapi tidak dipanggil |
| Session Restore | ⚠️ Bug | Redirect salah untuk VOTING/FINISHED |
| Unit Testing | ❌ Belum ada | Prioritas utama |
| i18n konsisten | ⚠️ Bug | Ada hardcoded string |
| console.log sensitif | ⚠️ Bug | Bocorkan kata rahasia ke console |

---

## BUG KRITIS — PERBAIKI DULU

### BUG-1: `fireConfetti` tidak dipanggil
**File:** `src/views/FinishedView.vue`

`import confetti` sudah ada tapi fungsinya tidak pernah dipanggil.

**Fix — tambahkan di `onMounted` dan buat fungsinya:**
```javascript
// Di onMounted, ganti blok SFX:
if (winnerRole === 'CIVILIANS') {
  sfx.play('victory')
  fireConfetti() // TAMBAHKAN INI
} else {
  sfx.play('defeat')
}

// Tambahkan fungsi baru setelah onMounted:
const fireConfetti = () => {
  const duration = 3000
  const animationEnd = Date.now() + duration
  const interval = setInterval(() => {
    if (Date.now() > animationEnd) return clearInterval(interval)
    const count = 50 * ((animationEnd - Date.now()) / duration)
    confetti({ particleCount: count, spread: 360, origin: { x: Math.random(), y: Math.random() - 0.2 } })
  }, 250)
}
```

---

### BUG-2: Session restore redirect ke halaman salah
**File:** `src/App.vue` baris 16-19

Jika status room `VOTING` atau `FINISHED`, user selalu diarahkan ke `/play`.

**Fix — ganti blok if-else:**
```javascript
// SEBELUM:
if (status === 'LOBBY') {
  router.push(`/room/${code}`)
} else {
  router.push(`/room/${code}/play`)
}

// SESUDAH:
const routeMap = {
  'LOBBY': `/room/${code}`,
  'PLAYING': `/room/${code}/play`,
  'VOTING': `/room/${code}/vote`,
  'MR_WHITE_GUESS': `/room/${code}/guess`,
  'FINISHED': `/room/${code}/finish`,
}
router.push(routeMap[status] || '/')
```

---

### BUG-3: `console.log` bocorkan kata rahasia
**File:** `src/stores/gameStore.js` sekitar baris 608

```javascript
console.log('Comparing guess:', guess, 'with word:', civilianWord)
```

Siapapun bisa buka DevTools dan tahu kata rahasianya!

**Fix:**
```javascript
// Hapus baris itu, atau ganti dengan:
if (import.meta.env.DEV) {
  console.log('Comparing guess:', guess, 'with word:', civilianWord)
}
```

---

### BUG-4: Hardcoded string tidak pakai i18n
**File:** `src/views/LobbyView.vue` baris 173, 292, 299 dan `GameplayView.vue` baris 209

Contoh yang salah:
```html
<!-- LobbyView.vue baris 173 -->
{{ t('welcome') === 'Welcome to Undercover' ? 'Add' : 'Tambah' }}

<!-- GameplayView.vue baris 209 — "detik" tidak diterjemahkan -->
<span class="text-[8px]...">detik</span>
```

**Fix — tambahkan di `src/i18n/index.js`:**
```javascript
// Bagian ID:
settings: {
  // ... yang sudah ada ...
  addPlayer: 'Tambah',
  anonymousDesc: 'Gilirkan HP ke setiap pemain',
  realLifeDesc: 'Paling cepat (Host tentukan hasil)',
},
gameplay: {
  // ... yang sudah ada ...
  seconds: 'detik',
},

// Bagian EN:
settings: {
  addPlayer: 'Add',
  anonymousDesc: 'Pass the phone around',
  realLifeDesc: 'Fastest (Host decides result)',
},
gameplay: {
  seconds: 'sec',
},
```

Lalu ganti di template dengan `{{ t('settings.addPlayer') }}` dan `{{ t('gameplay.seconds') }}`.

---

### BUG-5: `resetRoom` tidak ada error handling
**File:** `src/stores/gameStore.js` baris 64-97

Jika salah satu dari tiga operasi DB gagal, `loading` tidak akan di-reset ke `false` dan UI akan stuck.

**Fix:**
```javascript
async resetRoom() {
  if (!this.currentRoom) return
  try {
    this.loading = true
    await Promise.all([
      supabase.from('rooms')
        .update({ status: 'LOBBY', current_round: 1, current_turn: 0 })
        .eq('id', this.currentRoom.id),
      supabase.from('players')
        .update({ is_alive: true, role: null, word: null, turn_order: null })
        .eq('room_id', this.currentRoom.id),
      supabase.from('votes')
        .delete()
        .eq('room_id', this.currentRoom.id),
    ])
    await this.fetchPlayers()
  } catch (err) {
    console.error('Reset Room Error:', err)
    this.showNotify('Gagal mereset ruangan. Coba lagi.')
  } finally {
    this.loading = false
  }
},
```

---

## TASK LIST — UNIT TESTING

### TASK-1: Setup Environment Testing
**Estimasi:** 1-2 jam

```bash
npm install -D vitest @vue/test-utils happy-dom @pinia/testing
```

Buat file `vitest.config.js` di root proyek:
```javascript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    }
  },
})
```

Tambahkan script di `package.json`:
```json
"test": "vitest",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"
```

---

### TASK-2: Test Store — `gameStore.js`
**File baru:** `src/stores/__tests__/gameStore.test.js`
**Estimasi:** 2-3 jam

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '../gameStore'

// Mock Supabase agar tidak perlu koneksi internet saat test
vi.mock('../../services/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'uuid-1', room_code: 'ABCD12', status: 'LOBBY' },
            error: null
          }))
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: { message: 'not found' } })),
          data: [], error: null
        })),
        count: 'exact',
        head: true,
      })),
      update: vi.fn(() => ({ eq: vi.fn(() => ({ data: null, error: null })) })),
      delete: vi.fn(() => ({ eq: vi.fn(() => ({ data: null, error: null })) })),
    })),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
  }
}))

describe('gameStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
  })

  describe('showNotify', () => {
    it('menampilkan notifikasi dengan pesan benar', () => {
      const store = useGameStore()
      store.showNotify('Test pesan', 'error')
      expect(store.notification.show).toBe(true)
      expect(store.notification.message).toBe('Test pesan')
      expect(store.notification.type).toBe('error')
    })

    it('default type adalah error', () => {
      const store = useGameStore()
      store.showNotify('Test')
      expect(store.notification.type).toBe('error')
    })
  })

  describe('createRoom', () => {
    it('mengembalikan data room jika sukses', async () => {
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

    it('currentRoom diset setelah sukses', async () => {
      const store = useGameStore()
      await store.createRoom('ID')
      expect(store.currentRoom).not.toBeNull()
    })
  })

  describe('myPlayer getter', () => {
    it('mengembalikan null jika tidak ada session', () => {
      const store = useGameStore()
      expect(store.myPlayer).toBeNull()
    })

    it('menemukan player berdasarkan sessionStorage id', () => {
      const store = useGameStore()
      store.players = [{ id: 'player-1', nickname: 'Budi' }]
      sessionStorage.setItem('undercover_player_id', 'player-1')
      expect(store.myPlayer?.nickname).toBe('Budi')
    })

    it('mengembalikan null jika id tidak cocok', () => {
      const store = useGameStore()
      store.players = [{ id: 'player-1', nickname: 'Budi' }]
      sessionStorage.setItem('undercover_player_id', 'player-99')
      expect(store.myPlayer).toBeNull()
    })
  })

  describe('calculateElimination', () => {
    it('tidak throw saat votes valid', async () => {
      const store = useGameStore()
      store.currentRoom = { id: 'room-1', current_round: 1 }
      store.players = [
        { id: 'p1', is_alive: true, role: 'CIVILIAN', nickname: 'A' },
        { id: 'p2', is_alive: true, role: 'UNDERCOVER', nickname: 'B' },
      ]
      const votes = [
        { voter_id: 'p1', target_id: 'p2' },
        { voter_id: 'p2', target_id: 'p1' },
        { voter_id: 'p3', target_id: 'p2' },
      ]
      await expect(store.calculateElimination(votes)).resolves.not.toThrow()
    })
  })
})
```

---

### TASK-3: Test Utility — `sfx.js`
**File baru:** `src/utils/__tests__/sfx.test.js`
**Estimasi:** 1 jam

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock browser Audio API
global.Audio = vi.fn(() => ({
  play: vi.fn(() => Promise.resolve()),
  currentTime: 0,
}))

describe('SFXManager', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('play audio saat tidak di-mute', async () => {
    const { sfx } = await import('../sfx')
    sfx.muted = false
    sfx.audioCache = {}
    sfx.play('click')
    expect(global.Audio).toHaveBeenCalled()
  })

  it('TIDAK play audio saat di-mute', async () => {
    const { sfx } = await import('../sfx')
    sfx.muted = true
    sfx.audioCache = {}
    sfx.play('click')
    expect(global.Audio).not.toHaveBeenCalled()
  })

  it('toggleMute membalik state', async () => {
    const { sfx } = await import('../sfx')
    sfx.muted = false
    const result = sfx.toggleMute()
    expect(result).toBe(true)
    expect(sfx.isMuted()).toBe(true)
  })

  it('state mute tersimpan di localStorage', async () => {
    const { sfx } = await import('../sfx')
    sfx.muted = false
    sfx.toggleMute()
    expect(localStorage.getItem('sfx_muted')).toBe('true')
  })

  it('tidak crash untuk tipe suara tidak dikenal', async () => {
    const { sfx } = await import('../sfx')
    sfx.muted = false
    expect(() => sfx.play('suara_hantu_123')).not.toThrow()
  })

  it('tidak crash saat sound type undefined', async () => {
    const { sfx } = await import('../sfx')
    sfx.muted = false
    expect(() => sfx.play(undefined)).not.toThrow()
  })
})
```

---

### TASK-4: Test Router
**File baru:** `src/router/__tests__/router.test.js`
**Estimasi:** 30 menit

```javascript
import { describe, it, expect } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'

const makeRouter = () => createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', name: 'home', component: { template: '<div/>' } },
    { path: '/room/:id', name: 'lobby', component: { template: '<div/>' } },
    { path: '/room/:id/play', name: 'gameplay', component: { template: '<div/>' } },
    { path: '/room/:id/vote', name: 'voting', component: { template: '<div/>' } },
    { path: '/room/:id/guess', name: 'guess', component: { template: '<div/>' } },
    { path: '/room/:id/finish', name: 'finish', component: { template: '<div/>' } },
  ]
})

describe('Router', () => {
  it('semua route terdaftar', () => {
    const router = makeRouter()
    expect(router.hasRoute('home')).toBe(true)
    expect(router.hasRoute('lobby')).toBe(true)
    expect(router.hasRoute('gameplay')).toBe(true)
    expect(router.hasRoute('voting')).toBe(true)
    expect(router.hasRoute('guess')).toBe(true)
    expect(router.hasRoute('finish')).toBe(true)
  })

  it('/room/ABCD resolve ke lobby dengan params yang benar', () => {
    const router = makeRouter()
    const resolved = router.resolve('/room/ABCD')
    expect(resolved.name).toBe('lobby')
    expect(resolved.params.id).toBe('ABCD')
  })

  it('/room/ABCD/vote resolve ke voting', () => {
    const router = makeRouter()
    const resolved = router.resolve('/room/ABCD/vote')
    expect(resolved.name).toBe('voting')
  })

  it('/room/ABCD/finish resolve ke finish', () => {
    const router = makeRouter()
    const resolved = router.resolve('/room/ABCD/finish')
    expect(resolved.name).toBe('finish')
  })
})
```

---

## TASK LIST — FITUR & UX

### TASK-5: Ko-fi di FinishedView
**File:** `src/views/FinishedView.vue` baris 128-131
**Estimasi:** 15 menit

Ganti tombol Saweria tunggal dengan dua tombol:
```html
<div class="flex flex-col sm:flex-row gap-3 justify-center">
  <a href="https://saweria.co/Pebri17" target="_blank"
    class="inline-flex items-center gap-2 bg-amber-50 px-5 py-3 rounded-2xl border border-amber-100 text-amber-700 hover:bg-amber-100 transition-all">
    <span class="text-lg">🇮🇩</span>
    <span class="font-black text-xs uppercase tracking-widest">Saweria</span>
  </a>
  <a href="https://ko-fi.com/pebriyawan" target="_blank"
    class="inline-flex items-center gap-2 bg-blue-50 px-5 py-3 rounded-2xl border border-blue-100 text-blue-700 hover:bg-blue-100 transition-all">
    <span class="text-lg">🌎</span>
    <span class="font-black text-xs uppercase tracking-widest">Ko-fi</span>
  </a>
</div>
```

---

### TASK-6: Tambah `id` Attributes untuk Testing & Aksesibilitas
**Estimasi:** 30 menit

Tambahkan `id` pada elemen penting agar test bisa menemukan elemen dengan mudah:

| File | Elemen | ID |
|---|---|---|
| HomeView.vue | Input nickname | `input-nickname` |
| HomeView.vue | Input room code | `input-room-code` |
| HomeView.vue | Tombol Buat Room | `btn-create-room` |
| HomeView.vue | Tombol Join Room | `btn-join-room` |
| LobbyView.vue | Tombol Start Game | `btn-start-game` |
| LobbyView.vue | Tombol Share WA | `btn-share-wa` |
| GameplayView.vue | Tombol Start Voting | `btn-start-voting` |
| GameplayView.vue | Tombol Reset Timer | `btn-reset-timer` |

---

## CHECKLIST SEBELUM DEPLOY

- [ ] `npm run test:run` — semua test lulus
- [ ] BUG-1 (confetti) sudah diperbaiki
- [ ] BUG-2 (session restore) sudah diperbaiki
- [ ] BUG-3 (console.log) sudah dihapus
- [ ] File `.env` tidak masuk Git
- [ ] RLS Supabase sudah aktif (jalankan SQL di bawah)
- [ ] Ko-fi tersedia di HomeView dan FinishedView

---

## SQL WAJIB DI SUPABASE DASHBOARD

Buka: Supabase Dashboard → SQL Editor → Jalankan query ini:

```sql
-- Aktifkan RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.words_library ENABLE ROW LEVEL SECURITY;

-- Buat Policy akses publik
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rooms' AND policyname='Public rooms access') THEN
    CREATE POLICY "Public rooms access" ON public.rooms FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='players' AND policyname='Public players access') THEN
    CREATE POLICY "Public players access" ON public.players FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='votes' AND policyname='Public votes access') THEN
    CREATE POLICY "Public votes access" ON public.votes FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='words_library' AND policyname='Public words read') THEN
    CREATE POLICY "Public words read" ON public.words_library FOR SELECT USING (true);
  END IF;
END $$;
```

---

## URUTAN PENGERJAAN (PRIORITAS)

1. 🔴 **BUG-3** — Hapus `console.log` sensitif (2 menit)
2. 🔴 **BUG-1** — Fix confetti tidak muncul (5 menit)
3. 🔴 **BUG-2** — Fix session restore (10 menit)
4. 🟡 **TASK-1** — Setup Vitest (1-2 jam)
5. 🟡 **TASK-2** — Test gameStore (2-3 jam)
6. 🟡 **TASK-3** — Test sfx.js (1 jam)
7. 🟡 **TASK-4** — Test router (30 menit)
8. 🟢 **BUG-4, BUG-5** — i18n & resetRoom fix (30 menit)
9. 🟢 **TASK-5** — Ko-fi di FinishedView (15 menit)
10. 🟢 **TASK-6** — id attributes (30 menit)
