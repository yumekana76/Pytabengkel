/* =========================================
   THEME (LIGHT / DARK)
   Dipakai bersama oleh halaman admin,
   halaman customer, dan halaman login.
   ========================================= */

var THEME_KEY = "workshop_theme";

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch (error) {
    return null;
  }
}

function getPreferredTheme() {
  const stored = getStoredTheme();

  if (stored === "light" || stored === "dark") {
    return stored;
  }

  if (window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  return "light";
}

/* `persist = false` dipakai saat tema hanya DITERAPKAN (bukan dipilih
   pengguna): saat halaman dimuat atau saat sistem operasi berganti
   tema. Tanpa opsi ini, pilihan "Ikuti Sistem" langsung tertimpa oleh
   nilai hasil terjemahan dan mode ikut-sistem mati untuk selamanya. */
function applyTheme(theme, persist = true) {
  const value = theme === "dark" ? "dark" : "light";

  document.documentElement.setAttribute("data-theme", value);

  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, value);
    } catch (error) {
      /* localStorage bisa tidak tersedia (mode privat) */
    }
  }

  return value;
}

function getCurrentTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

function toggleTheme() {
  return applyTheme(getCurrentTheme() === "dark" ? "light" : "dark");
}

function updateThemeButtons() {
  const theme = getCurrentTheme();

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    button.setAttribute(
      "aria-label",
      theme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap",
    );
    button.title =
      theme === "dark"
        ? "Mode gelap aktif — klik untuk terang"
        : "Mode terang aktif — klik untuk gelap";
  });
}

function initTheme() {
  /* Jangan menyimpan hasil terjemahan — cukup terapkan, supaya
     pilihan "Ikuti Sistem" tetap dikenali di kunjungan berikutnya. */
  applyTheme(getPreferredTheme(), false);
  updateThemeButtons();

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    if (button.dataset.themeBound === "true") return;
    button.dataset.themeBound = "true";
    button.addEventListener("click", () => {
      toggleTheme();
      updateThemeButtons();
    });
  });

  if (window.matchMedia) {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (event) => {
        if (!getStoredTheme()) {
          applyTheme(event.matches ? "dark" : "light", false);
          updateThemeButtons();
        }
      });
  }
}

/* =========================================
   SKELETON LOADING
   Fungsi ini berada di theme.js (bukan global.js) karena
   skeleton harus terpasang SEBELUM paint pertama: theme.js
   dimuat dari <head>, lalu tiap halaman memanggil
   showSkeleton() lewat inline script tepat setelah tag
   <body>. Kalau skeleton dibuat oleh global.js (di ekor
   <body>), browser sudah sempat me-render layout kosong
   lebih dulu sehingga tampilan kedip sebelum skeleton
   muncul.
   ========================================= */

/* Pita kolom tabel: satu balok setiap kolom <th>, kolom pertama ("No")
   dan kolom terakhir ("Aksi") lebih pendek seperti tabel aslinya. */
function skRowBars(cols) {
  return Array.from({ length: cols }, function (_, index) {
    return `<span class="skeleton-bar${index === 0 ? " sk-col-no" : ""}${
      index === cols - 1 ? " sk-col-action" : ""
    }"></span>`;
  }).join("");
}

/* Lebar grid baris tabel: sel "No" 44px + sisanya rata. */
function skGridCols(cols) {
  return cols > 1
    ? `grid-template-columns: 44px repeat(${cols - 1}, minmax(0, 1fr));`
    : "grid-template-columns: minmax(0, 1fr);";
}

/* Badan tabel: thead + baris isi + table-footer (info ± pagination),
   jumlah kolom & baris mengikuti halaman aslinya. */
function skTable(cols, rows, footer) {
  return `
        <div class="sk-thead" style="${skGridCols(cols)}">
          ${skRowBars(cols)}
        </div>
        <div class="sk-rows">${Array.from(
          { length: rows },
          function () {
            return `
      <div class="sk-row" style="${skGridCols(cols)}">
        ${skRowBars(cols)}
      </div>`;
          },
        ).join("")}</div>
        ${skTableFooter(footer)}`;
}

function skTableFooter(footer) {
  if (!footer) return "";
  return `
        <div class="sk-footer">
          <span class="skeleton-bar sk-footer-info"></span>
          ${
            footer === "pag"
              ? `<div class="sk-pag">${Array.from(
                  { length: 4 },
                  function () {
                    return `<span class="skeleton-bar sk-page"></span>`;
                  },
                ).join("")}</div>`
              : ""
          }
        </div>`;
}

function showSkeleton() {
  if (document.getElementById("appSkeleton") || !document.body) {
    return;
  }

  /* Tiap halaman punya isi berbeda — jumlah kartu statistik, tab status,
     toolbar, form, dsb. Struktur skeleton dipilih dari preset per file
     (lihat skeletonPreset) supaya padding & margin skeleton persis sama
     dengan halaman aslinya dan tidak ada loncatan saat konten muncul. */
  const preset = skeletonPreset();

  const navItems = Array.from({ length: preset.nav }, function (_, index) {
    return `<span class="skeleton-bar sk-nav-item${
      index === 0 ? " active" : ""
    }"></span>`;
  }).join("");

  /* .page-header — tombol kanan hanya muncul kalau halaman aslinya punya. */
  const head = preset.headerBtn
    ? `<div class="sk-head sk-head-row">
            <div class="sk-head-text">
              <span class="skeleton-bar sk-title"></span>
              <span class="skeleton-bar sk-sub w30"></span>
            </div>
            <span class="skeleton-bar sk-head-btn"></span>
          </div>`
    : `<div class="sk-head">
            <span class="skeleton-bar sk-title"></span>
            <span class="skeleton-bar sk-sub w30"></span>
          </div>`;

  /* .customer-hero — sapaan khas dashboard customer (menggantikan header). */
  const hero = preset.hero
    ? `<div class="sk-hero">
            <div class="sk-hero-text">
              <span class="skeleton-bar sk-title"></span>
              <span class="skeleton-bar sk-sub w30"></span>
            </div>
            <span class="skeleton-bar sk-hero-badge"></span>
          </div>`
    : "";

  /* .stats-grid — jumlah kartu mengikuti halaman aslinya. */
  const cards = preset.cards
    ? `<div class="sk-cards">${Array.from(
        { length: preset.cards },
        function () {
          return `
      <div class="sk-card">
        <span class="skeleton-bar sk-card-icon"></span>
        <span class="skeleton-bar sk-card-number"></span>
        <span class="skeleton-bar sk-card-label"></span>
      </div>`;
        },
      ).join("")}</div>`
    : "";

  /* .profile-card — avatar + nama (halaman Profil Saya). */
  const profileCard = preset.profileCard
    ? `<div class="sk-profile-card">
            <span class="skeleton-bar sk-avatar"></span>
            <div class="sk-profile-text">
              <span class="skeleton-bar sk-profile-name"></span>
              <span class="skeleton-bar sk-profile-meta"></span>
            </div>
          </div>`
    : "";

  /* .setting — tumpukan kartu baris (Pengaturan admin), bukan tabel/form. */
  const settingRows = preset.settingRows
    ? `<div class="sk-setting">${Array.from(
        { length: preset.settingRows },
        function () {
          return `
      <div class="sk-setting-row">
        <span class="skeleton-bar sk-setting-icon"></span>
        <div class="sk-setting-text">
          <span class="skeleton-bar sk-setting-title"></span>
          <span class="skeleton-bar sk-setting-desc"></span>
        </div>
      </div>`;
        },
      ).join("")}</div>`
    : "";

  /* .dashboard-grid — dua panel sejajar (dashboard admin & customer). */
  const dashGrid = preset.dashGrid
    ? `<div class="sk-dash-grid">
            <div class="sk-panel">
              <div class="sk-panel-head">
                <div class="sk-panel-title">
                  <span class="skeleton-bar sk-panel-h"></span>
                  <span class="skeleton-bar sk-panel-p w30"></span>
                </div>
                <span class="skeleton-bar sk-panel-link"></span>
              </div>
              <div class="sk-dash-body">
                <span class="skeleton-bar sk-circle"></span>
                <div class="sk-status-list">
                  <span class="skeleton-bar sk-status-item"></span>
                  <span class="skeleton-bar sk-status-item"></span>
                  <span class="skeleton-bar sk-status-item"></span>
                  <span class="skeleton-bar sk-status-item"></span>
                </div>
              </div>
            </div>
            <div class="sk-panel">
              <div class="sk-panel-head">
                <div class="sk-panel-title">
                  <span class="skeleton-bar sk-panel-h"></span>
                  <span class="skeleton-bar sk-panel-p w30"></span>
                </div>
                ${
                  preset.dashCols
                    ? `<span class="skeleton-bar sk-select sk-select-sm"></span>`
                    : `<span class="skeleton-bar sk-panel-link"></span>`
                }
              </div>
              ${
                preset.dashCols
                  ? skTable(preset.dashCols, 3, "info")
                  : `<div class="sk-panel-body sk-info-list">${Array.from(
                      { length: 5 },
                      function () {
                        return `<span class="skeleton-bar sk-info-row"></span>`;
                      },
                    ).join("")}</div>`
              }
            </div>
          </div>`
    : "";

  /* .chart — grafik pendapatan (keuangan admin): 12 kolom bar.
     Tinggi bar disimulasikan beragam supaya mirip isi asli. */
  const chartPanel = preset.chart
    ? `<div class="sk-panel sk-chart-panel">
            <div class="sk-panel-head">
              <div class="sk-panel-title">
                <span class="skeleton-bar sk-panel-h"></span>
                <span class="skeleton-bar sk-panel-p w30"></span>
              </div>
              <span class="skeleton-bar sk-select sk-select-sm"></span>
            </div>
            <div class="sk-chart">${Array.from(
              { length: 12 },
              function (_, index) {
                const heights = [64, 96, 76, 128, 56, 140, 88, 160, 104, 72, 120, 84];
                return `
        <div class="sk-chart-col">
          <span class="skeleton-bar sk-chart-value"></span>
          <span class="skeleton-bar sk-chart-bar" style="height:${heights[index]}px"></span>
          <span class="skeleton-bar sk-chart-month"></span>
        </div>`;
              },
            ).join("")}</div>
          </div>`
    : "";

  /* Toolbar panel: .filter-select (160px) + .search-box (220px),
     jumlah select mengikuti halaman aslinya; search-box ikut ada
     jika halaman aslinya punya (search: false = tanpa search-box). */
  const toolbar = preset.toolbar
    ? `<div class="sk-toolbar">${Array.from(
        { length: preset.toolbar },
        function () {
          return `<span class="skeleton-bar sk-select"></span>`;
        },
      ).join("")}${
        preset.search === false ? "" : `<span class="skeleton-bar sk-search"></span>`
      }</div>`
    : `<span class="skeleton-bar sk-panel-link"></span>`;

  /* .status-tabs — tab Lunas / Belum Lunas (riwayat & keuangan admin). */
  const tabs = preset.tabs
    ? `<div class="sk-tabs">${Array.from(
        { length: preset.tabs },
        function () {
          return `<span class="sk-tab"><span class="skeleton-bar"></span></span>`;
        },
      ).join("")}</div>`
    : "";

  /* Panel utama: tabel (default) atau grid kartu kendaraan. */
  const mainPanel =
    preset.formPanels || preset.settingRows || preset.auth
      ? ""
      : `
        <div class="sk-panel">
          <div class="sk-panel-head">
            <div class="sk-panel-title">
              <span class="skeleton-bar sk-panel-h"></span>
              <span class="skeleton-bar sk-panel-p w30"></span>
            </div>
            ${toolbar}
          </div>
          ${tabs}
          ${
            preset.vehicleCards
              ? `<div class="sk-panel-body">
            <div class="sk-veh-cards">${Array.from(
              { length: preset.vehicleCards },
              function () {
                return `
      <div class="sk-veh-card">
        <span class="skeleton-bar sk-veh-title"></span>
        <span class="skeleton-bar"></span>
        <span class="skeleton-bar"></span>
        <span class="skeleton-bar w30"></span>
      </div>`;
              },
            ).join("")}</div>
          </div>`
              : skTable(preset.cols, preset.rows, preset.footer)
          }
        </div>`;

  /* Panel formulir — halaman tanpa tabel (Pengaturan & Profil customer). */
  const formPanels = preset.formPanels
    ? `<div class="sk-stack">${Array.from(
        { length: preset.formPanels },
        function () {
          return `
        <div class="sk-panel">
          <div class="sk-panel-head">
            <div class="sk-panel-title">
              <span class="skeleton-bar sk-panel-h"></span>
              <span class="skeleton-bar sk-panel-p w30"></span>
            </div>
          </div>
          <div class="sk-panel-body">
            <div class="sk-form-grid">${Array.from(
              { length: 4 },
              function () {
                return `<div class="sk-field">
              <span class="skeleton-bar sk-field-label"></span>
              <span class="skeleton-bar sk-field-input"></span>
            </div>`;
              },
            ).join("")}</div>
          </div>
        </div>`;
        },
      ).join("")}</div>`
    : "";

  /* Halaman register: layout login dua kolom, tanpa topbar/sidebar. */
  const auth = preset.auth
    ? `<div class="sk-auth">
        <div class="sk-auth-info">
          <span class="skeleton-bar sk-auth-logo"></span>
          <div class="sk-auth-info-text">
            <span class="skeleton-bar sk-auth-title"></span>
            <span class="skeleton-bar sk-auth-sub"></span>
            <span class="skeleton-bar sk-auth-sub sk-short"></span>
          </div>
        </div>
        <div class="sk-auth-form">
          <span class="skeleton-bar sk-auth-h2"></span>
          <span class="skeleton-bar sk-auth-sub"></span>
          ${Array.from({ length: 4 }, function () {
            return `<div class="sk-field">
            <span class="skeleton-bar sk-field-label"></span>
            <span class="skeleton-bar sk-field-input"></span>
          </div>`;
          }).join("")}
          <span class="skeleton-bar sk-auth-btn"></span>
          <span class="skeleton-bar sk-auth-link"></span>
        </div>
      </div>`
    : "";

  const content = preset.auth
    ? auth
    : `
    <div class="sk-topbar">
      <span class="skeleton-bar sk-logo"></span>
      <span class="sk-spacer"></span>
      <span class="skeleton-bar sk-chip"></span>
      <span class="skeleton-bar sk-chip sk-chip-sm"></span>
    </div>
    <div class="sk-layout">
      <div class="sk-side">
        <span class="skeleton-bar sk-side-title"></span>
        ${navItems}
      </div>
      <div class="sk-main">
        ${hero || head}
        ${cards}
        ${profileCard}
        ${settingRows}
        ${chartPanel}
        ${dashGrid}
        ${mainPanel}
        ${formPanels}
      </div>
    </div>`;

  const skeleton = document.createElement("div");
  skeleton.id = "appSkeleton";
  skeleton.className = "skeleton";
  skeleton.setAttribute("role", "status");
  skeleton.setAttribute("aria-live", "polite");
  skeleton.innerHTML = `${content}
    <span class="skeleton-sr">Memuat data…</span>`;

  document.body.appendChild(skeleton);
}

/* Preset struktur per halaman: jumlah kartu statistik, tab status,
   toolbar, dan jenis konten (tabel / kartu / form) supaya skeleton
   identik dengan isi halaman aslinya. Kunci = 2 segmen terakhir path
   sehingga nama file yang sama di portal admin & customer tidak bentrok. */
function skeletonPreset() {
  const path = String(window.location.pathname || "")
    .replace(/\\/g, "/")
    .toLowerCase();
  const key = path.split("/").slice(-2).join("/");
  const isCustomer = key.indexOf("customers-page") !== -1;

  const presets = {
    /* --- Portal admin (sidebar 10 menu) ---
       cols  = jumlah kolom <th> tabelnya, footer = table-footer
       ("info" = teks kiri saja, "pag" = + tombol pagination),
       toolbar = jumlah select di panel-header. */
    "admin-page/dashboard.html": {
      cards: 6,
      headerBtn: true,
      dashGrid: true,
      dashCols: 5, /* panel kanan: tabel mekanik 5 kolom */
      toolbar: 1,
      cols: 13, /* panel kendaraan: 13 kolom, kolom "No" 44px */
      footer: "pag",
    },
    "admin-page/customers.html": { cards: 4, toolbar: 1, cols: 9, footer: "pag" },
    "admin-page/kendaraan.html": { cards: 6, toolbar: 2, cols: 12, footer: "pag" },
    "admin-page/keuangan.html": {
      cards: 5,
      chart: true, /* panel grafik pendapatan per bulan */
      toolbar: 3,
      tabs: 3,
      cols: 9,
      footer: "pag",
    },
    "admin-page/mekanik.html": { cards: 3, toolbar: 2, cols: 7, footer: "info" },
    "admin-page/pengaturan.html": { cards: 0, settingRows: 4 },
    "admin-page/riwayat.html": {
      cards: 3,
      toolbar: 2,
      tabs: 3,
      cols: 10,
      footer: "pag",
    },
    "admin-page/service.html": { cards: 4, toolbar: 2, cols: 11, footer: "info" },
    "admin-page/sparepart.html": { cards: 3, toolbar: 2, cols: 6, footer: "info" },
    "admin-page/ulasan.html": { cards: 4, toolbar: 2, cols: 8, footer: "pag" },

    /* --- Portal customer (sidebar 7 menu) --- */
    "customers-page/dashboard.html": {
      cards: 4,
      hero: true,
      dashGrid: true, /* panel kanan: info-list bengkel */
      toolbar: 0, /* panel riwayat: header pakai link "Lihat semua" */
      cols: 8,
      rows: 5,
    },
    "customers-page/kendaraan.html": {
      cards: 4,
      headerBtn: true,
      toolbar: 2,
      vehicleCards: 3,
    },
    "customers-page/keuangan.html": { cards: 4, toolbar: 3, cols: 9, footer: "pag" },
    "customers-page/pengaturan.html": { cards: 0, formPanels: 3 },
    "customers-page/profil.html": {
      cards: 0,
      profileCard: true,
      formPanels: 2,
    },
    "customers-page/register.html": { auth: true },
    "customers-page/riwayat.html": { cards: 4, toolbar: 2, cols: 10, footer: "pag" },
    "customers-page/service.html": { cards: 4, toolbar: 2, cols: 9, footer: "info" },
  };

  return Object.assign(
    {
      cards: 4,
      nav: isCustomer ? 7 : 10,
      rows: 6,
      cols: 9,
      footer: "info",
      toolbar: 0,
      tabs: 0,
      hero: false,
      headerBtn: false,
      profileCard: false,
      settingRows: 0,
      dashGrid: false,
      dashCols: 0,
      vehicleCards: 0,
      formPanels: 0,
      chart: false,
      auth: false,
    },
    presets[key] || {},
  );
}

/* Script kecil yang disisipkan di <head> agar tema
   tidak berkedip (flash) sebelum halaman selesai dimuat. */
function applyThemeBeforePaint() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    const theme =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (error) {
    document.documentElement.setAttribute("data-theme", "light");
  }
}
