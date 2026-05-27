<script setup>
// Mengimpor fungsi reaktivitas (onMounted, onUnmounted, watch, ref, computed) dari Vue 3
import { onMounted, onUnmounted, watch, ref, computed } from "vue";
// Mengimpor hook useRouter untuk navigasi halaman secara programmatic
import { useRouter } from "vue-router";
// Mengimpor global game store Pinia
import { useGameStore } from "../stores/gameStore";
// Mengimpor hook Vue I18n untuk lokalisasi teks multibahasa
import { useI18n } from "vue-i18n";
// Mengimpor manager SFX suara lokal
import { sfx } from "../utils/sfx";

// Inisialisasi router navigasi
const router = useRouter();
// Mengakses state global game
const gameStore = useGameStore();
// Mengambil fungsi penerjemahan i18n
const { t } = useI18n();

// Ref reaktif untuk melacak ID pemain yang di-vote oleh user saat ini
const votedId = ref(null);
// Cek computed reaktif jika user saat ini adalah Host kamar
const isHost = computed(() => gameStore.myPlayer?.id === gameStore.currentRoom?.host_id);
// Cek computed reaktif jika metode voting adalah 'real-life' (langsung ditunjuk di dunia nyata)
const isRealLifeVote = computed(() => gameStore.currentRoom?.voting_method === "real-life");
// Cek computed reaktif jika game dimainkan secara Offline (satu HP bergiliran)
const isOffline = computed(() => gameStore.currentRoom?.game_mode === "offline");

// Ref reaktif untuk memegang instansi Audio pengungkapan kartu eliminasi
const revealAudio = ref(null);
// Ref reaktif untuk melacak timeout ID pembersihan suara reveal
const revealTimerId = ref(null);

// Opsi penampung data untuk proses voting offline (satu HP bergiliran)
// Index pemain ke berapa yang sedang memegang HP untuk voting
const offlineVoterIndex = ref(0);
// Map penyimpan hasil suara: { voterId: targetPlayerId }
const offlineVotes = ref({});
// Modal konfirmasi perantara agar pemain berikutnya bisa memegang HP secara rahasia
const showOfflineVoteConfirm = ref(false);
// Menampilkan peran pemain yang tereliminasi (dimunculkan setelah suspense loading 5 detik)
const showRole = ref(false);
// Status loading saat host menutup modal reveal untuk melanjutkan game
const isClosing = ref(false);

// Watcher untuk mengawasi apakah sistem sedang menampilkan layar reveal tereliminasi
watch(
  () => gameStore.isEliminationRevealing,
  (isRevealing) => {
    if (isRevealing) {
      // Set agar kartu peran masih tertutup di awal (suspense loading)
      showRole.value = false;
      // Jika suara tidak dimute, mainkan audio reveal khusus selama 5 detik
      if (!gameStore.isMuted) {
        try {
          revealAudio.value = new Audio("/sounds/reveal-after-vote.mp3");
          revealAudio.value.play().catch(() => {});
          // Set timer untuk memberhentikan musik reveal tepat pada detik ke-5
          revealTimerId.value = setTimeout(() => {
            try {
              if (revealAudio.value) {
                revealAudio.value.pause();
                revealAudio.value.currentTime = 0;
              }
            } catch (e) {}
            revealAudio.value = null;
            revealTimerId.value = null;
          }, 5000);
        } catch (e) {}
      }

      // Jalankan waktu 5 detik sebelum teks kartu identitas asli di-reveal ke layar
      setTimeout(() => {
        showRole.value = true;
      }, 5000);
    } else {
      // Jika proses reveal selesai, reset seluruh state reaktif audio
      showRole.value = false;
      if (revealTimerId.value) {
        clearTimeout(revealTimerId.value);
        revealTimerId.value = null;
      }
      if (revealAudio.value) {
        try {
          revealAudio.value.pause();
          revealAudio.value.currentTime = 0;
        } catch (e) {}
        revealAudio.value = null;
      }
    }
  },
);

// Mendeklarasikan unsubscribe subscription database di level scope setup utama
let unsubscribe = null;

// Lifecycle hook ketika halaman VotingView di-unmount
onUnmounted(() => {
  // Panggil fungsi pembatalan subscribe database jika aktif
  if (unsubscribe) unsubscribe();
  // Bersihkan sisa timer lagu
  if (revealTimerId.value) clearTimeout(revealTimerId.value);
  // Pastikan lagu reveal dimatikan sepenuhnya
  if (revealAudio.value) {
    try {
      revealAudio.value.pause();
      revealAudio.value.currentTime = 0;
    } catch (e) {}
    revealAudio.value = null;
  }
});

// Watcher untuk menyinkronkan perpindahan halaman berdasarkan status room di DB
watch(
  () => gameStore.currentRoom?.status,
  (newStatus) => {
    // Jika status kamar berubah kembali menjadi bermain (mulai ronde diskusi baru)
    if (newStatus === "PLAYING") {
      router.push(`/room/${gameStore.currentRoom.room_code}/play`);
    // Jika Mr. White yang tereliminasi dan berhak menebak kata warga
    } else if (newStatus === "MR_WHITE_GUESS") {
      router.push(`/room/${gameStore.currentRoom.room_code}/guess`);
    // Jika permainan selesai (satu kelompok menang)
    } else if (newStatus === "FINISHED") {
      router.push(`/room/${gameStore.currentRoom.room_code}/finish`);
    }
  },
);

// Lifecycle hook ketika halaman VotingView dipasang ke layar
onMounted(async () => {
  // Validasi keberadaan kamar dan status login pemain
  if (!gameStore.currentRoom || !gameStore.myPlayer) {
    router.push("/");
    return;
  }

  // Berlangganan saluran real-time update room dari database
  unsubscribe = await gameStore.subscribeToRoom();
});

// Memproses klik pada salah satu kandidat eliminasi
const handleVote = async (playerId) => {
  sfx.play("click");
  // Jika mode offline, simpan suara secara lokal dulu lalu tampilkan layar tutup HP
  if (isOffline.value) {
    const currentVoter = alivePlayers.value[offlineVoterIndex.value];
    offlineVotes.value[currentVoter.id] = playerId;
    showOfflineVoteConfirm.value = true;
    return;
  }

  // Jika online, kirim data suara langsung ke DB Supabase
  if (votedId.value || !gameStore.myPlayer.is_alive) return;
  votedId.value = playerId;
  await gameStore.votePlayer(playerId);
};

// Navigasi ke pemilih offline berikutnya
const nextOfflineVoter = async () => {
  showOfflineVoteConfirm.value = false;
  // Jika masih ada pemain hidup berikutnya yang belum memilih
  if (offlineVoterIndex.value < alivePlayers.value.length - 1) {
    offlineVoterIndex.value++;
  } else {
    // Jika seluruh suara offline sudah terkumpul, host mengirimkan rekap suara ke DB
    await gameStore.submitOfflineVotes(offlineVotes.value);
  }
};

// Handler ketika Host menekan tombol eliminasi langsung pada mode real-life
const handleHostEliminate = async (playerId) => {
  confirmEliminatePlayer.value = gameStore.players.find((p) => p.id === playerId);
};

// Fungsi memproses konfirmasi akhir eliminasi pemain dari dialog Host
const confirmElimination = async () => {
  const playerId = confirmEliminatePlayer.value.id;
  confirmEliminatePlayer.value = null;
  await gameStore.eliminatePlayer(playerId);
};

// Ref reaktif penampung data pemain yang akan dikonfirmasi eliminasinya
const confirmEliminatePlayer = ref(null);

// Fungsi menutup layar reveal peran setelah voting selesai untuk melaju ke tahap berikutnya
const handleCloseReveal = async () => {
  if (isClosing.value) return;
  isClosing.value = true;
  await gameStore.closeReveal();
  isClosing.value = false;
};

// Memetakan warna background kartu reveal identitas berdasarkan perannya
const getRoleColorClass = (role) => {
  switch (role) {
    case "CIVILIAN":
      return "text-white bg-emerald-500 border-emerald-400";
    case "UNDERCOVER":
      return "text-white bg-rose-600 border-rose-500";
    case "MR_WHITE":
      return "text-white bg-slate-600 border-slate-500";
    default:
      return "text-white bg-slate-500 border-slate-400";
  }
};

// Computed property untuk memisahkan daftar pemain yang masih berstatus hidup
const alivePlayers = computed(() => gameStore.players.filter((p) => p.is_alive));

// Computed property mencari tahu secara real-time siapa pemain yang memegang giliran memilih
const currentVoter = computed(() => {
  if (isOffline.value) {
    return alivePlayers.value[offlineVoterIndex.value];
  }
  return gameStore.myPlayer;
});

// Computed property untuk menampilkan daftar pemain yang dapat dipilih
const votablePlayers = computed(() => {
  const voter = currentVoter.value;
  if (!voter) return alivePlayers.value;
  // Menyaring daftar agar nama pemilih saat ini dikeluarkan dari opsi pilihan (mencegah vote diri sendiri)
  return alivePlayers.value.filter((p) => p.id !== voter.id);
});
</script>

<!-- Tampilan Halaman Voting -->
<template>
  <div class="min-h-screen p-6 flex flex-col items-center py-12 relative overflow-hidden">
    <!-- Dekorasi background blur melayang -->
    <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>

    <div class="z-10 max-w-2xl w-full space-y-10 text-center">
      <!-- Judul Voting -->
      <div>
        <h1 class="text-5xl font-black text-slate-800 mb-3 tracking-tight">{{ t("voting.title") }}</h1>
        <p class="text-slate-500 font-medium tracking-wide">{{ t("voting.desc") }}</p>
      </div>

      <!-- TAMPILAN JIKA METODE VOTING ADALAH REAL-LIFE (VOTING MANUAL DUNIA NYATA) -->
      <div v-if="isRealLifeVote" class="space-y-8">
        <div class="glass p-8 border-t-4 border-primary-500">
          <h2 class="text-2xl font-black text-slate-800 mb-2">{{ t("voting.realLifeTitle") }}</h2>
          <p class="text-slate-500">{{ t("voting.realLifeDesc") }}</p>

          <!-- Tampilan tombol panel eliminasi khusus untuk Host saja -->
          <div v-if="isHost" class="mt-8 space-y-4">
            <p class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{{ t("voting.hostPanel") }}</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                v-for="player in alivePlayers"
                :key="player.id"
                @click="handleHostEliminate(player.id)"
                class="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-red-500 hover:bg-red-50 transition-all group"
              >
                <span class="font-bold text-slate-700">{{ player.nickname }}</span>
                <span class="text-[10px] font-black bg-red-100 text-red-600 px-3 py-1 rounded-full group-hover:bg-red-500 group-hover:text-white">{{ t("voting.eliminate") }}</span>
              </button>
            </div>
          </div>
          <!-- Tampilan loading menunggu host bagi pemain non-host -->
          <div v-else class="mt-8 py-10">
            <div class="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl animate-bounce">⏳</div>
            <p class="text-slate-500 font-medium italic">{{ t("voting.recording") }}</p>
          </div>
        </div>
      </div>

      <!-- TAMPILAN VOTING DIGITAL (ANONIM / BERGILIRAN LEWAT HP) -->
      <div v-else class="space-y-10">
        <!-- Indikator giliran pemilih untuk mode Offline -->
        <div v-if="isOffline" class="text-center space-y-2 mb-8 animate-in fade-in zoom-in">
          <p class="text-primary-600 font-black text-xs uppercase tracking-[0.3em]">{{ t("voting.passPhone") }}</p>
          <h2 class="text-4xl font-black text-slate-800">{{ alivePlayers[offlineVoterIndex]?.nickname }}</h2>
          <p class="text-slate-400 text-sm">{{ t("voting.yourTurn") }}</p>
        </div>

        <!-- Render list tombol pemain yang bisa di-vote -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            v-for="player in votablePlayers"
            :key="player.id"
            @click="handleVote(player.id)"
            :disabled="!player.is_alive || (!isOffline && (votedId || !gameStore.myPlayer.is_alive))"
            class="relative glass p-6 transition-all duration-300 group overflow-hidden border-2"
            :class="[
              player.is_alive ? 'hover:border-primary-500 hover:bg-white' : 'opacity-40 grayscale cursor-not-allowed',
              votedId === player.id || (isOffline && offlineVotes[alivePlayers[offlineVoterIndex]?.id] === player.id) ? 'border-primary-500 bg-white shadow-lg' : 'border-transparent',
            ]"
          >
            <div class="flex items-center gap-4">
              <!-- Huruf depan nickname pemain -->
              <div class="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-xl text-slate-400 group-hover:text-primary-600 group-hover:bg-primary-50 transition-all shadow-inner">
                {{ player.nickname[0].toUpperCase() }}
              </div>
              <div class="text-left">
                <!-- Nickname pemain target -->
                <p class="font-black text-slate-800 text-lg leading-tight">{{ player.nickname }}</p>
                <p class="text-[10px] font-black uppercase tracking-widest" :class="player.is_alive ? 'text-primary-600/60' : 'text-slate-400'">
                  {{ player.is_alive ? t("alive") : t("eliminated") }}
                </p>
              </div>
            </div>
          </button>
        </div>

        <!-- Informasi konfirmasi bagi pemilih online yang sudah mencatat suaranya -->
        <div v-if="votedId && !isOffline" class="bg-primary-50 border border-primary-100 p-6 rounded-3xl shadow-sm inline-block">
          <p class="text-primary-600 font-black text-xs uppercase tracking-[0.2em] animate-pulse">
            {{ t("voting.recorded") }}
          </p>
        </div>

        <!-- Keterangan bagi pemain yang mati bahwa ia tidak bisa berpartisipasi voting -->
        <div v-if="!isOffline && !gameStore.myPlayer.is_alive" class="glass p-8 border-t-4 border-slate-200">
          <p class="text-slate-500 font-medium italic">
            {{ t("voting.cannotVote") }}
          </p>
        </div>
      </div>

      <!-- MODAL TELEPORT DIATAS BODY LAYAR -->

      <!-- Modal Jeda Oper HP untuk mode Offline -->
      <Teleport to="body">
        <div v-if="showOfflineVoteConfirm" class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
          <div class="glass p-8 w-full max-w-sm space-y-6 text-center animate-in fade-in zoom-in duration-300">
            <div class="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto text-3xl">🗳️</div>
            <h3 class="text-2xl font-black text-slate-800">{{ t("voting.recorded") }}</h3>
            <p class="text-slate-500">
              {{ t("voting.recorded") === "Vote recorded! Waiting for others..." ? "Please hide your vote and pass the phone to the next player." : "Harap sembunyikan pilihan Anda dan berikan HP ke pemain berikutnya." }}
            </p>
            <!-- Tombol untuk melaju ke giliran pemain berikutnya -->
            <button @click="nextOfflineVoter" class="btn-primary w-full py-4">{{ t("gameplay.nextPlayer") }}</button>
          </div>
        </div>
      </Teleport>

      <!-- Overlay Animasi Reveal Pengungkapan Peran Pemain Tereliminasi -->
      <Teleport to="body">
        <div v-if="gameStore.isEliminationRevealing" class="fixed inset-0 z-[200] flex flex-col items-center justify-center p-6 bg-slate-900 text-white overflow-hidden">
          <!-- Background gradasi memutar dinamis -->
          <div class="absolute inset-0 overflow-hidden">
            <div class="absolute inset-[-50%] bg-gradient-to-tr from-primary-900/40 via-slate-900 to-primary-900/40 animate-[spin_10s_linear_infinite]"></div>
          </div>

          <div class="relative z-10 text-center space-y-8 max-w-sm w-full">
            <!-- Tahapan Investigasi Awal (Menunggu bar loading 5 detik selesai) -->
            <div v-if="!showRole" class="space-y-8 animate-in fade-in duration-500">
              <div class="space-y-2">
                <p class="text-primary-400 font-black text-xs uppercase tracking-[0.4em] animate-pulse">{{ t("elimination.investigating") }}</p>
                <h2 class="text-5xl font-black tracking-tighter">{{ gameStore.revealedEliminatedPlayer?.nickname }}</h2>
              </div>

              <!-- Bar loading suspense 5 detik -->
              <div class="relative w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div class="absolute inset-0 bg-primary-500 animate-[progress_5s_linear_forwards]"></div>
              </div>

              <div class="flex items-center justify-center gap-3">
                <div v-for="n in 3" :key="n" class="w-2 h-2 bg-primary-500 rounded-full animate-bounce" :style="{ animationDelay: n * 0.2 + 's' }"></div>
              </div>
            </div>

            <!-- Tahapan Pengungkapan (Setelah loading 5 detik selesai) -->
            <div v-if="showRole" class="w-full flex flex-col items-center animate-in fade-in zoom-in duration-700">
              <div class="mb-6">
                <p class="text-white/40 text-[10px] font-black uppercase tracking-[0.4em] mb-1">{{ t("elimination.playerEliminated") }}</p>
                <h2 class="text-4xl font-black tracking-tighter text-white">{{ gameStore.revealedEliminatedPlayer?.nickname }}</h2>
              </div>

              <!-- Feedback teks jika salah mengeliminasi Warga Sipil -->
              <div v-if="gameStore.revealedEliminatedPlayer?.role === 'CIVILIAN'" class="mb-8 space-y-2 animate-[shake_0.5s_ease-in-out_infinite]">
                <p class="text-rose-500 font-black text-3xl tracking-tighter uppercase">{{ t("elimination.wrongPick") }}</p>
                <p class="text-white/70 text-sm">{{ t("elimination.wrongDesc") }}</p>
              </div>

              <!-- Kartu identitas peran asli terungkap -->
              <div class="flex flex-col items-center justify-center w-full">
                <p class="text-white/40 text-[10px] font-black uppercase tracking-[0.4em] mb-4">{{ t("elimination.realIdentity") }}</p>
                <div
                  class="inline-flex items-center justify-center px-12 py-6 rounded-3xl border-4 font-black text-4xl sm:text-5xl uppercase tracking-widest shadow-2xl transition-all"
                  :class="getRoleColorClass(gameStore.revealedEliminatedPlayer?.role)"
                >
                  {{ t(`roles.${(gameStore.revealedEliminatedPlayer?.role || "").toLowerCase()}`) }}
                </div>
              </div>

              <!-- Informasi tambahan konsekuensi eliminasi peran -->
              <div v-if="gameStore.revealedEliminatedPlayer?.role === 'CIVILIAN'" class="mt-10 p-6 bg-emerald-500/20 border border-emerald-500/30 rounded-3xl animate-in zoom-in">
                <p class="text-emerald-400 font-bold">
                  {{ t("elimination.civilianLeft") }}
                </p>
              </div>
              <div v-else-if="gameStore.revealedEliminatedPlayer?.role === 'MR_WHITE'" class="mt-10 p-6 bg-slate-500/20 border border-slate-500/30 rounded-3xl animate-in zoom-in">
                <p class="text-slate-300 font-bold text-sm mb-2">
                  {{ t("elimination.mrWhiteFound") }}
                </p>
                <p class="text-slate-400 text-xs italic">
                  {{ t("elimination.mrWhiteChance") }}
                </p>
              </div>
              <div v-else class="mt-10 p-6 bg-primary-500/20 border border-primary-500/30 rounded-3xl animate-in zoom-in">
                <p class="text-primary-400 font-bold">
                  {{ t("elimination.undercoverFound") }}
                </p>
              </div>

              <!-- Tombol Lanjutkan Game (Hanya diproses host / pada offline mode) -->
              <button
                v-if="isHost || isOffline"
                @click="handleCloseReveal"
                :disabled="isClosing"
                class="mt-12 w-full py-5 bg-white text-slate-900 font-black rounded-2xl shadow-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {{ isClosing ? "LOADING..." : t("elimination.continue") }}
                <svg v-if="!isClosing" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Modal Dialog Konfirmasi Eliminasi Host pada mode Real-Life -->
      <Teleport to="body">
        <div v-if="confirmEliminatePlayer" class="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div class="glass p-10 w-full max-w-sm space-y-8 text-center animate-in fade-in zoom-in duration-300">
            <div class="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto text-3xl transform rotate-12">🔪</div>
            <div class="space-y-2">
              <h3 class="text-2xl font-black text-slate-800">{{ t("voting.confirmTitle").replace("{name}", confirmEliminatePlayer.nickname) }}</h3>
              <p class="text-slate-500 text-sm">{{ t("voting.confirmDesc") }}</p>
            </div>
            <div class="flex gap-3">
              <button @click="confirmEliminatePlayer = null" class="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors">
                {{ t("voting.cancel") }}
              </button>
              <button @click="confirmElimination" class="flex-1 py-4 font-black bg-rose-500 text-white shadow-xl shadow-rose-500/20 rounded-2xl hover:bg-rose-600 transition-colors">
                {{ t("voting.eliminate") }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>
