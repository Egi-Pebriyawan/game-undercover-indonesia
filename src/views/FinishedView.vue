<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/gameStore'

const router = useRouter()
const gameStore = useGameStore()

onMounted(async () => {
  if (!gameStore.currentRoom) {
    router.push('/')
    return
  }
  await gameStore.fetchPlayers()
})

const winner = computed(() => {
  const alivePlayers = gameStore.players.filter(p => p.is_alive)
  const baddies = alivePlayers.filter(p => p.role === 'UNDERCOVER' || p.role === 'MR_WHITE')
  
  if (baddies.length > 0) {
    return 'Undercover / Mr. White'
  }
  return 'Civilians'
})

const restart = () => {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen p-6 flex flex-col items-center py-12 relative overflow-hidden">
    <!-- Decorative background elements -->
    <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>

    <div class="z-10 max-w-2xl w-full space-y-10 text-center">
      <div>
        <h1 class="text-6xl font-black text-slate-800 mb-6 tracking-tighter">
          GAME OVER
        </h1>
        <div class="glass p-10 inline-block border-b-8 border-primary-500 shadow-xl">
          <p class="text-slate-400 uppercase tracking-[0.3em] text-[10px] font-black mb-3">The Winners Are</p>
          <h2 class="text-5xl font-black text-primary-600 tracking-tight">{{ winner }}</h2>
        </div>
      </div>

      <div class="glass p-10">
        <h3 class="text-xl font-black text-slate-800 mb-8 flex items-center gap-3 uppercase tracking-wider">
          <span class="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl shadow-inner border border-slate-100">📖</span>
          Final Reveal
        </h3>
        <div class="space-y-4">
          <div 
            v-for="player in gameStore.players" 
            :key="player.id"
            class="flex justify-between items-center p-5 rounded-2xl transition-all border-2"
            :class="player.is_alive ? 'bg-white border-slate-50 shadow-sm' : 'bg-slate-50 border-transparent opacity-60'"
          >
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400">
                {{ player.nickname[0].toUpperCase() }}
              </div>
              <div class="text-left">
                <p class="font-bold text-slate-800 leading-none">{{ player.nickname }}</p>
                <span v-if="!player.is_alive" class="inline-block mt-2 text-[8px] font-black tracking-widest bg-slate-200 text-slate-500 px-2 py-0.5 rounded uppercase">Eliminated</span>
              </div>
            </div>
            <div class="text-right">
              <p class="text-xs font-black uppercase tracking-widest mb-1" :class="player.role === 'CIVILIAN' ? 'text-primary-600' : 'text-primary-800'">
                {{ player.role }}
              </p>
              <p class="text-lg font-black text-slate-700 italic">"{{ player.word || '-' }}"</p>
            </div>
          </div>
        </div>
      </div>

      <button @click="restart" class="btn-primary px-16 text-lg shadow-xl shadow-primary-500/30">
        PLAY AGAIN
      </button>
    </div>
  </div>
</template>
