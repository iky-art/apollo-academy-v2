# Apollo Academy — Setup

## 1. Siapkan database Supabase
1. Buka project Supabase kamu → **SQL Editor**.
2. Jalankan seluruh isi `supabase-schema.sql`. Ini membuat tabel `profiles`, `chapters`, `reading_progress`, `bookmarks`, plus RLS policy-nya.
3. Di **Authentication → Providers**, pastikan **Email** provider aktif.
   - Kalau mau user langsung bisa login setelah daftar (tanpa cek email dulu), matikan "Confirm email" di **Authentication → Settings**.

## 2. Buat 3 akun admin
Karena admin login pakai email+password (bukan OAuth), buat manual akunnya:
1. Di halaman `register.html`, daftarkan `kimlana269@gmail.com`, `kumenomikuroo@gmail.com`, dan `gtau22609@gmail.com` seperti user biasa (atau lewat Supabase Dashboard → Authentication → Users → Add user).
2. Setelah login pertama kali (lewat `login.html` biasa saja), sistem otomatis menandai `role = 'admin'` di tabel `profiles` karena emailnya cocok dengan allowlist di `js/supabase-client.js`.
3. Selanjutnya mereka bisa masuk lewat `login-admin.html` → diarahkan ke `admin.html`.

## 3. Deploy ke Vercel (URL bersih tanpa `.html`)
File `vercel.json` sudah disertakan dengan `"cleanUrls": true`, jadi begitu di-deploy ke Vercel, semua link otomatis jadi rapi:
- `apollo-academy.vercel.app/` → dashboard (`index.html`)
- `apollo-academy.vercel.app/login` → `login.html`
- `apollo-academy.vercel.app/register` → `register.html`
- `apollo-academy.vercel.app/login-admin` → `login-admin.html`
- `apollo-academy.vercel.app/admin` → `admin.html`

Cara deploy:
1. Upload seluruh folder ini (termasuk `vercel.json`, `css/`, `js/`) ke repo GitHub, lalu import di [vercel.com](https://vercel.com/new) — **jangan ubah Root Directory**, biarkan default (folder ini sendiri adalah root project).
2. Atau lewat CLI: `vercel --prod` dari dalam folder ini.
3. Semua link internal di HTML (navbar, tombol, redirect setelah login) sudah pakai path bersih (`/login`, `/admin`, dst), jadi tidak perlu diubah lagi.

Untuk buka lokal tanpa deploy (tanpa clean URL), tetap bisa langsung buka `index.html` di browser — hanya saja saat itu link ke halaman lain perlu diketik manual dengan `.html` di address bar kalau server lokalmu tidak meniru perilaku `cleanUrls` Vercel.

## Struktur file
```
index.html          → dashboard belajar (redirect ke /login kalau belum login)
login.html           → login user biasa
register.html         → daftar akun baru
login-admin.html      → login khusus admin (dicek lewat allowlist email)
admin.html            → panel admin: statistik, daftar user, kelola chapter
css/style.css          → design system (manga neubrutalism)
js/supabase-client.js  → salinan referensi (tidak lagi di-load dari sini — lihat catatan di bawah)
vercel.json             → konfigurasi clean URL untuk Vercel
supabase-schema.sql      → schema database + RLS policy, jalankan sekali di Supabase
```

> **Catatan teknis:** kode koneksi Supabase (yang tadinya di `js/supabase-client.js`) sekarang **ditempel langsung** di dalam `<script>` tiap halaman HTML, bukan dimuat lewat `<script src="js/supabase-client.js">`. Ini sengaja dilakukan supaya tiap halaman tidak bergantung pada folder `js/` ikut ter-upload/ter-deploy dengan benar — beberapa hosting/cara buka file sebelumnya menyebabkan file itu gagal dimuat (404), yang bikin error `client is not defined`. File `js/supabase-client.js` masih disertakan sebagai referensi/cadangan, tapi tidak lagi dipakai langsung oleh HTML.

## Yang belum dibuat (lanjutan)
- `chapter.html` — halaman baca konten chapter satu-per-satu (linknya sudah disiapkan di dashboard, tinggal dibuatkan halamannya).
- Sistem penambahan XP/streak otomatis saat user menyelesaikan chapter.

## Catatan keamanan
`anon key` Supabase memang didesain untuk dipakai di sisi browser (public), jadi aman ditaruh di `js/supabase-client.js`. Yang menjaga keamanan data sebenarnya adalah RLS policy di `supabase-schema.sql` — pastikan itu sudah dijalankan sebelum situs dipakai publik.
