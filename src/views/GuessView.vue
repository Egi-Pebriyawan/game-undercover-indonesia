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

<template>
  <div class="min-h-screen p-4 flex flex-col items-center justify-center text-center">
    <div class="max-w-md w-full space-y-8">
      <div v-if="gameStore.myPlayer?.role === 'MR_WHITE'">
        <h1 class="text-4xl font-bold text-purple-400 mb-4">MR. WHITE IS ELIMINATED!</h1>
        <p class="text-xl mb-8">But wait! You can still win if you can guess the <span class="text-emerald-400 font-bold">Civilian Word</span>.</p>
        
        <div class="glass p-8 space-y-6">
          <input 
            v-model="guess" 
            type="text" 
            class="input-field w-full text-center text-2xl uppercase tracking-widest"
            placeholder="TYPE WORD HERE"
            @keyup.enter="submitGuess"
          >
          <button @click="submitGuess" class="btn-primary w-full">
            SUBMIT GUESS
          </button>
        </div>
      </div>

      <div v-else class="glass p-8 space-y-6">
        <h1 class="text-2xl font-bold">Mr. White is guessing...</h1>
        <p class="text-slate-400 animate-pulse">If he guesses correctly, he wins!</p>
      </div>
    </div>
  </div>
</template>
