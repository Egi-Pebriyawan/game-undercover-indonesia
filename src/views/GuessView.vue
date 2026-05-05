<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/gameStore'

const router = useRouter()
const gameStore = useGameStore()
const guess = ref('')

watch(() => gameStore.currentRoom?.status, (newStatus) => {
  if (newStatus === 'FINISHED') {
    router.push(`/room/${gameStore.currentRoom.room_code}/finish`)
  } else if (newStatus === 'PLAYING') {
    router.push(`/room/${gameStore.currentRoom.room_code}/play`)
  }
})

onMounted(async () => {
  if (!gameStore.currentRoom || !gameStore.myPlayer) {
    router.push('/')
    return
  }
  await gameStore.subscribeToRoom()
})

const submitGuess = async () => {
  if (!guess.value) return
  await gameStore.guessWord(guess.value)
}
</script>

<!-- GuessView.vue -->
<template>
  <div class="min-h-screen p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
    <!-- Decorative background elements -->
    <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>

    <div class="z-10 max-w-md w-full space-y-10">
      <div v-if="gameStore.myPlayer?.role === 'MR_WHITE' || gameStore.currentRoom?.game_mode === 'offline'">
        <h1 class="text-4xl font-black text-slate-800 mb-4 uppercase tracking-tighter">Last Chance!</h1>
        <p class="text-slate-500 font-medium leading-relaxed">
          {{ gameStore.currentRoom?.game_mode === 'offline' ? 'Mr. White' : 'You' }} was eliminated, but can still win by guessing the 
          <span class="text-primary-600 font-black">Civilian Word</span>.
        </p>
        
        <div class="glass p-10 space-y-8 mt-10 border-b-8 border-primary-500">
          <div class="space-y-2">
            <p class="text-[10px] font-black text-primary-600 uppercase tracking-[0.3em]">Identity Confirmed</p>
            <h2 class="text-2xl font-black text-slate-800">MR. WHITE</h2>
          </div>

          <input 
            v-model="guess" 
            type="text" 
            class="input-field w-full text-center text-3xl font-black uppercase tracking-[0.2em] !bg-slate-50 border-2"
            placeholder="TYPE WORD"
            @keyup.enter="submitGuess"
          >
          <button @click="submitGuess" class="btn-primary w-full text-lg shadow-xl shadow-primary-500/20">
            SUBMIT GUESS
          </button>
        </div>
      </div>

      <div v-else class="glass p-10 space-y-8">
        <div class="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner border border-primary-100">
          🤔
        </div>
        <div>
          <h1 class="text-2xl font-black text-slate-800 mb-2">Mr. White is guessing...</h1>
          <p class="text-slate-400 font-medium animate-pulse tracking-wide uppercase text-[10px]">If he's right, he wins it all!</p>
        </div>
      </div>
    </div>
  </div>
</template>
