// Mengimpor fungsi createRouter dan createWebHistory dari Vue Router library
import { createRouter, createWebHistory } from 'vue-router'

// Memuat komponen secara asinkron (lazy loading) untuk optimasi kecepatan load aplikasi awal
// Halaman utama untuk memasukkan nama dan membuat/gabung room
const HomeView = () => import('../views/HomeView.vue')
// Halaman lobi room untuk mengatur opsi game dan menunggu pemain lain
const LobbyView = () => import('../views/LobbyView.vue')
// Halaman utama gameplay di mana diskusi giliran dilakukan
const GameplayView = () => import('../views/GameplayView.vue')
// Halaman voting untuk memilih pemain yang dicurigai sebagai pengkhianat
const VotingView = () => import('../views/VotingView.vue')
// Halaman tebakan kata oleh Mr. White ketika tereliminasi
const GuessView = () => import('../views/GuessView.vue')
// Halaman penyelesaian game yang menampilkan hasil kemenangan dan peran masing-masing
const FinishedView = () => import('../views/FinishedView.vue')

// Membuat instance router baru
const router = createRouter({
  // Menggunakan mode history HTML5 untuk URL yang bersih tanpa simbol hash (#)
  history: createWebHistory(),
  // Daftar rute (routing) yang didukung oleh aplikasi beserta path parameternya
  routes: [
    {
      // Path rute beranda utama
      path: '/',
      // Nama unik rute
      name: 'home',
      // Komponen yang dirender saat mengakses rute ini
      component: HomeView
    },
    {
      // Path rute lobi room dengan parameter ID kode ruangan
      path: '/room/:id',
      // Nama unik rute lobi
      name: 'lobby',
      // Komponen lobi
      component: LobbyView
    },
    {
      // Path rute permainan utama (giliran berbicara)
      path: '/room/:id/play',
      // Nama unik rute gameplay
      name: 'gameplay',
      // Komponen gameplay
      component: GameplayView
    },
    {
      // Path rute proses voting eliminasi pemain
      path: '/room/:id/vote',
      // Nama unik rute voting
      name: 'voting',
      // Komponen voting
      component: VotingView
    },
    {
      // Path rute tebakan kata warga oleh Mr. White
      path: '/room/:id/guess',
      // Nama unik rute guess
      name: 'guess',
      // Komponen guess
      component: GuessView
    },
    {
      // Path rute penyelesaian/tampilan hasil pemenang
      path: '/room/:id/finish',
      // Nama unik rute finish
      name: 'finish',
      // Komponen finished
      component: FinishedView
    }
  ]
})

// Mengekspor instance router agar dapat didaftarkan di file entrypoint utama (main.js)
export default router
