// === Apollo Academy — Supabase Client & Shared Config ===

const SUPABASE_URL = "https://pdgmxvfevvinfcrwyget.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_b2dHUQoztQJF3Oj-2Jofog_N276bXEw";

// supabase-js v2 is loaded globally via CDN as `window.supabase`.
// If this file loads before that CDN script, or the CDN script itself
// failed (blocked, offline, wrong path), window.supabase won't exist yet.
// We fail loudly here instead of silently leaving `client` undefined,
// which is what causes the cryptic "client is not defined" error on
// every page that tries to use it afterwards.
let client;

if (!window.supabase || typeof window.supabase.createClient !== "function") {
  const msg =
    "Gagal memuat pustaka Supabase. Cek koneksi internet kamu, atau pastikan " +
    "urutan <script> di HTML benar: CDN supabase-js HARUS dimuat SEBELUM " +
    "js/supabase-client.js.";
  console.error("[Apollo Academy]", msg);
  document.addEventListener("DOMContentLoaded", () => {
    const banner = document.createElement("div");
    banner.textContent = "⚠️ " + msg;
    banner.style.cssText =
      "position:fixed;top:0;left:0;right:0;z-index:9999;background:#d8402c;" +
      "color:#fff;font-family:sans-serif;font-size:14px;padding:10px 16px;" +
      "text-align:center;";
    document.body.prepend(banner);
  });
} else {
  client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Also expose on window so it's reachable even if a page's inline script
// runs in a slightly different scope than expected.
window.client = client;

// Daftar email admin — dipakai untuk gate login-admin.html & penetapan role otomatis
const ADMIN_EMAILS = [
  "kimlana269@gmail.com",
  "kumenomikuroo@gmail.com",
  "gtau22609@gmail.com",
];

function isAdminEmail(email) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

// Ambil sesi user saat ini, redirect ke login jika tidak ada & wajib login
async function requireSession(redirectTo = "login.html") {
  const { data: { session } } = await client.auth.getSession();
  if (!session) {
    window.location.href = redirectTo;
    return null;
  }
  return session;
}

// Pastikan baris profil ada untuk user yang baru login (upsert ringan)
async function ensureProfile(user, extra = {}) {
  if (!user) return null;
  const role = isAdminEmail(user.email) ? "admin" : "student";
  const { data, error } = await client
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email,
        role,
        ...extra,
      },
      { onConflict: "id", ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) {
    console.error("ensureProfile error:", error.message);
    return null;
  }
  return data;
}

function showToast(message, type = "info") {
  let toast = document.getElementById("aa-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "aa-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `aa-toast aa-toast--${type} aa-toast--show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("aa-toast--show"), 3200);
}

function formatError(err) {
  if (!err) return "Terjadi kesalahan tak terduga.";
  const msg = err.message || String(err);
  if (msg.includes("Invalid login credentials")) return "Email atau kata sandi salah.";
  if (msg.includes("User already registered")) return "Email ini sudah terdaftar. Coba masuk.";
  if (msg.includes("Password should be at least")) return "Kata sandi minimal 6 karakter.";
  if (msg.includes("Email not confirmed")) return "Cek email kamu untuk konfirmasi akun dulu, ya.";
  return msg;
}
