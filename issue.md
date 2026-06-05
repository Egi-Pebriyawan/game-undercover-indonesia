# Daftar Issue (Task)

Berikut adalah rincian *issues* (tiket perbaikan) yang telah disusun agar mudah dipahami oleh *Junior Programmer* maupun *AI Agent*.

---

## Issue #1: Set Bahasa Default Aplikasi ke Bahasa Inggris
**Deskripsi:**
Saat ini aplikasi belum menggunakan bahasa Inggris sebagai bahasa bawaan. Kita perlu memastikan pengguna baru yang pertama kali menginstal atau membuka game akan langsung mendapatkan antarmuka berbahasa Inggris.

**Tugas (Tasks):**
- Cari file konfigurasi atau *state management* yang mengatur bahasa aplikasi (`locale` / `i18n` / `language`).
- Ubah nilai default (bawaan) *variable* bahasa dari sebelumnya (misal: Indonesia) menjadi "English" (`en` atau `en-US`).
- Pastikan perubahan ini berlaku untuk instalasi baru tanpa mengubah preferensi pengguna lama yang sudah mengatur bahasanya sendiri.

**Kriteria Penerimaan (Acceptance Criteria):**
- Saat aplikasi diinstal ulang atau data aplikasi dihapus (*clear data*), bahasa pertama yang muncul adalah bahasa Inggris.

---

## Issue #2: Perbaiki Ukuran Font Kode Invitasi di Lobi (Overlap)
**Deskripsi:**
Pada halaman Lobi (*Lobby*), teks untuk "Kode Invitasi" ukurannya terlalu besar sehingga keluar dari batas wadah (container/box) atau menumpuk (*overlap*) dengan elemen UI lainnya.

**Tugas (Tasks):**
- Buka file UI/Layout untuk halaman Lobi.
- Cari elemen teks yang menampilkan "Kode Invitasi" (Invitation Code).
- Kurangi ukuran font (misal: dari `24sp/px` menjadi `18sp/px`) atau gunakan penyesuaian teks otomatis (*auto-size text / text scaling*).
- Tambahkan *padding* atau sesuaikan ukuran *container* agar teks tidak terpotong atau keluar batas.

**Kriteria Penerimaan (Acceptance Criteria):**
- Teks kode invitasi terlihat rapi, tidak keluar dari wadahnya, dan tidak menumpuk dengan tombol atau teks lain pada layar dengan berbagai ukuran resolusi HP.

---

## Issue #3: Set Mode Game Default ke "Offline (Satu HP)"
**Deskripsi:**
Saat ini pengaturan awal (*default*) mode game belum diatur ke mode "Offline (Satu HP) / Pass and Play". Kita ingin agar pemain baru langsung diarahkan ke mode ini saat pertama kali membuat atau memulai permainan.

**Tugas (Tasks):**
- Cari *state* atau variabel yang mengatur pemilihan mode permainan saat membuat *room* atau menekan tombol "Mulai Bermain".
- Atur nilai default variabel tersebut ke opsi "Offline Satu HP" (`offline_single_device` atau sejenisnya).
- Pastikan UI (tombol/radio button) untuk mode "Offline Satu HP" langsung dalam kondisi aktif (*selected/checked*) secara default.

**Kriteria Penerimaan (Acceptance Criteria):**
- Saat pengguna masuk ke halaman pengaturan game, mode "Offline Satu HP" sudah otomatis terpilih tanpa harus ditekan manual.

---

## Issue #4: Ubah Default Role Undercover menjadi 0 & Tambahkan Peringatan Syarat Pemain
**Deskripsi:**
Pada pengaturan peran (*role setting*), jumlah awal karakter "Undercover" harus diatur ke angka 0. Selain itu, fitur/tombol untuk menambah peran Undercover harus terkunci atau tidak bisa digunakan sampai jumlah total pemain mencapai minimal 5 orang. Harus ada teks penjelasan mengenai syarat ini.

**Tugas (Tasks):**
- Ubah inisialisasi awal jumlah peran Undercover menjadi 0.
- Tambahkan logika (*logic validation*) pengecekan jumlah total pemain.
- Jika total pemain < 5:
  - Nonaktifkan tombol tambah (+) untuk peran Undercover (*disable button*).
  - Tampilkan teks peringatan di bawah pengaturan Undercover: "Butuh minimal 5 orang untuk membuka role ini" (atau terjemahannya dalam bahasa Inggris "Requires a minimum of 5 players to unlock this role").
- Jika total pemain >= 5:
  - Aktifkan kembali tombol tambah (+) dan sembunyikan teks peringatan.

**Kriteria Penerimaan (Acceptance Criteria):**
- Jumlah Undercover selalu mulai dari 0.
- Teks peringatan "Butuh minimal 5 orang..." muncul jika pemain kurang dari 5, dan tombol penambahan Undercover tidak bisa ditekan.

---

## Issue #5: Set Metode Voting Default ke "Real Life (Diskusi Langsung)"
**Deskripsi:**
Pengaturan bawaan untuk metode pemungutan suara (*voting method*) harus diatur ke opsi "Real Life" atau diskusi langsung, bukan voting melalui aplikasi (*in-app voting*).

**Tugas (Tasks):**
- Cari pengaturan metode voting di *state management* atau *database lokal* pengguna.
- Ubah nilai bawaannya menjadi "Real Life" (`voting_method: 'real_life'`).
- Pastikan pada UI pengaturan, opsi "Real Life" langsung terpilih (*selected/checked*) saat layar pertama kali dibuka.

**Kriteria Penerimaan (Acceptance Criteria):**
- Saat game dimulai, aplikasi mengasumsikan pemain berdiskusi di dunia nyata tanpa menampilkan layar voting aplikasi, kecuali pemain mengubah pengaturannya secara manual.

---

## Issue #6: Perbaiki Layout Halaman Final Reveal (Overlap pada Teks Role)
**Deskripsi:**
Pada halaman "Final Reveal" (pengungkapan peran di akhir permainan), tata letaknya (*layout*) berantakan karena teks nama peran (*role*) menumpuk (*overlap*) satu sama lain atau keluar batas layar.

**Tugas (Tasks):**
- Buka file UI/Layout untuk halaman Final Reveal.
- Gunakan *Layout Manager* yang responsif (seperti `Flexbox`, `ConstraintLayout`, `Wrap`, atau `Grid`).
- Atur properti margin, padding, dan jarak (*spacing*) antar elemen peran.
- Pastikan teks yang terlalu panjang diatur agar dibungkus ke baris baru (`wrap text`) atau diberi elipsis (`...`) jika memang ruang sangat terbatas, bukan membiarkannya menumpuk.

**Kriteria Penerimaan (Acceptance Criteria):**
- Semua peran terlihat dengan jelas, rapi, dan tidak ada teks yang saling bertumpuk di akhir permainan, terlepas dari berapa banyak jumlah pemainnya.

---

## Issue #7: Buat Pop-up Donasi/Dukungan Muncul Setelah 5 Detik di Final Reveal
**Deskripsi:**
Saat ini teks "Kalian luar biasa terimakasih dukunganya" beserta link donasi lokal dan internasional (Saweria, Ko-fi, dll.) mungkin berada di tempat yang salah. Ini harus diubah menjadi sistem *Pop-up (Dialog/Modal)* yang muncul secara otomatis dengan jeda (*delay*) 5 detik setelah pemain masuk ke layar Final Reveal.

**Tugas (Tasks):**
- Buat komponen *Pop-up/Modal* baru yang berisi teks "Kalian luar biasa, terima kasih dukungannya!" dan tombol/link dukungan (Lokal & Internasional).
- Tambahkan tombol "Close" (X) atau tutup di dalam pop-up tersebut agar pengguna bisa menutupnya.
- Pada halaman Final Reveal, tambahkan fungsi *Timer/Delay* (misalnya `setTimeout` selama 5000ms).
- Panggil (*trigger*) pop-up tersebut untuk muncul (*visible*) setelah timer 5 detik selesai.

**Kriteria Penerimaan (Acceptance Criteria):**
- Pop-up dukungan muncul secara otomatis tepat 5 detik setelah halaman Final Reveal terbuka.
- Pop-up memiliki tombol "Close" yang berfungsi menutup dialog tersebut saat ditekan.
- Link donasi bisa diklik dan mengarahkan pengguna ke halaman web yang benar.
- *Layout* halaman Final Reveal menjadi lebih bersih karena teks donasi sudah dipindahkan ke dalam pop-up.
