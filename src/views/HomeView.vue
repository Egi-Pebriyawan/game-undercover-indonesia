<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/gameStore'
import { useI18n } from 'vue-i18n'

import { sfx } from '../utils/sfx'

const router = useRouter()
const gameStore = useGameStore()
const { t, locale } = useI18n()

const nickname = ref('')
const roomCode = ref('')
const selectedLang = ref('ID')
const showConfirm = ref(false)
const showRules = ref(false)
const showSupportMenu = ref(false)

const isMuted = ref(sfx.isMuted())
const toggleMute = () => {
  isMuted.value = sfx.toggleMute()
}

// Watch for manual language toggle to update UI instantly
watch(selectedLang, (newLang) => {
  locale.value = newLang
})

onMounted(async () => {
  localStorage.setItem('locale', locale.value)
  await gameStore.fetchGlobalStats()
})

const handleCreateClick = () => {
  const name = nickname.value.trim()
  if (!name) return gameStore.showNotify(t('nickname') + ' required')
  if (name.length < 2) return gameStore.showNotify('Nickname minimal 2 karakter')
  if (name.length > 15) return gameStore.showNotify('Nickname maksimal 15 karakter')
  
  nickname.value = name // update with trimmed name
  showConfirm.value = true
}

const confirmCreate = async () => {
  showConfirm.value = false
  locale.value = selectedLang.value
  const room = await gameStore.createRoom(selectedLang.value)
  if (room) {
    await gameStore.joinRoom(room.room_code, nickname.value)
    sfx.play('notification')
    router.push(`/room/${room.room_code}`)
  }
}

const handleJoin = async () => {
  const name = nickname.value.trim()
  if (!name) return gameStore.showNotify(t('nickname') + ' required')
  if (name.length < 2) return gameStore.showNotify('Nickname minimal 2 karakter')
  if (name.length > 15) return gameStore.showNotify('Nickname maksimal 15 karakter')
  if (!roomCode.value) return gameStore.showNotify(t('roomCode') + ' required')
  
  nickname.value = name // update with trimmed name
  
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
  <div class="min-h-screen flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden bg-slate-50/50">
    <!-- Decorative background elements -->
    <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>
    
    <!-- Support & Help Buttons -->
    <div class="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[60] flex flex-col items-end gap-3">
      <!-- Expanded Menu -->
      <div v-if="showSupportMenu" class="flex flex-col items-end gap-2 mb-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <!-- Ko-fi (International) -->
        <a href="https://ko-fi.com/pebriyawan" target="_blank" 
          class="flex items-center gap-3 bg-white border-2 border-blue-100 p-2 pr-6 rounded-2xl shadow-xl hover:shadow-blue-500/10 hover:-translate-x-1 transition-all group"
        >
          <div class="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:rotate-12 transition-transform">
            <span class="text-xl">🌎</span>
          </div>
          <div class="text-left">
            <p class="text-[8px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">International</p>
            <p class="text-xs font-bold text-slate-700 leading-none">{{ t('support.international') }}</p>
          </div>
        </a>

        <!-- Saweria (Local) -->
        <a href="https://saweria.co/Pebri17" target="_blank" 
          class="flex items-center gap-3 bg-white border-2 border-amber-100 p-2 pr-6 rounded-2xl shadow-xl hover:shadow-amber-500/10 hover:-translate-x-1 transition-all group"
        >
          <div class="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:rotate-12 transition-transform">
            <span class="text-xl">🇮🇩</span>
          </div>
          <div class="text-left">
            <p class="text-[8px] font-black text-amber-600 uppercase tracking-widest leading-none mb-1">Local Support</p>
            <p class="text-xs font-bold text-slate-700 leading-none">{{ t('support.local') }}</p>
          </div>
        </a>
      </div>

      <!-- Main Toggle Button -->
      <button 
        @click="showSupportMenu = !showSupportMenu" 
        class="flex items-center gap-3 bg-white border-2 p-2 md:pr-6 rounded-full shadow-xl transition-all group"
        :class="showSupportMenu ? 'border-primary-500 ring-4 ring-primary-500/10' : 'border-primary-100 hover:shadow-primary-500/20 hover:-translate-y-1'"
      >
        <div class="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-all"
          :class="showSupportMenu ? 'bg-slate-800 rotate-45' : 'bg-primary-500 group-hover:rotate-12'"
        >
          <span class="text-xl">{{ showSupportMenu ? '✕' : '☕' }}</span>
        </div>
        <div class="hidden md:block text-left">
          <p class="text-[8px] font-black text-primary-600 uppercase tracking-widest leading-none mb-1">{{ t('support.title') }}</p>
          <p class="text-xs font-bold text-slate-700 leading-none">{{ showSupportMenu ? 'Close' : t('support.button') }}</p>
        </div>
      </button>
      
      <!-- Mute Toggle -->
      <button 
        @click="toggleMute"
        class="w-12 h-12 md:w-14 md:h-14 bg-white border-2 border-slate-100 text-slate-400 rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 transition-all group"
        :title="isMuted ? 'Unmute' : 'Mute'"
      >
        <span class="text-xl md:text-2xl">{{ isMuted ? '🔇' : '🔊' }}</span>
      </button>

      <!-- Help Button -->
      <button 
        @click="showRules = true"
        class="w-12 h-12 md:w-14 md:h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-slate-900/30 hover:scale-110 hover:rotate-3 transition-all group"
      >
        <span class="text-xl md:text-2xl group-hover:animate-bounce">❓</span>
      </button>
    </div>

    <div class="z-10 w-full max-w-2xl flex flex-col items-center">
      <!-- Title Section -->
      <div class="flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-1000 mb-4 text-center">
        <h1 class="text-5xl md:text-8xl font-black text-slate-800 tracking-tighter mb-0 leading-none">
          UNDERCOVER
        </h1>
        <p class="text-blue-600 uppercase tracking-[0.4em] text-[9px] md:text-xs font-black mt-2">
          {{ t('subtitle') }}
        </p>

        <!-- Personal & Touching Stats (More Compact) -->
        <div class="mt-4 px-6 py-3 bg-white/60 backdrop-blur-md rounded-2xl border border-white shadow-sm max-w-xs md:max-w-md relative">
          <span class="absolute -top-2 -left-2 text-lg animate-pulse">❤️</span>
          <span class="absolute -bottom-2 -right-2 text-lg">👨‍👩‍👧‍👦</span>
          <p class="text-[11px] md:text-sm font-bold text-slate-600 leading-tight italic">
            "{{ t('support.stats', { 
              n: (gameStore.totalGames || 0).toLocaleString(), 
              m: (gameStore.totalPlayers || 0).toLocaleString() 
            }) }}"
          </p>
        </div>
      </div>

      <!-- Main Interaction Card (More Compact) -->
      <div class="glass p-6 md:p-8 w-full max-w-sm md:max-w-md space-y-5 md:space-y-6 shadow-2xl relative border-t-4 border-primary-500">
        <!-- Nickname Input -->
        <div class="space-y-1.5">
          <label class="block text-[10px] font-black text-slate-400 tracking-widest uppercase">{{ t('nickname') }}</label>
          <input id="nickname" v-model="nickname" type="text" class="input-field w-full py-3 text-base" :placeholder="t('nicknamePlaceholder')">
        </div>

        <!-- Create Section -->
        <div class="pt-4 border-t border-slate-100 space-y-4">
          <div class="grid grid-cols-2 gap-2 bg-slate-100/50 p-1.5 rounded-xl border border-slate-200">
            <button 
              @click="selectedLang = 'ID'"
              :class="selectedLang === 'ID' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'"
              class="py-2 px-3 rounded-lg font-bold transition-all text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
            >
              ID
              <svg viewBox="0 0 64 64" class="w-4 h-4 rounded-full">
                <rect width="64" height="32" fill="#ed1c24"/><rect y="32" width="64" height="32" fill="#fff"/>
              </svg>
            </button>
            <button 
              @click="selectedLang = 'EN'"
              :class="selectedLang === 'EN' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'"
              class="py-2 px-3 rounded-lg font-bold transition-all text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
            >
              EN
              <svg viewBox="0 0 64 64" class="w-4 h-4 rounded-full">
                <rect width="64" height="64" fill="#012169"/><path d="M0 0l64 64M64 0L0 64" stroke="#fff" stroke-width="6"/><path d="M0 0l64 64M64 0L0 64" stroke="#c8102e" stroke-width="4"/><path d="M32 0v64M0 32h64" stroke="#fff" stroke-width="10"/><path d="M32 0v64M0 32h64" stroke="#c8102e" stroke-width="6"/>
              </svg>
            </button>
          </div>
          
          <button @click="handleCreateClick" class="btn-primary w-full py-3.5 text-sm uppercase tracking-[0.1em] font-black group" :disabled="gameStore.loading">
            {{ gameStore.loading ? '...' : t('createRoom') }}
          </button>
        </div>

        <!-- Join Section -->
        <div class="pt-4 border-t border-slate-100 space-y-3">
          <input id="roomCode" v-model="roomCode" type="text" class="input-field w-full py-3 text-center uppercase tracking-[0.3em] font-black text-sm" :placeholder="t('roomCodePlaceholder')" maxlength="6">
          <button @click="handleJoin" class="w-full py-3 rounded-xl font-black text-slate-500 hover:text-primary-600 hover:bg-primary-50 transition-all text-[11px] uppercase tracking-widest border border-dashed border-slate-200" :disabled="gameStore.loading">
            {{ t('joinRoom') }}
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
          <button @click="showRules = false" class="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors z-20">
            <svg class="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div class="text-center mb-8">
            <h2 class="text-3xl font-black text-slate-800 uppercase tracking-tighter">{{ t('rules.title') }}</h2>
            <div class="w-12 h-1.5 bg-primary-500 mx-auto mt-2 rounded-full"></div>
          </div>
          <div class="space-y-4 pb-4">
            <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex gap-4 items-start">
              <div class="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl shrink-0">🏠</div>
              <div>
                <h4 class="font-black text-emerald-900 uppercase text-xs tracking-wider mb-1">{{ t('rules.civilian.title') }}</h4>
                <p class="text-emerald-700 text-sm leading-relaxed">{{ t('rules.civilian.desc') }}</p>
              </div>
            </div>
            <div class="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex gap-4 items-start">
              <div class="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl shrink-0">🕵️</div>
              <div>
                <h4 class="font-black text-rose-900 uppercase text-xs tracking-wider mb-1">{{ t('rules.undercover.title') }}</h4>
                <p class="text-rose-700 text-sm leading-relaxed">{{ t('rules.undercover.desc') }}</p>
              </div>
            </div>
            <div class="p-4 rounded-2xl bg-slate-100 border border-slate-200 flex gap-4 items-start">
              <div class="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl shrink-0">⚪</div>
              <div>
                <h4 class="font-black text-slate-900 uppercase text-xs tracking-wider mb-1">{{ t('rules.mrWhite.title') }}</h4>
                <p class="text-slate-600 text-sm leading-relaxed">{{ t('rules.mrWhite.desc') }}</p>
              </div>
            </div>
            <div class="pt-6 border-t border-slate-100 w-full">
              <h4 class="font-black text-slate-800 text-xs uppercase mb-4 text-center tracking-[0.2em] opacity-50">{{ t('rules.howTo') }}</h4>
              <div class="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-5">
                <div class="flex gap-4 items-start"><span class="w-7 h-7 bg-white shadow-sm border border-slate-200 text-slate-800 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0">1</span><p class="text-sm text-slate-600 leading-relaxed pt-0.5">{{ t('rules.step1') }}</p></div>
                <div class="flex gap-4 items-start"><span class="w-7 h-7 bg-white shadow-sm border border-slate-200 text-slate-800 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0">2</span><p class="text-sm text-slate-600 leading-relaxed pt-0.5">{{ t('rules.step2') }}</p></div>
                <div class="flex gap-4 items-start"><span class="w-7 h-7 bg-white shadow-sm border border-slate-200 text-slate-800 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0">3</span><p class="text-sm text-slate-600 leading-relaxed pt-0.5">{{ t('rules.step3') }}</p></div>
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
