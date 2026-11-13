/* =====================================================================
   DATA LAYER
   ---------------------------------------------------------------------
   Sumber data tunggal untuk seluruh aplikasi: SEMUA dari Supabase
   (tabel + RLS). Tidak ada lagi mode lokal/localStorage — cache di
   bawah hanya penampung dalam memori untuk satu sesi halaman.

   Antarmuka fungsi tetap SAMA dengan versi lama
   (getCustomers / saveCustomers / getKendaraan / ...) sehingga semua
   halaman lama tetap bekerja tanpa perubahan besar.
   ===================================================================== */

var DB = {
  mode: isSupabaseMode() ? "supabase" : "local",
  ready: false,
  /* Peta posisi antrean (id service -> nomor urut) dari RPC
     queue_positions(). Null = belum dimuat / RPC belum ada. */
  antrian: null,
  cache: {
    customers: [],
    services: [],
    mechanics: [],
    spareparts: [],
    reviews: [],
    promos: [],
    accounts: [],
    logs: [],
    info: {},
  },
  known: {
    customers: new Set(),
    services: new Set(),
    mechanics: new Set(),
    spareparts: new Set(),
    reviews: new Set(),
    promos: new Set(),
  },
  queue: Promise.resolve(),
  writeErrors: 0,

  /* Snapshot status/approval/pembayaran terakhir yang SUDAH tersimpan
     (diisi saat load data & setiap save sukses). Deteksi event WA
     memakai baseline ini — bukan array "sebelum" — karena banyak
     pemanggil UI memutasi array cache in-place SEBELUM saveKendaraan
     dipanggil (array "sebelum" dan "sesudah" jadi identik). */
  serviceState: new Map(),
};

/* ---------------------------------------------------------------------
   UTILITAS
   --------------------------------------------------------------------- */

function dbLog(...args) {
  console.warn("[db]", ...args);
}

/* Penanda versi kode: tercetak SEKALI saat file ini dimuat.
   Kalau baris ini tidak muncul di console setelah reload, berarti
   browser masih memakai db.js lama (cache) — pakai Ctrl+Shift+R. */
dbLog("db.js versi notifikasi WA aktif (2026-11-12)");

function notifyDbError(message) {
  console.error("[db]", message);

  if (typeof showPageNotice === "function") {
    showPageNotice(
      "Perubahan gagal dikirim ke server. Periksa koneksi lalu coba lagi.",
      "error",
    );
  }
}

/* PostgREST menolak SELURUH baris kalau payload memuat kolom yang belum
   dikenal — mis. kode baru sudah memakai kolom tambahan tetapi
   supabase/schema.sql belum dijalankan ulang (atau cache schema
   PostgREST belum reload). Supaya perubahan tetap tersimpan, kolom yang
   tidak dikenal dibuang lalu upsert diulang. */
function missingDbColumn(error) {
  const message = String(error?.message || "");
  const match =
    message.match(/Could not find the '([^']+)' column/i) ||
    message.match(/column "([^"]+)" of relation/i) ||
    message.match(/column "([^"]+)" does not exist/i);
  return match ? match[1] : "";
}

var missingColumnNotified = false;

async function upsertRows(table, rows, onConflict = "id") {
  let payload = rows;
  let result = null;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    result = await supabaseClient.from(table).upsert(payload, { onConflict });
    if (!result.error) return result;

    const column = missingDbColumn(result.error);
    if (
      !column ||
      !payload.some((row) => Object.prototype.hasOwnProperty.call(row, column))
    ) {
      return result;
    }

    dbLog(
      `kolom ${column} belum ada di tabel ${table} — menyimpan tanpa kolom itu.`,
    );

    if (!missingColumnNotified) {
      missingColumnNotified = true;
      if (typeof showPageNotice === "function") {
        showPageNotice(
          "Data tersimpan, tetapi kolom baru belum ada di database. " +
            "Jalankan ulang supabase/schema.sql agar sasaran & daftar diskon " +
            "(termasuk multi-promo) ikut tersimpan.",
          "error",
        );
      }
    }

    /* Kolom nama sasaran ikut dibuang supaya promo yang tidak bisa
       menyimpan daftar id tidak tampak menyasar sparepart tertentu
       padahal berlaku untuk semua. */
    const siblings =
      column === "sparepart_ids"
        ? ["sparepart_nama"]
        : column === "promo_sparepart_ids"
          ? ["promo_sparepart_nama"]
          : [];

    payload = payload.map((row) => {
      const next = { ...row };
      delete next[column];
      siblings.forEach((key) => delete next[key]);
      return next;
    });
  }

  return result;
}

/* Menjalankan operasi tulis satu per satu (menghindari race condition). */
function dbQueue(task) {
  DB.queue = DB.queue
    .then(async () => {
      try {
        const result = await task();
        return result === undefined ? { ok: true } : result;
      } catch (error) {
        DB.writeErrors += 1;
        notifyDbError(error?.message || String(error));
        return { ok: false, error: error?.message || String(error) };
      }
    })
    .catch((error) => {
      DB.writeErrors += 1;
      notifyDbError(error?.message || String(error));
      return { ok: false, error: error?.message || String(error) };
    });

  return DB.queue;
}

/* Tunggu sampai SEMUA pekerjaan tulis yang sudah masuk antrean selesai.
   save*() bersifat fire-and-forget (tidak mengembalikan promise), jadi
   pemanggil yang butuh kepastian — mis. Restore/Reset Data sebelum
   redirect — memakai fungsi ini. Mengembalikan `true` kalau tidak ada
   pekerjaan yang gagal selama menunggu. */
function dbFlush() {
  const awal = DB.writeErrors;

  return dbQueue(async () => {}).then(() => DB.writeErrors === awal);
}

/* ---------------------------------------------------------------------
   NOTIFIKASI WHATSAPP — INFO KENDARAAN
   ---------------------------------------------------------------------
   Setelah perubahan service tersimpan ke Supabase, browser mengirim
   event-nya ke service WhatsApp (folder whatsapp-service/, Baileys)
   sebagai FALLBACK pelengkap Supabase Database Webhook — kalau webhook
   aktif, keduanya tidak menduplikasi pesan karena ada anti-duplikat
   di server (window per nomor + kode + event).

   Semua bersifat fire-and-forget: kegagalan menghubungi server WA
   TIDAK boleh menggagalkan penyimpanan data.

   Sumber konfigurasi: window.SUPABASE_CONFIG.waServerUrl + waApiKey
   (env WA_SERVER_URL / WA_API_KEY, lihat scripts/build-config.js).
   --------------------------------------------------------------------- */

function waNotifyConfig() {
  const cfg = window.SUPABASE_CONFIG || {};
  const url = String(cfg.waServerUrl || "").trim().replace(/\/+$/, "");
  const key = String(cfg.waApiKey || "").trim();
  return { url, key };
}

function waNotifyTeleponDariCache(customerId) {
  const id = Number(customerId);
  if (!id) return "";

  const customer = (DB.cache.customers || []).find(
    (item) => Number(item.id) === id,
  );

  return customer?.telepon || "";
}

/* Simpan baseline deteksi event dari data yang SUDAH dianggap benar
   (hasil load awal / hasil save sukses). Isi: status, approval,
   pembayaran — satu-satunya field yang memicu notifikasi. */
function commitServiceState(items) {
  const next = new Map();
  (items || []).forEach((item) => {
    next.set(Number(item.id), {
      status: item.status,
      approval: item.approval,
      pembayaran: item.pembayaran,
    });
  });
  DB.serviceState = next;
}

/* Bandingkan data service dengan BASELINE tersimpan lalu kumpulkan
   event yang perlu diumumkan ke pelanggan.

   Baseline per id: DB.serviceState (hasil load / save terakhir) — jika
   id belum ada di sana, jatuh ke item pada array `previous`. Penting:
   banyak pemanggil UI memutasi array cache in-place sebelum memanggil
   saveKendaraan, jadi `previous` bisa jadi identik dengan `current`;
   serviceState tidak ikut termutasi karena tersimpan terpisah. */
function collectWaNotifications(previous, current) {
  const prevById = new Map(
    (previous || []).map((item) => [Number(item.id), item]),
  );
  const baseline = DB.serviceState || new Map();
  const notifications = [];

  (current || []).forEach((item) => {
    const id = Number(item.id);
    const prev = baseline.has(id) ? baseline.get(id) : prevById.get(id);
    const events = [];

    if (!prev) {
      events.push("ajuan");
    } else {
      if (prev.approval !== item.approval) {
        if (item.approval === "Disetujui") events.push("disetujui");
        else if (item.approval === "Ditolak") events.push("ditolak");
      }

      if (prev.status !== item.status) {
        if (item.status === "Dikerjakan") events.push("dikerjakan");
        else if (item.status === "Selesai") events.push("selesai");
      }

      if (prev.pembayaran !== item.pembayaran && item.pembayaran === "Lunas") {
        events.push("lunas");
      }
    }

    if (events.length) {
      notifications.push({ item, events });
    }
  });

  return notifications;
}

/* Kirim notifikasi (fire-and-forget, tanpa mengubah hasil penyimpanan).
   Log di console [db] memudahkan verifikasi:
     - "Notifikasi WA terkirim"      -> server menerima & pesan keluar
     - "Notifikasi WA ditolak server"=> ada masalah (lihat alasan)
     - "Notifikasi WA nonaktif"      -> waServerUrl belum dikonfigurasi  */
function waNotifyServiceEvents(notifications) {
  const { url, key } = waNotifyConfig();

  if (!notifications || !notifications.length) {
    return;
  }

  if (!url) {
    dbLog(
      "Notifikasi WA nonaktif (waServerUrl kosong) — jalankan " +
        "`node scripts/build-config.js` lalu muat ulang halaman. Event: " +
        notifications.map((n) => n.events.join(",")).join("; "),
    );
    return;
  }

  notifications.forEach(({ item, events }) => {
    fetch(`${url}/api/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { "x-api-key": key } : {}),
      },
      body: JSON.stringify({
        service: serviceToDb(item),
        telepon: waNotifyTeleponDariCache(item.pelangganId),
        events,
      }),
      keepalive: true,
    })
      .then(async (res) => {
        if (res.ok) {
          dbLog(
            "Notifikasi WA terkirim:",
            (item.kode || item.id) + " → " + events.join(", "),
          );
          return;
        }

        let alasan = "";
        try {
          alasan = (await res.json())?.error || "";
        } catch {
          /* body bukan JSON — abaikan. */
        }
        dbLog("Notifikasi WA ditolak server:", res.status, alasan);
      })
      .catch((error) => {
        dbLog("Notifikasi WA gagal dikirim:", error?.message || error);
      });
  });
}

/* ---------------------------------------------------------------------
   BERSIHKAN DATA LOKAL WARISAN MODE LAMA
   ---------------------------------------------------------------------
   Versi sebelumnya menyimpan mirror data (dan password demo) di
   localStorage. Jalankan sekali lalu buang key-nya. Yang TIDAK disentuh:
   tema (workshop_theme), preferensi "ingat email", buffer error
   (workshop_client_errors), dan sesi auth milik supabase-js.
   --------------------------------------------------------------------- */
(function purgeLegacyLocalData() {
  var LEGACY_KEYS = [
    "workshop_customers",
    "workshop_kendaraan",
    "workshop_mekanik",
    "workshop_sparepart",
    "workshop_reviews",
    "workshop_promos",
    "workshop_info",
    "workshop_customer_accounts",
    "workshop_activity_logs",
  ];

  try {
    LEGACY_KEYS.forEach(function (key) {
      localStorage.removeItem(key);
    });
    sessionStorage.removeItem("workshopSession");
  } catch (error) {
    /* storage tidak tersedia (mis. mode privat) — abaikan. */
  }
})();

/* ---------------------------------------------------------------------
   MAPPER KOLOM  <->  SHAPE APLIKASI
   --------------------------------------------------------------------- */

function customerToDb(row) {
  return {
    id: Number(row.id),
    kode: row.kode || "",
    nama: row.nama || "",
    telepon: row.telepon || "",
    email: row.email || "",
    alamat: row.alamat || "",
    catatan: row.catatan || "",
    registered_at: row.registeredAt || new Date().toISOString(),
    registered_via: row.registeredVia || "admin",
  };
}

function customerFromDb(row) {
  return {
    id: Number(row.id),
    kode: row.kode || "",
    nama: row.nama || "",
    telepon: row.telepon || "",
    email: row.email || "",
    alamat: row.alamat || "",
    catatan: row.catatan || "",
    registeredAt: row.registered_at,
    registeredVia: row.registered_via || "admin",
  };
}

function mekanikToDb(row) {
  /* Nomor telepon TIDAK dikirim ke tabel mechanics (kolomnya sudah
     dipindah ke mechanics_private — lihat saveMekanik). */
  return {
    id: Number(row.id),
    kode: row.kode || "",
    nama: row.nama || "",
    spesialisasi: row.spesialisasi || "",
    status: row.status || "Aktif",
  };
}

function mekanikFromDb(row, telepon) {
  return {
    id: Number(row.id),
    kode: row.kode || "",
    nama: row.nama || "",
    spesialisasi: row.spesialisasi || "",
    /* telepon diisi dari mechanics_private (hanya admin yang dapat data;
       customer otomatis mendapat string kosong). */
    telepon: telepon || "",
    status: row.status || "Aktif",
  };
}

function sparepartToDb(row) {
  return {
    id: Number(row.id),
    kode: row.kode || "",
    nama: row.nama || "",
    kategori: row.kategori || "",
    harga: Number(row.harga) || 0,
    stok: Number(row.stok) || 0,
  };
}

function sparepartFromDb(row) {
  return {
    id: Number(row.id),
    kode: row.kode || "",
    nama: row.nama || "",
    kategori: row.kategori || "",
    harga: Number(row.harga) || 0,
    stok: Number(row.stok) || 0,
  };
}

/* Daftar id sparepart sasaran promo/service. Menerima objek aplikasi
   (promoSparepartIds) maupun baris Supabase (promo_sparepart_ids);
   data lama yang hanya punya satu sparepart tetap terbaca. */
function promoSparepartIds(row) {
  const list =
    row?.sparepart_ids ??
    row?.promo_sparepart_ids ??
    row?.sparepartIds ??
    row?.promoSparepartIds;
  const single =
    row?.sparepart_id ??
    row?.promo_sparepart_id ??
    row?.sparepartId ??
    row?.promoSparepartId;
  /* Daftar kosong berarti "semua sparepart", jadi jangan jatuh ke
     kolom tunggal lama yang mungkin masih menyimpan id sebelumnya. */
  return normalizeSparepartIds(Array.isArray(list) ? list : single);
}

/* Snapshot promo pada service: daftar multi-promo dari kolom
   promo_list, atau fallback satu promo dari kolom promo_* lama. */
function servicePromoSnapshots(row) {
  let raw = row?.promo_list ?? row?.promoList ?? row?.promos;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch (error) {
      raw = [];
    }
  }

  const daftar = (Array.isArray(raw) ? raw : [])
    .map((promo) => {
      if (!promo) return null;
      return {
        id: promo.id != null ? Number(promo.id) : null,
        kode: String(promo.kode || "").trim().toUpperCase(),
        nama: String(promo.nama || "").trim(),
        tipe: promo.tipe === "nominal" ? "nominal" : "persen",
        nilai: Number(promo.nilai) || 0,
        target:
          promo.target === "jasa" || promo.target === "sparepart"
            ? promo.target
            : "total",
        sparepartIds: promoSparepartIds(promo),
        sparepartNama: String(promo.sparepartNama || "").trim(),
      };
    })
    .filter((promo) => promo && promo.nilai > 0);

  if (daftar.length) return daftar;

  const kode = String(row?.promo_kode ?? row?.promoKode ?? "")
    .trim()
    .toUpperCase();
  const nilai = Number(row?.promo_nilai ?? row?.promoNilai) || 0;
  if (!kode || nilai <= 0) return [];

  const target = row?.promo_target ?? row?.promoTarget ?? "";
  return [
    {
      id: Number(row?.promo_id ?? row?.promoId) || null,
      kode,
      nama: String(row?.promo_nama ?? row?.promoNama ?? "").trim(),
      tipe:
        (row?.promo_tipe ?? row?.promoTipe) === "nominal"
          ? "nominal"
          : "persen",
      nilai,
      target: target === "jasa" || target === "sparepart" ? target : "total",
      sparepartIds: promoSparepartIds(row),
      sparepartNama: String(
        row?.promo_sparepart_nama ?? row?.promoSparepartNama ?? "",
      ).trim(),
    },
  ];
}

function serviceToDb(row) {
  const sparepartIds = promoSparepartIds(row);
  const promoList = servicePromoSnapshots(row);
  const promo = promoList[0] || null;
  return {
    id: Number(row.id),
    kode: row.kode || "",
    polisi: row.polisi || "",
    jenis: row.jenis || "",
    merk: row.merk || "",
    customer_id: row.pelangganId ? Number(row.pelangganId) : null,
    pelanggan: row.pelanggan || "",
    keluhan: row.keluhan || "",
    status: row.status || "Menunggu",
    mechanic_id: row.mekanikId ? Number(row.mekanikId) : null,
    mekanik: row.mekanik || "",
    tanggal_service: row.tanggalService || null,
    biaya_jasa: Number(row.biayaJasa) || 0,
    spareparts: row.spareparts || [],
    pembayaran: row.pembayaran || "Belum Lunas",
    requested_by: row.requestedBy || "admin",
    approval: row.approval || "Disetujui",
    approval_note: row.approvalNote || "",
    promo_id: promo ? promo.id : null,
    promo_kode: promo ? promo.kode : "",
    promo_nama: promo ? promo.nama : "",
    promo_tipe: promo ? promo.tipe : "",
    promo_nilai: promo ? promo.nilai : 0,
    promo_target: promo ? promo.target : "",
    promo_sparepart_id: sparepartIds.length === 1 ? sparepartIds[0] : null,
    promo_sparepart_ids: sparepartIds,
    promo_sparepart_nama: promo ? promo.sparepartNama : "",
    promo_list: promoList,
  };
}

function serviceFromDb(row) {
  const sparepartIds = promoSparepartIds(row);
  const promoList = servicePromoSnapshots(row);
  const promo = promoList[0] || null;
  return {
    id: Number(row.id),
    kode: row.kode || "",
    polisi: row.polisi || "",
    jenis: row.jenis || "",
    merk: row.merk || "",
    pelangganId: row.customer_id ? Number(row.customer_id) : null,
    pelanggan: row.pelanggan || "",
    keluhan: row.keluhan || "",
    status: row.status || "Menunggu",
    mekanikId: row.mechanic_id ? Number(row.mechanic_id) : null,
    mekanik: row.mekanik || "",
    tanggalService: row.tanggal_service || "",
    biayaJasa: Number(row.biaya_jasa) || 0,
    spareparts: row.spareparts || [],
    pembayaran: row.pembayaran || "Belum Lunas",
    requestedBy: row.requested_by || "admin",
    /* Fallback kalau kolom approval belum ada di database: ajuan
       customer yang masih "Menunggu" dianggap menunggu persetujuan,
       sisanya sudah disetujui. */
    approval:
      row.approval ||
      (row.requested_by === "customer" && row.status === "Menunggu"
        ? "Menunggu"
        : "Disetujui"),
    approvalNote: row.approval_note || "",
    promoId: promo ? promo.id : null,
    promoKode: promo ? promo.kode : "",
    promoNama: promo ? promo.nama : "",
    promoTipe: promo ? promo.tipe : "",
    promoNilai: promo ? promo.nilai : 0,
    promoTarget: promo ? promo.target : "",
    promoSparepartIds: sparepartIds,
    promoSparepartId: sparepartIds.length === 1 ? sparepartIds[0] : null,
    promoSparepartNama: promo ? promo.sparepartNama : "",
    promoList,
  };
}

function reviewToDb(row) {
  return {
    id: Number(row.id),
    kode: row.kode || "",
    service_id: Number(row.serviceId),
    customer_id: row.customerId ? Number(row.customerId) : null,
    rating: Math.min(5, Math.max(1, Number(row.rating) || 0)),
    komentar: row.komentar || "",
  };
}

function reviewFromDb(row) {
  return {
    id: Number(row.id),
    kode: row.kode || "",
    serviceId: Number(row.service_id),
    customerId: row.customer_id ? Number(row.customer_id) : null,
    rating: Number(row.rating) || 0,
    komentar: row.komentar || "",
    createdAt: row.created_at || "",
  };
}

function promoToDb(row) {
  const sparepartIds = promoSparepartIds(row);
  return {
    id: Number(row.id),
    kode: row.kode || "",
    nama: row.nama || "",
    deskripsi: row.deskripsi || "",
    tipe: row.tipe === "nominal" ? "nominal" : "persen",
    nilai: Number(row.nilai) || 0,
    mulai: row.mulai || null,
    sampai: row.sampai || null,
    aktif: row.aktif !== false,
    target: row.target === "jasa" || row.target === "sparepart" ? row.target : "total",
    sparepart_id: sparepartIds.length === 1 ? sparepartIds[0] : null,
    sparepart_ids: sparepartIds,
    sparepart_nama: row.sparepartNama || "",
  };
}

function promoFromDb(row) {
  const sparepartIds = promoSparepartIds(row);
  return {
    id: Number(row.id),
    kode: row.kode || "",
    nama: row.nama || "",
    deskripsi: row.deskripsi || "",
    tipe: row.tipe === "nominal" ? "nominal" : "persen",
    nilai: Number(row.nilai) || 0,
    mulai: row.mulai || "",
    sampai: row.sampai || "",
    aktif: row.aktif !== false,
    target: row.target === "jasa" || row.target === "sparepart" ? row.target : "total",
    sparepartIds,
    sparepartId: sparepartIds.length === 1 ? sparepartIds[0] : null,
    sparepartNama: row.sparepart_nama || "",
  };
}

/* Promo/diskon: aktif=true dan berada dalam rentang mulai–sampai (bila diisi). */
function isPromoActive(promo, now) {
  if (!promo || promo.aktif === false) return false;
  var at = now instanceof Date ? now : new Date();
  if (promo.mulai) {
    var start = new Date(String(promo.mulai));
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(promo.mulai))) {
      start.setHours(0, 0, 0, 0);
    }
    if (!isNaN(start) && at < start) return false;
  }
  if (promo.sampai) {
    var end = new Date(String(promo.sampai));
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(promo.sampai))) {
      end.setHours(23, 59, 59, 999);
    }
    if (!isNaN(end) && at > end) return false;
  }
  return true;
}

/* ---------------------------------------------------------------------
   INISIALISASI
   --------------------------------------------------------------------- */

/* Promise dbInit yang sedang berjalan — dipakai bersama oleh semua
   pemanggil supaya tidak ada request ganda ke Supabase. */
let DB_INIT_PROMISE = null;

async function dbInit() {
  if (DB.ready) {
    return DB.cache;
  }

  if (!DB_INIT_PROMISE) {
    DB_INIT_PROMISE = dbInitOnce().finally(function () {
      DB_INIT_PROMISE = null;
    });
  }

  return DB_INIT_PROMISE;
}

async function dbInitOnce() {
  if (!supabaseClient) {
    /* Tanpa credential: JANGAN diam-diam pakai localStorage (mode lokal
       sudah dihapus). Halaman sudah menampilkan pesan konfigurasi dari
       supabase.js — cache dikosongkan supaya tidak ada data palsu. */
    DB.ready = true;
    return DB.cache;
  }

  try {
    /* Log aktivitas dimulai berbarengan dengan tabel lain, bukan
       setelahnya — menghemat satu putaran jaringan penuh. */
    const logsReady = dbLoadLogs();

    /* Ulasan dimuat terpisah dengan catch sendiri: kalau tabel `reviews`
       belum dibuat di Supabase, halaman lain tetap harus berfungsi. */
    const reviewsReady = supabaseClient
      .from("reviews")
      .select("*")
      .order("id")
      .then((result) => {
        if (result.error) throw result.error;
        return (result.data || []).map(reviewFromDb);
      })
      .catch((error) => {
        dbLog(
          "Gagal memuat reviews (jalankan ulang supabase/schema.sql?):",
          error.message,
        );
        return [];
      });

    /* Promo/diskon dimuat terpisah: tabel mungkin belum ada di deployment lama. */
    const promosReady = supabaseClient
      .from("promos")
      .select("*")
      .order("id")
      .then((result) => {
        if (result.error) throw result.error;
        return (result.data || []).map(promoFromDb);
      })
      .catch((error) => {
        dbLog(
          "Gagal memuat promos (jalankan ulang supabase/schema.sql?):",
          error.message,
        );
        return [];
      });

    /* Posisi antrean service (RPC queue_positions) dimuat berbarengan
       dengan tabel lain. Catch sendiri: kalau fungsi RPC belum dibuat
       (schema.sql belum dijalankan ulang) halaman lain tetap jalan dan
       posisi antrean jatuh ke hitung lokal. */
    const antrianReady = supabaseClient
      .rpc("queue_positions")
      .then((result) => {
        if (result.error) throw result.error;
        return new Map(
          (result.data || []).map((row) => [
            Number(row.service_id),
            Number(row.nomor),
          ]),
        );
      })
      .catch((error) => {
        dbLog(
          "Gagal memuat antrean (jalankan ulang supabase/schema.sql?):",
          error.message,
        );
        return null;
      });

    const [
      customers,
      services,
      mechanics,
      mechPrivate,
      spareparts,
      info,
      profiles,
      antrian,
    ] = await Promise.all([
      supabaseClient.from("customers").select("*").order("id"),
      supabaseClient.from("services").select("*").order("id"),
      supabaseClient.from("mechanics").select("*").order("id"),
      supabaseClient.from("mechanics_private").select("*"),
      supabaseClient.from("spareparts").select("*").order("id"),
      supabaseClient.from("workshop_info").select("*").limit(1),
      supabaseClient.from("profiles").select("*"),
      antrianReady,
    ]);

    DB.antrian = antrian || null;

    if (customers.error) throw customers.error;
    if (services.error) throw services.error;

    const rawCustomers = (customers.data || []).map(customerFromDb);
    const rawServices = (services.data || []).map(serviceFromDb);

    /* Nomor telepon menyusul dari tabel private (admin dapat semua,
       customer kosong karena RLS). Gagal sekalipun tidak fatal. */
    const teleponMap = new Map(
      (mechPrivate.data || []).map((row) => [
        Number(row.mechanic_id),
        row.telepon || "",
      ]),
    );
    const rawMechanics = (mechanics.data || []).map((row) =>
      mekanikFromDb(row, teleponMap.get(Number(row.id))),
    );
    const rawSpareparts = (spareparts.data || []).map(sparepartFromDb);

    DB.cache.customers = ensureKode(rawCustomers, "customers");
    DB.cache.services = ensureKode(rawServices, "kendaraan");
    commitServiceState(DB.cache.services);
    DB.cache.mechanics = ensureKode(rawMechanics, "mekanik");
    DB.cache.spareparts = ensureKode(rawSpareparts, "sparepart");
    DB.cache.reviews = ensureKode(await reviewsReady, "reviews");
    DB.cache.promos = ensureKode(await promosReady, "promos");
    DB.cache.info = info.data?.[0]
      ? {
          nama: info.data[0].nama,
          alamat: info.data[0].alamat,
          kontak: info.data[0].kontak,
          email: info.data[0].email,
          jamBuka: info.data[0].jam_buka,
          hariBuka: info.data[0].hari_buka,
          heroFoto: info.data[0].hero_foto || "",
          heroLabel: info.data[0].hero_label || "",
          heroJudul: info.data[0].hero_judul || "",
          heroDeskripsi: info.data[0].hero_deskripsi || "",
        }
      : {};
    DB.cache.accounts = (profiles.data || []).map((row) => ({
      id: row.id,
      customerId: row.customer_id ? Number(row.customer_id) : null,
      email: row.email,
      nama: row.nama,
      role: row.role,
    }));

    DB.cache.logs = await logsReady;

    dbSyncKnown();

    /* Kode yang baru dibuat (data lama) disimpan ke server agar
       konsisten di semua perangkat. */
    if (dbIsAdmin()) {
      await Promise.all([
        dbPushKodeIfNeeded(
          rawCustomers,
          DB.cache.customers,
          "customers",
          customerToDb,
        ),
        dbPushKodeIfNeeded(
          rawServices,
          DB.cache.services,
          "services",
          serviceToDb,
        ),
        dbPushKodeIfNeeded(
          rawMechanics,
          DB.cache.mechanics,
          "mechanics",
          mekanikToDb,
        ),
        dbPushKodeIfNeeded(
          rawSpareparts,
          DB.cache.spareparts,
          "spareparts",
          sparepartToDb,
        ),
      ]);
    }
  } catch (error) {
    console.error("Gagal memuat data dari Supabase:", error);
    notifyDbError(
      "Gagal memuat data dari Supabase: " +
        (error?.message || String(error)),
    );
  }

  DB.ready = true;

  return DB.cache;
}

function dbSyncKnown() {
  DB.known.customers = new Set(
    DB.cache.customers.map((item) => Number(item.id)),
  );
  DB.known.services = new Set(DB.cache.services.map((item) => Number(item.id)));
  DB.known.mechanics = new Set(
    DB.cache.mechanics.map((item) => Number(item.id)),
  );
  DB.known.spareparts = new Set(
    DB.cache.spareparts.map((item) => Number(item.id)),
  );
  DB.known.reviews = new Set(DB.cache.reviews.map((item) => Number(item.id)));
  DB.known.promos = new Set(DB.cache.promos.map((item) => Number(item.id)));
}

/* Simpan kode yang belum ada di server (hasil backfill). */
async function dbPushKodeIfNeeded(before, after, table, mapper) {
  const berubah = after.filter(
    (item, index) => before[index]?.kode !== item.kode,
  );

  if (!berubah.length) {
    return;
  }

  dbLog(`Menyimpan kode baru ke tabel ${table} (${berubah.length} baris)`);

  await dbPushAll(table, berubah, mapper);
}

async function dbPushAll(table, rows, mapper) {
  if (!supabaseClient || !rows.length) {
    return;
  }

  const { error } = await supabaseClient
    .from(table)
    .upsert(rows.map(mapper), { onConflict: "id" });

  if (error) {
    dbLog(`Gagal seed ${table}:`, error.message);
  }
}

/* =========================================
   KODE ID (knd-001, cst-001, ...)
   Nomor urut tiap tabel memakai awalan huruf
   supaya ID mudah dibaca & tidak ambigu.
   ========================================= */

var KODE_PREFIX = {
  customers: "cst",
  kendaraan: "knd",
  mekanik: "mek",
  sparepart: "spp",
  reviews: "rev",
  promos: "prm",
};

function formatKode(prefix, nomor, panjang = 3) {
  return `${prefix}-${String(Number(nomor) || 0).padStart(panjang, "0")}`;
}

/* Nomor urut berikutnya (maks dari kode yang sudah ada). */
function nextKodeNumber(items) {
  return (
    (items || []).reduce((maks, item) => {
      const cocok = String(item.kode || "").match(/(\d+)\s*$/);
      return Math.max(maks, cocok ? Number(cocok[1]) : 0);
    }, 0) + 1
  );
}

function nextKode(type, items) {
  return formatKode(KODE_PREFIX[type] || "id", nextKodeNumber(items));
}

/* Kode yang ditampilkan di tabel & detail. */
function getKode(type, item) {
  if (!item) return "-";
  if (item.kode) return item.kode;
  return formatKode(KODE_PREFIX[type] || "id", item.id);
}

/* Pastikan semua baris punya kode (dipakai saat memuat data lama). */
function ensureKode(items, type) {
  const prefix = KODE_PREFIX[type] || "id";
  let nomor = nextKodeNumber(items);

  (items || []).forEach((item) => {
    if (item.kode) return;
    item.kode = formatKode(prefix, nomor);
    nomor += 1;
  });

  return items;
}

/* =========================================
   MEKANIK
   ========================================= */

/* Hanya mekanik aktif yang boleh dipilih. */
function getMekanikAktif() {
  return getMekanik().filter((item) => item.status === "Aktif");
}

/* =========================================
   INFORMASI BENGKEL
   ========================================= */

function getBengkelInfoLengkap() {
  const info = getWorkshopInfo() || {};

  return {
    nama: info.nama || "Pytabengkel",
    alamat: info.alamat || "",
    kontak: info.kontak || "",
    email: info.email || "",
    jamBuka: info.jamBuka || "",
    hariBuka: info.hariBuka || "",
    heroFoto: info.heroFoto || "",
    heroLabel: info.heroLabel || "",
    heroJudul: info.heroJudul || "",
    heroDeskripsi: info.heroDeskripsi || "",
  };
}

/* ---------------------------------------------------------------------
   API DATA (SAMA DENGAN VERSI LOKAL SEBELUMNYA)
   --------------------------------------------------------------------- */

/* CUSTOMER */

function getCustomers() {
  return DB.cache.customers;
}

function saveCustomers(customers) {
  DB.cache.customers = customers;

  if (!supabaseClient) {
    return;
  }

  const known = DB.known.customers;
  const current = new Set(customers.map((item) => Number(item.id)));
  const removed = [...known].filter((id) => !current.has(id));

  DB.known.customers = current;

  dbQueue(async () => {
    const payload = customers.map(customerToDb);

    /* Customer hanya boleh mengubah barisnya sendiri. */
    if (!dbIsAdmin()) {
      const profile = getCurrentProfile();
      const ownId = profile?.customer_id ? Number(profile.customer_id) : null;

      if (!ownId) {
        /* Sebelumnya diam saja — perubahan profil customer tidak
           pernah sampai ke server tanpa kabar apa pun. */
        notifyDbError(
          "Perubahan customer tidak tersimpan ke server: profil belum terhubung ke data customer.",
        );
        return;
      }

      const own = payload.filter((row) => row.id === ownId);

      if (!own.length) {
        return;
      }

      const { error } = await supabaseClient
        .from("customers")
        .update(own[0])
        .eq("id", ownId);

      if (error) {
        notifyDbError(error.message);
      }

      return;
    }

    /* Payload kosong (mis. Reset Data) → lewati upsert, langsung hapus
       baris yang hilang. */
    if (payload.length) {
      const { error } = await supabaseClient
        .from("customers")
        .upsert(payload, { onConflict: "id" });

      if (error) {
        notifyDbError(error.message);
        return;
      }
    }

    if (removed.length) {
      await supabaseClient.from("customers").delete().in("id", removed);
    }
  });
}

/* KENDARAAN + SERVICE */

function getKendaraan() {
  return DB.cache.services;
}

function saveKendaraan(data) {
  const previous = Array.isArray(DB.cache.services)
    ? DB.cache.services.slice()
    : [];
  const knownPrevious = new Set(DB.known.services);
  DB.cache.services = data;

  if (!supabaseClient) {
    return Promise.resolve({ ok: true });
  }

  const known = DB.known.services;
  const current = new Set(data.map((item) => Number(item.id)));
  const removed = [...known].filter((id) => !current.has(id));

  DB.known.services = current;

  /* Event notifikasi WA dihitung dari data SEBELUM tertimpa.
     Log selalu dicetak (walau 0 event) supaya mudah dipastikan dari
     console bahwa saveKendaraan jalan dan kode versi terbaru termuat:
       "[db] saveKendaraan: N event WA" -> kode BARU, event terdeteksi
       "[db] saveKendaraan: 0 event WA" -> kode BARU, perubahan bukan
                                           status/approval/pembayaran
       tidak ada log sama sekali        -> kode LAMA (cache) / tidak
                                           lewat saveKendaraan */
  const waNotifications = collectWaNotifications(previous, data);
  dbLog(
    `saveKendaraan: ${data.length} baris, ${waNotifications.length} event WA` +
      (waNotifications.length
        ? " (" +
          waNotifications
            .map((n) => `${n.item.kode || n.id}:${n.events.join("+")}`)
            .join(", ") +
          ")"
        : ""),
  );

  return dbQueue(async () => {
    const payload = data.map(serviceToDb);

    if (!dbIsAdmin()) {
      /* Customer boleh membuat & mengubah service miliknya saja. */
      const profile = getCurrentProfile();
      const ownId = profile?.customer_id ? Number(profile.customer_id) : null;

      if (!ownId) {
        notifyDbError(
          "Perubahan service tidak tersimpan ke server: profil belum terhubung ke data customer.",
        );
        DB.cache.services = previous;
        DB.known.services = knownPrevious;
        return { ok: false, error: "profil belum terhubung" };
      }

      const own = payload.filter((row) => row.customer_id === ownId);

      if (own.length) {
        const { error } = await upsertRows("services", own);

        if (error) {
          notifyDbError(error.message);
          DB.cache.services = previous;
          DB.known.services = knownPrevious;
          return { ok: false, error: error.message };
        }
      }

      waNotifyServiceEvents(waNotifications);
      commitServiceState(data);
      return { ok: true };
    }

    if (payload.length) {
      const { error } = await upsertRows("services", payload);

      if (error) {
        notifyDbError(error.message);
        DB.cache.services = previous;
        DB.known.services = knownPrevious;
        return { ok: false, error: error.message };
      }
    }

    if (removed.length) {
      const { error } = await supabaseClient
        .from("services")
        .delete()
        .in("id", removed);

      if (error) {
        notifyDbError(error.message);
        return { ok: false, error: error.message };
      }
    }

    waNotifyServiceEvents(waNotifications);
    commitServiceState(data);
    return { ok: true };
  });
}

/* MEKANIK */

function getMekanik() {
  return DB.cache.mechanics;
}

function saveMekanik(data) {
  DB.cache.mechanics = data;

  if (!supabaseClient) {
    return;
  }

  const known = DB.known.mechanics;
  const current = new Set(data.map((item) => Number(item.id)));
  const removed = [...known].filter((id) => !current.has(id));

  DB.known.mechanics = current;

  if (!dbIsAdmin()) {
    return;
  }

  dbQueue(async () => {
    const payload = data.map(mekanikToDb);

    if (payload.length) {
      const { error } = await supabaseClient
        .from("mechanics")
        .upsert(payload, { onConflict: "id" });

      if (error) {
        notifyDbError(error.message);
        return;
      }

      /* Nomor telepon disimpan terpisah di mechanics_private
         (RLS admin-only; fungsi ini sudah dijaga dbIsAdmin() di atas). */
      const privatePayload = data.map((item) => ({
        mechanic_id: Number(item.id),
        telepon: item.telepon || "",
      }));

      const { error: privateError } = await supabaseClient
        .from("mechanics_private")
        .upsert(privatePayload, { onConflict: "mechanic_id" });

      if (privateError) {
        notifyDbError(privateError.message);
        return;
      }
    }

    if (removed.length) {
      await supabaseClient.from("mechanics").delete().in("id", removed);
    }
  });
}

/* SPAREPART */

function getSparepart() {
  return DB.cache.spareparts;
}

function saveSparepart(sparepart) {
  DB.cache.spareparts = sparepart;

  if (!supabaseClient) {
    return;
  }

  const known = DB.known.spareparts;
  const current = new Set(sparepart.map((item) => Number(item.id)));
  const removed = [...known].filter((id) => !current.has(id));

  DB.known.spareparts = current;

  if (!dbIsAdmin()) {
    return;
  }

  dbQueue(async () => {
    const payload = sparepart.map(sparepartToDb);

    if (payload.length) {
      const { error } = await supabaseClient
        .from("spareparts")
        .upsert(payload, { onConflict: "id" });

      if (error) {
        notifyDbError(error.message);
        return;
      }
    }

    if (removed.length) {
      await supabaseClient.from("spareparts").delete().in("id", removed);
    }
  });
}

/* ULASAN / RATING */

function getReviews() {
  return DB.cache.reviews;
}

/* Ulasan milik sebuah service (satu service maksimal satu ulasan). */
function getReviewByServiceId(serviceId) {
  return (
    getReviews().find((item) => Number(item.serviceId) === Number(serviceId)) ||
    null
  );
}

function saveReviews(reviews) {
  const previous = Array.isArray(DB.cache.reviews)
    ? DB.cache.reviews.slice()
    : [];
  const knownPrevious = new Set(DB.known.reviews);
  DB.cache.reviews = reviews;

  if (!supabaseClient) {
    return Promise.resolve({ ok: true });
  }

  const known = DB.known.reviews;
  const current = new Set(reviews.map((item) => Number(item.id)));
  const removed = [...known].filter((id) => !current.has(id));

  DB.known.reviews = current;

  return dbQueue(async () => {
    let payload = reviews.map(reviewToDb);

    /* Customer hanya boleh menyimpan ulasan miliknya sendiri. */
    if (!dbIsAdmin()) {
      const profile = getCurrentProfile();
      const ownId = profile?.customer_id ? Number(profile.customer_id) : null;

      if (!ownId) {
        notifyDbError(
          "Ulasan tidak tersimpan ke server: profil belum terhubung ke data customer.",
        );
        DB.cache.reviews = previous;
        DB.known.reviews = knownPrevious;
        return { ok: false, error: "profil belum terhubung" };
      }

      payload = payload.filter((row) => row.customer_id === ownId);
    }

    if (payload.length) {
      const { error } = await supabaseClient
        .from("reviews")
        .upsert(payload, { onConflict: "id" });

      if (error) {
        notifyDbError(error.message);
        DB.cache.reviews = previous;
        DB.known.reviews = knownPrevious;
        return { ok: false, error: error.message };
      }
    }

    /* Penghapusan baris hanya dari sisi admin (mis. penataan data). */
    if (dbIsAdmin() && removed.length) {
      const { error } = await supabaseClient
        .from("reviews")
        .delete()
        .in("id", removed);
      if (error) {
        notifyDbError(error.message);
        return { ok: false, error: error.message };
      }
    }

    return { ok: true };
  });
}

/* PROMO / DISKON */

function getPromos() {
  return DB.cache.promos || [];
}

function savePromos(promos) {
  DB.cache.promos = promos;

  if (!supabaseClient) {
    return;
  }

  var known = DB.known.promos || new Set();
  var current = new Set(promos.map(function (item) { return Number(item.id); }));
  var removed = [];
  known.forEach(function (id) { if (!current.has(id)) removed.push(id); });

  DB.known.promos = current;

  if (!dbIsAdmin()) {
    return;
  }

  dbQueue(async function () {
    var payload = promos.map(promoToDb);

    if (payload.length) {
      var result = await upsertRows("promos", payload);

      if (result.error) {
        notifyDbError(result.error.message);
        return;
      }
    }

    if (removed.length) {
      await supabaseClient.from("promos").delete().in("id", removed);
    }
  });
}

/* ---------------------------------------------------------------------
   FOTO SERVICE (Supabase Storage)
   Hanya admin yang mengunggah/menghapus; customer hanya membaca foto
   service miliknya (RLS service_photos). Butuh koneksi Supabase.
   --------------------------------------------------------------------- */

async function getServicePhotos(serviceId) {
  if (!supabaseClient || !serviceId) {
    return [];
  }

  const { data, error } = await supabaseClient
    .from("service_photos")
    .select("*")
    .eq("service_id", Number(serviceId))
    .order("id");

  if (error) {
    dbLog("Gagal memuat foto service:", error.message);
    return [];
  }

  return data || [];
}

/* Unggah satu file ke bucket "service-photos", lalu catat barisnya.
   Melempar Error dengan pesan yang bisa ditampilkan langsung. */
async function uploadServicePhoto(serviceId, file) {
  if (!supabaseClient) {
    throw new Error("Foto hanya tersedia pada mode Supabase.");
  }

  if (!file || !String(file.type || "").startsWith("image/")) {
    throw new Error("File harus berupa gambar (jpg/png/webp).");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Ukuran foto maksimal 5 MB.");
  }

  const extRaw =
    String(file.name || "")
      .split(".")
      .pop() || "jpg";
  const ext = extRaw.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `svc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabaseClient.storage
    .from("service-photos")
    .upload(path, file, { upsert: false, contentType: file.type });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: pub } = supabaseClient.storage
    .from("service-photos")
    .getPublicUrl(path);

  const { error: insertError } = await supabaseClient
    .from("service_photos")
    .insert({
      service_id: Number(serviceId),
      path,
      url: pub.publicUrl,
      keterangan: String(file.name || "").slice(0, 120),
    });

  if (insertError) {
    /* Gagal mencatat baris -> bersihkan object yang baru diunggah. */
    await supabaseClient.storage.from("service-photos").remove([path]);
    throw new Error(insertError.message);
  }

  return pub.publicUrl;
}

async function deleteServicePhoto(photo) {
  if (!supabaseClient || !photo) {
    return;
  }

  const { error } = await supabaseClient
    .from("service_photos")
    .delete()
    .eq("id", Number(photo.id));

  if (error) {
    throw new Error(error.message);
  }

  if (photo.path) {
    await supabaseClient.storage.from("service-photos").remove([photo.path]);
  }
}

/* ---------------------------------------------------------------------
   FOTO HERO LANDING
   Satu file di bucket "site-assets"; URL publiknya disimpan di
   workshop_info.hero_foto dan dibaca landing page lewat RPC anon.
   --------------------------------------------------------------------- */

async function uploadHeroPhoto(file) {
  if (!supabaseClient) {
    throw new Error("Foto hanya tersedia pada mode Supabase.");
  }

  if (!dbIsAdmin()) {
    throw new Error("Hanya admin yang dapat mengganti foto hero.");
  }

  if (!file || !String(file.type || "").startsWith("image/")) {
    throw new Error("File harus berupa gambar (jpg/png/webp).");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Ukuran foto maksimal 5 MB.");
  }

  const extRaw =
    String(file.name || "")
      .split(".")
      .pop() || "jpg";
  const ext = extRaw.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `hero-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabaseClient.storage
    .from("site-assets")
    .upload(path, file, { upsert: false, contentType: file.type });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: pub } = supabaseClient.storage
    .from("site-assets")
    .getPublicUrl(path);

  return pub.publicUrl;
}

/* Hapus object foto hero lama dari storage (best-effort: URL yang bukan
   milik bucket site-assets — misal hasil backup — dibiarkan). */
async function removeHeroPhoto(url) {
  if (!supabaseClient || !url) {
    return;
  }

  const marker = "/site-assets/";
  const index = String(url).indexOf(marker);

  if (index === -1) {
    return;
  }

  const path = String(url).slice(index + marker.length).split("?")[0];

  if (!path) {
    return;
  }

  await supabaseClient.storage.from("site-assets").remove([path]);
}

/* AKUN CUSTOMER */

function getCustomerAccounts() {
  return DB.cache.accounts;
}

function saveCustomerAccounts(accounts) {
  DB.cache.accounts = accounts.map((item) => ({
    id: item.id,
    customerId: item.customerId ? Number(item.customerId) : null,
    email: item.email,
    nama: item.nama,
    password: item.password,
    role: item.role || "customer",
  }));


  /* Di mode Supabase akun dibuat lewat Supabase Auth, bukan tabel ini. */
}

/* Muat ulang daftar akun dari server sebelum operasi destruktif (mis.
   Reset Data). Tujuannya supaya tautan akun -> customer selalu yang
   terbaru, sehingga tidak ada data customer milik akun yang ikut
   terhapus. Mengembalikan `null` kalau gagal — pemanggil harus
   membatalkan operasi daripada mengambil risiko menghapus akun. */
async function dbReloadCustomerAccounts() {
  if (!supabaseClient || !dbIsAdmin()) {
    return getCustomerAccounts();
  }

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, customer_id, email, nama, role");

  if (error) {
    dbLog("Gagal memuat ulang daftar akun:", error.message);
    return null;
  }

  DB.cache.accounts = (data || []).map((row) => ({
    id: row.id,
    customerId: row.customer_id ? Number(row.customer_id) : null,
    email: row.email,
    nama: row.nama,
    role: row.role,
  }));

  return DB.cache.accounts;
}

function getCustomerById(customerId) {
  return (
    getCustomers().find(
      (customer) => Number(customer.id) === Number(customerId),
    ) || null
  );
}

/* ---------------------------------------------------------------------
   AKTIVITAS / JEJAK PERUBAHAN
   --------------------------------------------------------------------- */

function logToDb(row) {
  return {
    id: Number(row.id),
    waktu: row.waktu || new Date().toISOString(),
    aktor: row.aktor || "Sistem",
    role: row.role || "admin",
    aksi: row.aksi || "",
    entitas: row.entitas || "",
    kode: row.kode || "",
    keterangan: row.keterangan || "",
  };
}

function logFromDb(row) {
  return {
    id: Number(row.id),
    waktu: row.waktu,
    aktor: row.aktor || "",
    role: row.role || "",
    aksi: row.aksi || "",
    entitas: row.entitas || "",
    kode: row.kode || "",
    keterangan: row.keterangan || "",
  };
}

/* Muat log aktivitas terbaru dari Supabase (satu-satunya sumber). */
async function dbLoadLogs() {
  if (!supabaseClient) {
    return DB.cache.logs || [];
  }

  try {
    const { data, error } = await supabaseClient
      .from("activity_logs")
      .select("*")
      .order("waktu", { ascending: false })
      .limit(200);

    if (error) throw error;

    return (data || []).map(logFromDb);
  } catch (error) {
    dbLog("Gagal memuat aktivitas:", error);
    return DB.cache.logs || [];
  }
}

function getLogs() {
  return DB.cache.logs || [];
}

/* Kosongkan riwayat aktivitas (dipakai Reset Data Admin). Berbeda dari
   saveLogs([]) yang hanya menyimpan daftar kosong, fungsi ini benar-benar
   menghapus baris di server. */
async function clearActivityLogs() {
  DB.cache.logs = [];

  if (!supabaseClient || !dbIsAdmin()) {
    return;
  }

  const { error } = await supabaseClient
    .from("activity_logs")
    .delete()
    .neq("id", 0);

  if (error) {
    dbLog("Gagal membersihkan aktivitas:", error.message);
  }
}

function saveLogs(logs) {
  DB.cache.logs = logs;

  if (!supabaseClient || !dbIsAdmin()) {
    return;
  }

  const payload = logs.slice(-200).map(logToDb);

  dbQueue(async () => {
    const { error } = await supabaseClient
      .from("activity_logs")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      dbLog("Gagal menyimpan aktivitas:", error.message);
    }
  });
}

/* Catat aktivitas pengguna (create / update / delete / pembayaran). */
function addLog(aksi, entitas, keterangan = "", kode = "") {
  const profile =
    typeof getCurrentProfile === "function" ? getCurrentProfile() : null;
  const nama = profile?.nama || "Administrator Bengkel";

  const entry = {
    id: nextNumericId(DB.cache.logs),
    waktu: new Date().toISOString(),
    aktor: nama,
    role: profile?.role || "admin",
    aksi,
    entitas,
    kode: String(kode || ""),
    keterangan,
  };

  DB.cache.logs = [...(DB.cache.logs || []), entry].slice(-200);


  if (supabaseClient && dbIsAdmin()) {
    dbQueue(async () => {
      const { error } = await supabaseClient
        .from("activity_logs")
        .upsert([logToDb(entry)], { onConflict: "id" });

      if (error) {
        dbLog("Gagal menyimpan aktivitas:", error.message);
      }
    });
  }
}

/* INFO BENGKEL */

function getWorkshopInfo() {
  return DB.cache.info || {};
}

function saveWorkshopInfo(info) {
  /* Foto & teks hero TIDAK ikut ditimpa kalau tidak disertakan pemanggil
     (form Informasi Bengkel, restore backup lama, dsb). */
  const prev = DB.cache.info || {};
  const keep = (key) =>
    info[key] !== undefined ? info[key] : prev[key] || "";

  DB.cache.info = {
    ...info,
    heroFoto: keep("heroFoto"),
    heroLabel: keep("heroLabel"),
    heroJudul: keep("heroJudul"),
    heroDeskripsi: keep("heroDeskripsi"),
  };

  if (!supabaseClient || !dbIsAdmin()) {
    return;
  }

  dbQueue(async () => {
    const { error } = await supabaseClient.from("workshop_info").upsert(
      [
        {
          id: 1,
          nama: info.nama || "",
          alamat: info.alamat || "",
          kontak: info.kontak || "",
          email: info.email || "",
          jam_buka: info.jamBuka || "",
          hari_buka: info.hariBuka || "",
          hero_foto: DB.cache.info.heroFoto,
          hero_label: DB.cache.info.heroLabel,
          hero_judul: DB.cache.info.heroJudul,
          hero_deskripsi: DB.cache.info.heroDeskripsi,
        },
      ],
      { onConflict: "id" },
    );

    if (error) {
      notifyDbError(error.message);
    }
  });
}

/* ---------------------------------------------------------------------
   PROFIL PENGGUNA
   --------------------------------------------------------------------- */

async function dbUpdateProfile(patch = {}) {
  const profile = getCurrentProfile();

  if (!supabaseClient || !profile?.id) {
    return { ok: true };
  }

  const payload = {};

  /* Tabel `profiles` TIDAK punya kolom `catatan` (kolom itu hanya ada
     di `customers`). Mengirimnya membuat seluruh UPDATE ditolak
     PostgREST, jadi nama/email/telepon tidak pernah tersimpan. */
  if (patch.nama !== undefined) payload.nama = patch.nama;
  if (patch.telepon !== undefined) payload.telepon = patch.telepon;
  if (patch.email !== undefined) payload.email = patch.email;
  if (patch.alamat !== undefined) payload.alamat = patch.alamat;

  const { error } = await supabaseClient
    .from("profiles")
    .update(payload)
    .eq("id", profile.id);

  if (error) {
    notifyDbError(error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/* ---------------------------------------------------------------------
   HELPER
   --------------------------------------------------------------------- */

function dbIsAdmin() {
  return isAdminRole(getCurrentProfile()?.role);
}

