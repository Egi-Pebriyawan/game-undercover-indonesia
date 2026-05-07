<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useGameStore } from "../stores/gameStore";
import { useI18n } from "vue-i18n";
import { sfx } from "../utils/sfx";

const route = useRoute();
const router = useRouter();
const gameStore = useGameStore();
const { t } = useI18n();

// Lobby background music
const lobbyAudio = ref(null);

watch(
  () => gameStore.currentRoom?.status,
  (newStatus) => {
    if (newStatus === "PLAYING") {
      router.push(`/room/${gameStore.currentRoom.room_code}/play`);
    }
  },
);

// Auto-adjust settings based on player count
watch(
  () => gameStore.players.length,
  (newCount) => {
    if (!isHost()) return;

    // Auto-set Mr. White to 1 when players reach 3 (minimum for Mr. White)
    if (newCount >= 3 && gameStore.currentRoom?.mr_white_count === 0) {
      gameStore.updateRoomSettings({ mr_white_count: 1 });
    }

    // Auto-set Undercover to 1 when players reach 5
    if (newCount >= 5 && gameStore.currentRoom?.undercover_count === 0) {
      gameStore.updateRoomSettings({ undercover_count: 1 });
    }
  },
);

onMounted(async () => {
  if (!gameStore.currentRoom) {
    return;
  }
  // Ensure any playing sounds (victory/defeat) are stopped when re-entering lobby
  try {
    sfx.stop();
  } catch (e) {}

  await gameStore.fetchPlayers();
  const unsubscribe = await gameStore.subscribeToRoom();

  // Initialize lobby background music (public/sounds is served by Vite)
  try {
    lobbyAudio.value = new Audio("/sounds/lobby-play.mp3");
    lobbyAudio.value.loop = true;
    if (!gameStore.isMuted) {
      lobbyAudio.value.play().catch(() => {});
    } else {
      lobbyAudio.value.muted = true;
    }
  } catch (e) {
    console.warn("Failed to init lobby audio", e);
  }

  onUnmounted(() => {
    if (unsubscribe) unsubscribe();
  });
});

// Stop lobby audio when leaving
onUnmounted(() => {
  try {
    if (lobbyAudio.value) {
      lobbyAudio.value.pause();
      lobbyAudio.value.currentTime = 0;
      lobbyAudio.value = null;
    }
  } catch (e) {}
});

// React to mute changes from store
watch(
  () => gameStore.isMuted,
  (muted) => {
    try {
      if (lobbyAudio.value) {
        if (muted) {
          lobbyAudio.value.pause();
          lobbyAudio.value.currentTime = 0;
        } else {
          lobbyAudio.value.play().catch(() => {});
        }
      }

      // Keep small SFX manager in sync with global mute state
      if (sfx && typeof sfx.isMuted === "function" && typeof sfx.toggleMute === "function") {
        if (sfx.isMuted() !== muted) sfx.toggleMute();
      }
    } catch (e) {}
  },
);

const newOfflineName = ref("");

const isHost = () => {
  return gameStore.myPlayer?.id === gameStore.currentRoom?.host_id;
};

const updateSettings = async (key, value) => {
  if (!isHost()) return;

  // Restriction: Need at least 5 players to change undercover counts
  if (key === "undercover_count" && gameStore.players.length < 5) {
    gameStore.showNotify("Minimal 5 pemain untuk menambah Undercover", "warning");
    return;
  }

  // Restriction: Need at least 3 players for Mr. White (minimum game size)
  if (key === "mr_white_count" && gameStore.players.length < 3) {
    gameStore.showNotify("Minimal 3 pemain untuk mengaktifkan Mr. White", "warning");
    return;
  }

  await gameStore.updateRoomSettings({ [key]: value });
};

const addOfflinePlayer = async () => {
  if (!newOfflineName.value) return;
  await gameStore.addOfflinePlayer(newOfflineName.value);
  newOfflineName.value = "";
};

const removePlayer = async (player) => {
  await gameStore.removePlayer(player.id);
};

const startGame = async () => {
  await gameStore.startGame();
};

const shareViaWA = () => {
  const url = window.location.href;
  const roomCode = gameStore.currentRoom?.room_code;
  const text = `Ayo main Undercover! Masuk dengan kode ruangan: *${roomCode}*\n\nKlik link ini untuk bergabung: ${url}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
};

watch(
  () => gameStore.error,
  (newError) => {
    if (newError) {
      gameStore.showNotify(newError, "error");
    }
  },
);
</script>

<template>
  <div class="min-h-screen p-6 flex flex-col relative overflow-hidden">
    <!-- Decorative background elements -->
    <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>

    <div class="z-10 max-w-3xl mx-auto w-full space-y-8 mt-10">
      <!-- Header / Room Info -->
      <div class="glass p-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div class="text-center md:text-left">
          <p class="text-primary-600 font-bold tracking-widest uppercase text-xs mb-2">{{ t("lobby") }}</p>
          <div class="flex items-center gap-4 justify-center md:justify-start">
            <h1 class="text-4xl md:text-5xl font-black text-slate-800 tracking-widest bg-slate-50 px-6 py-2 rounded-2xl border border-slate-200 shadow-sm">
              {{ gameStore.currentRoom?.room_code }}
            </h1>
            <button @click="shareViaWA" class="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all hover:scale-110 active:scale-95 group" title="Share via WhatsApp">
              <svg class="w-6 h-6 group-hover:rotate-12 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                <path
                  d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
                />
              </svg>
            </button>
            <button @click="gameStore.toggleMute()" class="p-4 bg-slate-100 text-slate-700 rounded-2xl shadow-sm hover:bg-slate-200 transition-all" :title="gameStore.isMuted ? 'Unmute' : 'Mute'">
              <span v-if="gameStore.isMuted">🔇</span>
              <span v-else>🔊</span>
            </button>
          </div>
        </div>
        <div class="text-center md:text-right bg-primary-50/50 px-8 py-5 rounded-3xl border border-primary-100 shadow-sm">
          <p class="text-[10px] text-primary-600 font-black uppercase tracking-widest mb-1">{{ t("players") }}</p>
          <p class="text-4xl font-black text-slate-800">
            <span class="text-primary-600">{{ gameStore.players.length }}</span> <span class="text-slate-300 text-2xl">/ 20</span>
          </p>
        </div>
      </div>

      <!-- Player List -->
      <div class="glass p-8">
        <h2 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
          <span>{{ t("players") }} ({{ gameStore.players.length }})</span>
          <span v-if="gameStore.currentRoom?.game_mode === 'offline'" class="text-primary-500 font-black">OFFLINE MODE</span>
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div class="flex flex-col gap-2 w-full col-span-full">
            <div
              v-for="player in gameStore.players"
              :key="player.id"
              class="flex items-center justify-between p-4 glass-panel group transition-all hover:translate-x-1"
              :class="{ 'border-primary-200 bg-primary-50/30': player.id === gameStore.myPlayer?.id }"
            >
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl shadow-inner">
                  {{ player.id === gameStore.currentRoom?.host_id ? "👑" : "👤" }}
                </div>
                <div>
                  <p class="font-bold text-slate-800">{{ player.nickname }}</p>
                  <p v-if="player.id === gameStore.myPlayer?.id" class="text-[10px] font-black text-primary-500 uppercase tracking-widest">You</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <div v-if="player.id === gameStore.currentRoom?.host_id" class="px-3 py-1 bg-primary-100 text-primary-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {{ t("settings.host") }}
                </div>
                <button v-if="isHost() && player.id !== gameStore.myPlayer?.id" @click="removePlayer(player)" class="p-2 text-slate-300 hover:text-red-500 transition-colors">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Add Offline Player Input -->
            <div v-if="isHost() && gameStore.currentRoom?.game_mode === 'offline'" class="mt-2 flex gap-2">
              <input id="offlinePlayerName" v-model="newOfflineName" @keyup.enter="addOfflinePlayer" type="text" class="input-field flex-1 text-sm" :placeholder="t('nickname')" />
              <button @click="addOfflinePlayer" class="btn-primary !py-0 !px-6 text-sm">{{ t("settings.addOffline") }}</button>
            </div>
          </div>
        </div>

        <!-- Host Settings -->
        <div v-if="isHost()" class="space-y-6">
          <div class="flex items-center gap-3">
            <div class="h-px flex-1 bg-slate-200"></div>
            <h2 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{{ t("settings.title") }}</h2>
            <div class="h-px flex-1 bg-slate-200"></div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Game Mode -->
            <div class="glass-panel p-5 space-y-3 col-span-full">
              <label class="text-sm font-bold text-slate-700">📱 {{ t("settings.gameMode") }}</label>
              <div class="flex gap-2">
                <button
                  @click="updateSettings('game_mode', 'online')"
                  class="flex-1 py-3 rounded-xl border-2 transition-all font-bold text-xs"
                  :class="gameStore.currentRoom.game_mode === 'online' ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-white border-slate-100 text-slate-400'"
                >
                  {{ t("settings.online") }}
                </button>
                <button
                  @click="updateSettings('game_mode', 'offline')"
                  class="flex-1 py-3 rounded-xl border-2 transition-all font-bold text-xs"
                  :class="gameStore.currentRoom.game_mode === 'offline' ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-white border-slate-100 text-slate-400'"
                >
                  {{ t("settings.offline") }}
                </button>
              </div>
            </div>

            <!-- Custom Words Toggle -->
            <div class="glass-panel p-5 space-y-3 col-span-full">
              <div class="flex items-center justify-between">
                <label class="text-sm font-bold text-slate-700">✍️ {{ t("settings.customWords") }}</label>
                <button
                  @click="updateSettings('is_custom_words', !gameStore.currentRoom.is_custom_words)"
                  class="w-12 h-6 rounded-full transition-colors relative"
                  :class="gameStore.currentRoom.is_custom_words ? 'bg-primary-500' : 'bg-slate-200'"
                >
                  <div class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform" :class="gameStore.currentRoom.is_custom_words ? 'translate-x-6' : 'translate-x-0'"></div>
                </button>
              </div>

              <div v-if="gameStore.currentRoom.is_custom_words" class="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                <div class="space-y-1">
                  <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{{ t("settings.civilianWord") }}</p>
                  <input
                    id="customCivilianWord"
                    :value="gameStore.currentRoom.custom_word_civilian"
                    @input="updateSettings('custom_word_civilian', $event.target.value)"
                    type="text"
                    class="input-field !py-3 !text-sm"
                    :placeholder="t('settings.customPlaceholder')"
                  />
                </div>
                <div class="space-y-1">
                  <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{{ t("settings.undercoverWord") }}</p>
                  <input
                    id="customUndercoverWord"
                    :value="gameStore.currentRoom.custom_word_undercover"
                    @input="updateSettings('custom_word_undercover', $event.target.value)"
                    type="text"
                    class="input-field !py-3 !text-sm"
                    :placeholder="t('settings.customPlaceholder')"
                  />
                </div>
              </div>
            </div>

            <!-- Undercover Count -->
            <div class="glass-panel p-5 space-y-3">
              <label class="text-sm font-bold text-slate-700 flex items-center gap-2"> 🕵️ {{ t("settings.undercover") }} </label>
              <div class="flex gap-2">
                <button
                  v-for="n in [0, 1, 2]"
                  :key="n"
                  @click="updateSettings('undercover_count', n)"
                  class="flex-1 py-2 rounded-xl border-2 transition-all font-bold"
                  :class="[
                    gameStore.currentRoom.undercover_count === n ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200',
                    gameStore.players.length < 5 ? 'opacity-50 cursor-not-allowed' : '',
                  ]"
                >
                  {{ n }}
                </button>
              </div>
            </div>

            <!-- Mr White Count -->
            <div class="glass-panel p-5 space-y-3">
              <label class="text-sm font-bold text-slate-700 flex items-center gap-2"> ⚪ {{ t("settings.mrWhite") }} </label>
              <div class="flex gap-2">
                <button
                  v-for="n in [0, 1]"
                  :key="n"
                  @click="updateSettings('mr_white_count', n)"
                  class="flex-1 py-2 rounded-xl border-2 transition-all font-bold"
                  :class="[
                    gameStore.currentRoom.mr_white_count === n ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200',
                    gameStore.players.length < 3 ? 'opacity-50 cursor-not-allowed' : '',
                  ]"
                >
                  {{ n }}
                </button>
              </div>
            </div>

            <!-- Voting Method -->
            <div class="glass-panel p-5 space-y-3">
              <label class="text-sm font-bold text-slate-700">🗳️ {{ t("settings.voting") }}</label>
              <div class="space-y-2">
                <button
                  @click="updateSettings('voting_method', 'anonymous')"
                  class="w-full text-left px-4 py-3 rounded-xl border-2 transition-all"
                  :class="gameStore.currentRoom.voting_method === 'anonymous' ? 'bg-primary-50 border-primary-500 text-primary-700 ring-2 ring-primary-500/10' : 'bg-white border-slate-100 text-slate-500'"
                >
                  <p class="font-bold text-sm">{{ t("settings.anonymous") }}</p>
                  <p class="text-[10px] opacity-70">{{ t("settings.anonymousDesc") }}</p>
                </button>
                <button
                  @click="updateSettings('voting_method', 'real-life')"
                  class="w-full text-left px-4 py-3 rounded-xl border-2 transition-all"
                  :class="gameStore.currentRoom.voting_method === 'real-life' ? 'bg-primary-50 border-primary-500 text-primary-700 ring-2 ring-primary-500/10' : 'bg-white border-slate-100 text-slate-500'"
                >
                  <p class="font-bold text-sm">{{ t("settings.realLife") }}</p>
                  <p class="text-[10px] opacity-70">{{ t("settings.realLifeDesc") }}</p>
                </button>
              </div>
            </div>

            <!-- Spy Position -->
            <div class="glass-panel p-5 space-y-3">
              <label class="text-sm font-bold text-slate-700">🎭 {{ t("settings.spyPosition") }}</label>
              <div class="space-y-2">
                <select
                  :value="gameStore.currentRoom.spy_position"
                  @change="updateSettings('spy_position', $event.target.value)"
                  class="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 focus:border-primary-500 outline-none transition-all"
                >
                  <option value="anyone">{{ t("settings.spyAnyone") }}</option>
                  <option value="not-first">{{ t("settings.spyNotFirst") }}</option>
                  <option value="not-first-two">{{ t("settings.spyNotFirstTwo") }}</option>
                </select>
              </div>
            </div>

            <!-- Role Visibility -->
            <div class="glass-panel p-5 space-y-3 md:col-span-2">
              <label class="text-sm font-bold text-slate-700">👁️ Role Visibility</label>
              <div class="flex gap-4">
                <button
                  @click="updateSettings('infiltrator_visibility', 'known')"
                  class="flex-1 py-3 rounded-xl border-2 transition-all font-bold text-xs"
                  :class="gameStore.currentRoom.infiltrator_visibility === 'known' ? 'bg-primary-500 border-primary-500 text-white' : 'bg-white border-slate-100 text-slate-400'"
                >
                  Terlihat
                </button>
                <button
                  @click="updateSettings('infiltrator_visibility', 'secret')"
                  class="flex-1 py-3 rounded-xl border-2 transition-all font-bold text-xs"
                  :class="gameStore.currentRoom.infiltrator_visibility === 'secret' ? 'bg-primary-500 border-primary-500 text-white' : 'bg-white border-slate-100 text-slate-400'"
                >
                  Tidak
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="pt-8 space-y-4">
          <div v-if="gameStore.players.length === 0" class="text-center py-10 text-slate-400 font-medium italic">Fetching player list...</div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col items-center justify-center gap-6 pt-4">
        <div v-if="isHost()" class="w-full max-w-sm flex flex-col items-center">
          <button @click="startGame" :disabled="gameStore.players.length < 4" class="btn-primary w-full text-lg flex items-center justify-center gap-3 group disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none">
            {{ t("start") }}
            <svg class="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
          <p v-if="gameStore.players.length < 4" class="text-primary-600/60 text-[11px] mt-4 font-black uppercase tracking-widest flex items-center gap-2">
            <span class="w-1.5 h-1.5 bg-primary-600 rounded-full animate-ping"></span>
            {{ t("settings.needPlayers") }}
          </p>
        </div>
        <div v-else class="bg-primary-50 px-8 py-4 rounded-full border border-primary-100 flex items-center gap-4 text-primary-600 shadow-sm">
          <div class="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <p class="font-black text-xs uppercase tracking-widest">{{ t("waiting") }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
