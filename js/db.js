/* =====================================================================
   DATA LAYER
   ---------------------------------------------------------------------
   Sumber data tunggal untuk seluruh aplikasi.

   MODE SUPABASE : data diambil dari tabel Supabase, perubahan dikirim
                   kembali dengan sinkronisasi (upsert + hapus yang hilang).
   MODE LOKAL    : data diambil/diambil dari localStorage (fallback demo).

   Antarmuka fungsi tetap SAMA dengan versi localStorage sebelumnya
   (getCustomers / saveCustomers / getKendaraan / ...) sehingga semua
   halaman lama tetap bekerja tanpa perubahan besar.
   ===================================================================== */

var DB = {
  mode: isSupabaseMode() ? "supabase" : "local",
  ready: false,
  cache: {
    customers: [],
    services: [],
    mechanics: [],
    spareparts: [],
    reviews: [],
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
  },
  queue: Promise.resolve(),
};

/* ---------------------------------------------------------------------
   UTILITAS
   --------------------------------------------------------------------- */

function dbLog(...args) {
  console.warn("[db]", ...args);
}

function notifyDbError(message) {
  console.error("[db]", message);

  if (typeof showPageNotice === "function") {
    showPageNotice(
      "Perubahan tersimpan di perangkat ini, tetapi gagal dikirim ke server.",
      "error",
    );
  }
}

/* Menjalankan operasi tulis satu per satu (menghindari race condition). */
function dbQueue(task) {
  DB.queue = DB.queue.then(task).catch((error) => {
    notifyDbError(error?.message || String(error));
  });

  return DB.queue;
}

/* Mirror ke localStorage supaya data tidak hilang & mode lokal tetap jalan. */
function dbPersistLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    dbLog("Gagal menyimpan mirror local:", error);
  }
}

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

function serviceToDb(row) {
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
  };
}

function serviceFromDb(row) {
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
    /* Production tanpa Supabase: JANGAN diam-diam pakai localStorage.
       Halaman sudah menampilkan pesan konfigurasi dari supabase.js. */
    if (typeof LOCAL_MODE_ALLOWED === "boolean" && !LOCAL_MODE_ALLOWED) {
      DB.ready = true;
      return DB.cache;
    }

    dbLoadFromLocal();
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

    const [
      customers,
      services,
      mechanics,
      mechPrivate,
      spareparts,
      info,
      profiles,
    ] = await Promise.all([
      supabaseClient.from("customers").select("*").order("id"),
      supabaseClient.from("services").select("*").order("id"),
      supabaseClient.from("mechanics").select("*").order("id"),
      supabaseClient.from("mechanics_private").select("*"),
      supabaseClient.from("spareparts").select("*").order("id"),
      supabaseClient.from("workshop_info").select("*").limit(1),
      supabaseClient.from("profiles").select("*"),
    ]);

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
    DB.cache.mechanics = ensureKode(rawMechanics, "mekanik");
    DB.cache.spareparts = ensureKode(rawSpareparts, "sparepart");
    DB.cache.reviews = ensureKode(await reviewsReady, "reviews");
    DB.cache.info = info.data?.[0]
      ? {
          nama: info.data[0].nama,
          alamat: info.data[0].alamat,
          kontak: info.data[0].kontak,
          email: info.data[0].email,
          jamBuka: info.data[0].jam_buka,
          hariBuka: info.data[0].hari_buka,
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

    /* Mirror ke localStorage supaya tetap ada cadangan di perangkat. */
    dbPersistLocal("workshop_customers", DB.cache.customers);
    dbPersistLocal("workshop_kendaraan", DB.cache.services);
    dbPersistLocal("workshop_mekanik", DB.cache.mechanics);
    dbPersistLocal("workshop_sparepart", DB.cache.spareparts);
    dbPersistLocal("workshop_reviews", DB.cache.reviews);
    dbPersistLocal("workshop_info", DB.cache.info);
  } catch (error) {
    console.error("Gagal memuat data dari Supabase:", error);
    dbLoadFromLocal();
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

/* ---------------------------------------------------------------------
   MODE LOKAL
   --------------------------------------------------------------------- */

function dbLoadFromLocal() {
  DB.cache.customers = ensureKode(
    readLocalArray("workshop_customers", []),
    "customers",
  );
  DB.cache.services = ensureKode(
    readLocalArray("workshop_kendaraan", []),
    "kendaraan",
  );
  DB.cache.mechanics = ensureKode(
    readLocalArray("workshop_mekanik", []),
    "mekanik",
  );
  DB.cache.spareparts = ensureKode(
    readLocalArray("workshop_sparepart", []),
    "sparepart",
  );
  DB.cache.reviews = ensureKode(
    readLocalArray("workshop_reviews", []),
    "reviews",
  );

  try {
    DB.cache.info = JSON.parse(localStorage.getItem("workshop_info") || "{}");
  } catch (error) {
    DB.cache.info = {};
  }

  /* Info bengkel default (bisa diubah admin di halaman Pengaturan). */
  DB.cache.info = {
    nama: DB.cache.info.nama || "Pytabengkel",
    alamat: DB.cache.info.alamat || "Jl. Merdeka No. 10, Bandung",
    kontak: DB.cache.info.kontak || "0812-3456-7890",
    email: DB.cache.info.email || "halo@pytabengkel.co.id",
    jamBuka: DB.cache.info.jamBuka || "08.00 - 17.00 WIB",
    hariBuka: DB.cache.info.hariBuka || "Senin - Sabtu",
  };

  const accounts = readLocalArray("workshop_customer_accounts", []);

  DB.cache.logs = readLocalArray("workshop_activity_logs", []);

  DB.cache.accounts = accounts.map((item) => ({
    id: item.id,
    customerId: item.customerId ? Number(item.customerId) : null,
    email: item.email,
    nama: item.nama,
    password: item.password,
    role: item.role || "customer",
  }));

  /* Seed akun demo kalau belum ada (mode lokal). */
  if (!DB.cache.accounts.length) {
    DB.cache.accounts = dbBuildDemoAccounts();
    dbPersistLocal("workshop_customer_accounts", DB.cache.accounts);
  }

  dbSyncKnown();
}

/* Akun demo mode lokal.
   Credential diambil dari `js/config.js` (window.SUPABASE_CONFIG.localAccounts)
   dan tidak pernah ditampilkan di halaman login. */
function dbBuildDemoAccounts() {
  const localAccounts = window.SUPABASE_CONFIG?.localAccounts || {};

  const adminAccount = localAccounts.admin || {
    email: "admin@workshop.com",
    password: "admin123",
  };

  const customerAccount = localAccounts.customer || {
    email: "customer@workshop.com",
    password: "customer123",
  };

  return [
    {
      id: 1,
      customerId: null,
      nama: "Administrator Bengkel",
      email: adminAccount.email,
      password: adminAccount.password,
      role: "admin",
    },
    {
      id: 2,
      customerId: null,
      nama: "Customer",
      email: customerAccount.email,
      password: customerAccount.password,
      role: "customer",
    },
  ];
}

function readLocalArray(key, fallback) {
  try {
    const raw = localStorage.getItem(key);

    if (raw === null) {
      dbPersistLocal(key, fallback);
      return fallback.map((item) => ({ ...item }));
    }

    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (error) {
    console.error(`Data ${key} rusak:`, error);
  }

  return fallback.map((item) => ({ ...item }));
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
  dbPersistLocal("workshop_customers", customers);

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
  DB.cache.services = data;
  dbPersistLocal("workshop_kendaraan", data);

  if (!supabaseClient) {
    return;
  }

  const known = DB.known.services;
  const current = new Set(data.map((item) => Number(item.id)));
  const removed = [...known].filter((id) => !current.has(id));

  DB.known.services = current;

  dbQueue(async () => {
    const payload = data.map(serviceToDb);

    if (!dbIsAdmin()) {
      /* Customer boleh membuat & mengubah service miliknya saja. */
      const profile = getCurrentProfile();
      const ownId = profile?.customer_id ? Number(profile.customer_id) : null;

      if (!ownId) {
        return;
      }

      const own = payload.filter((row) => row.customer_id === ownId);

      if (own.length) {
        const { error } = await supabaseClient
          .from("services")
          .upsert(own, { onConflict: "id" });

        if (error) {
          notifyDbError(error.message);
        }
      }

      return;
    }

    if (payload.length) {
      const { error } = await supabaseClient
        .from("services")
        .upsert(payload, { onConflict: "id" });

      if (error) {
        notifyDbError(error.message);
        return;
      }
    }

    if (removed.length) {
      await supabaseClient.from("services").delete().in("id", removed);
    }
  });
}

/* MEKANIK */

function getMekanik() {
  return DB.cache.mechanics;
}

function saveMekanik(data) {
  DB.cache.mechanics = data;
  dbPersistLocal("workshop_mekanik", data);

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
  dbPersistLocal("workshop_sparepart", sparepart);

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
  DB.cache.reviews = reviews;
  dbPersistLocal("workshop_reviews", reviews);

  if (!supabaseClient) {
    return;
  }

  const known = DB.known.reviews;
  const current = new Set(reviews.map((item) => Number(item.id)));
  const removed = [...known].filter((id) => !current.has(id));

  DB.known.reviews = current;

  dbQueue(async () => {
    let payload = reviews.map(reviewToDb);

    /* Customer hanya boleh menyimpan ulasan miliknya sendiri. */
    if (!dbIsAdmin()) {
      const profile = getCurrentProfile();
      const ownId = profile?.customer_id ? Number(profile.customer_id) : null;

      if (!ownId) {
        return;
      }

      payload = payload.filter((row) => row.customer_id === ownId);
    }

    if (payload.length) {
      const { error } = await supabaseClient
        .from("reviews")
        .upsert(payload, { onConflict: "id" });

      if (error) {
        notifyDbError(error.message);
        return;
      }
    }

    /* Penghapusan baris hanya dari sisi admin (mis. penataan data). */
    if (dbIsAdmin() && removed.length) {
      await supabaseClient.from("reviews").delete().in("id", removed);
    }
  });
}

/* ---------------------------------------------------------------------
   FOTO SERVICE (Supabase Storage)
   Hanya admin yang mengunggah/menghapus; customer hanya membaca foto
   service miliknya (RLS service_photos). Mode lokal: tidak tersedia.
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

  dbPersistLocal("workshop_customer_accounts", DB.cache.accounts);

  /* Di mode Supabase akun dibuat lewat Supabase Auth, bukan tabel ini. */
}

function findCustomerAccountByEmail(email) {
  const target = String(email || "")
    .trim()
    .toLowerCase();

  return (
    getCustomerAccounts().find(
      (account) => String(account.email || "").toLowerCase() === target,
    ) || null
  );
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

/* Muat log aktivitas terbaru dari Supabase (fallback ke localStorage). */
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

function saveLogs(logs) {
  DB.cache.logs = logs;
  dbPersistLocal("workshop_activity_logs", logs);

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

  dbPersistLocal("workshop_activity_logs", DB.cache.logs);

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
  DB.cache.info = info;
  dbPersistLocal("workshop_info", info);

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
  return getCurrentProfile()?.role === "admin";
}
