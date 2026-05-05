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
  <div class="min-h-screen p-4 flex flex-col items-center py-12">
    <div class="max-w-2xl w-full space-y-8 text-center">
      <div>
        <h1 class="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 mb-4">
          GAME OVER
        </h1>
        <div class="glass p-8 inline-block">
          <p class="text-slate-400 uppercase tracking-widest mb-2">The Winners Are</p>
          <h2 class="text-4xl font-bold text-white">{{ winner }}</h2>
        </div>
      </div>

      <div class="glass p-6">
        <h3 class="text-xl font-bold mb-6 text-left border-b border-white/10 pb-2">Final Reveal</h3>
        <div class="space-y-3">
          <div 
            v-for="player in gameStore.players" 
            :key="player.id"
            class="flex justify-between items-center p-3 rounded-lg"
            :class="player.is_alive ? 'bg-white/5' : 'bg-red-500/10 opacity-60'"
          >
            <div class="flex items-center gap-3">
              <span class="font-bold">{{ player.nickname }}</span>
              <span v-if="!player.is_alive" class="text-[10px] bg-red-500 px-2 py-0.5 rounded uppercase">Eliminated</span>
            </div>
            <div class="text-right">
              <p class="text-sm font-bold" :class="player.role === 'CIVILIAN' ? 'text-blue-400' : 'text-red-400'">
                {{ player.role }}
              </p>
              <p class="text-[10px] text-slate-400">{{ player.word || '-' }}</p>
            </div>
          </div>
        </div>
      </div>

      <button @click="restart" class="btn-primary px-12">
        PLAY AGAIN
      </button>
    </div>
  </div>
</template>
