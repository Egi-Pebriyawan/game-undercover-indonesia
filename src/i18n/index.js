import { createI18n } from 'vue-i18n'

const messages = {
  ID: {
    welcome: 'Selamat Datang di Undercover',
    createRoom: 'Buat Room',
    joinRoom: 'Masuk Room',
    nickname: 'Nama Panggilan',
    roomCode: 'Kode Room',
    start: 'Mulai Game',
    waiting: 'Menunggu pemain lain...',
    lobby: 'Lobi',
    players: 'Pemain',
    role: 'Peran',
    word: 'Kata Rahasia',
    alive: 'Hidup',
    eliminated: 'Tereliminasi',
    vote: 'Pilih',
    doneTalking: 'Selesai Bicara'
  },
  EN: {
    welcome: 'Welcome to Undercover',
    createRoom: 'Create Room',
    joinRoom: 'Join Room',
    nickname: 'Nickname',
    roomCode: 'Room Code',
    start: 'Start Game',
    waiting: 'Waiting for players...',
    lobby: 'Lobby',
    players: 'Players',
    role: 'Role',
    word: 'Secret Word',
    alive: 'Alive',
    eliminated: 'Eliminated',
    vote: 'Vote',
    doneTalking: 'Done Talking'
  }
}

export const i18n = createI18n({
  legacy: false,
  locale: 'ID',
  fallbackLocale: 'EN',
  messages
})
