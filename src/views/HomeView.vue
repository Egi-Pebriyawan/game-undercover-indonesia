<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/gameStore'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const gameStore = useGameStore()
const { t, locale } = useI18n()

const nickname = ref('')
const roomCode = ref('')
const selectedLang = ref('ID')

const handleCreate = async () => {
  if (!nickname.value) return alert(t('nickname') + ' required')
  locale.value = selectedLang.value
  const room = await gameStore.createRoom(selectedLang.value)
  if (room) {
    await gameStore.joinRoom(room.room_code, nickname.value)
    router.push(`/room/${room.room_code}`)
  }
}

const handleJoin = async () => {
  if (!nickname.value || !roomCode.value) return alert('Nickname & Room Code required')
  const player = await gameStore.joinRoom(roomCode.value.toUpperCase(), nickname.value)
  if (player) {
    router.push(`/room/${roomCode.value.toUpperCase()}`)
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
    <!-- Decorative background elements -->
    <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-600/20 rounded-full blur-3xl"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-secondary-600/20 rounded-full blur-3xl"></div>

    <div class="z-10 w-full max-w-md flex flex-col items-center">
      <div class="mb-10 text-center">
        <h1 class="text-5xl md:text-6xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-br from-white via-primary-100 to-primary-300 drop-shadow-sm">
          UNDERCOVER
        </h1>
        <p class="text-primary-200/80 tracking-widest uppercase text-sm font-semibold">The Secret Role Game</p>
      </div>

      <div class="glass p-8 w-full space-y-8">
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-slate-300 tracking-wide">{{ t('nickname') }}</label>
          <input v-model="nickname" type="text" class="input-field w-full text-lg" placeholder="Enter your name...">
        </div>

        <div class="pt-6 border-t border-white/10 space-y-5">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-white">{{ t('createRoom') }}</h2>
          </div>
          
          <div class="flex gap-3 bg-slate-950/40 p-1.5 rounded-2xl border border-white/5">
            <button 
              @click="selectedLang = 'ID'"
              :class="selectedLang === 'ID' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-400 hover:text-white'"
              class="flex-1 py-2.5 rounded-xl font-medium transition-all duration-300"
            >ID</button>
            <button 
              @click="selectedLang = 'EN'"
              :class="selectedLang === 'EN' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-400 hover:text-white'"
              class="flex-1 py-2.5 rounded-xl font-medium transition-all duration-300"
            >EN</button>
          </div>
          
          <button @click="handleCreate" class="btn-primary w-full group" :disabled="gameStore.loading">
            <span class="flex items-center justify-center gap-2">
              {{ gameStore.loading ? 'Creating...' : t('createRoom') }}
              <svg v-if="!gameStore.loading" class="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
        </div>

        <div class="pt-6 border-t border-white/10 space-y-5">
          <h2 class="text-xl font-bold text-white">{{ t('joinRoom') }}</h2>
          <input v-model="roomCode" type="text" class="input-field w-full text-lg uppercase tracking-widest text-center" :placeholder="t('roomCode')" maxlength="6">
          <button @click="handleJoin" class="btn-primary w-full !from-slate-700 !to-slate-800 hover:!from-slate-600 hover:!to-slate-700 border border-white/10" :disabled="gameStore.loading">
            {{ gameStore.loading ? 'Joining...' : t('joinRoom') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
