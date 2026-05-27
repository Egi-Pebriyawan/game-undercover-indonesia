<script setup>
// Mengimpor fungsi reaktivitas, hook lifecycle, dan watcher dari Vue 3
import { computed, onMounted, watch } from "vue";
// Mengimpor hook useRouter untuk navigasi halaman secara terprogram
import { useRouter } from "vue-router";
// Mengimpor global game store Pinia
import { useGameStore } from "../stores/gameStore";
// Mengimpor hook Vue I18n untuk lokalisasi teks multibahasa
import { useI18n } from "vue-i18n";
// Mengimpor pengelola sfx suara lokal
import { sfx } from "../utils/sfx";
// Mengimpor pustaka confetti untuk efek visual kemenangan
import confetti from "canvas-confetti";

// Inisialisasi router navigasi
const router = useRouter();
// Mengakses state global game
const gameStore = useGameStore();
// Mengambil fungsi penerjemahan i18n
const { t } = useI18n();

// Watcher untuk mendeteksi apabila status room direset kembali ke LOBBY
watch(
  () => gameStore.currentRoom?.status,
  (newStatus) => {
    // Jika room direset ke LOBBY oleh host, arahkan pemain kembali ke halaman lobi
    if (newStatus === "LOBBY") {
      router.push(`/room/${gameStore.currentRoom.room_code}`);
    }
  },
);

// Dipanggil saat komponen dirender di layar
onMounted(async () => {
  // Jika tidak ada data room aktif, paksa kembali ke beranda utama
  if (!gameStore.currentRoom) {
    router.push("/");
    return;
  }
  // Perbarui daftar pemain terbaru dari database
  await gameStore.fetchPlayers();
  // Berlangganan ulang ke saluran room real-time Supabase
  await gameStore.subscribeToRoom();

  // Memutar musik kemenangan atau kekalahan berdasarkan hasil akhir game
  const winnerRole = gameStore.currentRoom?.winner_role;
  // Cek jika warga sipil (CIVILIANS) yang menang
  if (winnerRole === "CIVILIANS") {
    // Jika suara tidak dimute, mainkan audio kemenangan
    if (!gameStore.isMuted) {
      try {
        new Audio("/sounds/victory.mp3").play().catch(() => {});
      } catch (e) {}
    }
    // Picu ledakan efek confetti perayaan
    fireConfetti();
  } else {
    // Jika suara tidak dimute, mainkan audio kekalahan warga
    if (!gameStore.isMuted) {
      try {
        new Audio("/sounds/defeat-faahhh.mp3").play().catch(() => {});
      } catch (e) {}
    }
  }
});

// Fungsi memicu partikel confetti secara berulang selama 3 detik
const fireConfetti = () => {
  // Durasi durasi animasi efek confetti dalam milidetik (3 detik)
  const duration = 3000;
  // Waktu akhir animasi confetti
  const animationEnd = Date.now() + duration;
  // Set interval pengulangan partikel confetti setiap 250ms
  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    // Berhenti saat waktu habis
    if (timeLeft <= 0) return clearInterval(interval);
    // Jumlah partikel dihitung proporsional terhadap sisa waktu
    const count = 60 * (timeLeft / duration);
    // Panggil efek confetti dari library canvas-confetti dengan posisi acak horizontal
    confetti({ particleCount: count, spread: 360, origin: { x: Math.random() * 0.6 + 0.2, y: Math.random() - 0.2 } });
  }, 250);
};

// Computed property untuk memetakan teks info pemenang dan warna UI secara dinamis
const winInfo = computed(() => {
  const winnerRole = gameStore.currentRoom?.winner_role;

  // Jika kelompok pengkhianat (BADDIES: Undercover / Mr. White) yang menang
  if (winnerRole === "BADDIES") {
    return {
      label: t("winner.baddies"),
      color: "text-rose-600",
      bgColor: "border-rose-500",
      icon: "😈",
    };
  }
  // Default jika kelompok Warga Sipil (CIVILIANS) yang menang
  return {
    label: t("winner.civilians"),
    color: "text-emerald-600",
    bgColor: "border-emerald-500",
    icon: "🏆",
  };
});

// Aksi tombol kembali ke lobi (hanya diproses host)
const backToLobby = async () => {
  try {
    // Hentikan semua musik latar yang sedang menyala
    sfx.stop();
  } catch (e) {}
  // Hubungi server untuk me-reset status kamar dan merapikan data ronde
  await gameStore.resetRoom();
  // Navigasi kembali ke halaman lobby
  router.push(`/room/${gameStore.currentRoom.room_code}`);
};

// Aksi keluar dari game dan kembali ke beranda utama
const backToHome = () => {
  try {
    // Hentikan suara sfx
    sfx.stop();
  } catch (e) {}
  // Navigasi kembali ke halaman utama
  router.push("/");
};
</script>

<!-- Tampilan Hasil Akhir Permainan -->
<template>
  <div class="min-h-screen p-6 flex flex-col items-center py-12 relative overflow-hidden">
    <!-- Elemen dekoratif background -->
    <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>

    <div class="z-10 max-w-2xl w-full space-y-10 text-center">
      <div>
        <!-- Tulisan utama Game Over -->
        <h1 class="text-6xl font-black text-slate-800 mb-6 tracking-tighter">GAME OVER</h1>
        <!-- Kotak hasil pemenang game -->
        <div class="glass p-10 px-16 inline-block shadow-2xl transform hover:scale-105 transition-transform border-b-[12px]" :class="winInfo.bgColor">
          <div class="text-5xl mb-4 animate-bounce">{{ winInfo.icon }}</div>
          <p class="text-slate-400 uppercase tracking-[0.4em] text-[11px] font-black mb-3">{{ t("subtitle") }}</p>
          <h2 class="text-4xl md:text-6xl font-black tracking-tighter" :class="winInfo.color">{{ winInfo.label }}</h2>
        </div>
      </div>

      <!-- Kotak pengungkapan peran asli seluruh pemain -->
      <div class="glass p-10">
        <h3 class="text-xl font-black text-slate-800 mb-8 flex items-center gap-3 uppercase tracking-wider">
          <span class="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl shadow-inner border border-slate-100">📖</span>
          {{ t("roles.mrWhite") === "Mr. White" ? "Final Reveal" : "Pengungkapan Akhir" }}
        </h3>
        <div class="space-y-4">
          <!-- Loop render list pemain dengan peran asli dan kata rahasianya -->
          <div
            v-for="player in gameStore.players"
            :key="player.id"
            class="flex justify-between items-center p-5 rounded-2xl transition-all border-2"
            :class="player.is_alive ? 'bg-white border-slate-50 shadow-sm' : 'bg-slate-50 border-transparent opacity-60'"
          >
            <div class="flex items-center gap-4">
              <!-- Avatar inisial nama pemain -->
              <div class="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400">
                {{ player.nickname[0].toUpperCase() }}
              </div>
              <div class="text-left">
                <!-- Nickname pemain -->
                <p class="font-bold text-slate-800 leading-none">{{ player.nickname }}</p>
                <!-- Label tereliminasi jika status is_alive false -->
                <span v-if="!player.is_alive" class="inline-block mt-2 text-[8px] font-black tracking-widest bg-slate-200 text-slate-500 px-2 py-0.5 rounded uppercase">{{ t("eliminated") }}</span>
              </div>
            </div>
            <!-- Info kata rahasia & perannya -->
            <div class="text-right">
              <p class="text-xs font-black uppercase tracking-widest mb-1" :class="player.role === 'CIVILIAN' ? 'text-primary-600' : 'text-primary-800'">
                {{ t(`roles.${player.role.toLowerCase()}`) }}
              </p>
              <p class="text-lg font-black text-slate-700 italic">"{{ player.word || "-" }}"</p>
            </div>
          </div>
        </div>

        <!-- Tombol aksi footer -->
        <div class="pt-8 w-full space-y-4">
          <!-- Tombol kembali ke lobi hanya muncul jika user saat ini adalah Host -->
          <div v-if="gameStore.myPlayer?.id === gameStore.currentRoom?.host_id" class="space-y-3">
            <button @click="backToLobby" class="btn-primary w-full py-4 text-lg shadow-xl shadow-primary-500/20">
              {{ t("backToLobby") }}
            </button>
          </div>

          <!-- Tombol kembali ke beranda utama untuk seluruh pemain -->
          <button @click="backToHome" class="w-full py-4 rounded-2xl font-black text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-widest text-xs">
            {{ t("backToHome") }}
          </button>

          <!-- Menu Donasi untuk Developer -->
          <div class="mt-12 pt-8 border-t border-slate-100 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{{ t("support.thanks") }}</p>
            <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
              <!-- Saweria (Dukungan Lokal) -->
              <a
                href="https://saweria.co/Pebri17"
                target="_blank"
                class="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-amber-50 px-6 py-3 rounded-2xl border border-amber-100 text-amber-600 hover:bg-amber-100 hover:scale-105 transition-all group"
              >
                <span class="text-xl group-hover:rotate-12 transition-transform">🇮🇩</span>
                <span class="font-black text-xs uppercase tracking-widest">{{ t("support.local") }}</span>
              </a>
              <!-- Ko-fi (Dukungan Internasional) -->
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
