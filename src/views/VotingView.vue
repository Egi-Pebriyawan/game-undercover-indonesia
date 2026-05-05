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
  <div class="min-h-screen p-6 flex flex-col items-center py-12 relative overflow-hidden">
    <!-- Decorative background elements -->
    <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>

    <div class="z-10 max-w-2xl w-full space-y-10 text-center">
      <div>
        <h1 class="text-5xl font-black text-slate-800 mb-3 tracking-tight">TIME TO VOTE!</h1>
        <p class="text-slate-500 font-medium tracking-wide">Who is the <span class="text-primary-600 font-bold">Undercover</span> among us?</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button 
          v-for="player in gameStore.players" 
          :key="player.id"
          @click="handleVote(player.id)"
          :disabled="!player.is_alive || votedId || !gameStore.myPlayer.is_alive"
          class="relative glass p-6 transition-all duration-300 group overflow-hidden border-2"
          :class="[
            player.is_alive ? 'hover:border-primary-500 hover:bg-white' : 'opacity-40 grayscale cursor-not-allowed',
            votedId === player.id ? 'border-primary-500 bg-white shadow-lg' : 'border-transparent'
          ]"
        >
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-xl text-slate-400 group-hover:text-primary-600 group-hover:bg-primary-50 transition-all shadow-inner">
              {{ player.nickname[0].toUpperCase() }}
            </div>
            <div class="text-left">
              <p class="font-black text-slate-800 text-lg leading-tight">{{ player.nickname }}</p>
              <p class="text-[10px] font-black uppercase tracking-widest" :class="player.is_alive ? 'text-primary-600/60' : 'text-slate-400'">
                {{ player.is_alive ? 'Status: Alive' : 'Status: Eliminated' }}
              </p>
            </div>
          </div>
          
          <div v-if="votedId === player.id" class="absolute top-3 right-3 text-primary-600 bg-primary-50 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm border border-primary-100">
             ✅
          </div>
        </button>
      </div>

      <div v-if="votedId" class="bg-primary-50 border border-primary-100 p-6 rounded-3xl shadow-sm inline-block">
        <p class="text-primary-600 font-black text-xs uppercase tracking-[0.2em] animate-pulse">
          Vote recorded! Waiting for others...
        </p>
      </div>

      <div v-if="!gameStore.myPlayer.is_alive" class="glass p-8 border-t-4 border-slate-200">
        <p class="text-slate-500 font-medium italic">
          You are eliminated and cannot vote, but you can still watch the results unfold.
        </p>
      </div>
    </div>
  </div>
</template>
