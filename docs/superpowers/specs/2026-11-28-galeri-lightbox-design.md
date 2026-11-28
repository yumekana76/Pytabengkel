# Desain: Galeri bengkel — foto + judul saja, detail muncul saat diklik

Tanggal: 2026-11-28
Status: disetujui user ("aku setuju sama semua saranmu")

## Intent

Kartu galeri di landing page saat ini menampilkan foto + judul + keterangan
sekaligus, sehingga area foto terlihat ramai. User ingin kartu hanya menampilkan
**foto dan judul**; **keterangan (deskripsi) muncul saat foto diklik**, lewat
lightbox.

## Goals

- Kartu galeri (grid) hanya menampilkan foto + judul.
- Klik foto → lightbox: foto besar + judul + keterangan lengkap.
- Penutup: tombol ×, klik area gelap, tombol Esc.
- Petunjuk bisa diklik: ikon k zoom kecil di sudut kartu; kartu bisa difokus
  keyboard (Enter/Spasi).
- Berlaku untuk **dua sumber**: galeri admin (`workshop_info.galeri_foto`) dan
  galeri bawaan `html/index.html`.

## Non-goals

- Tanpa navigasi prev/next di dalam lightbox (sesuai permintaan).
- Tidak mengubah layout grid/mosaik, urutan, atau data galeri.
- Foto bawaan yang belum punya foto asli (kartu placeholder ikon) tetap bisa
  diklik — lightbox menampilkan blok gradasi + ikon yang sama, jadi
  keterangan tidak hilang begitu saja.

## Keputusan desain

- **CSS** (`css/landing.css`): `.lp-gallery-item figcaption span` disembunyikan
  di kartu (deskripsi tetap ada di DOM, dibaca lightbox); `::before` kartu jadi
  lencana ikon zoom (Font Awesome `\f00e`); blok gaya `.lp-lightbox*` di akhir
  file (setelah `.lp-media-fallback`, supaya aturan gradasi tidak menimpa).
- **HTML** (`html/index.html`): satu markup lightbox `#lpLightbox`
  (`role="dialog"`, `aria-modal`) berisi `#lpLightboxImg`,
  `#lpLightboxPlaceholder` (gradasi + ikon), `#lpLightboxJudul`,
  `#lpLightboxDeskripsi`, tombol `#lpLightboxClose`.
- **JS** (`js/landing.js`):
  - `siapkanItemGaleri(grid)` — tiap `.lp-gallery-item` diberi `tabindex="0"`,
    `role="button"`, `aria-label` judul foto; dipanggil saat init (galeri
    bawaan) dan setiap `renderGallery()` selesai (galeri admin).
  - `initLightbox()` — delegasi klik & keydown (Enter/Spasi) di grid,
    tombol tutup, klik backdrop, Esc global; kunci scroll body saat terbuka,
    kembalikan fokus ke kartu asal saat ditutup.
  - `bukaLightbox(item)` / `tutupLightbox()` — salin src/judul/deskripsi dari
    kartu; tanpa `<img>` → tampilkan placeholder.

## Verifikasi

`node --check js/landing.js` + skrip Playwright
`scripts/verify-galeri-lightbox.cjs` (server statis + RPC dipalsukan):
kartu hanya judul (deskripsi `display:none`), klik foto membuka lightbox
berisi judul + deskripsi, Esc menutupnya.
