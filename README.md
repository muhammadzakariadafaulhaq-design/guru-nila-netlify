# Hilyah's Home Schooling — Guru Nila (Netlify starter)

Starter project untuk mulai mengubah rancangan Guru Nila menjadi PWA yang kompatibel dengan Netlify Free.

## Apa yang sudah aktif di starter ini

- Frontend statis dan PWA installable.
- Netlify Functions untuk login, logout, pemeriksaan sesi, dan proxy Gemini.
- API key Gemini dibaca hanya dari environment variable server-side.
- Login satu pengguna dengan password dan cookie `HttpOnly`.
- Chat teks Arab dengan instruksi guru yang mengoreksi bahasa secara lembut.
- Web Speech API untuk input ucapan Arab (bila browser mendukung) dan pembacaan jawaban.
- Catatan tugas, tracker 16 juz, timer fokus, dan catatan murajaah disimpan lokal di IndexedDB.
- Service worker menyimpan shell aplikasi saja; request `/api/*` tidak pernah dimasukkan cache.

## Batas versi awal yang harus dipahami

1. Ini adalah **starter Netlify**, bukan keseluruhan produk akhir. Modul chat, tugas, timer, dan tracker dasar sudah ada; bank 60+ soal adaptif, kelas mendalam nahwu/sharaf/qira'ah, laporan akademik, sinkronisasi cloud, backup terenkripsi, panggilan AI realtime, dan integrasi telepon belum dibangun.
2. Memori akademik tahap awal berada di IndexedDB pada browser/perangkat ini. Data tidak otomatis pindah ke HP atau browser lain. Ekspor/impor backup perlu dibuat pada iterasi berikutnya.
3. Web Speech API bukan panggilan telepon AI penuh. Mode awal berupa ucapan → teks → Gemini → teks → suara. `SpeechRecognition` tidak tersedia di semua browser; browser tertentu dapat mengirim audio ke layanan pengenal suara mereka sendiri. Jika tidak tersedia, ketik pesan.
4. Free tier Gemini memiliki batas dan ketentuan data. Google menyatakan konten dari free tier dapat digunakan untuk meningkatkan produk. Jangan masukkan jurnal pribadi, rahasia, data kesehatan, alamat, nomor telepon, atau informasi keluarga. Starter ini mengirim hanya konteks akademik minimal yang dipilih aplikasi, serta pesan dan beberapa giliran chat terbaru yang diperlukan untuk merespons.
5. Login kata sandi menahan akses kasual tetapi bukan sistem identitas perusahaan. Lindungi tautan, gunakan password acak yang kuat, dan jangan bagikan password. Tambahkan Netlify Traffic Rules/rate limits jika tersedia di dashboard.
6. Netlify Free saat ini memberi 300 kredit per bulan dengan hard limit. Saat kuota terpakai, project dapat dijeda sampai siklus berikutnya. Google Gemini Free mempunyai kuota/rate limit yang dapat berubah. Rp0 tidak dijamin selamanya.

## Struktur folder

```text
guru-nila-netlify/
├── netlify.toml
├── package.json
├── .nvmrc
├── .env.example
├── public/
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── storage.js
│   ├── voice.js
│   ├── sw.js
│   ├── manifest.webmanifest
│   └── assets/
└── netlify/
    └── functions/
        ├── _auth.mjs
        ├── login.mjs
        ├── logout.mjs
        ├── me.mjs
        └── guru-chat.mjs
```

## Environment variables

Buat variables berikut melalui Netlify dashboard → Site configuration → Environment variables (jangan menuliskan secret di `netlify.toml` atau di file frontend):

| Key | Wajib | Fungsi |
|---|---:|---|
| `GEMINI_API_KEY` | Ya | API key Gemini dari Google AI Studio |
| `GEMINI_MODEL` | Tidak | Default `gemini-3.8-flash`; bisa diganti model yang aktif di akun/project |
| `GURU_LOGIN_PASSWORD` | Ya | Password privat aplikasi; buat unik dan panjang |
| `SESSION_SECRET` | Ya | Secret acak minimal 32 karakter untuk tanda tangan sesi |
| `MAX_INPUT_CHARS` | Tidak | Batas panjang pesan; default 3500 |
| `MAX_OUTPUT_TOKENS` | Tidak | Batas jawaban AI; default 450 |

Untuk `SESSION_SECRET`, buat nilai acak panjang, misalnya dengan perintah Node berikut di komputer abangmu:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Jangan gunakan contoh `.env.example` sebagai nilai sungguhan. `.env` hanya untuk pengembangan lokal dan sudah masuk `.gitignore`. Netlify membaca variable runtime dari pengaturan dashboard/CLI; variable rahasia jangan ditulis di `netlify.toml`.

## Deploy ke Netlify

1. Ekstrak ZIP ini di komputer.
2. Buat repository Git pribadi (private) dan unggah isi folder ini, atau gunakan Netlify CLI.
3. Di Netlify pilih **Add new project → Import an existing project**, lalu hubungkan repository.
4. Build settings: **Publish directory** `public`; **Functions directory** `netlify/functions`. File `netlify.toml` sudah mengatur keduanya.
5. Di **Site configuration → Environment variables**, tambahkan variable wajib di atas. Pastikan API key dan password tidak diawali prefix publik seperti `VITE_` atau `PUBLIC_`.
6. Deploy ulang setelah menambahkan/mengubah variables.
7. Buka URL `*.netlify.app`, masuk dengan password yang telah dibuat, lalu uji chat.
8. Tambahkan Traffic Rules/rate limiting di dashboard jika tersedia pada akunmu; jangan mengandalkan origin check sebagai satu-satunya proteksi API.

### Pengembangan lokal (opsional, dibantu abangmu)

```bash
npm install
cp .env.example .env
# Isi nilai sungguhan pada .env lokal, jangan commit file ini.
npm run dev
```

Netlify CLI membaca environment lokal saat menjalankan `netlify dev`. Jangan pernah mengirim `.env` ke chat atau repository.

## Privasi dan penyimpanan

- Password aplikasi dan API key hanya berada di environment variable fungsi.
- Cookie sesi `HttpOnly`, `SameSite=Strict`, dan `Secure` pada HTTPS.
- Riwayat chat, tugas, tracker juz, dan catatan murajaah tahap awal tersimpan di IndexedDB browser.
- Menghapus data situs/browser dapat menghapus memori lokal; buat backup manual sebelum membersihkan data browser. Fitur ekspor/impor belum tersedia pada starter ini.
- API request tidak disimpan oleh service worker cache.
- Pesan chat yang dikirim ke Gemini tetap diproses oleh penyedia AI. Penyimpanan lokal tidak berarti pesan yang dikirim ke model tetap berada hanya di HP.

## Rencana iterasi selanjutnya

1. Uji kompatibilitas hosting Netlify, login, API key, dan model Gemini.
2. Tambahkan ekspor/impor memori dan pengaturan privasi.
3. Bangun kurikulum adaptif 60+ latihan: listening, speaking, nahwu, sharaf, qira'ah, mufradat, dan evaluasi.
4. Lengkapi dashboard rencana belajar dan jadwal harian 24 Nov 2026–4 Jan 2027.
5. Uji suara Arab pada HP/browser sasaran. Baru setelah itu pertimbangkan Realtime API atau telepon Twilio.

## Validasi kode

```bash
npm run check
```

### Penting: mode gratis dan keamanan

- Netlify Free mempunyai batas 300 kredit/bulan. Kredit dipakai oleh deployment produksi, komputasi Functions, bandwidth, dan permintaan. Free memiliki hard cap; saat habis, aplikasi dapat terhenti sementara sampai kuota bulan berikutnya.
- Gemini API Free tidak menjamin kapasitas tanpa batas. Model dan rate limit dapat berubah; jika muncul 429, tunggu kuota pulih atau kurangi penggunaan.
- Untuk keamanan login, gunakan password panjang yang tidak dipakai pada akun lain. Atur traffic/rate limit untuk endpoint `/api/login` dan `/api/guru-chat` di Netlify dashboard bila opsi tersedia. Jangan anggap satu URL rahasia sebagai keamanan.
- Mode gratis Gemini punya kebijakan data berbeda dari tier berbayar. Periksa ulang halaman kebijakan dan pricing sebelum mengirim data pribadi. Starter hanya mengirim konteks akademik terbatas, bukan jurnal pribadi.
