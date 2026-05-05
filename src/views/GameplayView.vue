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
  <div class="min-h-screen p-6 flex flex-col items-center justify-center space-y-10 relative overflow-hidden">
    <!-- Decorative background elements -->
    <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>

    <!-- Turn Indicator -->
    <div class="glass p-8 w-full max-w-md text-center border-t-4 border-primary-500 shadow-lg">
      <p class="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mb-2">Current Speaker</p>
      <div class="flex items-center justify-center gap-4">
        <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-primary-600 border border-slate-200">
          {{ currentTurnPlayer?.nickname[0].toUpperCase() }}
        </div>
        <h2 class="text-3xl font-black text-slate-800">
          {{ currentTurnPlayer?.nickname }}
        </h2>
      </div>
      
      <div v-if="isMyTurn" class="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-full text-sm font-bold animate-pulse">
        <span class="w-2 h-2 bg-primary-600 rounded-full"></span>
        IT'S YOUR TURN!
      </div>
    </div>

    <!-- Secret Card -->
    <div 
      class="no-select relative w-72 h-96 perspective-1000 group"
      @pointerdown="showWord = true"
      @pointerup="showWord = false"
      @pointerleave="showWord = false"
      @contextmenu.prevent
    >
      <div 
        class="w-full h-full glass flex flex-col items-center justify-center p-8 text-center transition-all duration-500 transform-gpu"
        :class="showWord ? 'bg-white scale-105 shadow-2xl border-primary-400 rotate-1' : 'bg-white/90 group-hover:rotate-[-1deg]'"
      >
        <template v-if="!showWord">
          <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner border border-slate-100">
            🕵️‍♂️
          </div>
          <p class="text-slate-400 font-bold uppercase tracking-wider text-sm">Hold to Reveal</p>
        </template>
        
        <template v-else>
          <p class="text-primary-600 text-xs font-black uppercase tracking-[0.3em] mb-4">{{ gameStore.myPlayer?.role }}</p>
          <div class="h-px w-12 bg-primary-200 mb-6"></div>
          <h3 class="text-4xl font-black text-slate-800 mb-4 break-words w-full">
            {{ gameStore.myPlayer?.word || '???' }}
          </h3>
          <p v-if="gameStore.myPlayer?.role === 'MR_WHITE'" class="text-xs text-slate-500 font-medium leading-relaxed max-w-[180px]">
            You don't have a word. Listen carefully and blend in!
          </p>
        </template>
      </div>
    </div>

    <!-- Action Button -->
    <div class="w-full max-w-md">
      <button 
        v-if="isMyTurn"
        @click="handleNext"
        class="btn-primary w-full shadow-lg shadow-primary-500/20"
      >
        {{ t('doneTalking') }}
      </button>
      <div v-else class="text-center">
        <p class="text-slate-400 font-medium italic flex items-center justify-center gap-2">
          Wait for {{ currentTurnPlayer?.nickname }}...
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.perspective-1000 {
  perspective: 1000px;
}
</style>
