<script setup>
// Mengimpor fungsi reaktivitas (ref, watch) dan lifecycle hooks dari Vue 3
import { ref, onMounted, onUnmounted, watch } from 'vue'
// Mengimpor hook useRouter untuk navigasi halaman programmatic
import { useRouter } from 'vue-router'
// Mengimpor store game Pinia untuk mengakses dan mengubah state game global
import { useGameStore } from '../stores/gameStore'

// Membuat instansi router untuk navigasi halaman
const router = useRouter()
// Mengakses state dan actions global dari Game Store
const gameStore = useGameStore()
// Ref reaktif untuk menampung string tebakan kata warga oleh Mr. White
const guess = ref('')

// Memantau perubahan status ruangan secara dinamis dari database
watch(() => gameStore.currentRoom?.status, (newStatus) => {
  // Jika status berubah menjadi FINISHED (permainan selesai), pindah ke halaman Finish
  if (newStatus === 'FINISHED') {
    router.push(`/room/${gameStore.currentRoom.room_code}/finish`)
  // Jika status berubah menjadi PLAYING (melanjutkan ronde baru), kembali ke halaman Play
  } else if (newStatus === 'PLAYING') {
    router.push(`/room/${gameStore.currentRoom.room_code}/play`)
  }
})

// Lifecycle hook ketika komponen dipasang ke dalam DOM
onMounted(async () => {
  // Jika pemain tidak memiliki data ruangan aktif atau pemain belum terdaftar, arahkan kembali ke beranda
  if (!gameStore.currentRoom || !gameStore.myPlayer) {
    router.push('/')
    return
  }
  // Berlangganan (subscribe) ke update real-time database Supabase
  await gameStore.subscribeToRoom()
})

// Fungsi memicu pengiriman jawaban tebakan Mr. White ke Supabase
const submitGuess = async () => {
  // Jika input tebakan kosong, batalkan pengiriman
  if (!guess.value) return
  // Panggil action gameStore untuk memproses tebakan kata di backend/DB
  await gameStore.guessWord(guess.value)
}
</script>

<!-- Halaman Tebakan Word Mr. White -->
<template>
  <div class="min-h-screen p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
    <!-- Elemen dekoratif latar belakang berbentuk lingkaran blur halus -->
    <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>

    <div class="z-10 max-w-md w-full space-y-10">
      <!-- Tampilan khusus jika user saat ini adalah Mr. White atau sedang bermain dalam Mode Offline (Satu HP) -->
      <div v-if="gameStore.myPlayer?.role === 'MR_WHITE' || gameStore.currentRoom?.game_mode === 'offline'">
        <!-- Judul Peringatan Kesempatan Terakhir -->
        <h1 class="text-4xl font-black text-slate-800 mb-4 uppercase tracking-tighter">Last Chance!</h1>
        <p class="text-slate-500 font-medium leading-relaxed">
          <!-- Dinamis menampilkan nama pemain Mr. White jika offline, atau "You" jika online -->
          {{ gameStore.currentRoom?.game_mode === 'offline' ? 'Mr. White' : 'You' }} was eliminated, but can still win by guessing the 
          <!-- Teks penjelas kata sipil -->
          <span class="text-primary-600 font-black">Civilian Word</span>.
        </p>
        
        <!-- Panel input tebakan dengan gaya kaca transparan -->
        <div class="glass p-10 space-y-8 mt-10 border-b-8 border-primary-500">
          <div class="space-y-2">
            <!-- Label identitas terkonfirmasi -->
            <p class="text-[10px] font-black text-primary-600 uppercase tracking-[0.3em]">Identity Confirmed</p>
            <!-- Judul nama peran -->
            <h2 class="text-2xl font-black text-slate-800">MR. WHITE</h2>
          </div>

          <!-- Input teks untuk memasukkan kata tebakan dengan huruf besar (uppercase) otomatis -->
          <input 
            v-model="guess" 
            type="text" 
            class="input-field w-full text-center text-3xl font-black uppercase tracking-[0.2em] !bg-slate-50 border-2"
            placeholder="TYPE WORD"
            @keyup.enter="submitGuess"
          >
          <!-- Tombol konfirmasi pengiriman tebakan -->
          <button @click="submitGuess" class="btn-primary w-full text-lg shadow-xl shadow-primary-500/20">
            SUBMIT GUESS
          </button>
        </div>
      </div>

      <!-- Tampilan untuk pemain lain (bukan Mr. White) yang sedang menunggu proses penebakan selesai -->
      <div v-else class="glass p-10 space-y-8">
        <!-- Icon animasi berpikir -->
        <div class="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner border border-primary-100">
          🤔
        </div>
        <div>
          <!-- Status loading menunggu tebakan Mr. White -->
          <h1 class="text-2xl font-black text-slate-800 mb-2">Mr. White is guessing...</h1>
          <!-- Keterangan dampak tebakan -->
          <p class="text-slate-400 font-medium animate-pulse tracking-wide uppercase text-[10px]">If he's right, he wins it all!</p>
        </div>
      </div>
    </div>
  </div>
</template>
