/* =====================================================================
   KONFIGURASI APLIKASI
   ---------------------------------------------------------------------
   Cara pakai:

   1. DEVELOPMENT (default)
      - Buka file ini, isi url + anonKey Supabase (boleh kosong)
      - Kalau kosong -> mode LOKAL, data disimpan di localStorage

   2. PRODUCTION
      - Jangan edit file ini. Buat file `config.prod.js` yang menimpa
        nilai di bawah (isi dengan credential asli), lalu include
        `config.prod.js` SEBELUM `config.js` di setiap halaman:

          <script src="/js/config.prod.js"></script>
          <script src="/js/config.js"></script>

      - `config.prod.js` cukup berisi:

          window.SUPABASE_CONFIG_OVERRIDE = {
            url: "https://xxxx.supabase.co",
            anonKey: "eyJhbGciOi...",
          };

      - Mode lokal otomatis MATI di production (lihat mode di bawah).
   ===================================================================== */

/* Konfigurasi dasar (diklawsifikasi, tidak diubah saat build) */
const SUPABASE_DEFAULTS = {
  url: "",
  anonKey: "",

  /* Email yang otomatis mendapat role admin saat mendaftar. */
  adminEmail: "admin@workshop.com",

  /* Akun lokal (dipakai hanya saat Supabase belum terhubung / mode lokal).
     Credential ini SENGAJA TIDAK ditampilkan di halaman login supaya
     tidak mudah dilihat orang lain. Ganti passwordnya di sini (atau di
     `config.prod.js`) sebelum aplikasi dipakai demo di depan umum. */
  localAccounts: {
    admin: { email: "admin@workshop.com", password: "admin123" },
    customer: { email: "customer@workshop.com", password: "customer123" },
  },

  /* Halaman tujuan setelah login. */
  adminRedirect: "dashboard.html",
  customerRedirect: "dashboard.html",

  /* Isi data contoh ke Supabase saat tabel masih kosong. */
  seedDemoData: true,

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

/* Gabungkan default + override (file config.prod.js) */
window.SUPABASE_CONFIG = {
  ...SUPABASE_DEFAULTS,
  ...(window.SUPABASE_CONFIG_OVERRIDE || {}),
};

window.SUPABASE_CONFIG.env = APP_ENV;
window.SUPABASE_CONFIG.isProduction = APP_ENV === "prod";

/* ---------------------------------------------------------------------
   MODE LOKAL TIDAK BOLEH AKTIF DI PRODUCTION
   ---------------------------------------------------------------------
   Di production, aplikasi WAJIB terhubung ke Supabase. Kalau credential
   belum diisi, halaman ditampilkan dengan pesan error yang jelas
   (bukan diam-diam memakai localStorage).
   --------------------------------------------------------------------- */

window.SUPABASE_CONFIG.localModeAllowed = !window.SUPABASE_CONFIG.isProduction;
