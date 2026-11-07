/* =====================================================================
   CONTOH KONFIGURASI PRODUCTION
   ---------------------------------------------------------------------
   1. Salin file ini menjadi `js/config.prod.js`
   2. Isi `url` dan `anonKey` dari Supabase > Project Settings > API
   3. JANGAN pernah commit file `js/config.prod.js` (sudah masuk .gitignore)
   4. Tidak perlu menambahkan <script> di halaman mana pun —
      `js/config.js` memuat file ini OTOMATIS (auto-load) selama
      berada di folder yang sama (js/config.prod.js).
      (Tag manual sebelum config.js juga tetap didukung.)

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
