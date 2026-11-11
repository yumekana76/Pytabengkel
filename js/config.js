/* =====================================================================
   KONFIGURASI APLIKASI
   ---------------------------------------------------------------------
   Cara pakai:

   1. CREDENTIAL SUPABASE TIDAK LAGI DITULIS DI FILE INI.
      Sumbernya: environment variable `SUPABASE_URL` + `SUPABASE_ANON_KEY`
      (Vercel Environment Variables untuk deploy, atau file `.env` lokal).

      - DEVELOPMENT lokal:
          cp .env.example .env        # lalu isi
          node scripts/build-config.js
        Perintah terakhir membuat `js/config.prod.js` (gitignored) yang
        dimuat OTOMATIS oleh blok auto-load di bawah — tidak perlu
        menambahkan <script> di setiap halaman.
        (Kalau Anda sudah menambahkan tag config.prod.js manual sebelum
        file ini, auto-load otomatis menyerah.)

      - PRODUCTION (Vercel):
        build step `scripts/build-config.js` (lihat vercel.json)
        menulis `js/config.prod.js` dari Environment Variables.

   2. SATU MODE: SUPABASE
      Tidak ada lagi mode lokal/localStorage. Semua data dibaca & ditulis
      ke Supabase. Kalau url + anonKey kosong (config.prod.js belum ada),
      halaman menampilkan pesan konfigurasi yang jelas — bukan data dummy.
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

/* Konfigurasi dasar (diklasifikasi, tidak diubah saat build).
   url + anonKey SENGAJA dikosongkan di sini: credential datang dari
   js/config.prod.js (hasil generate scripts/build-config.js dari
   environment variable). Lihat .env.example. */
const SUPABASE_DEFAULTS = {
  url: "",
  anonKey: "",

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

  /* Mode lokal/localStorage sudah dihapus — aplikasi selalu memakai
     Supabase. Kalau credential belum diisi, supabase.js menampilkan
     pesan konfigurasi yang jelas (bukan diam-diam pakai localStorage). */

  return window.SUPABASE_CONFIG;
};

window.__applySupabaseConfig();
