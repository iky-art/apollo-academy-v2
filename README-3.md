# 📖 Apollo Academy — Koding Manga

Versi **HTML/CSS/JS murni** (tanpa React, tanpa build step) — jauh lebih simpel di-deploy karena Vercel/Netlify langsung serve file apa adanya, tidak ada proses build yang bisa gagal.

**Power By Team Apollo AI Studio**

## Struktur

```
apollo-academy/
├── index.html              ← Aplikasi utama (Beranda, Daftar Bab, Detail Bab, Profil, Login)
├── style.css                ← Semua styling (tema gamified krem/ungu)
├── script.js                 ← Semua logika (Supabase auth, router, render tiap halaman)
├── admin.html                ← Halaman terpisah khusus admin
├── supabase-schema.sql       ← Jalankan pertama di Supabase SQL Editor
└── supabase-seed/             ← Jalankan satu-satu (20 file, isi bab)
    ├── seed-ch01.sql
    ├── ...
    └── seed-ch20.sql
```

## Kenapa lebih simpel dari versi React?

- **Tidak ada `npm install`, tidak ada build** — file HTML/CSS/JS langsung jalan di browser
- **Tidak ada "Root Directory" yang bisa salah setting** di Vercel — semua file di root repo
- **Tidak ada environment variable** yang perlu di-set di dashboard hosting — URL & anon key Supabase langsung ditulis di `script.js` (aman, karena anon key memang didesain publik & dibatasi Row Level Security)
- Routing pakai `#hash` (mis. `#/bab/3`) — bekerja otomatis tanpa konfigurasi rewrite apa pun

## Setup Database (sama seperti sebelumnya)

1. Buka **Supabase SQL Editor** → jalankan `supabase-schema.sql`
2. Jalankan `supabase-seed/seed-ch01.sql` sampai `seed-ch20.sql` satu-satu (New Query → paste → Run, ulangi)
3. Aktifkan **Google Login**: Authentication → Providers → Google, isi Client ID & Secret
4. Authorized redirect URI di Google Console: `https://qoxhfnlkqqejgpotzxxl.supabase.co/auth/v1/callback`
5. Di Supabase → Authentication → URL Configuration → Site URL & Redirect URLs isi dengan domain kamu nanti (mis. `https://apollo-academy.vercel.app`)

## Coba di lokal

Karena ini file statis, tinggal buka `index.html` langsung di browser — **tapi** login Google butuh server (bukan `file://`). Cara termudah pakai server statis sederhana:

```bash
npx serve .
# atau
python3 -m http.server 5500
```

Lalu buka `http://localhost:5500`.

## Deploy ke Vercel

1. Push semua file ini ke GitHub (root repo, tidak perlu folder `client/` lagi)
2. Import repo di Vercel
3. **Framework Preset**: pilih **Other** (bukan Vite/Next — karena ini bukan project yang perlu build)
4. **Build Command**: kosongkan / biarkan default
5. **Output Directory**: kosongkan (Vercel otomatis serve dari root)
6. Deploy — selesai, tidak ada langkah lain

## Admin

Login dengan salah satu dari 3 email admin yang terdaftar di `supabase-schema.sql` → buka halaman Profil → akan muncul link **"Buka Panel Admin →"** yang mengarah ke `admin.html`.

## Push ke GitHub

```bash
cd apollo-academy
git init
git add .
git commit -m "Initial commit: Apollo Academy (static HTML/JS)"
git branch -M main
git remote add origin https://github.com/USERNAME/apollo-academy.git
git push -u origin main
```

---
Power By **Team Apollo AI Studio**
