// ============================================
// APOLLO ACADEMY — script.js
// Vanilla JS + Supabase, tanpa build step
// ============================================

const SUPABASE_URL = "https://qoxhfnlkqqejgpotzxxl.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ILXonaeTKgw0IqqrRF09mg_j913SIGS";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;   // { id, email, name, avatar }
let currentProfile = null; // baris dari tabel profiles

const BADGES = [
  { key: "petualang", emoji: "⚔️", name: "Petualang", need: 1, type: "completed", sub: "1 bab" },
  { key: "kutubuku", emoji: "📚", name: "Kutu Buku", need: 5, type: "completed", sub: "5 bab" },
  { key: "fokus", emoji: "🎯", name: "Fokus", need: 10, type: "completed", sub: "10 bab" },
  { key: "ninja", emoji: "⚡", name: "Ninja", need: 15, type: "completed", sub: "15 bab" },
  { key: "kolektor", emoji: "🏷️", name: "Kolektor", need: 3, type: "bookmark", sub: "3 bookmark" },
  { key: "master", emoji: "👑", name: "Master", need: 20, type: "completed", sub: "Selesai" },
];

// ============================================
// AUTH
// ============================================

async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  await applySession(session);

  supabase.auth.onAuthStateChange(async (_event, session) => {
    await applySession(session);
    if (document.body.dataset.page === "admin") initAdminPage();
    else route();
  });
}

async function applySession(session) {
  if (session) {
    currentUser = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || "Pembaca",
      avatar: session.user.user_metadata?.avatar_url,
    };
    const { data } = await supabase.from("profiles").select("*").eq("id", currentUser.id).single();
    currentProfile = data;
  } else {
    currentUser = null;
    currentProfile = null;
  }
}

function loginWithGoogle() {
  supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + window.location.pathname + "#/profile" },
  });
}

async function logout() {
  await supabase.auth.signOut();
  currentUser = null;
  currentProfile = null;
  navigate("/");
}

async function refreshProfile() {
  if (!currentUser) return;
  const { data } = await supabase.from("profiles").select("*").eq("id", currentUser.id).single();
  currentProfile = data;
}

// ============================================
// THEME
// ============================================

function initTheme() {
  const saved = localStorage.getItem("apollo-theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
}

async function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("apollo-theme", next);

  if (currentUser) {
    await supabase.from("profiles").update({ theme: next }).eq("id", currentUser.id);
    refreshProfile();
  }
}

// ============================================
// MARKDOWN RENDERER (ringan, khusus format bab kita)
// ============================================

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderInline(text) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts
    .map((part) => {
      if (part.startsWith("**") && part.endsWith("**")) return `<b>${escapeHtml(part.slice(2, -2))}</b>`;
      if (part.startsWith("`") && part.endsWith("`")) return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
      return escapeHtml(part);
    })
    .join("");
}

function renderChapterMarkdown(content) {
  const lines = content.split("\n");
  let html = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      html += `<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`;
      i++;
      continue;
    }
    if (line.startsWith("## ")) { html += `<h2>${escapeHtml(line.slice(3))}</h2>`; i++; continue; }
    if (line.startsWith("# ")) { html += `<h1>${escapeHtml(line.slice(2))}</h1>`; i++; continue; }
    if (line.startsWith("- ")) {
      html += "<ul>";
      while (i < lines.length && lines[i].startsWith("- ")) {
        html += `<li>${renderInline(lines[i].slice(2))}</li>`;
        i++;
      }
      html += "</ul>";
      continue;
    }
    if (line.trim() === "" || line.trim() === "---") { i++; continue; }

    const isPanel = line.trim().startsWith("**Panel");
    html += `<p class="${isPanel ? "panel" : ""}">${renderInline(line)}</p>`;
    i++;
  }
  return html;
}

// ============================================
// ROUTER (hash based) — hanya untuk index.html
// ============================================

function navigate(path) { window.location.hash = "#" + path; }

async function route() {
  const hash = window.location.hash.slice(1) || "/";
  const container = document.getElementById("view-container");
  container.innerHTML = '<p class="loading-screen">Memuat...</p>';

  updateBottomNav(hash);

  if (hash === "/") return renderHome(container);
  if (hash === "/bab") return renderBabList(container);
  if (hash.startsWith("/bab/")) return renderBabDetail(container, hash.split("/")[2]);
  if (hash === "/profile") return renderProfilePage(container);
  if (hash === "/login") return renderLoginPage(container);

  container.innerHTML = '<p class="loading-screen">Halaman tidak ditemukan.</p>';
}

function updateBottomNav(hash) {
  document.querySelectorAll(".nav-item").forEach((el) => {
    const route = el.dataset.route;
    const active =
      (route === "/" && hash === "/") ||
      (route === "/bab" && hash.startsWith("/bab")) ||
      (route === "/profile" && (hash === "/profile" || hash === "/login"));
    el.classList.toggle("active", active);
  });
}

// ============================================
// VIEW: HEADER (dipakai berulang)
// ============================================

function headerHTML(subtitle) {
  const rightSide = currentUser
    ? `<a href="#/profile">${
        currentUser.avatar
          ? `<img src="${currentUser.avatar}" class="avatar-sm" alt="${currentUser.name}">`
          : `<div class="avatar-sm">${currentUser.name[0]}</div>`
      }</a>`
    : `<a href="#/login" class="btn-login-sm">Masuk</a>`;

  return `
    <div class="app-header">
      <div class="app-title-row">
        <div class="app-icon">📖</div>
        <div class="app-title"><h2>Apollo Academy</h2><p>${subtitle}</p></div>
      </div>
      <div class="header-actions">
        <button class="theme-toggle-btn" onclick="toggleTheme()">${document.documentElement.getAttribute("data-theme") === "dark" ? "🌙" : "☀️"}</button>
        ${rightSide}
      </div>
    </div>`;
}

// ============================================
// VIEW: BERANDA
// ============================================

async function renderHome(container) {
  const { data: chapters } = await supabase.from("chapters").select("*").order("number");
  let progressMap = {};
  let bookmarks = [];

  if (currentUser) {
    const { data: progress } = await supabase.from("reading_progress").select("*").eq("user_id", currentUser.id);
    (progress || []).forEach((p) => (progressMap[p.chapter_id] = p));

    const { data: bm } = await supabase
      .from("bookmarks").select("*, chapters(*)").eq("user_id", currentUser.id).order("created_at", { ascending: false });
    bookmarks = bm || [];
  }

  const completedCount = Object.values(progressMap).filter((p) => p.completed).length;
  const totalCount = chapters.length;
  const progressPct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const nextChapter = chapters.find((c) => !progressMap[c.id]?.completed);

  const volumeNames = [...new Set(chapters.map((c) => c.volume))];
  const icons = ["⚔️", "🧠", "🌐", "📕", "🖥️", "⚡"];
  const volumesHTML = volumeNames
    .map((vol, idx) => {
      const chs = chapters.filter((c) => c.volume === vol);
      const done = chs.filter((c) => progressMap[c.id]?.completed).length;
      return `
      <div class="volume-card" onclick="navigate('/bab/${chs[0].number}')">
        <div class="volume-icon" style="background:var(--mint)">${icons[idx % icons.length]}</div>
        <h4>${vol.replace(/^Volume [IVX]+ — /, "")}</h4>
        <div class="vol-sub">${done}/${chs.length} bab</div>
      </div>`;
    })
    .join("");

  container.innerHTML = `
    ${headerHTML("Petualangan belajar coding")}

    ${nextChapter ? `
    <div class="section">
      <div class="section-title">▶ Lanjutkan Baca</div>
      <div class="continue-card" onclick="navigate('/bab/${nextChapter.number}')">
        <div class="continue-illust">📦</div>
        <div class="continue-info">
          <div class="eyebrow">Bab ${nextChapter.number} · ${nextChapter.tags?.[0] || ""}</div>
          <h3>${nextChapter.title}</h3>
          <p>${nextChapter.volume}</p>
          <span class="tag ${nextChapter.level.toLowerCase()}">${nextChapter.level}</span>
          <span class="tag time">⏱ ${nextChapter.duration_minutes}m</span>
        </div>
      </div>
    </div>` : ""}

    ${currentUser ? `
    <div class="section">
      <div class="section-title">📈 Statistik Kamu</div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon" style="background:var(--green-bg)">✅</div><div class="num">${completedCount}</div><div class="label">Selesai</div><div class="sub">dari ${totalCount} bab</div></div>
        <div class="stat-card"><div class="stat-icon" style="background:var(--orange-bg)">🏆</div><div class="num">${progressPct}%</div><div class="label">Progress</div><div class="sub">perjalanan</div></div>
        <div class="stat-card"><div class="stat-icon" style="background:var(--lavender)">🔖</div><div class="num">${bookmarks.length}</div><div class="label">Bookmark</div><div class="sub">ditandai</div></div>
        <div class="stat-card"><div class="stat-icon" style="background:var(--mint)">🔥</div><div class="num">${currentProfile?.streak_count || 0}</div><div class="label">Streak</div><div class="sub">hari beruntun</div></div>
      </div>
    </div>
    <div class="section">
      <div class="progress-panel">
        <div class="top-row"><span>PERJALANAN</span><span>${completedCount} / ${totalCount} bab</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${progressPct}%"></div></div>
      </div>
    </div>` : ""}

    <div class="section">
      <div class="section-title">📚 Volume <a href="#/bab" class="link">Lihat semua →</a></div>
      <div class="volume-scroller">${volumesHTML}</div>
    </div>

    ${currentUser && bookmarks.length > 0 ? `
    <div class="section">
      <div class="section-title">🔖 Ditandai</div>
      ${bookmarks.map((b) => `
        <div class="bookmark-item" onclick="navigate('/bab/${b.chapters.number}')">
          <div class="bookmark-icon">📖</div>
          <div class="bookmark-info">
            <div class="bab-num">Bab ${b.chapters.number}</div>
            <h4>${b.chapters.title}</h4>
            <span class="tag ${b.chapters.level.toLowerCase()}">${b.chapters.level}</span>
            <span class="tag time">⏱ ${b.chapters.duration_minutes}m</span>
          </div>
          <div class="chevron">›</div>
        </div>`).join("")}
    </div>` : ""}

    ${!currentUser ? `<div class="section"><p class="empty-note">Masuk dengan Google untuk menyimpan progress baca, bookmark, dan streak harianmu.</p></div>` : ""}
  `;
}

// ============================================
// VIEW: DAFTAR BAB
// ============================================

let babFilter = "Semua";

async function renderBabList(container) {
  const { data: chapters } = await supabase.from("chapters").select("*").order("number");
  let progressMap = {};
  let bookmarkSet = new Set();

  if (currentUser) {
    const { data: progress } = await supabase.from("reading_progress").select("*").eq("user_id", currentUser.id);
    (progress || []).forEach((p) => (progressMap[p.chapter_id] = p));

    const { data: bm } = await supabase.from("bookmarks").select("chapter_id").eq("user_id", currentUser.id);
    bookmarkSet = new Set((bm || []).map((b) => b.chapter_id));
  }

  renderBabListBody(container, chapters, progressMap, bookmarkSet);
}

function renderBabListBody(container, chapters, progressMap, bookmarkSet) {
  const filtered =
    babFilter === "Semua" ? chapters :
    babFilter === "Ditandai" ? chapters.filter((c) => bookmarkSet.has(c.id)) :
    chapters.filter((c) => c.level === babFilter);

  const grouped = {};
  filtered.forEach((c) => { (grouped[c.volume] = grouped[c.volume] || []).push(c); });

  const pills = ["Semua", "Ditandai", "Pemula", "Menengah", "Lanjutan", "Master"]
    .map((f) => `<button class="pill ${babFilter === f ? "active" : ""}" onclick="setBabFilter('${f}')">${f === "Ditandai" ? "🔖 Ditandai" : f}</button>`)
    .join("");

  const groupsHTML = Object.entries(grouped).map(([volume, chs]) => `
    <div class="section" style="padding-bottom:8px;"><div class="section-title" style="margin:0;">${volume}</div></div>
    <div class="chapter-grid" style="margin-bottom:20px;">
      ${chs.map((c) => {
        const done = progressMap[c.id]?.completed;
        const bookmarked = bookmarkSet.has(c.id);
        return `
        <div class="chapter-card" onclick="navigate('/bab/${c.number}')">
          <div class="chapter-illust">
            <span class="badge-num">#${c.number}</span>
            <span class="badge-bookmark" onclick="event.stopPropagation(); toggleBookmarkQuick('${c.id}')">${bookmarked ? "🔖" : "🏷️"}</span>
            📖
            ${done ? '<span class="badge-status done">✓ selesai</span>' : ""}
          </div>
          <div class="chapter-meta">
            <h4>${c.title}</h4>
            <span class="tag ${c.level.toLowerCase()}">${c.level}</span>
            <span class="tag time">⏱ ${c.duration_minutes}m</span>
          </div>
        </div>`;
      }).join("")}
    </div>
  `).join("");

  container.innerHTML = `
    ${headerHTML(chapters.length + " bab tersedia")}
    <div class="pill-row">${pills}</div>
    ${groupsHTML || '<p class="empty-note" style="padding:0 16px;">Tidak ada bab untuk filter ini.</p>'}
  `;
}

function setBabFilter(f) {
  babFilter = f;
  route();
}

async function toggleBookmarkQuick(chapterId) {
  if (!currentUser) return navigate("/login");
  const { data: existing } = await supabase.from("bookmarks").select("id").eq("user_id", currentUser.id).eq("chapter_id", chapterId).maybeSingle();
  if (existing) {
    await supabase.from("bookmarks").delete().eq("id", existing.id);
  } else {
    await supabase.from("bookmarks").insert({ user_id: currentUser.id, chapter_id: chapterId });
  }
  route();
}

// ============================================
// VIEW: DETAIL BAB
// ============================================

async function renderBabDetail(container, number) {
  const { data: chapter } = await supabase.from("chapters").select("*").eq("number", Number(number)).single();
  if (!chapter) { container.innerHTML = '<p class="loading-screen">Bab tidak ditemukan.</p>'; return; }

  const { count: totalChapters } = await supabase.from("chapters").select("*", { count: "exact", head: true });

  let isBookmarked = false;
  let isCompleted = false;

  if (currentUser) {
    const { data: bm } = await supabase.from("bookmarks").select("id").eq("user_id", currentUser.id).eq("chapter_id", chapter.id).maybeSingle();
    isBookmarked = !!bm;
    const { data: prog } = await supabase.from("reading_progress").select("completed").eq("user_id", currentUser.id).eq("chapter_id", chapter.id).maybeSingle();
    isCompleted = !!prog?.completed;
  }

  container.innerHTML = `
    <div class="detail-topbar">
      <button onclick="history.back()">←</button>
      <h2 style="font-size:16px;">Detail Bab</h2>
      <button onclick="toggleBookmarkDetail('${chapter.id}')" id="bookmark-btn">${isBookmarked ? "🔖" : "🏷️"}</button>
    </div>

    <div class="detail-illust">
      <span class="badge-top-left">BAB ${chapter.number}</span>
      ${isCompleted ? '<span class="badge-top-right">✓ Selesai</span>' : ""}
      📖
    </div>

    <div class="detail-body">
      <div class="eyebrow">${chapter.volume}</div>
      <h2>${chapter.title}</h2>
      <div class="tag-row">
        <span class="tag ${chapter.level.toLowerCase()}">⭐ ${chapter.level}</span>
        ${(chapter.tags || []).map((t) => `<span class="tag neutral">${t}</span>`).join("")}
        <span class="tag time">⏱ ${chapter.duration_minutes} menit</span>
      </div>

      <button class="btn-primary" id="mark-read-btn" onclick="markAsRead('${chapter.id}')" ${isCompleted ? "disabled" : ""}>
        ${isCompleted ? "✓ Sudah Dibaca" : "▶ Tandai Sudah Dibaca"}
      </button>

      ${renderChapterMarkdown(chapter.content)}

      <div style="display:flex; gap:10px; margin:20px 0;">
        <button class="btn-secondary" onclick="navigate('/bab/${chapter.number - 1}')" ${chapter.number <= 1 ? "disabled" : ""}>‹ Bab Sebelumnya</button>
        <button class="btn-secondary" onclick="navigate('/bab/${chapter.number + 1}')" ${chapter.number >= totalChapters ? "disabled" : ""}>Bab Selanjutnya ›</button>
      </div>
    </div>
  `;
}

async function toggleBookmarkDetail(chapterId) {
  if (!currentUser) return navigate("/login");
  const { data: existing } = await supabase.from("bookmarks").select("id").eq("user_id", currentUser.id).eq("chapter_id", chapterId).maybeSingle();
  const btn = document.getElementById("bookmark-btn");
  if (existing) {
    await supabase.from("bookmarks").delete().eq("id", existing.id);
    btn.textContent = "🏷️";
  } else {
    await supabase.from("bookmarks").insert({ user_id: currentUser.id, chapter_id: chapterId });
    btn.textContent = "🔖";
  }
}

async function markAsRead(chapterId) {
  if (!currentUser) return navigate("/login");
  const btn = document.getElementById("mark-read-btn");
  btn.disabled = true;
  btn.textContent = "Menyimpan...";

  await supabase.from("reading_progress").upsert(
    { user_id: currentUser.id, chapter_id: chapterId, completed: true, completed_at: new Date().toISOString() },
    { onConflict: "user_id,chapter_id" }
  );
  await updateStreak();
  await refreshProfile();

  btn.textContent = "✓ Sudah Dibaca";
}

async function updateStreak() {
  const { data: profile } = await supabase.from("profiles").select("streak_count,last_active_date").eq("id", currentUser.id).single();
  const today = new Date().toISOString().slice(0, 10);
  if (profile?.last_active_date === today) return;

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const newStreak = profile?.last_active_date === yesterday ? (profile.streak_count || 0) + 1 : 1;

  await supabase.from("profiles").update({ streak_count: newStreak, last_active_date: today }).eq("id", currentUser.id);
}

// ============================================
// VIEW: PROFIL
// ============================================

async function renderProfilePage(container) {
  if (!currentUser) return navigate("/login");

  const { count: totalChapters } = await supabase.from("chapters").select("*", { count: "exact", head: true });
  const { count: completedCount } = await supabase.from("reading_progress").select("*", { count: "exact", head: true }).eq("user_id", currentUser.id).eq("completed", true);
  const { count: bookmarkCount } = await supabase.from("bookmarks").select("*", { count: "exact", head: true }).eq("user_id", currentUser.id);

  const progressPct = totalChapters ? Math.round((completedCount / totalChapters) * 100) : 0;
  const isAdmin = currentProfile?.role === "admin";

  const badgesHTML = BADGES.map((b) => {
    const value = b.type === "completed" ? completedCount : bookmarkCount;
    const unlocked = value >= b.need;
    return `
      <div class="badge-card ${unlocked ? "" : "locked"}">
        <div class="badge-emoji">${b.emoji}</div>
        <div class="bname">${b.name}</div>
        <div class="bsub">${b.sub}</div>
      </div>`;
  }).join("");

  container.innerHTML = `
    ${headerHTML("Petualangan belajar coding")}

    <div class="profile-hero">
      ${currentUser.avatar ? `<img src="${currentUser.avatar}" class="profile-avatar" alt="${currentUser.name}">` : '<div class="profile-avatar">🌱</div>'}
      <h3>${currentUser.name}</h3>
      <p class="email">${currentUser.email}</p>
      ${isAdmin ? '<div class="admin-badge">⚙️ ADMIN</div><br><a href="admin.html" style="font-size:12px;color:var(--purple-dark);font-weight:700;">Buka Panel Admin →</a>' : ""}
      <div class="lvl">Level perjalanan: ${progressPct}%</div>
      <div class="progress-track"><div class="progress-fill" style="width:${progressPct}%"></div></div>

      <div class="pref-row">
        <span>🌙 Mode Tampilan</span>
        <label class="switch">
          <input type="checkbox" ${document.documentElement.getAttribute("data-theme") === "light" ? "checked" : ""} onchange="toggleTheme()">
          <span class="slider"></span>
        </label>
        <span>${document.documentElement.getAttribute("data-theme") === "dark" ? "Gelap" : "Terang"}</span>
      </div>
    </div>

    <div class="section">
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon" style="background:var(--orange-bg)">🏆</div><div class="num">${completedCount}</div><div class="label">Bab selesai</div></div>
        <div class="stat-card"><div class="stat-icon" style="background:var(--mint)">🔥</div><div class="num">${currentProfile?.streak_count || 0}</div><div class="label">Streak hari</div></div>
        <div class="stat-card"><div class="stat-icon" style="background:var(--lavender)">🔖</div><div class="num">${bookmarkCount}</div><div class="label">Ditandai</div></div>
        <div class="stat-card"><div class="stat-icon" style="background:var(--pink-bg)">📖</div><div class="num">${totalChapters}</div><div class="label">Total bab</div></div>
      </div>
    </div>

    <div class="section"><div class="section-title">🏆 Lencana</div></div>
    <div class="badge-grid">${badgesHTML}</div>

    <button class="btn-logout" onclick="logout()">Keluar</button>
  `;
}

// ============================================
// VIEW: LOGIN
// ============================================

function renderLoginPage(container) {
  if (currentUser) return navigate("/profile");

  container.innerHTML = `
    <div class="login-page">
      <div class="login-panel">
        <div class="logo-big">📖</div>
        <h1 style="font-size:20px;margin-bottom:8px;">Masuk ke Apollo Academy</h1>
        <p>Simpan progress belajarmu, kumpulkan lencana, dan jaga streak harianmu.</p>
        <button class="btn-google" onclick="loginWithGoogle()">
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6 29.5 4 24 4c-7.6 0-14.1 4.3-17.7 10.7z"/>
            <path fill="#4CAF50" d="M24 44c5.4 0 10.3-1.8 14.1-5l-6.5-5.5C29.6 35.1 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9.8 39.6 16.3 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.5 5.5C40.9 36.6 44 30.8 44 24c0-1.3-.1-2.7-.4-3.5z"/>
          </svg>
          Masuk dengan Google
        </button>
      </div>
    </div>`;
}

// ============================================
// ADMIN PAGE (admin.html)
// ============================================

async function initAdminPage() {
  const container = document.getElementById("admin-container");

  if (!currentUser) {
    container.innerHTML = `<div class="login-page"><div class="login-panel"><p>Kamu harus masuk dulu.</p><button class="btn-google" onclick="loginWithGoogle()">Masuk dengan Google</button></div></div>`;
    return;
  }
  if (currentProfile?.role !== "admin") {
    container.innerHTML = `<div class="login-page"><div class="login-panel"><p>Halaman ini khusus admin.</p><a href="index.html" style="color:var(--purple-dark);font-weight:700;">← Kembali ke Beranda</a></div></div>`;
    return;
  }

  await renderAdminPanel();
}

async function renderAdminPanel(status = "") {
  const container = document.getElementById("admin-container");
  const { data: chapters } = await supabase.from("chapters").select("*").order("number");

  container.innerHTML = `
    <div class="app-header">
      <div class="app-title-row">
        <div class="app-icon">⚙️</div>
        <div class="app-title"><h2>Panel Admin</h2><p>${currentUser.email}</p></div>
      </div>
      <a href="index.html" style="font-size:20px;">🏠</a>
    </div>

    ${status ? `<div class="admin-status">${status}</div>` : ""}

    <section class="admin-card">
      <h2>Tambah Bab Baru</h2>
      <form class="admin-form" id="add-chapter-form">
        <input type="number" name="number" placeholder="Nomor bab, mis: 21" required>
        <input name="title" placeholder="Judul bab" required>
        <input name="volume" placeholder="Volume, mis: Volume VII — Dunia Baru" required>
        <select name="level">
          <option>Pemula</option><option>Menengah</option><option>Lanjutan</option><option>Master</option>
        </select>
        <input name="tags" placeholder="Tag (pisah koma), mis: Python, Dasar">
        <input type="number" name="duration" placeholder="Durasi (menit)">
        <textarea name="content" placeholder="Konten markdown bab (panel, kode, rangkuman)..." rows="8"></textarea>
        <button type="submit">Simpan Bab</button>
      </form>
    </section>

    <section class="admin-card">
      <h2>Daftar Bab (${chapters.length})</h2>
      <ul class="admin-list">
        ${chapters.map((c) => `
          <li>
            <span>#${c.number} — ${c.title}</span>
            <button class="btn-delete" onclick="deleteChapter('${c.id}')">Hapus</button>
          </li>`).join("")}
      </ul>
    </section>
  `;

  document.getElementById("add-chapter-form").addEventListener("submit", handleAddChapter);
}

async function handleAddChapter(e) {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);

  const { error } = await supabase.from("chapters").insert({
    number: Number(fd.get("number")),
    title: fd.get("title"),
    volume: fd.get("volume"),
    level: fd.get("level"),
    tags: fd.get("tags").split(",").map((t) => t.trim()).filter(Boolean),
    duration_minutes: Number(fd.get("duration")) || 5,
    content: fd.get("content"),
  });

  renderAdminPanel(error ? `❌ Gagal: ${error.message}` : "✅ Bab berhasil ditambahkan");
}

async function deleteChapter(id) {
  if (!confirm("Hapus bab ini?")) return;
  await supabase.from("chapters").delete().eq("id", id);
  renderAdminPanel("🗑️ Bab dihapus");
}

// ============================================
// INIT
// ============================================

document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  await initAuth();

  if (document.body.dataset.page === "admin") {
    initAdminPage();
  } else {
    window.addEventListener("hashchange", route);
    route();
  }
});
