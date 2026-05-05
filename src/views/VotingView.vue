<script setup>
import { onMounted, onUnmounted, watch, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/gameStore'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const gameStore = useGameStore()
const { t } = useI18n()

const votedId = ref(null)

watch(() => gameStore.currentRoom?.status, (newStatus) => {
  if (newStatus === 'PLAYING') {
    router.push(`/room/${gameStore.currentRoom.room_code}/play`)
  } else if (newStatus === 'MR_WHITE_GUESS') {
    router.push(`/room/${gameStore.currentRoom.room_code}/guess`)
  } else if (newStatus === 'FINISHED') {
    router.push(`/room/${gameStore.currentRoom.room_code}/finish`)
  }
})

onMounted(async () => {
  if (!gameStore.currentRoom || !gameStore.myPlayer) {
    router.push('/')
    return
  }
  
  const unsubscribe = await gameStore.subscribeToRoom()
  onUnmounted(() => {
    if (unsubscribe) unsubscribe()
  })
})

const handleVote = async (playerId) => {
  if (votedId.value || !gameStore.myPlayer.is_alive) return
  votedId.value = playerId
  await gameStore.votePlayer(playerId)
}
</script>

<template>
  <div class="min-h-screen p-4 flex flex-col items-center py-12">
    <div class="max-w-2xl w-full space-y-8 text-center">
      <div>
        <h1 class="text-4xl font-bold text-red-500 mb-2">TIME TO VOTE!</h1>
        <p class="text-slate-400">Choose who you think is the Undercover or Mr. White.</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button 
          v-for="player in gameStore.players" 
          :key="player.id"
          @click="handleVote(player.id)"
          :disabled="!player.is_alive || votedId || !gameStore.myPlayer.is_alive"
          class="relative glass p-6 transition-all group overflow-hidden"
          :class="[
            player.is_alive ? 'hover:border-red-500 hover:bg-red-500/10' : 'opacity-40 grayscale cursor-not-allowed',
            votedId === player.id ? 'border-red-500 bg-red-500/20' : ''
          ]"
        >
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xl group-hover:bg-red-500 transition-colors">
              {{ player.nickname[0].toUpperCase() }}
            </div>
            <div class="text-left">
              <p class="font-bold text-lg">{{ player.nickname }}</p>
              <p class="text-xs text-slate-400">
                {{ player.is_alive ? 'Status: Alive' : 'Status: Eliminated' }}
              </p>
            </div>
          </div>
          
          <div v-if="votedId === player.id" class="absolute top-2 right-2 text-red-500">
             ✅
          </div>
        </button>
      </div>

      <div v-if="votedId" class="glass p-6 bg-emerald-500/10 border-emerald-500/30">
        <p class="text-emerald-400 font-medium animate-pulse">
          Vote recorded! Waiting for others...
        </p>
      </div>

      <div v-if="!gameStore.myPlayer.is_alive" class="glass p-6 bg-slate-800">
        <p class="text-slate-400 italic">
          You are eliminated and cannot vote, but you can still watch the results.
        </p>
      </div>
    </div>
  </div>
</template>
