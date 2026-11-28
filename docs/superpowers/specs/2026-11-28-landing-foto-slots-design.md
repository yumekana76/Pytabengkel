# Desain: Semua slot foto landing page bisa diedit lewat super admin

Tanggal: 2026-11-28
Status: menunggu persetujuan

## Intent

Admin menandai setiap foto di landing page harus bisa diganti dari halaman
**Landing Page** di panel super admin, tanpa menyentuh kode atau URL manual.
Saat ini sudah bisa: hero (tunggal/slide), galeri, dan gambar blok
"Informasi Terbaru". Yang belum: 6 slot berikut masih ikon fallback statis di
`html/index.html`:

1. Foto hero samping (`.lp-hero-photo`)
2. Foto mini hero "Quality Check" (`.lp-hero-photo-mini`)
3. Foto panel "Kenapa Harus Pytabengkel?" (`.lp-feature-photo`)
4. Thumbnail kartu layanan: Servis Rutin & Tune Up
5. Thumbnail kartu layanan: Perbaikan & Diagnosa Mesin
6. Thumbnail kartu layanan: Suku Cadang & Kaki-kaki
7. Thumbnail kartu layanan: Quality Control & Test Drive

(Total 7 slot baru; 7 = 4 kartu layanan dihitung satu per kartu.)

## Goals

- Tiap slot di atas punya kontrol ganti/hapus foto di halaman admin Landing
  Page, dengan preview.
- Upload langsung ke bucket Supabase `site-assets` (kompres, hapus file lama
  saat ganti/hapus) — konsisten dengan hero & galeri yang sudah ada.
- Slot kosong atau gambar gagal dimuat → tampil seperti sekarang: foto default
  dari `asset/img/`, lalu ikon fallback.

## Non-goals

- Tidak mengubah layout, teks, atau urutan section landing page.
- Tidak menambah slot selain daftar di atas (logo, foto ulasan, foto promo
  tidak diminta).
- Tidak menyentuh halaman detail (`detail.html`) atau portal customer.

## Constraints

- CSP `html/index.html` hanya mengizinkan `img-src 'self' data:
  https://*.supabase.co` → foto default harus file lokal repo, foto admin
  harus URL storage Supabase.
- `landing.js` hanya membaca data publik lewat RPC anon
  `public_workshop_info()` → RPC harus ikut diperbarui, bukan baca tabel
  langsung.
- `upsertRows()` di `js/db.js` membuang kolom yang belum ada di database lalu
  mengulang, jadi aplikasi tetap jalan sebelum migrasi dijalankan — tetapi
  kolom baru **tidak akan tersimpan** sampai `supabase/schema.sql` dijalankan
  ulang di SQL Editor Supabase.

## Approaches yang dipertimbangkan

1. **Satu kolom JSON `media_foto` di `workshop_info` + satu modal admin baru
   — DIPILIH.** Ringkas, semua slot di tempat yang sama, menambah slot ke
   depan cukup tambah kunci di object. Kekurangan: perlu jalankan ulang schema.
2. Kolom terpisah per slot (`feature_foto`, `service_foto_1..4`, …). Jelas di
   SQL tapi kaku — tiap tambah kartu layanan harus ubah schema + kode.
3. Titip lewat tabel `galeri_foto` / `page_blocks` yang sudah ada. Tanpa
   skema baru, tapi semantics salah dan UI admin jadi membingungkan.

## Keputusan desain

- **Kolom baru:** `media_foto jsonb not null default '{}'` di
  `public.workshop_info`, kunci:
  `{ hero_sisi, hero_mini, fitur, layanan_servis, layanan_diagnosa,
  layanan_suku, layanan_qc }` — nilai berupa URL string (kosong = default).
- **RPC:** `public.public_workshop_info()` ikut mengembalikan `media_foto`.
- **Foto default (slot kosong):** `asset/img/hero-workshop.jpg`,
  `asset/img/keunggulan-technician.jpg`,
  `asset/img/layanan-servis-rutin.jpg`, `asset/img/layanan-diagnosa.jpg`,
  `asset/img/layanan-suku-cadang.jpg`,
  `asset/img/layanan-quality-control.jpg`, dan
  `asset/img/galeri-*.jpg` tidak diubah (galeri sudah dikelola admin).
  Foto default ditulis sebagai `src` awal di HTML, bukan di JS.
- **Render:** `html/index.html` diberi `<img>` (dengan `src` default,
  `loading="lazy"`, `alt`) di tiap slot; bila `img` gagal dimuat, elemen
  dilepas sehingga ikon fallback yang sudah ada tampil kembali.
  `js/landing.js` mengganti `src` dari `media_foto` saat data publik masuk
  (URL admin) atau mengembalikan `src` default bila admin menghapus foto.
- **Storage:** helper generik baru `uploadSitePhoto(file)` di `js/db.js`
  (kompres + upload ke `site-assets` + URL publik) yang dipakai modal ini;
  `removeSiteAsset(url)` dipakai untuk bersih-bersih file lama, sama seperti
  perilaku galeri.
- **Admin UI:** tombol baru **"Foto Halaman"** di panel tab hero
  (`html/admin-page/landing.html`, sejajar `btnHeroFoto` / `btnGaleriFoto` /
  `btnInfoBengkel`) membuka modal `landingMediaModal`: daftar 7 slot, tiap
  slot = preview + nama slot + tombol *Ganti foto* + *Hapus*, plus tombol
  Simpan. Urutan upload → simpan kolom → hapus file lama (best-effort), sama
  seperti alur galeri.
- **Akses:** halaman `admin-page/landing.html` sudah digate role admin; tidak
  ada perubahan izin. RLS `workshop_info` tetap (admin yang menyimpan).
- **Preview admin:** `renderLandingPreview()` ikut menampilkan 7 foto baru
  supaya super admin langsung melihat hasilnya.

## Data flow

```
super admin → landingMediaModal → uploadSitePhoto() → bucket site-assets
           → saveWorkshopInfo({ mediaFoto }) → workshop_info.media_foto
landing    → RPC public_workshop_info() → renderInfo() → renderMediaFoto()
           → <img src> tiap slot (fallback ikon bila gagal/kosong)
```

## Yang dikerjakan builder (ringkas)

1. `supabase/schema.sql`: tambah kolom + perbarui fungsi
   `public_workshop_info()`, plus blok `alter table ... add column if not
   exists` di bagian migrasi.
2. `js/db.js`: normalisasi + cache `mediaFoto` (load line ~874, getter
   `getBengkelInfoLengkap`, `saveWorkshopInfo`), helper `uploadSitePhoto`.
3. `html/index.html`: `<img>` default di 7 slot.
4. `js/landing.js`: `renderMediaFoto(info)` dari `media_foto`.
5. `html/admin-page/landing.html`: tombol + modal `landingMediaModal`.
6. `js/landing-admin.js`: render slot, pilih file, hapus, simpan.
7. Jalankan `supabase/schema.sql` di SQL Editor Supabase (langkah manual
   user, setelah kode disetujui).

## Buka untuk builder

- Detail penamaan fungsi/element mengikuti gaya file yang ada.
