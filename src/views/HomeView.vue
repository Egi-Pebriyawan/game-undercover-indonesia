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
const showConfirm = ref(false)

const handleCreateClick = () => {
  if (!nickname.value) return gameStore.showNotify(t('nickname') + ' required')
  showConfirm.value = true
}

const confirmCreate = async () => {
  showConfirm.value = false
  locale.value = selectedLang.value
  const room = await gameStore.createRoom(selectedLang.value)
  if (room) {
    await gameStore.joinRoom(room.room_code, nickname.value)
    router.push(`/room/${room.room_code}`)
  }
}

const handleJoin = async () => {
  if (!nickname.value) return gameStore.showNotify('Nickname required')
  if (!roomCode.value) return gameStore.showNotify('Room Code required')
  
  const player = await gameStore.joinRoom(roomCode.value.toUpperCase(), nickname.value)
  if (player) {
    router.push(`/room/${roomCode.value.toUpperCase()}`)
  } else {
    gameStore.showNotify(gameStore.error || 'Room not found')
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
    <!-- Decorative background elements -->
    <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>

    <div class="z-10 w-full max-w-md flex flex-col items-center">
      <div class="mb-10 text-center">
        <h1 class="text-5xl md:text-6xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-br from-primary-600 to-primary-800 drop-shadow-sm">
          UNDERCOVER
        </h1>
        <p class="text-primary-600/80 tracking-widest uppercase text-sm font-bold">The Secret Role Game</p>
      </div>

      <div class="glass p-8 w-full space-y-8">
        <div class="space-y-2">
          <label class="block text-sm font-bold text-slate-500 tracking-wide uppercase">{{ t('nickname') }}</label>
          <input v-model="nickname" type="text" class="input-field w-full text-lg" placeholder="Enter your name...">
        </div>

        <div class="pt-6 border-t border-slate-100 space-y-5">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-slate-800">{{ t('createRoom') }}</h2>
          </div>
          
          <div class="flex gap-3 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button 
              @click="selectedLang = 'ID'"
              :class="selectedLang === 'ID' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
              class="flex-1 py-2.5 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span>🇮🇩</span> ID
            </button>
            <button 
              @click="selectedLang = 'EN'"
              :class="selectedLang === 'EN' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
              class="flex-1 py-2.5 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span>🇺🇸</span> EN
            </button>
          </div>
          
          <button @click="handleCreateClick" class="btn-primary w-full group" :disabled="gameStore.loading">
            <span class="flex items-center justify-center gap-2">
              {{ gameStore.loading ? 'Creating...' : t('createRoom') }}
              <svg v-if="!gameStore.loading" class="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
        </div>

        <div class="pt-6 border-t border-slate-100 space-y-5">
          <h2 class="text-xl font-bold text-slate-800">{{ t('joinRoom') }}</h2>
          <input v-model="roomCode" type="text" class="input-field w-full text-lg uppercase tracking-widest text-center" :placeholder="t('roomCode')" maxlength="6">
          <button @click="handleJoin" class="btn-primary w-full !bg-slate-100 !text-slate-700 hover:!bg-slate-200 border border-slate-200 shadow-none" :disabled="gameStore.loading">
            {{ gameStore.loading ? 'Joining...' : t('joinRoom') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showConfirm" class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
        <div class="glass p-8 w-full max-w-sm space-y-6 animate-in fade-in zoom-in duration-300">
          <div class="text-center">
            <div class="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🏠</div>
            <h3 class="text-xl font-bold text-slate-800">Yakin ingin membuat room?</h3>
            <p class="text-slate-500 text-sm mt-2">Anda akan menjadi Host untuk permainan ini.</p>
          </div>
          <div class="flex gap-3">
            <button @click="showConfirm = false" class="flex-1 py-3 px-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">
              Tidak
            </button>
            <button @click="confirmCreate" class="flex-1 py-3 px-4 rounded-xl font-bold bg-primary-500 text-white shadow-lg shadow-primary-500/20 hover:bg-primary-600 transition-colors">
              Ya
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
