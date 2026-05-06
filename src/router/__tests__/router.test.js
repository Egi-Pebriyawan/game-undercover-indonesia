import { describe, it, expect } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'

// Buat router dengan stub components (tidak perlu komponen asli)
const stub = { template: '<div/>' }

const makeRouter = () => createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', name: 'home', component: stub },
    { path: '/room/:id', name: 'lobby', component: stub },
    { path: '/room/:id/play', name: 'gameplay', component: stub },
    { path: '/room/:id/vote', name: 'voting', component: stub },
    { path: '/room/:id/guess', name: 'guess', component: stub },
    { path: '/room/:id/finish', name: 'finish', component: stub },
  ]
})

describe('Router', () => {
  // ----------------------------------------------------------
  // Registrasi Route
  // ----------------------------------------------------------
  describe('Registrasi Route', () => {
    it('route "home" terdaftar', () => {
      expect(makeRouter().hasRoute('home')).toBe(true)
    })

    it('route "lobby" terdaftar', () => {
      expect(makeRouter().hasRoute('lobby')).toBe(true)
    })

    it('route "gameplay" terdaftar', () => {
      expect(makeRouter().hasRoute('gameplay')).toBe(true)
    })

    it('route "voting" terdaftar', () => {
      expect(makeRouter().hasRoute('voting')).toBe(true)
    })

    it('route "guess" terdaftar', () => {
      expect(makeRouter().hasRoute('guess')).toBe(true)
    })

    it('route "finish" terdaftar', () => {
      expect(makeRouter().hasRoute('finish')).toBe(true)
    })
  })

  // ----------------------------------------------------------
  // Resolusi Path
  // ----------------------------------------------------------
  describe('Resolusi Path', () => {
    it('"/" resolve ke route home', () => {
      const resolved = makeRouter().resolve('/')
      expect(resolved.name).toBe('home')
    })

    it('"/room/ABCD" resolve ke lobby', () => {
      const resolved = makeRouter().resolve('/room/ABCD')
      expect(resolved.name).toBe('lobby')
    })

    it('"/room/ABCD" menyimpan room code di params', () => {
      const resolved = makeRouter().resolve('/room/ABCD')
      expect(resolved.params.id).toBe('ABCD')
    })

    it('"/room/ABCD/play" resolve ke gameplay', () => {
      const resolved = makeRouter().resolve('/room/ABCD/play')
      expect(resolved.name).toBe('gameplay')
    })

    it('"/room/ABCD/vote" resolve ke voting', () => {
      const resolved = makeRouter().resolve('/room/ABCD/vote')
      expect(resolved.name).toBe('voting')
    })

    it('"/room/ABCD/guess" resolve ke guess', () => {
      const resolved = makeRouter().resolve('/room/ABCD/guess')
      expect(resolved.name).toBe('guess')
    })

    it('"/room/ABCD/finish" resolve ke finish', () => {
      const resolved = makeRouter().resolve('/room/ABCD/finish')
      expect(resolved.name).toBe('finish')
    })

    it('Room code berupa angka masih valid', () => {
      const resolved = makeRouter().resolve('/room/123456')
      expect(resolved.name).toBe('lobby')
      expect(resolved.params.id).toBe('123456')
    })

    it('Room code dengan huruf kapital masih valid', () => {
      const resolved = makeRouter().resolve('/room/XYZ789')
      expect(resolved.params.id).toBe('XYZ789')
    })
  })
})
