# Foto Slot Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Semua lokasi foto di landing page (hero samping, foto mini hero, foto keunggulan, 4 thumbnail kartu layanan) bisa diganti lewat halaman Landing Page di panel super admin.

**Architecture:** Satu kolom JSON baru `workshop_info.media_foto` menampung 7 slot foto (kunci → URL), dibaca landing page lewat RPC anon `public_workshop_info()` yang ikut diperbarui. Halaman admin mendapat tombol + modal "Foto Halaman" yang mengunggah ke bucket `site-assets` memakai helper yang sama seperti hero/galeri. Landing page selalu punya `<img>` dengan foto default di `asset/img/`; ikon fallback lama tampil hanya bila gambar gagal dimuat.

**Tech Stack:** HTML statis + vanilla JS (ES5-ish, gaya repo), CSS biasa, Supabase (Postgres RPC + Storage), Python `http.server` untuk verifikasi lokal, Playwright untuk verifikasi runtime.

**Spec:** `docs/superpowers/specs/2026-11-28-landing-foto-slots-design.md`

## Global Constraints

- Bahasa UI dan komentar: **Indonesia**, mengikuti gaya komentar "kenapa" yang sudah ada di file.
- CSP `html/index.html`: `img-src 'self' data: https://*.supabase.co` → foto default wajib path relatif dalam origin (`../asset/img/…`), foto admin wajib URL storage Supabase. `blob:` tidak diizinkan.
- Kunci slot (nilai di `media_foto`, dipakai konsisten di semua file): `hero_sisi`, `hero_mini`, `fitur`, `layanan_servis`, `layanan_diagnosa`, `layanan_suku`, `layanan_qc`.
- Foto default (hanya dipakai bila slot kosong): `../asset/img/hero-workshop.jpg`, `../asset/img/galeri-detailing.jpg`, `../asset/img/keunggulan-technician.jpg`, `../asset/img/layanan-servis-rutin.jpg`, `../asset/img/layanan-diagnosa.jpg`, `../asset/img/layanan-suku-cadang.jpg`, `../asset/img/layanan-quality-control.jpg` (urutan sama dengan daftar kunci di atas).
- Batas upload identik dengan hero/galeri: tipe `image/*`, maks 5 MB, kompresi `compressLandingPhoto()`, bucket `site-assets`.
- Tidak mengubah layout, teks, atau urutan section landing; tidak menyentuh `html/detail.html` atau portal customer; tidak mengubah aturan akses/role.
- Jangan meng-commit `.env`, `js/config.prod.js`, `node_modules/`.
- Verifikasi sintaks setiap perubahan JS: `node --check <file>`.

## Review Focus

1. **Migrasi belum dijalankan** (kolom `media_foto` belum ada di Supabase) → landing tetap tampil dengan foto bawaan dan admin tidak error. Diuji: Task 5 skenario B (respons RPC tanpa/kosong `media_foto`) + langkah manual SQL di Task 1.
2. **URL foto admin rusak/404** → gambar dilepas dari DOM, ikon fallback lama tampil kembali, tidak ada kotak gambar pecah. Diuji: Task 5 skenario C.
3. **Data `media_foto` terisi** → ketujuh `<img>` berganti ke URL admin (id dan urutan slot benar, tidak ada slot yang tertinggal). Diuji: Task 5 skenario A.
4. **Ganti/hapus foto** → file lama di bucket dihapus hanya bila tidak lagi dipakai slot mana pun; kegagalan upload membatalkan antrian tanpa meninggalkan file yatim. Diuji: langkah manual super admin di Task 5 (butuh akun login) + pemeriksaan langkah simpan di Task 4.
5. **File bukan gambar / >5 MB** → ditolak dengan pesan jelas sebelum upload. Diuji: langkah manual super admin di Task 5 (butuh akun login) + pemeriksaan validasi di Task 2.

---

### Task 1: Skema database `media_foto` + perbaruan RPC

**Files:**
- Modify: `supabase/schema.sql` (blok `create table public.workshop_info` baris ~49-68; blok `alter table` baris ~1116-1122; fungsi `public.public_workshop_info()` baris ~1126-1154)

**Interfaces:**
- Consumes: —
- Produces: kolom `public.workshop_info.media_foto jsonb not null default '{}'::jsonb`; RPC `public.public_workshop_info()` mengembalikan kolom tambahan `media_foto jsonb` (di atas `galeri_foto` tidak masalah — urutan kolom RPC mengikuti daftar `returns table` yang ditulis bersamaan).

- [ ] **Step 1: Tambah kolom di `create table`**

Di `supabase/schema.sql`, setelah baris `hero_autoplay boolean not null default false,` pada tabel `workshop_info`, tambahkan:

```sql
  -- Foto slot tetap landing (hero samping, hero mini, keunggulan,
  -- kartu layanan): object JSON { slot: url }. Kosong = foto bawaan.
  media_foto jsonb not null default '{}'::jsonb,
```

- [ ] **Step 2: Tambah pernyataan migrasi**

Setelah baris `alter table public.workshop_info add column if not exists hero_autoplay ...` (± baris 1122), tambahkan:

```sql
alter table public.workshop_info add column if not exists media_foto jsonb not null default '{}'::jsonb;
```

- [ ] **Step 3: Perbarui RPC `public_workshop_info()`**

Di blok `returns table (...)`, setelah `hero_autoplay boolean` tambahkan `media_foto jsonb,`; di body `select ...`, tambahkan `media_foto,` setelah `hero_autoplay`.

- [ ] **Step 4: Verifikasi perubahan SQL**

```bash
grep -n "media_foto" supabase/schema.sql
```
Expected: minimal 3 kecocokan — kolom `create table`, `alter table ... add column`, dan RPC (returns + select = 4).

- [ ] **Step 5: Migrasi dijalankan di Supabase (langkah manual user, boleh menyusul)**

Minta user menjalankan isi `supabase/schema.sql` (atau setidaknya dua pernyataan `media_foto` + fungsi RPC yang baru) di SQL Editor Supabase. Sampai langkah ini selesai, Task 5 skenario B yang menjamin halaman tetap jalan.

- [ ] **Step 6: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat(landing): tambah kolom media_foto + RPC public_workshop_info"
```

---

### Task 2: Lapisan data `js/db.js`

**Files:**
- Modify: `js/db.js` (fungsi `normalizeHeroSlides` ± baris 1091-1116; pemetaan load `DB.cache.info` ± baris 874-890; `getBengkelInfoLengkap` baris 1118-1137; `saveWorkshopInfo` baris 2094-2145; blok foto storage ± baris 1685-1895)

**Interfaces:**
- Consumes: kolom `workshop_info.media_foto` (Task 1), fungsi `compressLandingPhoto(file)`, `removeSiteAsset(url)`, `dbIsAdmin()`, `upsertRows()` yang sudah ada.
- Produces:
  - `var MEDIA_FOTO_SLOTS: string[]` — 7 kunci slot, urutan sesuai Global Constraints.
  - `function normalizeMediaFoto(value: any): Object<string,string>` — kembalikan object berisi hanya kunci slot dengan URL ter-trim non-kosong; string JSON di-parse dulu; nilai rusak → `{}`.
  - `function uploadSitePhoto(file: File): Promise<string>` — validasi + kompres + upload ke `site-assets`, kembalikan URL publik.
  - `DB.cache.info.mediaFoto: Object<string,string>` (key camelCase di cache, snake_case di kolom).
  - `getBengkelInfoLengkap().mediaFoto` dan `saveWorkshopInfo({ mediaFoto })`.

- [ ] **Step 1: Tambah `MEDIA_FOTO_SLOTS` + `normalizeMediaFoto`**

Setelah fungsi `normalizeHeroSlides` (± baris 1116), tambahkan konstanta 7 kunci urut dan fungsi normalisasi dengan komentar yang menjelaskan format `{ slot: url }`, toleransi string JSON (sama seperti `normalizeGalleryFoto`), dan aturan buang nilai kosong.

- [ ] **Step 2: Simpan ke cache saat load**

Di blok pemetaan `DB.cache.info = info.data?.[0] ? { ... }`, tambahkan baris:

```js
          mediaFoto: normalizeMediaFoto(info.data[0].media_foto),
```

- [ ] **Step 3: Tambahkan ke `getBengkelInfoLengkap()`**

Setelah baris `heroAutoplay: info.heroAutoplay === true,` tambahkan:

```js
    mediaFoto: normalizeMediaFoto(info.mediaFoto),
```

- [ ] **Step 4: `saveWorkshopInfo` menulis `media_foto`**

Di `saveWorkshopInfo(info)`, setelah perhitungan `heroAutoplay`, tambahkan penyelesaian nilai (hanya ditimpa bila pemanggil menyertakan `mediaFoto`, sama seperti perilaku `keep`):

```js
  const mediaFoto =
    info.mediaFoto !== undefined
      ? normalizeMediaFoto(info.mediaFoto)
      : normalizeMediaFoto(prev.mediaFoto);
```

Tambahkan `mediaFoto,` ke objek `DB.cache.info = { ... }`, dan `media_foto: DB.cache.info.mediaFoto || {},` ke payload upsert `workshop_info`.

- [ ] **Step 5: Tambah `uploadSitePhoto(file)`**

Setelah fungsi `uploadHeroPhoto`, tambahkan `async function uploadSitePhoto(file)` yang menyalin alur `uploadHeroPhoto` persis: guard `supabaseClient`, guard `dbIsAdmin()` (pesan: `"Hanya admin yang dapat mengganti foto landing page."`), tolak bukan `image/*`, tolak >5 MB, `await compressLandingPhoto(file)`, tolak >5 MB setelah kompres, ekstensi dari nama file (fallback `jpg`), path `` `foto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}` ``, upload `upsert: false` ke `site-assets`, lalu `getPublicUrl` → `return pub.publicUrl`.

- [ ] **Step 6: Verifikasi sintaks**

```bash
node --check js/db.js
```
Expected: tanpa keluaran (exit 0).

```bash
grep -n "mediaFoto\|uploadSitePhoto\|MEDIA_FOTO_SLOTS" js/db.js
```
Expected: kecocokan di normalisasi, load cache, getter, save (cache + payload), dan fungsi upload.

- [ ] **Step 7: Commit**

```bash
git add js/db.js
git commit -m "feat(landing): data layer media_foto + uploadSitePhoto"
```

---

### Task 3: Render foto slot di landing page

**Files:**
- Modify: `html/index.html` (slot hero baris 162-176, keunggulan baris 246-258, kartu layanan baris 348-401)
- Modify: `css/landing.css` (dekat blok `.lp-media-fallback` ± baris 3962-4015)
- Modify: `js/landing.js` (sebelum `renderInfo`, ± baris 423; pemanggilan di `renderInfo` baris 449-456)

**Interfaces:**
- Consumes: `info.media_foto` dari RPC (Task 1), kunci slot + URL default dari Global Constraints.
- Produces:
  - Id `<img>` di HTML: `lpMediaHeroSisi`, `lpMediaHeroMini`, `lpMediaFitur`, `lpMediaLayananServis`, `lpMediaLayananDiagnosa`, `lpMediaLayananSuku`, `lpMediaLayananQc`.
  - `function renderMediaFoto(info: object): void` di `js/landing.js`, dipanggil dari `renderInfo(rows)`.

- [ ] **Step 1: Sisipkan `<img>` di 7 slot `html/index.html`**

Aturan untuk ketujuh slot: `<img>` jadi **anak pertama** wadah, sebelum `<span class="lp-media-fallback">`, dengan atribut `id`, `src` foto default (daftar Global Constraints), `alt` sesuai isi slot, dan `loading="lazy"` — kecuali dua foto hero (`lpMediaHeroSisi`, `lpMediaHeroMini`) yang di atas lipatan layar: tanpa `loading` (eager).

Contoh slot pertama (di `<figure class="lp-hero-photo">`, sebelum `<span class="lp-media-fallback lp-media-hero">`):

```html
              <img
                id="lpMediaHeroSisi"
                src="../asset/img/hero-workshop.jpg"
                alt="Suasana bengkel Pytabengkel"
              />
```

Sisanya mengikuti pola sama di:
1. `<figure class="lp-hero-photo-mini">` → `lpMediaHeroMini`, `../asset/img/galeri-detailing.jpg`, alt `"Detailing kendaraan di Pytabengkel"`.
2. `<figure class="lp-feature-photo">` → `lpMediaFitur`, `../asset/img/keunggulan-technician.jpg`, alt `"Teknisi Pytabengkel memeriksa kendaraan"`.
3. Empat `<a class="lp-service-card">`: `lpMediaLayananServis`/`layanan-servis-rutin.jpg`/alt `"Servis rutin dan tune up"`, `lpMediaLayananDiagnosa`/`layanan-diagnosa.jpg`/alt `"Diagnosa mesin komputerized"`, `lpMediaLayananSuku`/`layanan-suku-cadang.jpg`/alt `"Suku cadang dan kaki-kaki"`, `lpMediaLayananQc`/`layanan-quality-control.jpg`/alt `"Quality control dan test drive"` — masing-masing sebagai anak pertama `<div class="lp-service-media">`, sebelum `<span class="lp-media-fallback lp-media-service">`.

- [ ] **Step 2: Sembunyikan ikon fallback ketika ada foto (`css/landing.css`)**

Setelah blok aturan `.lp-hero-photo-mini .lp-media-fallback { ... }` (± baris 4015), tambahkan:

```css
/* Slot sudah punya foto (bawaan HTML atau dari admin) → ikon fallback
   tidak ikut tampil supaya tidak menumpuk di bawah foto. landing.js
   melepas <img> bila gambarnya gagal dimuat, sehingga ikon kembali. */
.lp-hero-photo > img ~ .lp-media-fallback,
.lp-hero-photo-mini > img ~ .lp-media-fallback,
.lp-feature-photo > img ~ .lp-media-fallback,
.lp-service-media > img ~ .lp-media-fallback {
  display: none;
}
```

- [ ] **Step 3: `renderMediaFoto` di `js/landing.js`**

Sebelum `function renderInfo(rows)`, tambahkan peta id + fungsi render:

```js
  /* Foto slot tetap (hero samping, hero mini, keunggulan, kartu layanan).
     Kosong = foto bawaan di html/index.html; URL admin menggantikannya. */
  var MEDIA_FOTO_IDS = {
    hero_sisi: "lpMediaHeroSisi",
    hero_mini: "lpMediaHeroMini",
    fitur: "lpMediaFitur",
    layanan_servis: "lpMediaLayananServis",
    layanan_diagnosa: "lpMediaLayananDiagnosa",
    layanan_suku: "lpMediaLayananSuku",
    layanan_qc: "lpMediaLayananQc",
  };

  function renderMediaFoto(info) {
    var media = info.media_foto;

    if (typeof media === "string") {
      try {
        media = JSON.parse(media);
      } catch (error) {
        media = null;
      }
    }

    Object.keys(MEDIA_FOTO_IDS).forEach(function (slot) {
      var img = document.getElementById(MEDIA_FOTO_IDS[slot]);
      if (!img) return;

      /* Gambar gagal dimuat (URL dihapus/diblokir) → lepas <img>
         supaya ikon fallback di bawahnya tampil lagi. */
      img.onerror = function () {
        img.remove();
      };

      var url =
        media && typeof media === "object"
          ? String(media[slot] || "").trim()
          : "";

      if (url) img.src = url;
    });
  }
```

- [ ] **Step 4: Panggil dari `renderInfo`**

Di `renderInfo(rows)`, setelah baris `renderGallery(info.galeri_foto);`, tambahkan `renderMediaFoto(info);` dengan komentar bahwa foto slot mengikuti data admin dan tetap foto bawaan bila kosong.

- [ ] **Step 5: Verifikasi sintaks + markup**

```bash
node --check js/landing.js
grep -c 'id="lpMedia' html/index.html
```
Expected: `node --check` exit 0; `grep -c` menghasilkan `7` (ketujuh slot punya `<img>` ber-id).

```bash
grep -n "img ~ .lp-media-fallback" css/landing.css
```
Expected: 4 selektor + 1 blok aturan.

- [ ] **Step 6: Commit**

```bash
git add html/index.html css/landing.css js/landing.js
git commit -m "feat(landing): render 7 foto slot dengan fallback ikon"
```

---

### Task 4: Modal "Foto Halaman" di halaman admin landing

**Files:**
- Modify: `html/admin-page/landing.html` (panel `data-landing-tab-panel="hero"` baris 169-200; sisipkan modal baru setelah `galeriModal` baris 707)
- Modify: `js/landing-admin.js` (`renderLandingPreview` baris 15-105; blok galeri di dalam `initLandingAdminPage` berakhir ± baris 1020)

**Interfaces:**
- Consumes: `uploadSitePhoto(file)`, `normalizeMediaFoto` / `getBengkelInfoLengkap().mediaFoto` (Task 2), helper global `openModal`, `closeModal`, `escapeHTML`, `showPageNotice`, `saveWorkshopInfo`, `removeSiteAsset`.
- Produces:
  - Tombol `#btnMediaFoto` dan modal `#landingMediaModal` dengan: `#mediaManager` (wadah daftar slot), `#mediaFotoInput` (`type=file accept="image/*"` tersembunyi), `#mediaFormError`, tombol `#btnSimpanMedia`.
  - `MEDIA_SLOTS` (array `{ key, label }`, 7 entri berurutan) + `renderMediaManager()` di `js/landing-admin.js`.

- [ ] **Step 1: Tombol pengelola di `html/admin-page/landing.html`**

Setelah blok `setting-btn` tombol **Informasi Bengkel** (± baris 199), tambahkan blok `setting-btn` serupa: tombol `btnMediaFoto` kelas `btn btn-secondary`, ikon `fa-solid fa-panorama`, teks `Foto Halaman`, plus `span.setting-description` berisi: "Ganti foto hero samping, foto keunggulan, dan thumbnail kartu layanan landing page (maks 5 MB per foto)."

- [ ] **Step 2: Modal markup**

Setelah penutup `#galeriModal` (± baris 707), tambahkan `div.modal-overlay` id `landingMediaModal` menyalin struktur `galeriModal`: `role="dialog"`, `aria-labelledby="landingMediaModal-title"`, judul `Foto Halaman`, deskripsi "Atur foto hero samping, foto keunggulan, dan kartu layanan.", tombol `data-close-modal="landingMediaModal"`, `modal-body` berisi `<div class="galeri-manager" id="mediaManager"></div>`, `<input type="file" id="mediaFotoInput" class="form-control" accept="image/*" hidden />`, `<p class="form-error" id="mediaFormError" hidden></p>`, dan `modal-footer` berisi tombol Batal (`data-close-modal`) + tombol `btnSimpanMedia` (`btn btn-primary`, label `<i class="fa-solid fa-floppy-disk"></i> Simpan Foto`).

- [ ] **Step 3: State + render daftar slot (`js/landing-admin.js`)**

Di dalam `initLandingAdminPage()`, setelah blok kode galeri (± baris 1020), tambahkan blok baru `/* FOTO HALAMAN */` berisi:
- `const MEDIA_SLOTS = [ ... ]` dengan 7 entri `{ key, label }` berurutan sesuai Global Constraints; label: `Foto hero samping`, `Foto mini hero (Quality Check)`, `Foto Keunggulan`, `Kartu layanan: Servis Rutin & Tune Up`, `Kartu layanan: Perbaikan & Diagnosa Mesin`, `Kartu layanan: Suku Cadang & Kaki-kaki`, `Kartu layanan: Quality Control & Test Drive`.
- Referensi elemen: `mediaButton`, `mediaManager`, `mediaInput`, `mediaSimpan`, `mediaErrorEl`, state `mediaItems` (isi `{ key, label, url, file, preview }`) dan `mediaPickIndex`.
- `showMediaError(message)` (isi `mediaErrorEl`, `hidden` bila kosong) dan `renderMediaManager()` yang membangun HTML per slot memakai kelas yang sudah ada `galeri-admin-item` / `galeri-admin-thumb` / `galeri-admin-fields` / `galeri-admin-actions`, dengan `src` = `preview || url || ""` (lewat `escapeHTML`), label nama slot, dan dua tombol: `data-media-pick="index"` (`<i class="fa-solid fa-upload"></i> Ganti`) serta `data-media-reset="index"` (`<i class="fa-solid fa-rotate-left"></i> Foto Bawaan`, `disabled` bila slot sudah memakai foto bawaan). Sumber foto bawaan ditampilkan sebagai keterangan teks `"Foto bawaan"` bila `url` kosong.

- [ ] **Step 4: Interaksi pilih file**

Tambahkan listener: tombol `mediaButton` mengisi `mediaItems` dari `getBengkelInfoLengkap().mediaFoto` (URL per kunci, `file`/`preview` kosong), `renderMediaManager()`, `showMediaError("")`, lalu `openModal("landingMediaModal")`. Klik `data-media-pick` menyimpan `mediaPickIndex`, mereset `mediaInput.value = ""`, lalu `mediaInput.click()`. Event `change` `mediaInput` memvalidasi `file.type` diawali `image/` dan `file.size <= 5 * 1024 * 1024` (bila tidak lolos → `showMediaError` dengan pesan jelas dan tidak ada state yang berubah), membaca preview via `FileReader` (`data:` URL — satu-satunya yang diizinkan CSP), menetapkan `file` + `preview` pada slot, lalu `renderMediaManager()`. Klik `data-media-reset` mengosongkan `url`/`file`/`preview` slot lalu render ulang.

- [ ] **Step 5: Alur simpan**

Listener `mediaSimpan.click` (async, salin pola penyimpanan galeri):
1. Tolak bila ada `item.file` yang belum terbaca (mis. preview gagal) — `showMediaError`, keluar.
2. Set tombol `disabled` + label `Menyimpan…`.
3. Untuk tiap `item.file`: `item.url = await uploadSitePhoto(item.file)`; kumpulkan `uploaded` untuk pembatalan.
4. Bangun `payload` object `{ [key]: url }` berisi hanya URL non-kosong, lalu `saveWorkshopInfo({ ...getBengkelInfoLengkap(), mediaFoto: payload })`.
5. Bersihkan file lama: bandingkan URL `getBengkelInfoLengkap().mediaFoto` sebelum simpan (simpan dulu salinannya di awal) dengan `payload`; untuk tiap URL lama yang tidak dipakai lagi → `removeSiteAsset(url).catch(function () {})`.
6. Sukses: `closeModal("landingMediaModal")`, `renderLandingPreview()`, `showPageNotice("Foto halaman disimpan.", "success")`.
7. Gagal (`catch`): batalkan URL hasil upload via `removeSiteAsset`, tampilkan pesan lewat `showMediaError`, jangan tutup modal.
8. `finally`: tombol dikembalikan, `renderMediaManager()` ulang.

- [ ] **Step 6: Pratinjau di `renderLandingPreview`**

Setelah blok `galeriPreview`, tambahkan `mediaPreview`: bila `Object.keys(info.mediaFoto || {}).length` > 0, tampilkan `detail-item full` berlabel `Foto Halaman (N slot)` dengan `span.detail-value.landing-galeri-preview` berisi `<img src=... alt=label slot>` per kunci (hanya URL admin — foto bawaan tidak ditampilkan supaya path relatif halaman admin tidak salah), lalu sertakan `mediaPreview` di akumulasi `box.innerHTML`.

- [ ] **Step 7: Verifikasi sintaks + markup**

```bash
node --check js/landing-admin.js
grep -n "btnMediaFoto\|landingMediaModal\|btnSimpanMedia" html/admin-page/landing.html
```
Expected: `node --check` exit 0; tiap id muncul ≥ 2 kali (dipakai di markup + referensi JS).

- [ ] **Step 8: Commit**

```bash
git add html/admin-page/landing.html js/landing-admin.js
git commit -m "feat(landing): modal Foto Halaman untuk 7 slot foto"
```

---

### Task 5: Verifikasi runtime + pemeriksaan manual

**Files:**
- Create: `scripts/verify-landing-media.cjs`

**Interfaces:**
- Consumes: seluruh perubahan Task 1-4, server statis di `:8000`.
- Produces: skrip verifikasi yang bisa dijalankan ulang; keluaran `PASS` per skenario, exit code 1 bila ada yang gagal.

- [ ] **Step 1: Siapkan Playwright di folder luar repo**

```bash
mkdir -p /tmp/opencode/pw && cd /tmp/opencode/pw && npm init -y >/dev/null && npm i --silent playwright@1.65.1 && npx playwright install chromium
```
Expected: instalasi selesai (unduhan browser bisa gagal bila offline — bila gagal, lanjut ke Step 5 dan jalankan checklist manual sepenuhnya).

- [ ] **Step 2: Tulis `scripts/verify-landing-media.cjs`**

Skrip CJS yang: (a) `require("playwright")`, (b) menjalankan server statis `python3 -m http.server 8000` dari root proyek (atau mengandalkan server yang sudah jalan), (c) membuka `http://localhost:8000/html/index.html` tiga kali dengan `page.route("**/rest/v1/rpc/*", ...)` memalsukan respons JSON, (d) mencetak PASS/GAGAL + `process.exitCode`.

Tiga skenario dan asersinya:
1. **Skenario A — data admin terisi:** route `public_workshop_info` mengembalikan `media_foto` berisi 7 kunci → URL `https://example.com/<key>.jpg`; route RPC lain (`public_promos`, `public_page_blocks`, `public_reviews`) mengembalikan `[]`. Setelah `#lpMediaHeroSisi` muncul: assert ketujuh id punya `getAttribute("src")` persis sesuai URL mock, dan `getComputedStyle` dari `span.lp-media-fallback` terdekatnya berupa `display: "none"`.
2. **Skenario B — kolom/k data kosong (mis. migrasi belum jalan):** route yang sama mengembalikan objek tanpa `media_foto`. Assert ketujuh `src` berakhiran path default (mis. `../asset/img/hero-workshop.jpg` → cocokkan suffix per slot) dan tidak ada error JS (kumpulkan `pageerror` → harus kosong).
3. **Skenario C — URL rusak:** `media_foto.hero_sisi = "https://example.com/hilang.jpg"`, lalu `page.route("https://example.com/hilang.jpg", r => r.fulfill({ status: 404 }))`. Setelah menunggu: assert `#lpMediaHeroSisi` sudah tidak ada di DOM dan fallback `.lp-hero-photo > .lp-media-fallback` kembali `display` selain `none`.

- [ ] **Step 3: Jalankan server statis**

```bash
python3 -m http.server 8000
```
(dijalankan di background dari root proyek; berhenti dengan Ctrl+C / `kill` setelah verifikasi)

- [ ] **Step 4: Jalankan skrip verifikasi**

```bash
NODE_PATH=/tmp/opencode/pw/node_modules node scripts/verify-landing-media.cjs
```
Expected: `PASS` untuk skenario A, B, C; exit code 0. Bila gagal → perbaiki lalu ulangi sebelum lanjut.

- [ ] **Step 5: Checklist manual super admin (butuh akun login — user yang menjalankan)**

1. Jalankan `supabase/schema.sql` (atau pernyataan `media_foto` + RPC baru) di SQL Editor Supabase, lalu buka `html/admin-page/landing.html` sebagai super admin.
2. Tab **Hero & Galeri** → tombol **Foto Halaman** → ganti foto "Foto hero samping" dengan gambar >5 MB → muncul pesan tolak; pilih gambar valid → thumbnail berubah.
3. **Simpan Foto** → tutup modal → buka landing page → foto hero samping sudah berganti; ketujuh slot lain tetap foto bawaan.
4. Ulangi untuk satu kartu layanan, lalu klik **Foto Bawaan** + simpan → landing kembali memakai foto default.
5. Cek Supabase Storage `site-assets`: file lama sudah hilang (hanya file yang tidak dipakai slot mana pun).
6. Nonaktifkan koneksi (offline) atau pakai URL rusak → gambar dilepas dan ikon fallback tampil.

- [ ] **Step 6: Commit**

```bash
git add scripts/verify-landing-media.cjs
git commit -m "test(landing): verifikasi render 7 foto slot via Playwright"
```

- [ ] **Step 7: Hentikan server statis**

Matikan proses `python3 -m http.server 8000` yang berjalan di background.
