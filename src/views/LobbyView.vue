<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '../stores/gameStore'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const { t } = useI18n()

watch(() => gameStore.currentRoom?.status, (newStatus) => {
  if (newStatus === 'PLAYING') {
    router.push(`/room/${gameStore.currentRoom.room_code}/play`)
  }
})

onMounted(async () => {
  if (!gameStore.currentRoom) {
    // Try to restore session
    const storedToken = localStorage.getItem('undercover_session')
    if (storedToken) {
      // In a real app, you'd fetch the player and room by token
      // For now, redirect to home if no room in store
      router.push('/')
      return
    }
    router.push('/')
    return
  }

  await gameStore.fetchPlayers()
  const unsubscribe = await gameStore.subscribeToRoom()
  
  onUnmounted(() => {
    if (unsubscribe) unsubscribe()
  })
})

const isHost = () => {
  return gameStore.myPlayer?.id === gameStore.currentRoom?.host_id
}

const startGame = async () => {
  await gameStore.startGame()
}
</script>

<template>
  <div class="min-h-screen p-6 flex flex-col relative overflow-hidden">
    <!-- Decorative background elements -->
    <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-600/20 rounded-full blur-3xl"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-secondary-600/20 rounded-full blur-3xl"></div>

    <div class="z-10 max-w-3xl mx-auto w-full space-y-8 mt-10">
      
      <!-- Header / Room Info -->
      <div class="glass p-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div class="text-center md:text-left">
          <p class="text-primary-300 font-semibold tracking-widest uppercase text-sm mb-1">{{ t('lobby') }}</p>
          <div class="flex items-center gap-4 justify-center md:justify-start">
            <h1 class="text-4xl md:text-5xl font-black text-white tracking-widest bg-slate-950/50 px-6 py-2 rounded-xl border border-white/10">
              {{ gameStore.currentRoom?.room_code }}
            </h1>
          </div>
        </div>
        <div class="text-center md:text-right bg-white/5 px-6 py-4 rounded-2xl border border-white/5">
          <p class="text-sm text-slate-400 font-medium mb-1">{{ t('players') }}</p>
          <p class="text-3xl font-bold text-white"><span class="text-primary-400">{{ gameStore.players.length }}</span> <span class="text-slate-500 text-xl">/ 20</span></p>
        </div>
      </div>

      <!-- Player List -->
      <div class="glass p-8">
        <h2 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <svg class="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Joined Players
        </h2>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div 
            v-for="player in gameStore.players" 
            :key="player.id"
            class="bg-slate-950/40 p-4 rounded-2xl flex items-center gap-4 border border-white/5 hover:bg-white/5 transition-colors"
          >
            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center font-bold text-lg text-white shadow-inner">
              {{ player.nickname[0].toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-white font-semibold truncate">{{ player.nickname }}</p>
              <span v-if="player.id === gameStore.currentRoom?.host_id" class="inline-block mt-0.5 text-[10px] font-bold tracking-wider bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-md border border-yellow-500/30">HOST</span>
            </div>
          </div>
        </div>
        
        <div v-if="gameStore.players.length === 0" class="text-center py-10 text-slate-500">
          Loading players...
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col items-center justify-center gap-4 pt-4">
        <div v-if="isHost()" class="w-full max-w-sm flex flex-col items-center">
          <button 
            @click="startGame"
            :disabled="gameStore.players.length < 4"
            class="btn-primary w-full text-lg flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
          >
            {{ t('start') }}
            <svg class="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
          <p v-if="gameStore.players.length < 4" class="text-red-400 text-sm mt-4 font-medium flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            Need at least 4 players to start
          </p>
        </div>
        <div v-else class="glass-panel px-8 py-4 flex items-center gap-3 text-primary-300">
          <div class="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <p class="font-medium tracking-wide">Waiting for host to start...</p>
        </div>
      </div>
    </div>
  </div>
</template>
