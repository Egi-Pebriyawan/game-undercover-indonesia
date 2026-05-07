# 🎯 Improvement Plan — Undercover Indonesia

> Dokumen ini ditulis agar mudah dipahami oleh junior programmer atau AI agent.
> Setiap task punya konteks "kenapa" dan "bagaimana" yang jelas.

---

## 📋 Daftar Isi

1. [Bug & Masalah Kritis](#1--bug--masalah-kritis)
2. [SEO — Agar Masuk Google](#2--seo--agar-masuk-google)
3. [Performa & Keamanan](#3--performa--keamanan)
4. [UX & Fitur Baru](#4--ux--fitur-baru)
5. [Strategi Donasi Saweria](#5--strategi-donasi-saweria)
6. [Checklist Prioritas](#6--checklist-prioritas)

---

## 1. 🐛 Bug & Masalah Kritis

### 1.1 Supabase Key Terekspos di Source Code

> [!CAUTION]
> File `src/services/supabase.js` menyimpan URL dan Anon Key langsung di kode.

**Cara perbaiki:**

1. Buat file `.env` di root project:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxx
```

2. Update `src/services/supabase.js`:
```javascript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

3. Tambahkan `.env` ke `.gitignore`.

### 1.2 Aktifkan RLS (Row Level Security) di Supabase

Tanpa RLS, siapapun bisa menghapus semua data. Buka Supabase Dashboard → Enable RLS di setiap tabel.

### 1.3 Buat Auto-Cleanup Room Lama

Room yang selesai tidak pernah dihapus. Buat cron job:
```sql
DELETE FROM rooms WHERE created_at < NOW() - INTERVAL '24 hours';
```

---

## 2. 🔍 SEO — Agar Masuk Google

### 2.1 Perbaiki `index.html`

Ganti isi `<head>` dengan meta tags yang lengkap:

```html
<title>Undercover Indonesia — Game Peran Rahasia untuk Keluarga & Teman</title>
<meta name="description" content="Main game Undercover gratis bareng keluarga! Temukan mata-mata di antara kalian. Online atau offline di satu HP." />
<meta name="keywords" content="undercover game, game keluarga, party game indonesia, game peran rahasia" />

<!-- Open Graph (untuk preview WhatsApp/Instagram) -->
<meta property="og:type" content="website" />
<meta property="og:title" content="Undercover Indonesia — Game Peran Rahasia" />
<meta property="og:description" content="Main game Undercover gratis bareng keluarga dan teman!" />
<meta property="og:image" content="/og-image.png" />

<!-- Google Fonts -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
```

### 2.2 Buat `public/robots.txt`

```
User-agent: *
Allow: /
Sitemap: https://YOUR-DOMAIN.vercel.app/sitemap.xml
```

### 2.3 Buat `public/sitemap.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://YOUR-DOMAIN.vercel.app/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

### 2.4 Buat OG Image (`public/og-image.png`)

Buat gambar 1200x630px berisi judul "UNDERCOVER" + tagline. Gunakan Canva atau AI image generator.

### 2.5 Daftar Google Search Console

1. Buka https://search.google.com/search-console
2. Tambahkan URL website
3. Verifikasi kepemilikan
4. Submit sitemap.xml
5. Minta indexing halaman utama

### 2.6 Tambahkan Structured Data (JSON-LD)

Di `index.html` sebelum `</head>`:
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Undercover Indonesia",
  "description": "Game peran rahasia online gratis untuk keluarga",
  "applicationCategory": "Game",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "IDR" }
}
</script>
```

---

## 3. ⚡ Performa & Keamanan

### 3.1 Lazy Load Routes

Saat ini SEMUA halaman diload sekaligus. Ubah `src/router/index.js`:

```javascript
// SEBELUM (eager load - lambat)
import HomeView from '../views/HomeView.vue'

// SESUDAH (lazy load - cepat)
component: () => import('../views/HomeView.vue')
```

### 3.2 Validasi Input Nickname

Tambahkan pengecekan panjang (min 2, max 15 karakter) dan trim whitespace.

### 3.3 Error Handling

Bungkus setiap Supabase call dengan `try/catch`. Tampilkan pesan error yang jelas ke user.

---

## 4. 🎮 UX & Fitur Baru

### 4.1 Sound Effects (SFX)
Tambahkan suara saat: game mulai, voting, eliminasi, game selesai. Party game tanpa suara terasa "mati".

### 4.2 Share Room via WhatsApp
Tambahkan tombol di Lobby:
```javascript
const shareViaWA = () => {
  const url = `https://wa.me/?text=Ayo main Undercover! 🕵️ Kode: ${roomCode}`
  window.open(url, '_blank')
}
```

### 4.3 Timer Diskusi
Timer 60-90 detik per ronde agar diskusi tidak berkepanjangan.

### 4.4 PWA (Progressive Web App)
Agar user bisa "install" game di home screen HP. Gunakan plugin `vite-plugin-pwa`.

### 4.5 Custom Word Packs
Biarkan user memilih tema kata (makanan, kota, film, dll).

---

## 5. 💰 Strategi Donasi Saweria

### 5.1 Status Saat Ini

**✅ Sudah bagus:**
- Tombol floating di pojok kanan bawah
- Link di FinishedView setelah game selesai
- Membuka di tab baru (tidak ganggu sesi game)

**❌ Perlu diperbaiki:**
- Di mobile, tombol floating menutupi menu → solusi: ikon saja tanpa teks
- Narasi donasi kurang emosional

### 5.2 Tips Mendapatkan Donasi Lebih Banyak

> [!IMPORTANT]
> Kunci: buat orang INGIN membantu, bukan merasa DIPAKSA.

**A. Narasi Emosional di FinishedView:**

ID: *"Game ini dibuat oleh seorang mahasiswa yang percaya bahwa keceriaan keluarga tidak harus mahal. Jika momen tadi membuat kalian tertawa, bantu kami tetap gratis selamanya. ☕"*

EN: *"This game was made by a student who believes family joy shouldn't cost a thing. If this moment made you laugh, help us stay free forever. ☕"*

**B. Milestone Celebrations:**
- 100 games → "100 keluarga sudah tertawa bersama!"
- 1000 games → "1000 cerita seru! Bantu kami capai 10.000 ☕"

**C. Transparansi:**
Tambahkan tooltip: "Dana donasi untuk: Server, kata baru, fitur baru."

### 5.3 Platform Alternatif

| Platform | Kelebihan | Kekurangan |
|----------|-----------|------------|
| **Saweria** | Populer di ID, 0% fee | Hanya Indonesia |
| **Ko-fi** | International, 0% fee | Kurang dikenal di ID |
| **QRIS** | 0% fee, langsung masuk | Tidak ada tracking |

**Rekomendasi:** Tetap Saweria. Tambah Ko-fi jika ingin audience global.

---

## 6. ✅ Checklist Prioritas

### 🔴 Harus Segera (Minggu Ini)

| # | Task | Effort |
|---|------|--------|
| 1 | Pindahkan Supabase key ke `.env` | 10 menit |
| 2 | Perbaiki `index.html` (SEO meta tags + OG tags) | 15 menit |
| 3 | Buat `robots.txt` dan `sitemap.xml` | 5 menit |
| 4 | Buat OG image 1200x630px | 30 menit |
| 5 | Daftar Google Search Console | 15 menit |

### 🟡 Penting (Minggu Depan)

| # | Task | Effort |
|---|------|--------|
| 6 | Aktifkan RLS di Supabase | 1 jam |
| 7 | Lazy load routes | 15 menit |
| 8 | Validasi input nickname | 15 menit |
| 9 | Tombol Share via WhatsApp | 30 menit |
| 10 | Perbaiki narasi donasi | 30 menit |

### 🟢 Nice to Have (Bulan Depan)

| # | Task | Effort |
|---|------|--------|
| 11 | Sound Effects | 2-3 jam |
| 12 | Timer diskusi | 2 jam |
| 13 | PWA support | 1 jam |
| 14 | Custom word packs | 3-4 jam |
| 15 | Auto-cleanup room lama | 1 jam |

---

> [!NOTE]
> **Untuk AI Agent / Junior Dev:** Kerjakan sesuai urutan prioritas.
> Commit terpisah per task: `fix: move supabase keys to env` atau `feat: add SEO meta tags`.
> Test setelah setiap perubahan!

*Dibuat 6 Mei 2026 — Analisis kode aktual project Undercover Indonesia.*
