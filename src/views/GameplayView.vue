<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/gameStore'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const gameStore = useGameStore()
const { t } = useI18n()

const showWord = ref(false)

watch(() => gameStore.currentRoom?.status, (newStatus) => {
  if (newStatus === 'VOTING') {
    router.push(`/room/${gameStore.currentRoom.room_code}/vote`)
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

const currentTurnPlayer = computed(() => {
  return gameStore.players.find(p => p.id === gameStore.currentRoom?.current_turn_player_id)
})

const isMyTurn = computed(() => {
  return gameStore.myPlayer?.id === gameStore.currentRoom?.current_turn_player_id
})

const handleNext = async () => {
  await gameStore.nextTurn()
}
</script>

<template>
  <div class="min-h-screen p-4 flex flex-col items-center justify-center space-y-8">
    <!-- Turn Indicator -->
    <div class="glass p-6 w-full max-w-md text-center border-t-4 border-purple-500">
      <p class="text-slate-400 text-sm uppercase tracking-widest mb-1">Current Turn</p>
      <h2 class="text-3xl font-bold text-white">
        {{ currentTurnPlayer?.nickname }}
      </h2>
      <div v-if="isMyTurn" class="mt-4 animate-bounce text-purple-400 font-bold">
        It's your turn to speak!
      </div>
    </div>

    <!-- Secret Card -->
    <div 
      class="no-select relative w-64 h-80 perspective-1000 cursor-pointer"
      @pointerdown="showWord = true"
      @pointerup="showWord = false"
      @contextmenu.prevent
    >
      <div 
        class="w-full h-full glass flex flex-col items-center justify-center p-6 text-center transition-all duration-300"
        :class="showWord ? 'bg-white/20 scale-105 shadow-2xl border-purple-400' : 'bg-white/5'"
      >
        <template v-if="!showWord">
          <div class="text-5xl mb-4">🕵️‍♂️</div>
          <p class="text-slate-400 font-medium">Hold to Reveal Your Word</p>
        </template>
        
        <template v-else>
          <p class="text-purple-400 text-sm font-bold uppercase mb-2">{{ gameStore.myPlayer?.role }}</p>
          <h3 class="text-4xl font-bold text-white mb-4">
            {{ gameStore.myPlayer?.word || '???' }}
          </h3>
          <p v-if="gameStore.myPlayer?.role === 'MR_WHITE'" class="text-xs text-slate-400 italic">
            You don't have a word. Try to blend in!
          </p>
        </template>
      </div>
    </div>

    <!-- Action Button -->
    <div v-if="isMyTurn" class="w-full max-w-md">
      <button 
        @click="handleNext"
        class="btn-primary w-full bg-gradient-to-r from-emerald-600 to-teal-600"
      >
        {{ t('doneTalking') }}
      </button>
    </div>

    <div v-else class="text-slate-500 italic animate-pulse">
      Wait for {{ currentTurnPlayer?.nickname }} to finish...
    </div>
  </div>
</template>

<style scoped>
.perspective-1000 {
  perspective: 1000px;
}
</style>
