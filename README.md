# Pytabengkel — Portal Admin & Customer

Aplikasi web bengkel dengan **landing page publik** serta **portal super admin,
admin, dan customer** yang saling terhubung, **semuanya terhubung ke Supabase**
(database + auth + RLS). Tidak ada mode lokal — semua data dibaca & ditulis
ke Supabase saja.

> **100% HTML + CSS + JavaScript murni.** Tanpa framework, tanpa `npm install`,
> tanpa dependensi. Tinggal buka `html/index.html` di browser.
> (Satu-satunya "build" ada di Vercel: `scripts/build-config.js` yang hanya
> menulis `js/config.prod.js` dari environment variable — lihat
> [Environment variables](#0-environment-variables-supabase--vercel).)

> **Satu mode: Supabase.** Credential datang dari **environment variable**
> (`SUPABASE_URL` + `SUPABASE_ANON_KEY`) lalu di-embed ke
> `js/config.prod.js` oleh `scripts/build-config.js` — otomatis saat build
> Vercel, atau `node scripts/build-config.js` untuk lokal.
> `js/config.js` sendiri **tidak berisi credential**. Kalau credential belum
> ada (belum dijalankan build-nya), halaman menampilkan **pesan konfigurasi
> yang jelas** — tidak ada fallback data lokal lagi.

---

## 📁 Struktur Project

```
.
├── index.html                  # Redirect root → html/landing.html
├── html/                       # 📄 Semua halaman HTML
│   ├── landing.html            # ⭐ Landing page publik (beranda)
│   ├── index.html              # Login terpadu (Admin / Super Admin / Customer)
│   ├── admin-page/             # 🔧 Portal Admin & Super Admin
│   │   ├── dashboard.html      #   Dashboard
│   │   ├── customers.html      #   Manajemen customer (+ kelola akun login)
│   │   ├── kendaraan.html      #   Antrean kendaraan / service
│   │   ├── service.html        #   Proses service + status pembayaran
│   │   ├── riwayat.html        #   Riwayat service selesai + jejak perubahan (aktivitas)
│   │   ├── keuangan.html       #   Pendapatan per bulan
│   │   ├── mekanik.html        #   Data mekanik
│   │   ├── sparepart.html      #   Stok sparepart
│   │   ├── diskon.html         #   Promo & diskon (kode, nilai, periode)
│   │   ├── users.html          #   Kelola Pengguna & role (khusus super admin)
│   │   └── pengaturan.html     #   Info bengkel, backup, reset data
│   └── customers-page/         # 👤 Portal Customer
│       ├── register.html       #   Pendaftaran akun baru
│       ├── dashboard.html      #   Ringkasan kendaraan, service, tagihan
│       ├── kendaraan.html      #   Kendaraan saya + ajukan service
│       ├── service.html        #   Lacak progress service (stepper status)
│       ├── riwayat.html        #   Riwayat service + rincian tagihan
│       ├── keuangan.html       #   ⭐ Ringkasan keuangan / tagihan customer
│       ├── profil.html         #   Edit profil & ubah password
│       └── pengaturan.html     #   Tema, info akun, logout
├── supabase/
│   └── schema.sql              # ⭐ DDL: tabel, trigger, RLS, fungsi
├── .env.example                # Template environment variable (isi jadi `.env`)
├── scripts/
│   ├── build-config.js         # ⭐ env var -> js/config.prod.js (build Vercel)
│   └── apply-schema.py         # Jalankan supabase/schema.sql dari terminal
├── css/                        # Design token + light/dark theme
├── js/
│   ├── config.js               # Konfigurasi app (credential via env var)
│   ├── supabase.js             # Client Supabase + Auth service
│   ├── db.js                   # Data layer (semua dari Supabase)
│   ├── theme.js                # Engine tema terang/gelap
│   ├── auth.js                 # Guard halaman admin
│   ├── customer-auth.js        # Guard + sesi customer
│   ├── customer-register.js    # Logika pendaftaran customer
│   ├── login.js                # Logika halaman login terpadu
│   ├── global.js               # Helper bersama
│   ├── landing.js              # Logika landing page (data publik, ulasan, navigasi)
│   ├── diskon.js               # Logika halaman Diskon/Promo
│   ├── users.js                # Logika halaman Kelola Pengguna
│   └── vendor/supabase.min.js  # Library Supabase (self-hosted)
```

> **Tidak ada `package.json`, `node_modules`, atau proses build.**
> Folder ini bisa langsung di-upload ke hosting statis apa pun.

### 🗺️ Alur Halaman

```
Landing publik (html/landing.html — juga root "/")
   ├─ Nav di header · hero · promo & diskon · layanan · ulasan · kontak
   │
   └─ Masuk ► html/index.html (login terpadu)
        ├─ Administrator / Super Admin ──► html/admin-page/dashboard.html
        │                            ├─ customers · kendaraan · service
        │                            ├─ riwayat · keuangan · mekanik
        │                            ├─ sparepart · diskon · pengaturan
        │                            └─ … + users.html (Kelola Pengguna)
        │
        └─ Customer ─────────────► html/customers-page/dashboard.html
                                     ├─ kendaraan · service · riwayat
                                     ├─ keuangan
                                     └─ profil · pengaturan

Guard auth: belum login → arahkan ke ../index.html?role=admin|super_admin|customer
```

## 👥 Role & Hak Akses

| Role | Bisa mengakses | Catatan |
|---|---|---|
| `super_admin` | Seluruh portal admin + **Kelola Pengguna** | Satu-satunya role yang boleh mengubah role akun lain. Tidak bisa menurunkan role akunnya sendiri. |
| `admin` | Seluruh operasional bengkel | Tidak bisa mengubah role akun siapa pun (dijaga trigger database, bukan hanya UI). |
| `customer` | Portal customer | Hanya melihat kendaraan, service, tagihan, dan ulasan miliknya sendiri. |

Pendaftaran baru **selalu** menjadi `customer`. Role staf (`admin` /
`super_admin`) ditetapkan manual lewat SQL Editor, lalu bisa dikelola dari
halaman **Kelola Pengguna** oleh super admin.

---

## 🔌 Cara Menyambungkan ke Supabase

### Langkah 1 — Buat project

1. Buka <https://supabase.com> → **New project**.
2. Simpan **database password** (dipakai sekali saat setup).
3. Tunggu project selesai dibuat.

### Langkah 2 — Jalankan schema

1. Di Supabase Dashboard → menu **SQL Editor** → **New query**.
2. Salin **seluruh isi** `supabase/schema.sql` → klik **Run**.

> **Alternatif dari terminal** (project sudah `supabase link`):
>
> ```bash
> python3 -m venv .venv && .venv/bin/pip install "psycopg[binary]"
> # isi SUPABASE_DB_PASSWORD di .env (Project Settings -> Database)
> .venv/bin/python scripts/apply-schema.py            # eksekusi
> .venv/bin/python scripts/apply-schema.py --verify-only   # cek saja
> ```
>
> Script menjalankan **seluruh file dalam satu transaksi** (gagal di tengah
> = tidak ada yang tersimpan), mengirim `notify pgrst, 'reload schema'`,
> lalu memverifikasi semua tabel & fungsi dari schema.sql. Password tidak
> pernah dicetak dan tidak pernah dikirim ke Vercel.

File tersebut membuat:

| Objek | Fungsi |
|---|---|
| `customers` | Master data customer (sama dengan tabel Customers di portal admin) |
| `services` | Kendaraan + service (status, mekanik, tagihan, sparepart JSON) |
| `mechanics` | Data mekanik (nomor telepon di tabel `mechanics_private`, hanya admin) |
| `spareparts` | Stok & harga sparepart |
| `reviews` | Ulasan/rating customer (maksimal 1 ulasan per service) |
| `workshop_info` | Info bengkel (nama, alamat, kontak) — baris tunggal |
| `profiles` | Profil user: role (`super_admin`/`admin`/`customer`) + tautan ke `customers` |
| `service_photos` | Foto service (Supabase Storage, bucket `service-photos`) |
| `activity_logs` | Jejak perubahan (siapa mengubah apa) |
| `client_errors` | Log error JavaScript dari sisi client |
| `handle_new_user()` | Trigger: saat user daftar, profile & data customer otomatis dibuat |
| `ensure_my_profile()` | RPC: memperbaiki profil yang hilang (dipanggil tiap login) |
| `is_admin()` / `is_super_admin()` / `my_customer_id()` / `can_review()` | Helper RLS & hierarki role |
| `admin_set_user_role()` | RPC super admin untuk mengubah role akun (dijaga di database) |
| `promos` | Diskon/promo: kode, tipe (`persen`/`nominal`), nilai, periode, status aktif |
| `public_reviews()` | Fungsi baca ulasan publik untuk landing page (tanpa login) |
| `public_promos()` | Fungsi baca promo aktif untuk landing & pilihan promo customer (tanpa login) |
| `public_workshop_info()` | Fungsi baca info bengkel publik untuk landing page (tanpa login) |
| `delete_my_account()` | Fungsi customer menghapus akunnya sendiri |
| RLS policies | Customer hanya bisa melihat & mengubah datanya sendiri |

> File ini idempoten — aman dijalankan berulang di SQL Editor.

### Langkah 3 — Isi konfigurasi

Credential tidak lagi ditulis di dalam kode — isi lewat environment variable
(lihat [Environment variables](#0-environment-variables-supabase--vercel)):

```bash
cp .env.example .env       # isi SUPABASE_URL + SUPABASE_ANON_KEY
node scripts/build-config.js   # -> js/config.prod.js (otomatis dimuat config.js)
```

> **Jangan pernah** memakai `service_role` key di environment variable —
> key itu bisa melewati seluruh Row Level Security dan wajib disimpan
> di server. `SUPABASE_ANON_KEY` (publishable) memang aman untuk frontend
> karena RLS yang melindungi data.

### Langkah 4 — Atur Authentication

Di **Supabase Dashboard → Authentication → Providers → Email**:

- **Enable Email provider**: ON
- **Confirm email**: OFF (supaya pendaftaran langsung aktif; kalau website
  sungguhan, biarkan ON dan customer diminta konfirmasi via email)
- **Reset password**: ON (kalau mau tautan reset password berfungsi)

### Langkah 5 — Buat akun admin / super admin

1. Buka `html/index.html` → daftar lewat tombol **Kirim Link Login**,
   atau jalankan di SQL Editor:

```sql
insert into auth.users (email, password, email_confirmed_at)
values ('admin@workshop.com', 'admin123', now());
```

2. Jadikan dia admin. Pendaftaran baru **selalu** berstatus `customer`
   (trigger `handle_new_user` tidak pernah memberi role staf), jadi
   tetapkan manual lewat SQL Editor. Cocokkan lewat `auth.users.id`
   — bukan `profiles.email`, supaya tidak salah sasaran bila ada
   baris profil dengan email serupa:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@workshop.com')
  and role <> 'admin';
```

3. Untuk pemilik/penanggung jawab, buat **super admin** dengan perintah
   yang sama (ganti email dan role):

```sql
update public.profiles
set role = 'super_admin'
where id = (select id from auth.users where email = 'owner@workshop.com')
  and role <> 'super_admin';
```

4. Login di `html/index.html?role=admin` (atau `?role=super_admin`).
   Setelah itu, super admin bisa mengatur role akun lain di menu
   **Kelola Pengguna** tanpa perlu SQL lagi.

> **Penting:** jalankan ulang seluruh `supabase/schema.sql` setelah update
> ini. File tersebut menambahkan nilai enum `super_admin`, helper
> `is_super_admin()`, trigger penjaga role, dan RPC `admin_set_user_role()`.
> File bersifat idempoten — aman dijalankan berulang.

### Langkah 6 — Kirim email (opsional, untuk web sungguhan)

Supabasecustom SMTP bawaan hanya bisa kirim ke anggota tim. Untuk website
publik, pasang **SMTP Custom** (Resend / Brevo / SendGrid) di
**Authentication → SMTP Settings**.

### Selesai ✅

Sekarang aplikasi sepenuhnya memakai **Supabase**:

- Semua data diambil & disimpan di database (tidak ada penyimpanan lokal).
- Customer yang daftar langsung **masuk ke tabel Customers** milik admin.
- Customer hanya bisa melihat kendaraan, service, dan tagihannya sendiri
  (dijaga RLS di level database, bukan cuma di UI).

---

## 🔄 Satu Mode Kerja: Supabase

| | Perilaku |
|---|---|
| Pemicu | `js/config.prod.js` ada (dihasilkan dari environment variable) |
| Penyimpanan data | Database Supabase (semuanya) |
| Login | Supabase Auth (email + password / magic link / reset via email) |
| Multi-user | ✅ langsung & sinkron antar perangkat |
| RLS | ✅ di database |

Tanpa credential (config.prod.js belum dibuat), halaman menampilkan pesan
konfigurasi yang jelas dan data kosong — **bukan** data dummy dari browser.
Data lokal lama (mirror + akun demo) otomatis dibersihkan dari `localStorage`
saat aplikasi dimuat (tema & preferensi "ingat email" tetap dipertahankan).

---

## 🔑 Akun & Login

Akun dibuat **hanya lewat Supabase Auth** — tidak ada lagi akun demo lokal:

- **Daftar** di halaman login → memakai `Auth.signUp`, baris
  profil dibuat otomatis oleh trigger `handle_new_user`.
- **Admin mengundang customer** → tombol **Akun** di tabel Customers mengirim
  **link login** ke email customer.
- **Lupa password?** → tautan reset dikirim ke email (Supabase Auth), password
  baru diatur dari tautan itu — bukan lewat form di aplikasi.
- Role (super_admin / admin / customer) dikelola super admin di
  **Kelola Pengguna**, dijaga RPC `admin_set_user_role()`.

---

## 🔗 Bagaimana Admin ↔ Customer Terhubung

| Aksi di portal customer | Dampak di portal admin |
|---|---|
| Daftar akun | Data customer **muncul di tabel Customers** (dibuat trigger) |
| Ajukan service | Masuk **antrean Service** dengan status `Menunggu` |
| Klaim promo saat ajukan service | Promo tersimpan di service, total tagihan otomatis dipotong, dan jumlah klaim bertambah di halaman **Diskon** |
| Ubah profil | Nama/telepon/alamat **terupdate di tabel Customers** |
| Tandai tagihan lunas | Kolom **Pembayaran** di Service & Riwayat ikut berubah |
| Hapus akun | Akun login dihapus permanen; data kendaraan & riwayat service tetap tersimpan di bengkel |

Sebaliknya dari sisi admin:

- **Tambah customer** → customer bisa daftar dengan email yang sama, lalu
  datanya otomatis tertaut ke customer tersebut.
- **Tombol "Akun"** di tabel Customers → kirim **link login** ke email
  customer (Supabase Auth).
- **Hapus customer** → akun login customer ikut terhapus.
- **Backup / Restore** di Pengaturan sudah termasuk akun customer.
- **Reset Data** menghapus seluruh data bengkel tanpa menghapus akun
  admin/customer. Admin bisa memilih **Admin — semua data bengkel**,
  **semua data customer**, atau **satu akun customer**. Data customer yang
  tertaut ke akun tetap dipertahankan agar login customer tetap bisa dipakai.
- **Customer menghapus akun sendiri** lewat Pengaturan → Keamanan → Hapus Akun.
  Jalankan ulang `supabase/schema.sql` agar fungsi
  `delete_my_account()` tersedia.

---

## 🛠️ Menjalankan Project

**Tidak ada build, tidak ada install.** Cukup salah satu dari ini:

```bash
# Cara 1 — buka langsung
start html\landing.html          # Windows
xdg-open html/landing.html       # Linux
open html/landing.html           # macOS

# Cara 2 — server statis (disarankan, agar fetch & cookie rapi)
python3 -m http.server 8080
# lalu buka http://localhost:8080/ (landing) atau /html/index.html (login)
```

> Memakai `file://` juga bisa jalan, tapi **server statis lebihrecommended**
> supaya perilaku `fetch`, service worker, dan cookie sama seperti production.

### Yang perlu diubah kalau develop

| Mau ubah | Buka file ini |
|---|---|
| Kredensial Supabase | `.env` lalu `node scripts/build-config.js` (atau Vercel Environment Variables) |
| Warna / tema / layout | `css/global.css` (semua token di `:root`) |
| Landing page | `html/landing.html` · `css/landing.css` · `js/landing.js` |
| Kelola Pengguna & role | `html/admin-page/users.html` · `js/users.js` |
| Style halaman customer | `css/customer.css` |
| Tabel & data layer | `js/db.js` |
| Logic halaman admin | `js/<halaman>.js` |
| Logic halaman customer | `js/customer-app.js` |
| Struktur database | `supabase/schema.sql` |
| Halaman HTML | `html/admin-page/` & `html/customers-page/` |

---

## 🌐 Deploy ke Production

### 0. Environment variables (Supabase & Vercel)

Kredensial Supabase tidak harus diedit di dalam kode — bisa dimasukkan
lewat **environment variable**:

| Variabel | Isi | Catatan |
|---|---|---|
| `SUPABASE_URL` | Project URL → `https://xxxx.supabase.co` | Publik, aman |
| `SUPABASE_ANON_KEY` | Publishable key (`sb_publishable_…`) | **Bukan** `service_role` |

**Alur build (`scripts/build-config.js`, tanpa npm install):**

```
Vercel Environment Variables  ─┐
                               ├─► scripts/build-config.js ─► js/config.prod.js
.env (build lokal)            ─┘                                 │
                                                                 ▼
                                              js/config.js memuatnya otomatis
```

**Vercel — via dashboard:** Settings → **Environment Variables** → isi
`SUPABASE_URL` + `SUPABASE_ANON_KEY` (environment *Production*, dan
*Preview* kalau mau) → deploy ulang.

**Vercel — via CLI (CLI v13+/65):**

```bash
cp .env.example .env      # lalu isi nilainya
vercel login
vercel link --yes --project pytabengkel

# pakai --type config Supaya nilai bisa dipakai build & ditarik lokal
# (nilai ini memang publik — ikut terkirim ke browser juga)
set -a; . ./.env; set +a
vercel env add SUPABASE_URL      --type config --environment production,preview,development --value "$SUPABASE_URL"
vercel env add SUPABASE_ANON_KEY --type config --environment production,preview,development --value "$SUPABASE_ANON_KEY"
```

> ⚠️ **Jangan pakai tipe Secret** untuk dua variabel ini: nilai Secret
> ditulis sebagai `[SENSITIVE]` di build lokal, sehingga
> `js/config.prod.js` jadi tidak valid (build Vercel tetap menerima
> nilai aslinya, tapi `vercel build` lokal tidak).

**Verifikasi build lokal (opsional):**

```bash
vercel pull --yes --environment preview   # tarik settings + env ke .env.local
vercel build --yes --environment preview  # jalankan buildCommand
```

**Lokal:**

```bash
cp .env.example .env      # lalu isi nilainya
node scripts/build-config.js    # membuat js/config.prod.js (gitignored)
```

Catatan:

- Skrip **selalu sukses (exit 0)**: kalau env belum diisi, `js/config.prod.js`
  tidak ditulis — build tetap jalan. Akibatnya aplikasi tidak punya
  credential: di mana pun (lokal maupun production) muncul halaman error
  konfigurasi yang jelas, bukan data dummy. Isi env-nya supaya aplikasi
  terhubung ke Supabase.
- `js/config.prod.js` hasil generate **tidak boleh di-commit** dan
  **tidak ikut ter-upload** (`.vercelignore` mengecualikan `.env*`).
- `.env` juga **tidak ikut ter-deploy** ke Vercel.

### 1. Siapkan konfigurasi

Isi environment variable `SUPABASE_URL` + `SUPABASE_ANON_KEY` —
`js/config.prod.js` dibuat otomatis saat build,
lihat [Environment variables](#0-environment-variables-supabase--vercel).
(Ini satu-satunya cara — tidak ada lagi contoh file manual.)

> `js/config.prod.js` **tidak boleh di-commit** (sudah masuk `.gitignore`).

### 2. Konfigurasi dimuat otomatis

`js/config.js` **otomatis memuat** `js/config.prod.js` (di folder yang sama)
lewat auto-load `document.write` — jadi **tidak perlu** menambahkan tag
`<script>` di setiap halaman. Cukup:

```js
// js/config.prod.js
window.SUPABASE_CONFIG_OVERRIDE = {
  url: "https://xxxx.supabase.co",
  anonKey: "eyJhbGciOi...",
};
```

Kalau Anda sudah menambahkan tag manual sebelum `config.js`:

```html
<script src="/js/config.prod.js"></script>
<script src="/js/config.js"></script>
```

…auto-load mendeteksinya dan menyerah (tidak dimuat dua kali).

### 3. Guard konfigurasi aktif otomatis

| Where | Environment | Perilaku |
|---|---|---|
| `localhost` / `file://` | `dev` | Credential tetap dibutuhkan — tanpa credential, halaman kosong + pesan konfigurasi |
| Domain asli | `prod` | Sama: **wajib credential Supabase**, tidak ada fallback lokal |

Kalau credential belum diisi, muncul halaman error yang jelas di **semua**
environment — tidak ada lagi penyimpanan lokal yang dipakai diam-diam, jadi
tidak ada password/data browser yang bisa bocor lewat jalur itu.

### 4. Checklist sebelum publish

- [ ] `SUPABASE_URL` + `SUPABASE_ANON_KEY` sudah diisi di **Vercel Environment Variables** (atau `js/config.prod.js` diisi manual) — cek file hasil generate ada di deployment
- [ ] `js/config.prod.js` sudah diisi & **tidak** di-commit
- [ ] `supabase/schema.sql` sudah dijalankan di project Supabase
- [ ] Row Level Security aktif (dicek: `select * from pg_tables where schemaname='public' and rowsecurity;`)
- [ ] Akun admin dibuat & `role = 'admin'`; akun pemilik `role = 'super_admin'`
- [ ] `supabase/schema.sql` versi terbaru sudah dijalankan ulang (enum & RPC role)
- [ ] Root `/` sudah mengarah ke landing page (`vercel.json` atau `index.html`)
- [ ] SMTP custom terpasang (untuk email verifikasi & reset password)
- [ ] Header CSP dikonfigurasi di hosting (meta tag sudah ada di HTML)
- [ ] Sudah dicek manual: login admin → dashboard → logout → login customer

### 5. Hosting

Karena project ini **statis tanpa build**, langsung upload/drag-drop saja:

- **Netlify / Vercel / Cloudflare Pages / GitHub Pages** — publish directory `.`
  (build command dibiarkan **kosong**)
- **Hosting biasa / cPanel** — upload semua file except `js/config.prod.js`
  (isi manual di server), atau include lewat file konfigurasi sendiri

---

## 🔍 Filter, Sorting & Detail

| Halaman | Filter / Sort | Detail |
|---|---|---|
| **Customers** | Sort: ID, Nama A-Z/Z-A, Email, No. HP, Alamat, Terdaftar | Modal detail + kelola/buat akun login |
| **Kendaraan** | Status + Sort: ID, Tanggal, No. Polisi, Pelanggan, Total | Modal detail + edit/hapus |
| **Service** | Status + Sort: ID, Tanggal, No. Taxi, Pelanggan, Total | Modal proses service |
| **Riwayat** | Bulan + **Tab Lunas / Belum Lunas** + Sort | **Modal detail lengkap + stepper status + rincian tagihan + cetak struk** |
| **Riwayat → Aktivitas** | Entitas + Aksi + Sort + Cari | Tabel jejak perubahan (siapa mengubah apa) |
| **Keuangan** | Tahun, Bulan + **Tab Lunas / Belum Lunas** + Sort | **Modal detail transaksi (rincian biaya, periode, sisa tagihan) + stepper status + cetak struk** |
| **Ulasan** | Rating (1–5) + Sort + Cari | **Modal detail service + ulasan customer + hapus ulasan** |
| **Mekanik** | Status (Aktif / Izin) + Sort | Modal edit (+ nomor HP) |
| **Sparepart** | Stok + Sort (harga, stok, nama) | Modal edit |
| **Customer** | Status + Sort + **tab lunas/belum lunas** | Invoice + tandai lunas |
| **Customer Keuangan** | Tahun + status bayar + Sort | Invoice + tandai lunas |

> Semua tabel punya **ID unik berawalan huruf** supaya mudah dibaca:
> `knd-001` (kendaraan/service), `cst-001` (customer), `mek-001` (mekanik),
> `spp-001` (sparepart). ID ini bisa diketik di kolom pencarian.

> **Cetak struk** hanya bisa dilakukan oleh **admin bengkel** dan hanya
> untuk service yang sudah berstatus **Selesai**. Tampilannya seperti
> struk kasir (thermal printer) — bukan invoice A4.
>
> **Status pembayaran** bisa diubah admin dari halaman Service (form
> proses) maupun tombol **Tandai Lunas** di detail Riwayat/Keuangan.
> Pembayaran hanya bisa ditandai **Lunas** setelah status service
> **Selesai** — tombol Lunas otomatis nonaktif sebelum itu.

> **Urutan toolbar konsisten di semua halaman:**
> `[Filter opsional]` → **Urutan** → **Cari** → **Input data** → **Lihat semua**
> (cari & filter tetap berdampingan, juga di layar HP)

> Semua tabel punya kolom **ID** (primary key) supaya data tidak ambigu
> meskipun nomor bisa berubah atau sama.

---

## 🏷️ Fitur Diskon & Promo

Admin membuat promo di halaman **Diskon** (persen atau nominal, periode,
status aktif). Promo aktif tampil di landing page, dan tombol **Klaim**
membawa customer ke form ajukan service dengan promo sudah terpilih —
termasuk setelah login.

- Diskon adalah pilihan **terpisah** di form ajukan service, bukan bagian
  dari keluhan.
- Tipe & nilai promo disimpan sebagai *snapshot* pada service, jadi
  mengubah atau menghapus promo tidak mengubah tagihan service lama.
- Total tagihan dihitung otomatis: **subtotal − diskon**. Rincian diskon
  tampil di detail service, modal invoice, dan struk.
- Halaman Diskon menampilkan **Pelanggan Klaim** (jumlah customer unik)
  dan kolom **Diklaim** per promo; klik angkanya untuk melihat daftar
  pelanggan dan service yang memakai promo tersebut. Ajuan yang ditolak
  tidak dihitung.
- Jalankan ulang `supabase/schema.sql` agar kolom `promo_*` pada tabel
  `services` dan `id` pada RPC `public_promos()` tersedia.

---

## ⭐ Fitur Ulasan & Rating

Customer bisa menilai service yang sudah **Selesai**, dan admin memantau
semua ulasan di halaman khusus **Ulasan**.

**Cara kerja:**

- **Customer** → halaman **Riwayat Service** → kolom **Rating** menampilkan
  bintang (atau "Belum dinilai") → tombol **Detail** → section
  **Ulasan & Rating** → pilih bintang 1–5 + komentar (opsional) →
  **Kirim Ulasan**. Ulasan bisa diperbarui kapan saja.
- **Admin** → menu **Ulasan** → statistik (rata-rata rating, total ulasan,
  ulasan bulan ini, service belum dinilai) + tabel ulasan dengan filter
  rating, sort, dan pencarian → **Detail** untuk membuka service + ulasan →
  **Hapus Ulasan** (konfirmasi dua klik).
- **Publik** → landing page (`html/landing.html`) menampilkan section
  **ulasan pelanggan**: rating rata-rata + testimoni terbaru (nama depan
  saja). Data diambil lewat fungsi SQL `public_reviews()` yang aman
  dibaca tanpa login — tabel `reviews` sendiri tetap tertutup oleh RLS.

**Aturan database (tabel `public.reviews`):**

- Satu service **maksimal satu ulasan** (unique pada `service_id`).
- Rating hanya 1–5 (check constraint); ulasan service yang dihapus admin
  ikut terhapus (`on delete cascade`).
- RLS: customer hanya bisa **membaca & menulis ulasan service miliknya
  sendiri** (`customer_id = my_customer_id()` atau service yang
  dimilikinya); admin bebas; hanya admin (atau pemiliknya) yang boleh
  menghapus. Halaman publik membaca lewat `public_reviews()`, bukan
  langsung ke tabel.

> **Instalasi / update:** jalankan ulang seluruh
> `supabase/schema.sql` di SQL Editor Supabase — file ini idempoten,
> jadi aman dijalankan berulang. Tabel `reviews` akan dibuat otomatis.

---

## 🌙 Fitur Dark Mode

- Design token terpusat di `css/global.css` (`:root` = light, `[data-theme="dark"]` = dark).
- `js/theme.js` menyimpan pilihan di `localStorage` key `workshop_theme`.
- Tombol tema di **topbar semua halaman** + halaman login.
- Pengaturan customer: **Terang / Gelap / Ikuti Sistem**.
- Skrip di `<head>` menerapkan tema sebelum halaman digambar (tidak ada "kedipan").

---

## 📝 Catatan

- `anonKey` aman dipublikasikan di frontend **karena RLS yang melindungi data**.
  Jangan pernah menaruh `service_role` key di dalam project ini.
- Build step hanya `scripts/build-config.js` (env var → `js/config.prod.js`);
  selebihnya ubah file → muat ulang browser. Kalau ada error, buka
  DevTools → Console.
- Tidak ada data aplikasi yang disimpan di browser. Yang tersimpan lokal
  hanya preferensi per user: tema (`workshop_theme`), email "ingat saya",
  dan buffer log error (dikirim ke tabel `client_errors`).
- Data lama dari versi sebelumnya (mirror `workshop_*` + akun demo) otomatis
  dihapus dari `localStorage` saat aplikasi dimuat.
