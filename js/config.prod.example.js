/* =====================================================================
   CONTOH KONFIGURASI PRODUCTION
   ---------------------------------------------------------------------
   1. Salin file ini menjadi `js/config.prod.js`
   2. Isi `url` dan `anonKey` dari Supabase > Project Settings > API
   3. JANGAN pernah commit file `js/config.prod.js` (sudah masuk .gitignore)
   4. Pastikan `js/config.prod.js` di-load SEBELUM `js/config.js`
      di setiap halaman:

        <script src="/js/config.prod.js"></script>
        <script src="/js/config.js"></script>

   CATATAN KEAMANAN
   - Hanya gunakan `anon` / `publishable` key. JANGAN `service_role`:
     key itu melewati seluruh Row Level Security dan hanya boleh di server.
   - File ini hanya berisi credential yang memang publik (anon key aman
     di frontend karena RLS yang melindungi data).
   ===================================================================== */

window.SUPABASE_CONFIG_OVERRIDE = {
  url: "https://GANTI-DENGAN-PROJECT-URL-SUPABASE.supabase.co",
  anonKey: "GANTI-DENGAN-ANON-PUBLIC-KEY-SUPABASE",

};
