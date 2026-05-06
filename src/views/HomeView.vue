<script setup>
import { ref, watch, onMounted } from 'vue'
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
const showRules = ref(false)

// Watch for manual language toggle to update UI instantly
watch(selectedLang, (newLang) => {
  locale.value = newLang
})

onMounted(async () => {
  localStorage.setItem('locale', locale.value)
  await gameStore.fetchGlobalStats()
})

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
  if (!nickname.value) return gameStore.showNotify(t('nickname') + ' required')
  if (!roomCode.value) return gameStore.showNotify(t('roomCode') + ' required')
  
  const player = await gameStore.joinRoom(roomCode.value.toUpperCase(), nickname.value)
  if (player && gameStore.currentRoom) {
    // Sync local language with room language
    locale.value = gameStore.currentRoom.language || 'ID'
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
    
    <div class="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-3">
      <a href="https://saweria.co/Pebri17" target="_blank" class="flex items-center gap-3 bg-white border-2 border-primary-100 p-2 pr-6 rounded-full shadow-xl hover:shadow-primary-500/20 hover:-translate-y-1 transition-all group">
        <div class="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white shadow-lg group-hover:rotate-12 transition-transform">
          ☕
        </div>
        <div class="text-left">
          <p class="text-[8px] font-black text-primary-600 uppercase tracking-widest leading-none mb-1">{{ t('support.title') }}</p>
          <p class="text-xs font-bold text-slate-700 leading-none">{{ t('support.button') }}</p>
        </div>
      </a>
      
      <!-- Help Button -->
      <button 
        @click="showRules = true"
        class="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-slate-900/30 hover:scale-110 hover:rotate-3 transition-all group"
      >
        <span class="text-2xl group-hover:animate-bounce">❓</span>
      </button>
    </div>

    <div class="z-10 w-full max-w-md flex flex-col items-center">
      <div class="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-8 duration-1000 mb-10">
        <h1 class="text-6xl md:text-8xl font-black text-slate-800 tracking-tighter mb-0">
          UNDERCOVER
        </h1>
        <div class="bg-primary-50 px-4 py-1.5 rounded-full border border-primary-100 shadow-sm animate-pulse">
          <p class="text-[10px] font-black text-primary-600 uppercase tracking-[0.3em]">
            {{ t('support.stats', { n: (gameStore.totalGames || 0).toLocaleString() }) }}
          </p>
        </div>
      </div>

      <div class="glass p-8 w-full space-y-8">
        <div class="space-y-2">
          <label class="block text-sm font-bold text-slate-500 tracking-wide uppercase">{{ t('nickname') }}</label>
          <input v-model="nickname" type="text" class="input-field w-full text-lg" :placeholder="t('nicknamePlaceholder')">
        </div>

        <div class="pt-6 border-t border-slate-100 space-y-5">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-slate-800">{{ t('createRoom') }}</h2>
          </div>
          
          <div class="grid grid-cols-2 gap-3 bg-slate-100/50 p-2 rounded-2xl border border-slate-200">
            <button 
              @click="selectedLang = 'ID'"
              :class="selectedLang === 'ID' ? 'bg-white text-primary-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white/50'"
              class="group py-2.5 px-4 rounded-xl font-bold transition-all duration-500 flex items-center justify-between gap-3"
            >
              <span class="text-xs uppercase tracking-widest font-black">ID</span>
              <svg viewBox="0 0 64 64" class="w-6 h-6 rounded-full shadow-sm">
                <rect width="64" height="32" fill="#ed1c24"/>
                <rect y="32" width="64" height="32" fill="#fff"/>
              </svg>
            </button>
            <button 
              @click="selectedLang = 'EN'"
              :class="selectedLang === 'EN' ? 'bg-white text-primary-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white/50'"
              class="group py-2.5 px-4 rounded-xl font-bold transition-all duration-500 flex items-center justify-between gap-3"
            >
              <span class="text-xs uppercase tracking-widest font-black">English</span>
              <svg viewBox="0 0 64 64" class="w-6 h-6 rounded-full shadow-sm">
                <rect width="64" height="64" fill="#012169"/>
                <path d="M0 0l64 64M64 0L0 64" stroke="#fff" stroke-width="6"/>
                <path d="M0 0l64 64M64 0L0 64" stroke="#c8102e" stroke-width="4"/>
                <path d="M32 0v64M0 32h64" stroke="#fff" stroke-width="10"/>
                <path d="M32 0v64M0 32h64" stroke="#c8102e" stroke-width="6"/>
              </svg>
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
          <input v-model="roomCode" type="text" class="input-field w-full text-lg uppercase tracking-widest text-center" :placeholder="t('roomCodePlaceholder')" maxlength="6">
          <button @click="handleJoin" class="btn-primary w-full !bg-slate-100 !text-slate-700 hover:!bg-slate-200 border border-slate-200 shadow-none" :disabled="gameStore.loading">
            {{ gameStore.loading ? (selectedLang === 'ID' ? 'Masuk...' : 'Joining...') : t('joinRoom') }}
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
            <h3 class="text-xl font-bold text-slate-800">{{ selectedLang === 'ID' ? 'Yakin ingin membuat room?' : 'Create a new room?' }}</h3>
            <p class="text-slate-500 text-sm mt-2">
              {{ selectedLang === 'ID' ? 'Anda akan menjadi Host untuk permainan ini.' : 'You will be the Host for this game.' }}
            </p>
          </div>
          <div class="flex gap-3">
            <button @click="showConfirm = false" class="flex-1 py-3 px-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">
              {{ selectedLang === 'ID' ? 'Tidak' : 'Cancel' }}
            </button>
            <button @click="confirmCreate" class="flex-1 py-3 px-4 rounded-xl font-bold bg-primary-500 text-white shadow-lg shadow-primary-500/20 hover:bg-primary-600 transition-colors">
              {{ selectedLang === 'ID' ? 'Ya' : 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Rules Modal -->
    <Teleport to="body">
      <div v-if="showRules" class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
        <div class="glass p-10 w-full max-w-lg max-h-[85vh] overflow-y-auto relative animate-in fade-in zoom-in duration-300 scrollbar-hide">
          <!-- Absolute Close Button -->
          <button @click="showRules = false" class="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors z-20">
            <svg class="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div class="text-center mb-8">
            <h2 class="text-3xl font-black text-slate-800 uppercase tracking-tighter">{{ t('rules.title') }}</h2>
            <div class="w-12 h-1.5 bg-primary-500 mx-auto mt-2 rounded-full"></div>
          </div>

          <!-- Rule Cards -->
          <div class="space-y-4 pb-4">
            <!-- Civilian -->
            <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex gap-4 items-start">
              <div class="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl shrink-0">🏠</div>
              <div>
                <h4 class="font-black text-emerald-900 uppercase text-xs tracking-wider mb-1">{{ t('rules.civilian.title') }}</h4>
                <p class="text-emerald-700 text-sm leading-relaxed">{{ t('rules.civilian.desc') }}</p>
              </div>
            </div>

            <!-- Undercover -->
            <div class="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex gap-4 items-start">
              <div class="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl shrink-0">🕵️</div>
              <div>
                <h4 class="font-black text-rose-900 uppercase text-xs tracking-wider mb-1">{{ t('rules.undercover.title') }}</h4>
                <p class="text-rose-700 text-sm leading-relaxed">{{ t('rules.undercover.desc') }}</p>
              </div>
            </div>

            <!-- Mr White -->
            <div class="p-4 rounded-2xl bg-slate-100 border border-slate-200 flex gap-4 items-start">
              <div class="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl shrink-0">⚪</div>
              <div>
                <h4 class="font-black text-slate-900 uppercase text-xs tracking-wider mb-1">{{ t('rules.mrWhite.title') }}</h4>
                <p class="text-slate-600 text-sm leading-relaxed">{{ t('rules.mrWhite.desc') }}</p>
              </div>
            </div>

            <!-- Game Steps Card -->
            <div class="pt-6 border-t border-slate-100 w-full">
              <h4 class="font-black text-slate-800 text-xs uppercase mb-4 text-center tracking-[0.2em] opacity-50">{{ t('rules.howTo') }}</h4>
              
              <div class="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-5">
                <div class="flex gap-4 items-start">
                  <span class="w-7 h-7 bg-white shadow-sm border border-slate-200 text-slate-800 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0">
                    1
                  </span>
                  <p class="text-sm text-slate-600 leading-relaxed pt-0.5">{{ t('rules.step1') }}</p>
                </div>

                <div class="flex gap-4 items-start">
                  <span class="w-7 h-7 bg-white shadow-sm border border-slate-200 text-slate-800 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0">
                    2
                  </span>
                  <p class="text-sm text-slate-600 leading-relaxed pt-0.5">{{ t('rules.step2') }}</p>
                </div>

                <div class="flex gap-4 items-start">
                  <span class="w-7 h-7 bg-white shadow-sm border border-slate-200 text-slate-800 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0">
                    3
                  </span>
                  <p class="text-sm text-slate-600 leading-relaxed pt-0.5">{{ t('rules.step3') }}</p>
                </div>
              </div>
            </div>
          </div>

          <button @click="showRules = false" class="btn-primary w-full shadow-lg shadow-primary-500/20">
            {{ selectedLang === 'ID' ? 'Mengerti!' : 'Got it!' }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
