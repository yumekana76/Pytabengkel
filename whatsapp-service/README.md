# WhatsApp Service — Notifikasi Info Kendaraan (Baileys)

Service Node.js kecil yang menghubungkan web Pytabengkel dengan WhatsApp
menggunakan [Baileys](https://github.com/whiskeysockets/Baileys)
(koneksi WhatsApp Web tanpa aplikasi WhatsApp Business / API berbayar).

**Kegunaan:** memberitahu pelanggan info kendaraan mereka lewat WhatsApp
setiap ada perubahan status service:

| Event | Pesan |
|---|---|
| `ajuan` | Pengajuan service diterima (menunggu persetujuan) |
| `disetujui` | Pengajuan disetujui, masuk antrian |
| `ditolak` | Pengajuan ditolak (ikut catatan bengkel) |
| `dikerjakan` | Kendaraan sedang dikerjakan |
| `selesai` | Kendaraan selesai dikerjakan 🎉 |
| `lunas` | Pembayaran diterima, status Lunas 🧾 |

Isi pesan: kode, polisi, tipe kendaraan, keluhan, status, pembayaran,
mekanik, tanggal, dan biaya jasa — format rapi tebal/emoji.

---

## Cara kerja (2 jalur, anti-duplikat)

```
┌─ Jalur 1 (fallback, selalu aktif) ────────────────────────────────┐
│  Browser admin/customer ubah data                                │
│    → js/db.js (saveKendaraan) deteksi perubahan status/approval/  │
│      pembayaran → POST /api/notify ke service ini                │
└───────────────────────────────────────────────────────────────────┘

┌─ Jalur 2 (opsional, paling andal) ────────────────────────────────┐
│  Supabase Database Webhook (tabel services, INSERT + UPDATE)      │
│    → POST /api/webhook/service ke service ini                    │
│    → butuh URL publik + SUPABASE_SERVICE_ROLE_KEY (lihat bawah)   │
└───────────────────────────────────────────────────────────────────┘

Kedua jalur bisa aktif bersamaan: server menyimpan "jejak" event
(nomor + kode + event) selama 3 menit — event yang sama tidak akan
dikirim dua kali.
```

---

## Menjalankan (lokal)

```bash
cd whatsapp-service
npm install          # sekali saja
npm start
```

- Pertama kali: **QR code muncul di terminal** → buka WhatsApp di
  ponsel → *Perangkat Tertaut* → *Tautkan Perangkat* → scan.
  Sesi tersimpan di `auth_info/` (gitignored) — tidak perlu scan lagi.
- Status koneksi: `GET /api/status` → `{"status":"connected"}`.
- Kalau status `logged_out`: hapus folder `auth_info/`, jalankan ulang,
  scan QR lagi.

### Variabel di `whatsapp-service/.env`

| Variabel | Wajib | Keterangan |
|---|---|---|
| `PORT` | ✓ | Port HTTP (default 3000) |
| `API_KEY` | ✓ | Secret untuk header `x-api-key` — samakan dengan `WA_API_KEY` di `.env` root |
| `AUTH_DIR` | ✓ | Folder sesi Baileys (`./auth_info`) |
| `WORKSHOP_NAME` | | Nama bengkel di dalam pesan (default `Pytabengkel`) |
| `WEBHOOK_SECRET` | | Secret khusus Supabase webhook (header `x-webhook-secret` / query `?secret=`) |
| `SUPABASE_URL` | untuk jalur webhook | URL project Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | untuk jalur webhook | **Hanya di file ini, jangan di frontend.** Dipakai ambil nomor telepon customer (melewati RLS) |
| `DEDUP_WINDOW_MS` | | Jendela anti-duplikat (default 180000 = 3 menit) |

> Tanpa `SUPABASE_SERVICE_ROLE_KEY`, jalur webhook tidak bisa mencari
> nomor tujuan (tabel `customers` dilindungi RLS) dan akan membalas
> `422 nomor tujuan tidak ditemukan`. **Jalur frontend tetap jalan**
> karena browser mengirim `telepon` langsung dari cache-nya.

---

## Endpoint

Semua endpoint kecuali `/health` butuh autentikasi:
header `x-api-key: <API_KEY>` — untuk webhook juga boleh
`x-webhook-secret: <WEBHOOK_SECRET>` atau query `?secret=`.

| Method | Path | Fungsi |
|---|---|---|
| GET | `/health` | Cek server hidup (tanpa auth) |
| GET | `/api/status` | Status koneksi WhatsApp + error terakhir |
| POST | `/api/send` | Kirim pesan bebas — `{number, message}` (testing/manual) |
| POST | `/api/notify` | Kirim notifikasi terformat — `{service, events?, telepon?}` |
| POST | `/api/webhook/service` | Terima Supabase Database Webhook (tabel `services`) |

`events` yang dikenal: `ajuan`, `disetujui`, `ditolak`, `dikerjakan`,
`selesai`, `lunas`, `update` (fallback).

### Contoh

```bash
# status
curl -H "x-api-key: $API_KEY" http://localhost:3000/api/status

# notifikasi "selesai"
curl -H "x-api-key: $API_KEY" -H "Content-Type: application/json" -d '{
  "service": {"kode": "knd-001", "polisi": "B 1234 XY", "merk": "Toyota",
    "jenis": "Avanza", "pelanggan": "Budi", "keluhan": "Rem bunyi",
    "status": "Selesai", "mekanik": "Andi", "biayaJasa": 350000,
    "pembayaran": "Lunas"},
  "events": ["selesai", "lunas"],
  "telepon": "6281234567890"
}' http://localhost:3000/api/notify
```

Format `service` menerima camelCase (aplikasi) maupun snake_case
(payload Supabase) — keduanya dinormalkan otomatis.

---

## Menyambungkan frontend

1. Di **`.env` root project** (sudah diisi oleh setup ini):

   ```bash
   WA_SERVER_URL=http://localhost:3000
   WA_API_KEY=<sama dengan API_KEY di whatsapp-service/.env>
   ```

2. Jalankan `node scripts/build-config.js` (atau biarkan build Vercel
   yang jalan) → nilai masuk ke `js/config.prod.js` → otomatis dipakai
   `js/db.js`.

3. Selesai — setiap penyimpanan yang mengubah status/approval/pembayaran
   service akan memicu notifikasi (fire-and-forget; kalau server WA
   mati, penyimpanan data tetap sukses tanpa error).

> **Catatan keamanan:** `waApiKey` ikut terkirim ke browser, jadi siapa
> pun yang membuka situs bisa memakai endpoint kirim pesan. Untuk proyek
> demo ini wajar; untuk produksi, jangan simpan API key di frontend —
> misal dengan menyalakan hanya jalur webhook, atau menambah
> penandatanganan request di server.

---

## Aktivasi Supabase Database Webhook (opsional, disarankan)

Jalur ini membuat notifikasi tetap terkirim **walaupun tidak ada browser
yang terbuka**.

1. Isi `SUPABASE_SERVICE_ROLE_KEY` di `whatsapp-service/.env`
   (Supabase Dashboard → Project Settings → API → `service_role`).
2. Server harus bisa diakses dari internet. Selama masih lokal, pakai
   tunnel, misalnya:

   ```bash
   cloudflared tunnel --url http://localhost:3000
   # atau: ngrok http 3000
   ```

   Catat URL publiknya (mis. `https://xxxx.trycloudflare.com`).
3. Supabase Dashboard → **Database → Webhooks** → buat webhook:
   - Table: `services`
   - Events: **Insert** dan **Update**
   - Type: HTTP request
   - URL: `https://xxxx.trycloudflare.com/api/webhook/service`
   - Header: `x-webhook-secret: <WEBHOOK_SECRET>` (atau pakai
     `?secret=<WEBHOOK_SECRET>` di URL kalau dashboard tidak
     menyediakan custom header)
4. Uji: ubah status suatu service di halaman admin → cek log server
   (`[wa] terkirim -> ...`) dan pastikan tidak ada pesan dobel
   (anti-duplikat 3 menit yang bekerja).

Untuk production, host service ini di VPS yang selalu hidup
(systemd / Docker) dan pakai URL https tetap, lalu set
`WA_SERVER_URL` di Environment Variables Vercel ke URL itu.

---

## Struktur

```
whatsapp-service/
├── server.js      # HTTP server + koneksi Baileys + endpoint
├── messages.js    # deteksi event + penyusun pesan info kendaraan
├── .env           # rahasia (gitignored)
├── auth_info/     # sesi WhatsApp (gitignored — jangan di-commit)
├── node_modules/  # (gitignored)
└── package.json
```

## Troubleshooting

| Gejala | Penyebab / solusi |
|---|---|
| `{"status":"waiting_qr"}` | Scan QR di terminal dari ponsel |
| `{"status":"logged_out"}` | Hapus `auth_info/`, restart, scan ulang |
| `401 Unauthorized` | `x-api-key` tidak sama dengan `API_KEY` di `.env` |
| `503 WhatsApp belum terhubung` | Tunggu status `connected`, cek koneksi internet |
| `422 nomor tujuan tidak ditemukan` | Webhook: isi `SUPABASE_SERVICE_ROLE_KEY`; pastikan customer punya `telepon` |
| Frontend tidak mengirim | Cek `WA_SERVER_URL` + `WA_API_KEY` ter-build ke `js/config.prod.js`, dan server bisa diakses dari browser (CORS sudah diizinkan) |
| Pesan dobel | Turunkan `DEDUP_WINDOW_MS`, atau pastikan tidak ada dua instance server (`EADDRINUSE` = port sudah terpakai instance lain) |
