/* =====================================================================
   KONFIGURASI APLIKASI
   ---------------------------------------------------------------------
   Cara pakai:

   1. DEVELOPMENT (default)
      - Buka file ini, isi url + anonKey Supabase (boleh kosong)
      - Kalau kosong -> mode LOKAL, data disimpan di localStorage

   2. PRODUCTION
      - Jangan edit file ini. Buat file `config.prod.js` di folder yang
        sama (js/config.prod.js) berisi credential asli:

          window.SUPABASE_CONFIG_OVERRIDE = {
            url: "https://xxxx.supabase.co",
            anonKey: "eyJhbGciOi...",
          };

        File itu dimuat OTOMATIS oleh blok auto-load di bawah —
        TIDAK perlu menambahkan <script> di setiap halaman.
        (Kalau Anda sudah menambahkan tag config.prod.js manual
        sebelum file ini, auto-load otomatis menyerah.)

      - Mode lokal otomatis MATI di production (lihat mode di bawah).
   ===================================================================== */

/* ---------------------------------------------------------------------
   AUTO-LOAD config.prod.js (opsional)
   ---------------------------------------------------------------------
   Menyisipkan <script src="config.prod.js"> tepat setelah file ini,
   memakai document.write — hanya bisa dilakukan selama halaman masih
   diparse (config.js memang dimuat sebagai script biasa, tanpa
   defer/async). Lalu konfigurasi diterapkan ulang oleh script inline
   kedua, setelah config.prod.js selesai dieksekusi.

   Kalau config.prod.js tidak ada, browser hanya melaporkan 404 yang
   diabaikan js/error-logger.js (file ini memang opsional).
   --------------------------------------------------------------------- */
(function autoLoadConfigProd() {
  try {
    /* Sudah dimuat manual (tag sebelum config.js) -> jangan gandakan. */
    if (window.SUPABASE_CONFIG_OVERRIDE) return;
    /* Terlambat untuk document.write (mis. script di-defer) -> lewati. */
    if (document.readyState !== "loading") return;

    const script = document.currentScript;
    if (!script || script.async || script.defer || !script.src) return;

    const base = script.src.replace(/[^/]*$/, "");
    document.write(`<script src="${base}config.prod.js"><\/script>`);
    document.write(
      "<script>window.__applySupabaseConfig && window.__applySupabaseConfig();<\/script>",
    );
  } catch (error) {
    /* Auto-load bersifat opsional — kegagalan tidak boleh merusak
       halaman. Konfigurasi default tetap dipakai. */
  }
})();

/* Konfigurasi dasar (diklasifikasi, tidak diubah saat build) */
const SUPABASE_DEFAULTS = {
  url: "https://ggmjihuasfcjxvuewryn.supabase.co",
  anonKey: "sb_publishable_kx2HEvryTZWqtxDDiTtRsA_SMRsGEUH",

  /* Halaman tujuan setelah login. */
  adminRedirect: "dashboard.html",
  customerRedirect: "dashboard.html",

  /* Batas jumlah baris yang dimuat sekali dari server.
     Naikkan kalau data Anda masih sedikit. */
  maxRows: 5000,

  /* Batas waktu (ms) untuk satu permintaan ke Supabase. */
  requestTimeout: 15000,
};

/* Environment: "dev" | "prod" (bisa di-override lewat query ?env=) */
const urlParams =
  typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();

const APP_ENV =
  urlParams.get("env") ||
  window.SUPABASE_ENV ||
  (window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.protocol === "file:"
    ? "dev"
    : "prod");

/* Gabungkan default + override (file config.prod.js) lalu tentukan
   mode. Dipanggil dua kali: sekali saat file ini dieksekusi (hasil
   default), sekali lagi oleh auto-load setelah config.prod.js siap. */
window.__applySupabaseConfig = function () {
  window.SUPABASE_CONFIG = {
    ...SUPABASE_DEFAULTS,
    ...(window.SUPABASE_CONFIG_OVERRIDE || {}),
  };

  window.SUPABASE_CONFIG.env = APP_ENV;
  window.SUPABASE_CONFIG.isProduction = APP_ENV === "prod";

  /* ---------------------------------------------------------------------
     MODE LOKAL TIDAK BOLEH AKTIF DI PRODUCTION
     Di production, aplikasi WAJIB terhubung ke Supabase. Kalau credential
     belum diisi, halaman ditampilkan dengan pesan error yang jelas
     (bukan diam-diam memakai localStorage).
     --------------------------------------------------------------------- */
  window.SUPABASE_CONFIG.localModeAllowed =
    !window.SUPABASE_CONFIG.isProduction;

  return window.SUPABASE_CONFIG;
};

window.__applySupabaseConfig();
