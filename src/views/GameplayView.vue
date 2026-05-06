<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/gameStore'
import { useI18n } from 'vue-i18n'
import { sfx } from '../utils/sfx'

const router = useRouter()
const gameStore = useGameStore()
const { t } = useI18n()

const showWord = ref(false)
const isStartingVoting = ref(false)

watch(() => gameStore.currentRoom?.status, (newStatus) => {
  if (newStatus === 'VOTING') {
    router.push(`/room/${gameStore.currentRoom.room_code}/vote`)
  } else if (newStatus === 'FINISHED') {
    router.push(`/room/${gameStore.currentRoom.room_code}/finish`)
  }
})

const timer = ref(60)
let timerInterval = null

const startTimer = () => {
  stopTimer()
  timer.value = 60
  timerInterval = setInterval(() => {
    if (timer.value > 0) {
      timer.value--
      if (timer.value === 10 || timer.value === 3) {
        sfx.play('timer')
      }
    } else {
      stopTimer()
      sfx.play('notification')
    }
  }, 1000)
}

const stopTimer = () => {
  if (timerInterval) clearInterval(timerInterval)
}

onMounted(async () => {
  if (!gameStore.currentRoom || !gameStore.myPlayer) {
    router.push('/')
    return
  }

  const unsubscribe = await gameStore.subscribeToRoom()
  
  // Start timer if in discussion phase
  if (gameStore.currentRoom?.game_mode === 'online' || gameStore.offlineRevealIndex < 0) {
    startTimer()
  }

  onUnmounted(() => {
    if (unsubscribe) unsubscribe()
    stopTimer()
  })
})

// Restart timer if we just finished offline reveal
watch(() => gameStore.offlineRevealIndex, (newVal) => {
  if (newVal < 0) startTimer()
})

const currentTurnPlayer = computed(() => {
  return gameStore.players.find(p => p.id === gameStore.currentRoom?.current_turn_player_id)
})

const isMyTurn = computed(() => {
  return gameStore.myPlayer?.id === gameStore.currentRoom?.current_turn_player_id
})

const handleStartVoting = async () => {
  try {
    isStartingVoting.value = true
    await gameStore.startVoting()
    // Small delay to allow state to settle
    setTimeout(() => {
      if (gameStore.currentRoom?.status === 'VOTING') {
        router.push(`/room/${gameStore.currentRoom.room_code}/vote`)
      }
    }, 100)
  } catch (err) {
    console.error(err)
  } finally {
    isStartingVoting.value = false
  }
}

const isHost = computed(() => {
  return gameStore.myPlayer?.id === gameStore.currentRoom?.host_id
})

const sortedPlayers = computed(() => {
  return [...gameStore.players]
    .filter(p => p.is_alive)
    .sort((a, b) => (a.turn_order || 0) - (b.turn_order || 0))
})

const currentPlayerRevealing = computed(() => {
  if (gameStore.offlineRevealIndex < 0) return null
  return sortedPlayers.value[gameStore.offlineRevealIndex]
})

const revealRole = () => {
  gameStore.setRevealed(true)
}

const hideAndNext = async () => {
  await gameStore.nextOfflineReveal()
}

const getRoleColorClass = (role) => {
  if (gameStore.currentRoom?.infiltrator_visibility === 'secret' && role === 'UNDERCOVER') {
    return 'text-emerald-600 bg-emerald-50 border-emerald-100'
  }
  switch (role) {
    case 'CIVILIAN': return 'text-emerald-600 bg-emerald-50 border-emerald-100'
    case 'UNDERCOVER': return 'text-rose-600 bg-rose-50 border-rose-100'
    case 'MR_WHITE': return 'text-slate-600 bg-slate-50 border-slate-200'
    default: return 'text-primary-600 bg-primary-50 border-primary-100'
  }
}
</script>

<template>
  <div class="min-h-screen p-6 flex flex-col items-center justify-center space-y-10 relative overflow-hidden">
    <!-- Decorative background elements -->
    <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>

    <!-- Offline Reveal Phase -->
    <div v-if="gameStore.currentRoom?.game_mode === 'offline' && gameStore.offlineRevealIndex >= 0" class="flex flex-col items-center space-y-10 w-full max-w-md animate-in fade-in zoom-in duration-500">
      <div class="text-center space-y-2">
        <p class="text-primary-600 font-black text-xs uppercase tracking-[0.3em] opacity-60">{{ t('gameplay.passPhone') }}</p>
        <h2 class="text-5xl font-black text-slate-800 tracking-tight">{{ currentPlayerRevealing?.nickname }}</h2>
      </div>

      <div class="w-72 h-96 perspective-1000">
        <div class="w-full h-full glass flex flex-col items-center justify-center p-8 text-center transition-all duration-700 bg-white shadow-2xl relative overflow-hidden"
          :class="gameStore.isRevealed ? 'ring-2 ring-primary-100' : ''"
        >
          <template v-if="!gameStore.isRevealed">
            <div class="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-5xl mb-8 shadow-inner border border-slate-100 animate-bounce">🤫</div>
            <button @click="revealRole" class="btn-primary w-full py-4 text-lg shadow-xl shadow-primary-500/30">{{ t('gameplay.revealRole') }}</button>
            <p class="mt-6 text-[10px] text-slate-400 font-black uppercase tracking-widest">{{ t('gameplay.confidential') }}</p>
          </template>
          <template v-else>
            <div class="absolute inset-0 opacity-5 pointer-events-none">
              <div class="absolute inset-0 bg-gradient-to-br from-primary-500 to-transparent"></div>
            </div>
            
            <div class="px-6 py-2 rounded-full border font-black text-[10px] uppercase tracking-[0.3em] mb-6 animate-in slide-in-from-top-4"
              :class="getRoleColorClass(currentPlayerRevealing?.role)"
            >
              {{ 
                currentPlayerRevealing?.role === 'UNDERCOVER' && gameStore.currentRoom?.infiltrator_visibility === 'secret'
                ? t('roles.civilian')
                : t(`roles.${currentPlayerRevealing?.role.toLowerCase()}`)
              }}
            </div>

            <div class="h-px w-12 bg-slate-100 mb-8"></div>
            
            <h3 class="text-5xl font-black text-slate-800 mb-4 animate-in zoom-in duration-500 tracking-tight">
              {{ currentPlayerRevealing?.word || '???' }}
            </h3>
            
            <p v-if="currentPlayerRevealing?.role === 'MR_WHITE'" class="text-xs text-slate-400 font-medium italic mb-4">
              {{ t('gameplay.mrWhiteDesc') }}
            </p>

            <button @click="hideAndNext" class="mt-10 bg-slate-900 text-white font-black py-4 px-8 rounded-2xl w-full hover:bg-black transition-all shadow-lg active:scale-95">
              {{ t('gameplay.seen') }}
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- Discussion Phase (Turn List) -->
    <div v-else class="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div class="text-center space-y-2">
        <p class="text-primary-600 font-black text-xs uppercase tracking-[0.3em]">{{ t('gameplay.discussion') }}</p>
        <h2 class="text-3xl font-black text-slate-800">{{ t('gameplay.speakOrder') }}</h2>
      </div>

      <!-- Discussion Timer -->
      <div class="flex flex-col items-center justify-center space-y-4 py-4 animate-in fade-in zoom-in duration-700">
        <div class="relative w-32 h-32 flex items-center justify-center">
          <svg class="w-full h-full transform -rotate-90">
            <circle cx="64" cy="64" r="58" stroke="currentColor" stroke-width="8" fill="transparent" class="text-slate-100" />
            <circle cx="64" cy="64" r="58" stroke="currentColor" stroke-width="8" fill="transparent" 
              class="transition-all duration-1000"
              :class="timer < 10 ? 'text-rose-500' : 'text-primary-500'"
              :stroke-dasharray="364"
              :stroke-dashoffset="364 - (364 * timer) / 60"
            />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-4xl font-black tabular-nums" :class="timer < 10 ? 'text-rose-600 animate-pulse' : 'text-slate-800'">
              {{ timer }}
            </span>
            <span class="text-[8px] font-black uppercase tracking-widest text-slate-400">{{ t('gameplay.seconds') }}</span>
          </div>
        </div>
        <button v-if="isHost" @click="startTimer" class="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
          {{ t('gameplay.resetTimer') }}
        </button>
      </div>

      <div class="space-y-3">
        <div v-for="(player, index) in sortedPlayers" :key="player.id" 
          class="glass-panel p-4 flex items-center justify-between group hover:border-primary-300 transition-all duration-300"
          :class="index === 0 ? 'ring-2 ring-primary-500/10 border-primary-200 bg-white/80' : 'bg-white/40'"
        >
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center font-black text-primary-900 shadow-sm border border-primary-200">
              {{ index + 1 }}
            </div>
            <div>
              <p class="font-black text-slate-800">{{ player.nickname }}</p>
              <p v-if="index === 0" class="text-[10px] font-black text-primary-500 uppercase tracking-widest">{{ t('gameplay.starts') }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Host Action -->
      <div v-if="isHost" class="pt-6">
        <button 
          @click="handleStartVoting" 
          :disabled="isStartingVoting"
          class="btn-primary w-full py-5 text-lg shadow-xl shadow-primary-500/20 group disabled:opacity-50"
        >
          <span class="flex items-center justify-center gap-3">
            {{ isStartingVoting ? '...' : t('gameplay.startVoting') }}
            <svg v-if="!isStartingVoting" class="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </span>
        </button>
        <p class="text-center mt-4 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{{ t('gameplay.onlyHost') }}</p>
      </div>

      <!-- Secret Word (Sticky at bottom during discussion) -->
      <div v-if="gameStore.currentRoom?.game_mode === 'online'" class="pt-10">
        <div class="glass-panel p-6 bg-slate-900 border-slate-800 text-white flex items-center justify-between shadow-2xl">
          <div class="space-y-1">
            <p class="text-[10px] font-black text-primary-400 uppercase tracking-widest">{{ t('word') }}</p>
            <h4 class="text-xl font-black tracking-tight" :class="showWord ? 'blur-0' : 'blur-md select-none transition-all duration-500'">
              {{ gameStore.myPlayer?.word || '???' }}
            </h4>
          </div>
          <button 
            @touchstart="showWord = true" 
            @touchend="showWord = false"
            @mousedown="showWord = true" 
            @mouseup="showWord = false"
            @mouseleave="showWord = false"
            class="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors active:scale-90"
          >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.perspective-1000 {
  perspective: 1000px;
}
</style>
