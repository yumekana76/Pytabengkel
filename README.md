# Pytabengkel — Portal Admin & Customer

Aplikasi web bengkel dengan **portal admin** dan **portal customer** yang
saling terhubung. Bisa berjalan **lokal** (localStorage, untuk demo workshop)
atau **terhubung ke Supabase** (database + auth + RLS, untuk web sungguhan).

> **100% HTML + CSS + JavaScript murni.** Tanpa build step, tanpa Node.js,
> tanpa framework, tanpa `npm install`. Tinggal buka `html/index.html` di browser.

> **Mode aktif:** `js/config.js` sudah berisi credential Supabase, jadi
> mode **Supabase** yang jalan secara default. Untuk demo lokal (tanpa
> database), kosongkan `url` + `anonKey` di `SUPABASE_DEFAULTS` — mode
> lokal otomatis aktif dan data disimpan di `localStorage`.

---

## 📁 Struktur Project

```
.
├── html/                       # 📄 Semua halaman HTML
│   ├── index.html              # ⭐ SATU-SATUNYA index: login terpadu (pilih Admin / Customer)
│   ├── admin-page/             # 🔧 Portal Admin
│   │   ├── dashboard.html      #   Dashboard
│   │   ├── customers.html      #   Manajemen customer (+ kelola akun login)
│   │   ├── kendaraan.html      #   Antrean kendaraan / service
│   │   ├── service.html        #   Proses service + status pembayaran
│   │   ├── riwayat.html        #   Riwayat service selesai + jejak perubahan (aktivitas)
│   │   ├── keuangan.html       #   Pendapatan per bulan
│   │   ├── mekanik.html        #   Data mekanik
│   │   ├── sparepart.html      #   Stok sparepart
│   │   └── pengaturan.html     #   Info bengkel, backup, reset data
│   └── customers-page/         # 👤 Portal Customer
│       ├── login.html          #   Alias: langsung ke login Customer
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
├── css/                        # Design token + light/dark theme
├── js/
│   ├── config.js               # ⭐ Isi URL + anon key Supabase di sini
│   ├── config.prod.example.js  # Contoh konfigurasi production
│   ├── supabase.js             # Client Supabase + Auth service
│   ├── db.js                   # Data layer (Supabase / localStorage)
│   ├── theme.js                # Engine tema terang/gelap
│   ├── auth.js                 # Guard halaman admin
│   ├── customer-auth.js        # Guard + sesi customer
│   ├── customer-register.js    # Logika pendaftaran customer
│   ├── login.js                # Logika halaman login terpadu (pilih role)
│   ├── global.js               # Helper bersama
│   └── vendor/supabase.min.js  # Library Supabase (self-hosted)
```

> **Tidak ada `package.json`, `node_modules`, atau proses build.**
> Folder ini bisa langsung di-upload ke hosting statis apa pun.

### 🗺️ Alur Halaman

```
html/index.html  (satu-satunya index — login terpadu, ada tab Admin / Customer)
   │
   ├─ [tab Administrator] ──► html/admin-page/dashboard.html
   │                            ├─ customers · kendaraan · service
   │                            ├─ riwayat · keuangan · mekanik
   │                            └─ sparepart · pengaturan
   │
   └─ [tab Customer] ──────► html/customers-page/dashboard.html
                                ├─ kendaraan · service · riwayat
                                ├─ keuangan
                                └─ profil · pengaturan

Guard auth: belum login → arahkan ke ../index.html?role=admin|customer
```

---

## 🔌 Cara Menyambungkan ke Supabase

### Langkah 1 — Buat project

1. Buka <https://supabase.com> → **New project**.
2. Simpan **database password** (dipakai sekali saat setup).
3. Tunggu project selesai dibuat.

### Langkah 2 — Jalankan schema

1. Di Supabase Dashboard → menu **SQL Editor** → **New query**.
2. Salin **seluruh isi** `supabase/schema.sql` → klik **Run**.

File tersebut membuat:

| Objek | Fungsi |
|---|---|
| `customers` | Master data customer (sama dengan tabel Customers di portal admin) |
| `services` | Kendaraan + service (status, mekanik, tagihan, sparepart JSON) |
| `mechanics` | Data mekanik (nomor telepon di tabel `mechanics_private`, hanya admin) |
| `spareparts` | Stok & harga sparepart |
| `reviews` | Ulasan/rating customer (maksimal 1 ulasan per service) |
| `workshop_info` | Info bengkel (nama, alamat, kontak) — baris tunggal |
| `profiles` | Profil user: role (`admin`/`customer`) + tautan ke `customers` |
| `service_photos` | Foto service (Supabase Storage, bucket `service-photos`) |
| `activity_logs` | Jejak perubahan (siapa mengubah apa) |
| `client_errors` | Log error JavaScript dari sisi client |
| `handle_new_user()` | Trigger: saat user daftar, profile & data customer otomatis dibuat |
| `ensure_my_profile()` | RPC: memperbaiki profil yang hilang (dipanggil tiap login) |
| `is_admin()` / `my_customer_id()` / `can_review()` | Helper RLS |
| `public_reviews()` | Fungsi baca ulasan publik untuk halaman login (tanpa login) |
| `delete_my_account()` | Fungsi customer menghapus akunnya sendiri |
| RLS policies | Customer hanya bisa melihat & mengubah datanya sendiri |

> File ini idempoten — aman dijalankan berulang di SQL Editor.

### Langkah 3 — Isi konfigurasi

Buka **Project Settings → API**, lalu edit `js/config.js`:

```js
const SUPABASE_DEFAULTS = {
  url: "https://xxxxxxxxxxxx.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  ...
};
```

> Alternatif (tanpa mengubah `config.js`): buat `js/config.prod.js`
> berisi `window.SUPABASE_CONFIG_OVERRIDE = { url, anonKey }` — file itu
> dimuat otomatis oleh `config.js`, lihat
> [Deploy ke Production](#-deploy-ke-production).
>
> **Jangan pernah** memakai `service_role` key di sini — key itu bisa melewati
> seluruh Row Level Security dan wajib disimpan di server.

### Langkah 4 — Atur Authentication

Di **Supabase Dashboard → Authentication → Providers → Email**:

- **Enable Email provider**: ON
- **Confirm email**: OFF (supaya pendaftaran langsung aktif; kalau website
  sungguhan, biarkan ON dan customer diminta konfirmasi via email)
- **Reset password**: ON (kalau mau tautan reset password berfungsi)

### Langkah 5 — Buat akun admin

1. Buka `html/index.html` → daftar lewat tombol **Kirim Link Login**,
   atau jalankan di SQL Editor:

```sql
insert into auth.users (email, password, email_confirmed_at)
values ('admin@workshop.com', 'admin123', now());
```

2. Jadikan dia admin. Pendaftaran baru **selalu** berstatus `customer`
   (trigger `handle_new_user` tidak pernah memberi role admin), jadi
   tetapkan manual lewat SQL Editor. Cocokkan lewat `auth.users.id`
   — bukan `profiles.email`, supaya tidak salah sasaran bila ada
   baris profil dengan email serupa:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@workshop.com')
  and role <> 'admin';
```

3. Login di `html/index.html` (tab Administrator).

### Langkah 6 — Kirim email (opsional, untuk web sungguhan)

Supabasecustom SMTP bawaan hanya bisa kirim ke anggota tim. Untuk website
publik, pasang **SMTP Custom** (Resend / Brevo / SendGrid) di
**Authentication → SMTP Settings**.

### Selesai ✅

Sekarang aplikasi otomatismengaktifkan mode **Supabase**:

- Semua data diambil & disimpan di database (bukan localStorage).
- Customer yang daftar langsung **masuk ke tabel Customers** milik admin.
- Customer hanya bisa melihat kendaraan, service, dan tagihannya sendiri
  (dijaga RLS di level database, bukan cuma di UI).

---

## 🔄 Dua Mode Kerja

| | Mode Supabase | Mode Lokal |
|---|---|---|
| Pemicu | `url` + `anonKey` terisi di `js/config.js` | `url` + `anonKey` dikosongkan |
| Penyimpanan data | Database Supabase | `localStorage` browser |
| Login | Supabase Auth (email + password / magic link) | Akun demo lokal (lihat di bawah) |
| Multi-user | ✅langsung & sinkron antar perangkat | ❌ hanya per browser |
| RLS | ✅ di database | ❌ hanya di UI |

Mode Supabase aktif selama credential terisi (kondisi default). Untuk
demo tanpa database, kosongkan `url` + `anonKey` — mode lokal aktif
**otomatis**, jadi aplikasi tetap dapat didemokan saat presentasi.
Badge di halaman login menampilkan mode aktif:

- 🟢 **Terhubung ke Supabase**
- 🟡 **Mode lokal — data disimpan di browser**

---

## 🔑 Akun Demo (Mode Lokal)

Kredensial demo **sengaja tidak ditampilkan** di halaman login supaya tidak
langsung terlihat oleh siapa pun yang membuka aplikasi.

Akun demo dibuat otomatis oleh `js/db.js` → `dbBuildDemoAccounts()`
(bisa dioverride lewat `window.SUPABASE_CONFIG.localAccounts`):

| Tab       | Email                    | Password     | Ke mana                  |
| --------- | ------------------------ | ------------ | ------------------------ |
| Admin     | `admin@workshop.com`     | `admin123`   | `admin-page/dashboard.html`    |
| Customer  | `customer@workshop.com`  | `customer123`| `customers-page/dashboard.html` |

> Ganti password di `js/db.js` (atau `config.prod.js` via
> `localAccounts`) sebelum aplikasi dipakai demo di depan umum.
> Password juga bisa diubah langsung dari halaman login lewat
> **"Lupa password?"**.
>
> Saat login pertama, akun customer demo **membuat data customer
> "Budi Setiawan" otomatis** kalau belum ada (lazy-create), sehingga
> portal customer langsung bisa dipakai. Isi data kendaraan lewat
> portal customer atau halaman Kendaraan admin.
>
> Alamat lama (`customers-page/login.html`) tetap bekerja dan langsung
> mengarahkan ke login terpadu dengan role yang sesuai.

---

## 🔗 Bagaimana Admin ↔ Customer Terhubung

| Aksi di portal customer | Dampak di portal admin |
|---|---|
| Daftar akun | Data customer **muncul di tabel Customers** (dibuat trigger) |
| Ajukan service | Masuk **antrean Service** dengan status `Menunggu` |
| Ubah profil | Nama/telepon/alamat **terupdate di tabel Customers** |
| Tandai tagihan lunas | Kolom **Pembayaran** di Service & Riwayat ikut berubah |
| Hapus akun | Akun login dihapus permanen; data kendaraan & riwayat service tetap tersimpan di bengkel |

Sebaliknya dari sisi admin:

- **Tambah customer** → customer bisa daftar dengan email yang sama, lalu
  datanya otomatis tertaut ke customer tersebut.
- **Tombol "Akun"** di tabel Customers → kirim **link login** ke email
  customer (mode Supabase) atau atur password (mode lokal).
- **Hapus customer** → akun login customer ikut terhapus.
- **Backup / Restore** di Pengaturan sudah termasuk akun customer.
- **Reset Data** menghapus seluruh data bengkel tanpa menghapus akun
  admin/customer. Admin bisa memilih **Admin — semua data bengkel**,
  **semua data customer**, atau **satu akun customer**. Data customer yang
  tertaut ke akun tetap dipertahankan agar login customer tetap bisa dipakai.
- **Customer menghapus akun sendiri** lewat Pengaturan → Keamanan → Hapus Akun.
  Di mode Supabase, jalankan ulang `supabase/schema.sql` agar fungsi
  `delete_my_account()` tersedia.

---

## 🛠️ Menjalankan Project

**Tidak ada build, tidak ada install.** Cukup salah satu dari ini:

```bash
# Cara 1 — buka langsung
start html\index.html            # Windows
xdg-open html/index.html         # Linux
open html/index.html             # macOS

# Cara 2 — server statis (disarankan, agar fetch & localStorage rapi)
python3 -m http.server 8080
# lalu buka http://localhost:8080/html/index.html
```

> Memakai `file://` juga bisa jalan, tapi **server statis lebihrecommended**
> supaya perilaku `fetch`, service worker, dan cookie sama seperti production.

### Yang perlu diubah kalau develop

| Mau ubah | Buka file ini |
|---|---|
| Kredensial Supabase | `js/config.js` (atau `js/config.prod.js`) |
| Warna / tema / layout | `css/global.css` (semua token di `:root`) |
| Style halaman customer | `css/customer.css` |
| Tabel & data layer | `js/db.js` |
| Logic halaman admin | `js/<halaman>.js` |
| Logic halaman customer | `js/customer-app.js` |
| Struktur database | `supabase/schema.sql` |
| Halaman HTML | `html/admin-page/` & `html/customers-page/` |

---

## 🌐 Deploy ke Production

### 1. Siapkan konfigurasi

Salin `js/config.prod.example.js` → `js/config.prod.js`, isi `url` + `anonKey`
dari Supabase → **Project Settings → API**.

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

### 3. Guard production aktif otomatis

| Where | Environment | Perilaku |
|---|---|---|
| `localhost` / `file://` | `dev` | Mode lokal boleh aktif (demo) |
| Domain asli | `prod` | **Mode lokal MATI** — wajib Supabase |

Kalau production tapi credential belum diisi, muncul halaman error yang jelas
(bukan diam-diam memakai localStorage). Password lokal yang tersimpan
plaintext di `localStorage` **tidak mungkin** bocor di production.

### 4. Checklist sebelum publish

- [ ] `js/config.prod.js` sudah diisi & **tidak** di-commit
- [ ] `supabase/schema.sql` sudah dijalankan di project Supabase
- [ ] Row Level Security aktif (dicek: `select * from pg_tables where schemaname='public' and rowsecurity;`)
- [ ] Akun admin dibuat & `role = 'admin'`
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
- **Publik** → halaman login (`html/index.html`) menampilkan section
  **"Apa Kata Pelanggan"**: rating rata-rata + 6 testimoni terbaru
  (nama depan saja). Data diambil lewat fungsi SQL `public_reviews()`
  yang aman dibaca tanpa login — tabel `reviews` sendiri tetap tertutup
  oleh RLS. Section selalu tampil (meski 0 ulasan) supaya tinggi konten
  halaman tidak berubah mengikuti jumlah data.

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
> (Mode lokal tanpa Supabase juga mendukung fitur ini via localStorage.)

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
- Project ini **tidak punya build step**: ubah file → muat ulang browser.
  Kalau ada error, buka DevTools → Console.
- Menghapus data browser akan mengembalikan data contoh (mode lokal).
- Untuk development, buka DevTools → Application → Local Storage untuk
  melihat data yang tersimpan.
