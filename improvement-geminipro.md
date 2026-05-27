# Panduan Peningkatan Fitur Undercover Indonesia (Untuk Junior Programmer)

Dokumen ini berisi panduan teknis langkah demi langkah untuk mengimplementasikan fitur-fitur baru dan perbaikan bug pada game Undercover Indonesia sesuai dengan spesifikasi terbaru.

## 1. Fitur Pengaturan Suara & Audio Lobby (`LobbyView.vue`)
**Tujuan:** Menambahkan pengaturan mematikan suara (mute) di lobby dan memutar lagu `lobby-play.mp3`.

**Langkah-langkah:**
1. **Tambahkan State Mute di Store:**
   - Buka `src/stores/gameStore.ts` (atau store pinia yang mengatur konfigurasi game).
   - Tambahkan state `isMuted` (tipe boolean, nilai default: `false`).
   - Buat action `toggleMute()` untuk membalikkan nilai `isMuted`.
2. **UI Tombol Mute di Lobby:**
   - Buka `src/views/LobbyView.vue` (atau layout utama jika tombol mute mau tampil di semua halaman).
   - Tambahkan icon atau tombol (misal: icon 🔊 / 🔇) yang saat diklik akan memanggil `toggleMute()`.
3. **Logika Audio `lobby-play.mp3`:**
   - Masukkan file `lobby-play.mp3` ke folder `src/assets/sounds/`.
   - Di `LobbyView.vue`, inisialisasi audio menggunakan HTML5 Audio API atau library (jika ada).
   - Gunakan `onMounted` untuk mulai memutar audio (`audio.play()`) dengan pengaturan `loop = true`.
   - Gunakan `watch` untuk memantau state `isMuted`. Jika `isMuted === true`, matikan suara (`audio.muted = true` atau `audio.pause()`).
   - Jangan lupa matikan audio di hook `onUnmounted` agar suara tidak terbawa ke halaman game.

## 2. Audio Menang dan Kalah (`FinishView.vue`)
**Tujuan:** Memutar suara spesifik berdasarkan hasil akhir, yaitu jika Civilian (warga) menang atau kalah.

**Langkah-langkah:**
1. **Identifikasi Pemenang:**
   - Buka `src/views/FinishView.vue`.
   - Cek dari props atau state store apakah pemenangnya adalah faksi `Civilian` atau yang lain (Undercover/Mr. White).
2. **Putar Audio Sesuai Hasil:**
   - Siapkan file `victory.mp3` dan `defeat-faahhh.mp3` di folder assets/sounds.
   - Saat komponen dipasang (`onMounted`), cek state `isMuted`. Jika `true`, jangan lakukan apa-apa.
   - Jika `false`, gunakan logika kondisional:
     ```javascript
     if (winnerFaction === 'Civilian') {
       new Audio(victorySound).play();
     } else {
       new Audio(defeatSound).play();
     }
     ```

## 3. Audio Saat Reveal Peran Setelah Voting (`VotingView.vue` / `RevealView.vue`)
**Tujuan:** Memutar `reveal-after-vote.mp3` selama 5 detik saat peran seorang pemain yang tereliminasi di-reveal.

**Langkah-langkah:**
1. **Identifikasi Tampilan Reveal:**
   - Cari komponen modal atau halaman yang muncul setelah proses voting selesai dan menampilkan kartu pemain yang tereliminasi.
2. **Logika Putar 5 Detik:**
   - Saat modal reveal muncul, cek `isMuted`. Jika `false`, mainkan audio.
   - Buat fungsi setTimeout selama 5000ms untuk memberhentikan audionya jika halaman belum tertutup.
     ```javascript
     const audio = new Audio(revealSound);
     audio.play();
     setTimeout(() => {
       audio.pause();
       audio.currentTime = 0; // reset
     }, 5000);
     ```

## 4. Perbaikan Bug Timer Diskusi & Opsi Kustom (`LobbyView.vue` & `DiscussionView.vue`)
**Tujuan:** Memperbaiki timer yang "stuck" di 60 detik, menambah opsi durasi di lobby, dan memutar suara `timer-funny.mp3`.

**Langkah-langkah:**
1. **Tambahkan Opsi di Form Lobby:**
   - Di `LobbyView.vue`, tambahkan input pengaturan "Waktu Diskusi" dengan opsi:
     - Default (Tanpa Timer -> simpan nilai `0` atau `null`)
     - 30 Detik
     - 1 Menit (60 detik)
     - 3 Menit (180 detik)
     - Custom (munculkan input angka tambahan)
   - Simpan nilai ini ke dalam state (misalnya `discussionDuration`).
2. **Perbaikan Logika Timer:**
   - Buka `src/views/DiscussionView.vue`.
   - Ambil nilai `discussionDuration`. Jika nilainya `0`, sembunyikan UI timer sama sekali (jangan panggil `setInterval`).
   - Jika > 0, set variabel reaktif `timeLeft` sesuai nilai tersebut.
   - Pastikan fungsi `setInterval` berjalan setiap 1 detik untuk mengurangi `timeLeft`. Simpan ID intervalnya ke variabel, dan pastikan memanggil `clearInterval` saat `onUnmounted` agar terhindar dari bug memory leak atau timer ganda.
3. **Logika Suara `timer-funny.mp3`:**
   - Putar audio `timer-funny.mp3` selama *60 detik terakhir* timer diskusi (atau dari awal jika total waktu < 60 detik).
   - Di dalam fungsi interval, tambahkan kondisi: jika `timeLeft <= 60` dan audio belum terputar, panggil `audio.play()`.
   - Saat `timeLeft === 0` atau komponen di-unmount, panggil `audio.pause()`.

## 5. Cegah Voting Diri Sendiri di Mode Anonim (`VotingView.vue`)
**Tujuan:** Saat mode voting anonim aktif, orang yang memvoting tidak bisa mengklik/memilih dirinya sendiri.

**Langkah-langkah:**
1. **Logika Filter Pilihan Voting:**
   - Buka `VotingView.vue`.
   - Saat ini mungkin ada loop `v-for="player in players"` untuk merender tombol pilihan pemain.
   - Identifikasi siapa pemain yang sedang memegang device (`currentPlayer`).
   - Buat *computed property* `votablePlayers` yang isinya melakukan filter terhadap list player.
     ```javascript
     const votablePlayers = computed(() => {
       // Filter agar nama currentPlayer tidak muncul dalam opsi
       return players.value.filter(p => p.id !== currentPlayer.value.id);
     });
     ```
   - Gunakan `votablePlayers` ini di loop `v-for` untuk merender pilihan.

## 6. Sembunyikan Peran Jika "Pengkhianat Saling Kenal" = Tidak
**Tujuan:** Merahasiakan Civilian dan Undercover saat card reveal awal jika opsi ini dipilih, agar mereka tidak tahu peran pastinya. Mr. White tetap tahu perannya.

**Langkah-langkah:**
1. **Cek Opsi Setting:**
   - Pastikan form di Lobby menyimpan status "Pengkhianat Saling Kenal?" (misal: variabel `traitorsKnowEachOther` = true/false).
2. **Ubah Tampilan Role Card:**
   - Buka komponen yang menangani oper-operan device dan menampilkan peran di awal game (mungkin bernama `RoleRevealView.vue` atau `PassDeviceView.vue`).
   - Sesuaikan bagian teks yang mencetak nama Role dengan computed property berikut:
     ```javascript
     const displayRoleText = computed(() => {
       // Mr. White selalu tampil normal
       if (currentPlayerRole.value === 'Mr. White') {
         return 'Mr. White';
       }
       
       // Jika opsi tidak saling kenal dipilih, gabungkan penamaan Civilian & Undercover
       if (!traitorsKnowEachOther.value) {
         return 'Role disembunyikan. Anda bisa saja Civilian / Undercover.';
       }
       
       // Default tampilkan role aslinya
       return currentPlayerRole.value;
     });
     ```
   - Pastikan styling teks ini cukup jelas agar pemain tahu peraturannya.
