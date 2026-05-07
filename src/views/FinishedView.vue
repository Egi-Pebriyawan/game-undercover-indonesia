<script setup>
import { computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useGameStore } from "../stores/gameStore";
import { useI18n } from "vue-i18n";
import { sfx } from "../utils/sfx";
import confetti from "canvas-confetti";

const router = useRouter();
const gameStore = useGameStore();
const { t } = useI18n();

watch(
  () => gameStore.currentRoom?.status,
  (newStatus) => {
    if (newStatus === "LOBBY") {
      router.push(`/room/${gameStore.currentRoom.room_code}`);
    }
  },
);

onMounted(async () => {
  if (!gameStore.currentRoom) {
    router.push("/");
    return;
  }
  await gameStore.fetchPlayers();
  await gameStore.subscribeToRoom();

  // Play sound and effects based on result
  const winnerRole = gameStore.currentRoom?.winner_role;
  if (winnerRole === "CIVILIANS") {
    if (!gameStore.isMuted) {
      try {
        new Audio("/sounds/victory.mp3").play().catch(() => {});
      } catch (e) {}
    }
    fireConfetti();
  } else {
    if (!gameStore.isMuted) {
      try {
        new Audio("/sounds/defeat-faahhh.mp3").play().catch(() => {});
      } catch (e) {}
    }
  }
});

const fireConfetti = () => {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) return clearInterval(interval);
    const count = 60 * (timeLeft / duration);
    confetti({ particleCount: count, spread: 360, origin: { x: Math.random() * 0.6 + 0.2, y: Math.random() - 0.2 } });
  }, 250);
};

const winInfo = computed(() => {
  const winnerRole = gameStore.currentRoom?.winner_role;

  if (winnerRole === "BADDIES") {
    return {
      label: t("winner.baddies"),
      color: "text-rose-600",
      bgColor: "border-rose-500",
      icon: "😈",
    };
  }
  return {
    label: t("winner.civilians"),
    color: "text-emerald-600",
    bgColor: "border-emerald-500",
    icon: "🏆",
  };
});

const backToLobby = async () => {
  try {
    sfx.stop();
  } catch (e) {}
  await gameStore.resetRoom();
  router.push(`/room/${gameStore.currentRoom.room_code}`);
};

const backToHome = () => {
  try {
    sfx.stop();
  } catch (e) {}
  router.push("/");
};
</script>

<template>
  <div class="min-h-screen p-6 flex flex-col items-center py-12 relative overflow-hidden">
    <!-- Decorative background elements -->
    <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>

    <div class="z-10 max-w-2xl w-full space-y-10 text-center">
      <div>
        <h1 class="text-6xl font-black text-slate-800 mb-6 tracking-tighter">GAME OVER</h1>
        <div class="glass p-10 px-16 inline-block shadow-2xl transform hover:scale-105 transition-transform border-b-[12px]" :class="winInfo.bgColor">
          <div class="text-5xl mb-4 animate-bounce">{{ winInfo.icon }}</div>
          <p class="text-slate-400 uppercase tracking-[0.4em] text-[11px] font-black mb-3">{{ t("subtitle") }}</p>
          <h2 class="text-4xl md:text-6xl font-black tracking-tighter" :class="winInfo.color">{{ winInfo.label }}</h2>
        </div>
      </div>

      <div class="glass p-10">
        <h3 class="text-xl font-black text-slate-800 mb-8 flex items-center gap-3 uppercase tracking-wider">
          <span class="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl shadow-inner border border-slate-100">📖</span>
          {{ t("roles.mrWhite") === "Mr. White" ? "Final Reveal" : "Pengungkapan Akhir" }}
        </h3>
        <div class="space-y-4">
          <div
            v-for="player in gameStore.players"
            :key="player.id"
            class="flex justify-between items-center p-5 rounded-2xl transition-all border-2"
            :class="player.is_alive ? 'bg-white border-slate-50 shadow-sm' : 'bg-slate-50 border-transparent opacity-60'"
          >
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400">
                {{ player.nickname[0].toUpperCase() }}
              </div>
              <div class="text-left">
                <p class="font-bold text-slate-800 leading-none">{{ player.nickname }}</p>
                <span v-if="!player.is_alive" class="inline-block mt-2 text-[8px] font-black tracking-widest bg-slate-200 text-slate-500 px-2 py-0.5 rounded uppercase">{{ t("eliminated") }}</span>
              </div>
            </div>
            <div class="text-right">
              <p class="text-xs font-black uppercase tracking-widest mb-1" :class="player.role === 'CIVILIAN' ? 'text-primary-600' : 'text-primary-800'">
                {{ t(`roles.${player.role.toLowerCase()}`) }}
              </p>
              <p class="text-lg font-black text-slate-700 italic">"{{ player.word || "-" }}"</p>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="pt-8 w-full space-y-4">
          <div v-if="gameStore.myPlayer?.id === gameStore.currentRoom?.host_id" class="space-y-3">
            <button @click="backToLobby" class="btn-primary w-full py-4 text-lg shadow-xl shadow-primary-500/20">
              {{ t("backToLobby") }}
            </button>
          </div>

          <button @click="backToHome" class="w-full py-4 rounded-2xl font-black text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-widest text-xs">
            {{ t("backToHome") }}
          </button>

          <!-- Support Section -->
          <div class="mt-12 pt-8 border-t border-slate-100 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{{ t("support.thanks") }}</p>
            <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
              <!-- Saweria (Local) -->
              <a
                href="https://saweria.co/Pebri17"
                target="_blank"
                class="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-amber-50 px-6 py-3 rounded-2xl border border-amber-100 text-amber-600 hover:bg-amber-100 hover:scale-105 transition-all group"
              >
                <span class="text-xl group-hover:rotate-12 transition-transform">🇮🇩</span>
                <span class="font-black text-xs uppercase tracking-widest">{{ t("support.local") }}</span>
              </a>
              <!-- Ko-fi (International) -->
              <a
                href="https://ko-fi.com/pebriyawan"
                target="_blank"
                class="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-blue-50 px-6 py-3 rounded-2xl border border-blue-100 text-blue-600 hover:bg-blue-100 hover:scale-105 transition-all group"
              >
                <span class="text-xl group-hover:rotate-12 transition-transform">🌎</span>
                <span class="font-black text-xs uppercase tracking-widest">{{ t("support.international") }}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
