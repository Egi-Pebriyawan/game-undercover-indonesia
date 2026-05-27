# Panduan Perbaikan Bug (Fix Bug Guide) - Undercover Indonesia

Dokumen ini berisi panduan perbaikan bug secara detail dan langkah-langkah konkret yang bisa langsung dikerjakan oleh junior programmer atau AI Agent.

---

## Daftar Bug yang Diperbaiki:
1. **Gameplay Timer**: Timer diskusi awalnya default ke 60 detik meskipun belum dipilih. Harus dibuat kosong di awal, dan baru muncul setelah durasi dipilih.
2. **SFX Detik Akhir**: SFX bunyi beeps/peringatan di detik-detik akhir timer diskusi dihilangkan.
3. **Voting via HP (Missing Host & Self-Vote)**: Host tidak masuk dalam list pilihan vote pada device pemain lain, dan pemain bisa memilih dirinya sendiri (pada mode offline/online tertentu).
4. **Timer Sound Mode Vote**: Saat masuk ke mode voting, sound timer (`timer-funny.mp3`) harus langsung mati dan tidak boleh menunggu sampai lagunya habis.
5. **Flash/Kedipan Layar Saat Mr. White Tereliminasi**: Muncul sekilas tampilan diskusi/voting sebelum popup "Last Chance!" / Guess Word untuk Mr. White tampil.

---

### Bug 1 & 2: Gameplay Timer Awalnya Kosong & Penghapusan SFX Detik Akhir
* **File Target:** [GameplayView.vue](file:///f:/game-undercover-indonesia/src/views/GameplayView.vue)

#### Rationale (Analisis Masalah):
- Di `GameplayView.vue`, computed property `discussionDuration` mengembalikan nilai default `60` jika database bernilai `null` atau `undefined`. Akibatnya timer otomatis muncul di awal diskusi dengan waktu 60 detik.
- Perilaku yang diinginkan: Di awal diskusi, timer harus disembunyikan (tidak tampil / kosong). Begitu Host memilih salah satu opsi durasi (30s, 1m, 3m), timer baru akan muncul dan mulai berjalan.
- Juga, watch pada `discussionDuration` tidak diimplementasikan sehingga ketika durasi diubah oleh Host secara dinamis di tengah game, timer pada player lain tidak merespons perubahan tersebut.
- Sound effect detak detik terakhir (beep beeps) harus dihapus total.

#### Langkah Perbaikan Konkret:
1. Di [GameplayView.vue](file:///f:/game-undercover-indonesia/src/views/GameplayView.vue), ubah computed `discussionDuration` agar mengembalikan `0` jika durasi belum dipilih (bernilai `null` atau `undefined`).
2. Tambahkan `watch` untuk `discussionDuration` agar saat nilainya berubah dinamis, timer otomatis terupdate.
3. Hapus (atau hapus komentar) kode yang memainkan beeps detik akhir `sfx.play("timer")`.

#### Panduan Kode (Diff):
```diff
-const discussionDuration = computed(() => {
-  const raw = gameStore.currentRoom?.discussion_duration;
-  // Normalize: null/undefined -> default 60
-  if (raw === undefined || raw === null) return 60;
-  return Number(raw);
-});
+const discussionDuration = computed(() => {
+  const raw = gameStore.currentRoom?.discussion_duration;
+  // Mengembalikan 0 (tanpa timer) jika belum dipilih oleh host
+  if (raw === undefined || raw === null) return 0;
+  return Number(raw);
+});

// Tambahkan watch baru setelah computed discussionDuration:
+watch(discussionDuration, (newVal) => {
+  if (newVal > 0) {
+    startTimer(newVal);
+  } else {
+    stopTimer();
+  }
+});
```

Dan pastikan di bagian `setInterval` pada `startTimer`, baris warning beeps sudah bersih:
```javascript
// Di dalam startTimer -> pastikan baris ini dihapus atau dipastikan tetap non-aktif:
// Play short warning beeps as fallback
// if (timer.value === 10 || timer.value === 3) {
//   sfx.play("timer");
// }
```

---

### Bug 3: Masalah List Voting via HP (Host Hilang & Bisa Vote Diri Sendiri)
* **File Target:** [VotingView.vue](file:///f:/game-undercover-indonesia/src/views/VotingView.vue)

#### Rationale (Analisis Masalah):
- Di `VotingView.vue`, computed `votablePlayers` menyaring player dengan logika: `filter((p) => p.id !== gameStore.myPlayer?.id)`.
- **Masalah Offline:** Di mode offline (bermain pakai 1 HP bergiliran), `gameStore.myPlayer` selalu bernilai **Host** (pembuat ruangan). Ketika player 2 bergiliran memvoting, yang disembunyikan dari list adalah Host (`gameStore.myPlayer`), bukannya player 2 itu sendiri! Akhirnya:
  1. Host tidak bisa di-vote oleh siapa pun karena namanya hilang dari list.
  2. Player lain (misal Player 2) bisa memilih dirinya sendiri karena namanya ada di list.
- **Masalah Online:** Logika harusnya konsisten: siapa pun yang sedang memvoting tidak boleh memilih dirinya sendiri.

#### Langkah Perbaikan Konkret:
1. Buat computed `currentVoter` yang mendeteksi secara dinamis siapa yang sedang memvoting:
   - Jika mode Offline: Ambil dari `alivePlayers[offlineVoterIndex]`.
   - Jika mode Online: Ambil dari `gameStore.myPlayer`.
2. Di dalam `votablePlayers`, lakukan filter agar **tidak menampilkan `currentVoter`** di daftar pilihan vote.

#### Panduan Kode (Diff):
```diff
const alivePlayers = computed(() => gameStore.players.filter((p) => p.is_alive));

-const votablePlayers = computed(() => {
-  if (gameStore.currentRoom?.voting_method === "anonymous") {
-    return gameStore.players.filter((p) => p.id !== gameStore.myPlayer?.id);
-  }
-  return gameStore.players;
-});
+const currentVoter = computed(() => {
+  if (isOffline.value) {
+    return alivePlayers.value[offlineVoterIndex.value];
+  }
+  return gameStore.myPlayer;
+});
+
+const votablePlayers = computed(() => {
+  const voter = currentVoter.value;
+  if (!voter) return alivePlayers.value;
+  // Menyaring agar voter saat ini tidak bisa memilih dirinya sendiri
+  return alivePlayers.value.filter((p) => p.id !== voter.id);
+});
```

---

### Bug 4: Sound Timer Tetap Menyala Saat Masuk Mode Vote & Perbaikan `onUnmounted`
* **File Target:** [GameplayView.vue](file:///f:/game-undercover-indonesia/src/views/GameplayView.vue), [VotingView.vue](file:///f:/game-undercover-indonesia/src/views/VotingView.vue), [LobbyView.vue](file:///f:/game-undercover-indonesia/src/views/LobbyView.vue)

#### Rationale (Analisis Masalah):
- Di `GameplayView.vue`, ada watcher yang mendeteksi jika room status berubah ke `VOTING`, maka ia melakukan `router.push('/vote')`. Namun watcher tersebut tidak memanggil `stopTimer()`, sehingga audio `timer-funny.mp3` terus dimainkan.
- **Masalah Vue 3 Lifecycle:** Di file `GameplayView.vue`, `VotingView.vue`, dan `LobbyView.vue`, lifecycle hook `onUnmounted` dipanggil di dalam `onMounted(async () => { ... })` setelah statement `await`.
- Di Vue 3, lifecycle hooks harus dipanggil secara **synchronous** pada tingkat setup teratas (`<script setup>`). Jika ditaruh di dalam fungsi async atau setelah keyword `await`, Vue kehilangan konteks instans komponen tersebut sehingga hook `onUnmounted` **tidak akan pernah dieksekusi**. Hal ini membuat timer dan sound tidak pernah dibersihkan saat berganti halaman.

#### Langkah Perbaikan Konkret:
1. Di [GameplayView.vue](file:///f:/game-undercover-indonesia/src/views/GameplayView.vue), panggil `stopTimer()` secara eksplisit di dalam watcher status kamar ketika berpindah ke `VOTING` atau `FINISHED`.
2. Pindahkan deklarasi `onUnmounted` di ketiga file tersebut ke setup level paling atas (tidak boleh bersarang di dalam `onMounted`).
3. Deklarasikan variabel `unsubscribe` di scope teratas agar bisa diakses oleh `onUnmounted`.

#### Panduan Kode (Diff) - [GameplayView.vue](file:///f:/game-undercover-indonesia/src/views/GameplayView.vue):
```diff
// Di bagian watch status:
watch(
  () => gameStore.currentRoom?.status,
  (newStatus) => {
    if (newStatus === "VOTING") {
+     stopTimer();
      router.push(`/room/${gameStore.currentRoom.room_code}/vote`);
    } else if (newStatus === "FINISHED") {
+     stopTimer();
      router.push(`/room/${gameStore.currentRoom.room_code}/finish`);
    }
  },
);

// Di bagian setup scope dan lifecycle:
-onMounted(async () => {
-  if (!gameStore.currentRoom || !gameStore.myPlayer) {
-    router.push("/");
-    return;
-  }
-
-  const unsubscribe = await gameStore.subscribeToRoom();
-  ...
-  onUnmounted(() => {
-    if (unsubscribe) unsubscribe();
-    stopTimer();
-    ...
-  });
-});
+let unsubscribe = null;
+
+onMounted(async () => {
+  if (!gameStore.currentRoom || !gameStore.myPlayer) {
+    router.push("/");
+    return;
+  }
+
+  unsubscribe = await gameStore.subscribeToRoom();
+
+  if (gameStore.currentRoom?.game_mode === "online" || gameStore.offlineRevealIndex < 0) {
+    startTimer();
+  }
+});
+
+onUnmounted(() => {
+  if (unsubscribe) unsubscribe();
+  stopTimer();
+  if (gameplayAudio.value) {
+    gameplayAudio.value.pause();
+    gameplayAudio.value.currentTime = 0;
+    gameplayAudio.value = null;
+  }
+});
```

#### Panduan Kode (Diff) - [VotingView.vue](file:///f:/game-undercover-indonesia/src/views/VotingView.vue):
```diff
-onMounted(async () => {
-  if (!gameStore.currentRoom || !gameStore.myPlayer) {
-    router.push("/");
-    return;
-  }
-
-  const unsubscribe = await gameStore.subscribeToRoom();
-  onUnmounted(() => {
-    if (unsubscribe) unsubscribe();
-  });
-});
+let unsubscribe = null;
+
+onMounted(async () => {
+  if (!gameStore.currentRoom || !gameStore.myPlayer) {
+    router.push("/");
+    return;
+  }
+
+  unsubscribe = await gameStore.subscribeToRoom();
+});

onUnmounted(() => {
+  if (unsubscribe) unsubscribe();
  if (revealTimerId.value) clearTimeout(revealTimerId.value);
  if (revealAudio.value) {
    try {
      revealAudio.value.pause();
      revealAudio.value.currentTime = 0;
    } catch (e) {}
    revealAudio.value = null;
  }
});
```

#### Panduan Kode (Diff) - [LobbyView.vue](file:///f:/game-undercover-indonesia/src/views/LobbyView.vue):
```diff
-onMounted(async () => {
-  if (!gameStore.currentRoom) {
-    return;
-  }
-  ...
-  const unsubscribe = await gameStore.subscribeToRoom();
-  ...
-  onUnmounted(() => {
-    if (unsubscribe) unsubscribe();
-  });
-});
-
-// Stop lobby audio when leaving
-onUnmounted(() => {
-  try {
-    if (lobbyAudio.value) {
-      lobbyAudio.value.pause();
-      lobbyAudio.value.currentTime = 0;
-      lobbyAudio.value = null;
-    }
-  } catch (e) {}
-});
+let unsubscribe = null;
+
+onMounted(async () => {
+  if (!gameStore.currentRoom) {
+    return;
+  }
+  try {
+    sfx.stop();
+  } catch (e) {}
+
+  await gameStore.fetchPlayers();
+  unsubscribe = await gameStore.subscribeToRoom();
+
+  try {
+    lobbyAudio.value = new Audio("/sounds/lobby-play.mp3");
+    lobbyAudio.value.loop = true;
+    if (!gameStore.isMuted) {
+      lobbyAudio.value.play().catch(() => {});
+    } else {
+      lobbyAudio.value.muted = true;
+    }
+  } catch (e) {
+    console.warn("Failed to init lobby audio", e);
+  }
+});
+
+onUnmounted(() => {
+  if (unsubscribe) unsubscribe();
+  try {
+    if (lobbyAudio.value) {
+      lobbyAudio.value.pause();
+      lobbyAudio.value.currentTime = 0;
+      lobbyAudio.value = null;
+    }
+  } catch (e) {}
+});
```

---

### Bug 5: Kedipan Layar Diskusi/Voting Sebelum Popup Mr. White Guess / "Last Chance"
* **File Target:** [gameStore.js](file:///f:/game-undercover-indonesia/src/stores/gameStore.js)

#### Rationale (Analisis Masalah):
- Di `gameStore.js` action `closeReveal()`, ketika Mr. White tereliminasi, store langsung mengubah local state:
  ```javascript
  this.isEliminationRevealing = false;
  this.revealedEliminatedPlayer = null;
  ```
  Lalu memanggil query update ke Supabase secara asinkron:
  ```javascript
  await supabase.from("rooms").update({ status: "MR_WHITE_GUESS" }).eq("id", this.currentRoom.id);
  ```
- Karena `await supabase.from("rooms").update(...)` membutuhkan waktu jaringan beberapa milidetik hingga detik, local state `isEliminationRevealing` langsung bernilai `false` terlebih dahulu, yang menyebabkan overlay penutup di `VotingView.vue` langsung hilang.
- Akibatnya, Host melihat isi halaman Voting utama (yang berisi list player/voting) secara sekilas sebelum status room di DB berubah menjadi `MR_WHITE_GUESS` dan router memindahkannya ke halaman Guess.
- Hal ini juga terjadi pada kondisi kemenangan Civilian dan Undercover yang langsung menghilangkan overlay sebelum update DB selesai.

#### Langkah Perbaikan Konkret:
- Di dalam action `closeReveal()`, jalankan semua proses update Supabase (`supabase.from("rooms").update`) **terlebih dahulu** (menunggu sampai selesai), baru setelah itu ubah status overlay lokal (`isEliminationRevealing = false` dan `revealedEliminatedPlayer = null`).

#### Panduan Kode (Diff) - [gameStore.js](file:///f:/game-undercover-indonesia/src/stores/gameStore.js):
```diff
    async closeReveal() {
      if (!this.revealedEliminatedPlayer) return;

      const eliminatedPlayer = this.revealedEliminatedPlayer;
      const eliminatedPlayerId = eliminatedPlayer.id;

      // 1. Special Case: Mr. White eliminated
      if (eliminatedPlayer.role === "MR_WHITE") {
-       this.isEliminationRevealing = false;
-       this.revealedEliminatedPlayer = null;
        await supabase.from("rooms").update({ status: "MR_WHITE_GUESS" }).eq("id", this.currentRoom.id);
+       this.isEliminationRevealing = false;
+       this.revealedEliminatedPlayer = null;
        return;
      }

      // 2. Check win conditions
      const alivePlayers = this.players.filter((p) => p.is_alive);
      const civilians = alivePlayers.filter((p) => p.role === "CIVILIAN");
      const baddies = alivePlayers.filter((p) => p.role === "UNDERCOVER" || p.role === "MR_WHITE");

      if (baddies.length === 0) {
        // Civilian Win
-       this.isEliminationRevealing = false;
-       this.revealedEliminatedPlayer = null;
        await supabase
          .from("rooms")
          .update({
            status: "FINISHED",
            winner_role: "CIVILIANS",
          })
          .eq("id", this.currentRoom.id);
+       this.isEliminationRevealing = false;
+       this.revealedEliminatedPlayer = null;
      } else if (civilians.length <= baddies.length) {
        // Undercover Win
-       this.isEliminationRevealing = false;
-       this.revealedEliminatedPlayer = null;
        await supabase
          .from("rooms")
          .update({
            status: "FINISHED",
            winner_role: "BADDIES",
          })
          .eq("id", this.currentRoom.id);
+       this.isEliminationRevealing = false;
+       this.revealedEliminatedPlayer = null;
      } else {
        // Continue playing: Shuffle turns for next round
        await this.shuffleTurns();
-       this.isEliminationRevealing = false;
-       this.revealedEliminatedPlayer = null;
        await supabase
          .from("rooms")
          .update({
            status: "PLAYING",
            current_round: this.currentRoom.current_round + 1,
          })
          .eq("id", this.currentRoom.id);
+       this.isEliminationRevealing = false;
+       this.revealedEliminatedPlayer = null;
      }
    },
```
