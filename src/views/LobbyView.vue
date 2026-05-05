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
    <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>

    <div class="z-10 max-w-3xl mx-auto w-full space-y-8 mt-10">
      
      <!-- Header / Room Info -->
      <div class="glass p-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div class="text-center md:text-left">
          <p class="text-primary-600 font-bold tracking-widest uppercase text-xs mb-2">{{ t('lobby') }}</p>
          <div class="flex items-center gap-4 justify-center md:justify-start">
            <h1 class="text-4xl md:text-5xl font-black text-slate-800 tracking-widest bg-slate-50 px-6 py-2 rounded-2xl border border-slate-200 shadow-sm">
              {{ gameStore.currentRoom?.room_code }}
            </h1>
          </div>
        </div>
        <div class="text-center md:text-right bg-primary-50/50 px-8 py-5 rounded-3xl border border-primary-100 shadow-sm">
          <p class="text-[10px] text-primary-600 font-black uppercase tracking-widest mb-1">{{ t('players') }}</p>
          <p class="text-4xl font-black text-slate-800"><span class="text-primary-600">{{ gameStore.players.length }}</span> <span class="text-slate-300 text-2xl">/ 20</span></p>
        </div>
      </div>

      <!-- Player List -->
      <div class="glass p-8">
        <h2 class="text-lg font-black text-slate-800 mb-6 flex items-center gap-3 uppercase tracking-wider">
          <span class="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
            <svg class="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </span>
          Joined Players
        </h2>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div 
            v-for="player in gameStore.players" 
            :key="player.id"
            class="bg-white p-4 rounded-2xl flex items-center gap-4 border border-slate-100 hover:border-primary-200 hover:shadow-md transition-all duration-300 group"
          >
            <div class="w-12 h-12 rounded-2xl bg-slate-50 group-hover:bg-primary-50 flex items-center justify-center font-black text-lg text-slate-400 group-hover:text-primary-600 transition-colors shadow-inner">
              {{ player.nickname[0].toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-slate-800 font-bold truncate">{{ player.nickname }}</p>
              <span v-if="player.id === gameStore.currentRoom?.host_id" class="inline-block mt-0.5 text-[9px] font-black tracking-[0.15em] bg-yellow-400/10 text-yellow-600 px-2 py-0.5 rounded-md border border-yellow-400/20 uppercase">HOST</span>
            </div>
          </div>
        </div>
        
        <div v-if="gameStore.players.length === 0" class="text-center py-10 text-slate-400 font-medium italic">
          Fetching player list...
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col items-center justify-center gap-6 pt-4">
        <div v-if="isHost()" class="w-full max-w-sm flex flex-col items-center">
          <button 
            @click="startGame"
            :disabled="gameStore.players.length < 4"
            class="btn-primary w-full text-lg flex items-center justify-center gap-3 group disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
          >
            {{ t('start') }}
            <svg class="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
          <p v-if="gameStore.players.length < 4" class="text-primary-600/60 text-[11px] mt-4 font-black uppercase tracking-widest flex items-center gap-2">
            <span class="w-1.5 h-1.5 bg-primary-600 rounded-full animate-ping"></span>
            Need 4+ players to start
          </p>
        </div>
        <div v-else class="bg-primary-50 px-8 py-4 rounded-full border border-primary-100 flex items-center gap-4 text-primary-600 shadow-sm">
          <div class="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <p class="font-black text-xs uppercase tracking-widest">Waiting for host...</p>
        </div>
      </div>
    </div>
  </div>
</template>
