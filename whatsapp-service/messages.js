/* =====================================================================
   PESAN NOTIFIKASI INFO KENDARAAN
   ---------------------------------------------------------------------
   Menyusun pesan WhatsApp (Bahasa Indonesia) untuk perubahan data
   service kendaraan di tabel `services` Supabase.

   Dipakai oleh:
     - POST /api/notify           (fallback dari frontend, js/db.js)
     - POST /api/webhook/service  (Supabase Database Webhook)

   Bentuk `service` boleh camelCase (aplikasi) maupun snake_case
   (payload webhook Supabase) — keduanya dinormalkan di sini.
   ===================================================================== */

/** Format rupiah: Rp 150.000 */
export function rupiah(nilai) {
  const n = Number(nilai) || 0;
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `Rp ${n.toLocaleString("id-ID")}`;
  }
}

/** Normalkan baris service (camelCase aplikasi <-> snake_case webhook). */
export function normalizeService(raw = {}) {
  return {
    id: raw.id ?? null,
    kode: raw.kode || "",
    polisi: raw.polisi || "",
    jenis: raw.jenis || "",
    merk: raw.merk || "",
    pelanggan: raw.pelanggan || "",
    pelangganId: raw.pelangganId ?? raw.customer_id ?? null,
    keluhan: raw.keluhan || "",
    status: raw.status || "Menunggu",
    mekanik: raw.mekanik || "",
    tanggalService: raw.tanggalService ?? raw.tanggal_service ?? "",
    biayaJasa: Number(raw.biayaJasa ?? raw.biaya_jasa ?? 0) || 0,
    pembayaran: raw.pembayaran || "Belum Lunas",
    approval: raw.approval || "Disetujui",
    approvalNote: raw.approvalNote ?? raw.approval_note ?? "",
    requestedBy: raw.requestedBy ?? raw.requested_by ?? "admin",
  };
}

/**
 * Deteksi peristiwa dari perbandingan baris lama vs baru.
 * Mengembalikan daftar event, mis. ["selesai"] atau ["ajuan"].
 *
 * Event:
 *   ajuan      - baris service baru (pengajuan diterima sistem)
 *   disetujui  - approval berubah menjadi Disetujui
 *   ditolak    - approval berubah menjadi Ditolak
 *   dikerjakan - status berubah menjadi Dikerjakan
 *   selesai    - status berubah menjadi Selesai
 *   lunas      - pembayaran berubah menjadi Lunas
 */
export function detectChanges(oldRow, newRow) {
  const baru = normalizeService(newRow || {});

  if (!oldRow) {
    return ["ajuan"];
  }

  const lama = normalizeService(oldRow);
  const events = [];

  if (lama.approval !== baru.approval) {
    if (baru.approval === "Disetujui") events.push("disetujui");
    else if (baru.approval === "Ditolak") events.push("ditolak");
  }

  if (lama.status !== baru.status) {
    if (baru.status === "Dikerjakan") events.push("dikerjakan");
    else if (baru.status === "Selesai") events.push("selesai");
  }

  if (lama.pembayaran !== baru.pembayaran && baru.pembayaran === "Lunas") {
    events.push("lunas");
  }

  return events;
}

/* Kalimat pembuka per event (bisa lebih dari satu baris). */
const HEADLINES = {
  ajuan: [
    "Pengajuan service kendaraan Anda *sudah kami terima*.",
    "Menunggu persetujuan dari pihak bengkel.",
  ],
  disetujui: [
    "Pengajuan service kendaraan Anda *disetujui*. ✅",
    "Kendaraan akan segera masuk antrian pengerjaan.",
  ],
  ditolak: [
    "Mohon maaf, pengajuan service kendaraan Anda *tidak dapat kami setujui*. ❌",
  ],
  dikerjakan: [
    "Kendaraan Anda sedang *dikerjakan* oleh mekanik kami. 🔧",
  ],
  selesai: [
    "Kendaraan Anda sudah *selesai* dikerjakan. 🎉",
    "Silakan diambil/ditunggu di bengkel, atau hubungi kami untuk info lebih lanjut.",
  ],
  lunas: [
    "Pembayaran *sudah kami terima* — status: Lunas. 🧾",
    "Terima kasih atas pembayarannya.",
  ],
  update: ["Ada pembaruan pada service kendaraan Anda."],
};

/**
 * Susun pesan WhatsApp final.
 *
 * @param {object} service   hasil normalizeService() (atau bentuk mentah)
 * @param {string[]} events  daftar event dari detectChanges()
 * @param {object} [opts]    { workshopName }
 * @returns {string}
 */
export function formatServiceMessage(service, events = [], opts = {}) {
  const s = normalizeService(service);
  const namaBengkel = opts.workshopName || "Pytabengkel";
  const daftar = events.length ? events : ["update"];

  const baris = [];

  baris.push(`*${namaBengkel} — Info Kendaraan*`);

  if (s.pelanggan) {
    baris.push(`Halo *${s.pelanggan}* 👋`);
    baris.push("");
  }

  daftar.forEach((event) => {
    const judul = HEADLINES[event] || HEADLINES.update;
    judul.forEach((t) => baris.push(t));
    baris.push("");
  });

  baris.push("📋 *Detail kendaraan*");
  if (s.kode) baris.push(`• Kode: ${s.kode}`);
  if (s.polisi) baris.push(`• Polisi: ${s.polisi}`);
  if (s.merk || s.jenis) {
    baris.push(`• Tipe: ${[s.merk, s.jenis].filter(Boolean).join(" - ")}`);
  }
  if (s.keluhan) baris.push(`• Keluhan: ${s.keluhan}`);
  baris.push("");

  baris.push(`🔧 Status: *${s.status}*`);
  baris.push(`🧾 Pembayaran: *${s.pembayaran}*`);
  if (s.mekanik) baris.push(`👤 Mekanik: ${s.mekanik}`);
  if (s.tanggalService) baris.push(`📅 Tanggal service: ${s.tanggalService}`);
  if (s.biayaJasa) baris.push(`💰 Biaya jasa: ${rupiah(s.biayaJasa)}`);

  if (daftar.includes("ditolak") && s.approvalNote) {
    baris.push("");
    baris.push(`📝 Catatan bengkel: ${s.approvalNote}`);
  }

  baris.push("");
  baris.push(
    `Terima kasih sudah mempercayakan kendaraan Anda di ${namaBengkel}. 🙏`,
  );

  return baris.join("\n");
}

/**
 * Kunci anti-duplikat: event + baris yang sama dalam beberapa detik
 * tidak boleh dikirim dua kali (webhook Supabase + fallback frontend
 * bisa beriringan untuk perubahan yang sama).
 */
export function dedupKey(phone, service, events) {
  const s = normalizeService(service);
  return `${phone}|${s.kode || s.id || s.polisi}|${[...events].sort().join(",")}`;
}
