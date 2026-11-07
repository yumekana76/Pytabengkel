/* BIAYA SERVICE */

function getServiceTotal(service) {
  const biayaJasa = Number(service.biayaJasa) || 0;
  const totalSparepart = (service.spareparts || []).reduce(
    (total, item) =>
      total + (Number(item.harga) || 0) * (Number(item.jumlah) || 0),
    0,
  );
  return biayaJasa + totalSparepart;
}

function getCustomerVehicleCount(customerId) {
  const kendaraan = getKendaraan();

  return kendaraan.filter(
    (vehicle) => Number(vehicle.pelangganId) === Number(customerId),
  ).length;
}

/* STATISTIK CUSTOMER */

/* FORMAT */

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

/* Tanggal lokal (YYYY-MM-DD) — jangan pakai toISOString() karena itu
   UTC dan bisa menghasilkan tanggal kemarin pada dini hari WIB. */
function getTodayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/* Format tanggal LOKAL (YYYY-MM-DD) dari nilai tanggal apa pun
   (timestamp ISO, string tanggal, Date). Jangan pakai
   `String(iso).slice(0, 10)` — potongan itu UTC, jadi ulasan yang
   dibuat dini hari WIB bisa tertulis tanggal kemarin.
   Mengembalikan "" untuk nilai kosong dan potongan asli kalau
   valuenya tidak bisa diparse menjadi tanggal. */
function formatTanggalLokal(value) {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/* STATUS */

function getStatusClass(status) {
  switch (status) {
    case "Menunggu":
      return "waiting";

    case "Dikerjakan":
      return "working";

    case "Quality Check":
      return "qc";

    case "Selesai":
      return "done";

    default:
      return "";
  }
}

/* Status Quality Check / Selesai baru boleh dipakai setelah data service
   lengkap: mekanik ditugaskan, biaya jasa diisi, dan minimal satu
   sparepart dipakai. Dipakai semua form yang bisa mengubah status. */
function getServiceMissingRequirements(service) {
  const missing = [];

  if (
    !service?.mekanikId &&
    !String(service?.mekanik || "").trim()
  ) {
    missing.push("mekanik");
  }

  if (!(Number(service?.biayaJasa) > 0)) {
    missing.push("biaya jasa");
  }

  if (
    !Array.isArray(service?.spareparts) ||
    !service.spareparts.some((part) => Number(part?.jumlah) > 0)
  ) {
    missing.push("sparepart");
  }

  return missing;
}

function validateServiceStatus(status, service) {
  if (status !== "Quality Check" && status !== "Selesai") return "";

  const missing = getServiceMissingRequirements(service);
  if (!missing.length) return "";

  return (
    `Status ${status} belum bisa dipilih. Lengkapi ${missing.join(", ")} ` +
    "terlebih dahulu."
  );
}

/* HELPER */

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* Saring opsi <select> sesuai kata kunci pencarian. Opsi pertama
   (default, value kosong) selalu ditampilkan. Mengembalikan true
   bila pilihan yang sedang aktif tersaring keluar dari daftar.
   Dipakai kotak cari di halaman dashboard (Input Data) & kendaraan —
   pemanggil wajib meng-cache `selectEl.__allOptions` dulu saat opsi
   dibangun (lihat populateVehicleFormRelations / populateUnifiedRelations). */
function filterDropdown(selectEl, keyword) {
  if (!selectEl || !Array.isArray(selectEl.__allOptions)) return false;
  const key = String(keyword || "").toLowerCase().trim();
  const current = selectEl.value;
  selectEl.innerHTML = "";
  selectEl.__allOptions.forEach((opt) => {
    if (
      opt.value === "" ||
      !key ||
      opt.textContent.toLowerCase().includes(key)
    ) {
      selectEl.appendChild(opt.cloneNode(true));
    }
  });
  const masihDipilih = [...selectEl.options].some(
    (opt) => opt.value === current,
  );
  if (masihDipilih) selectEl.value = current;
  return !masihDipilih && current !== "";
}

/* MODAL */

/* Kumpulkan elemen yang bisa difokus di dalam modal (urutan tab). */
function getModalFocusable(modal) {
  if (!modal) return [];

  const selector =
    'a[href], button:not([disabled]):not([hidden]), input:not([disabled]):not([type="hidden"]):not([hidden]), select:not([disabled]):not([hidden]), textarea:not([disabled]):not([hidden]), [tabindex]:not([tabindex="-1"]):not([hidden])';

  return [...modal.querySelectorAll(selector)].filter((element) => {
    return (
      element.getClientRects().length > 0 &&
      element.getAttribute("aria-hidden") !== "true"
    );
  });
}

/* Fokuskan kontrol pertama (atau modal itu sendiri bila kosong). */
function focusModal(modal) {
  if (!modal) return;

  const field = [
    ...modal.querySelectorAll(
      'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])',
    ),
  ].find((element) => element.getClientRects().length > 0);

  const target =
    modal.querySelector("[autofocus]") || field || getModalFocusable(modal)[0];

  if (target) {
    target.focus({ preventScroll: true });
  } else {
    modal.setAttribute("tabindex", "-1");
    modal.focus({ preventScroll: true });
  }
}

function openModal(id) {
  const modal = document.getElementById(id);

  if (!modal || modal.classList.contains("show")) {
    return;
  }

  /* Simpan pemicu supaya fokus bisa kembali saat modal ditutup. */
  if (
    document.activeElement instanceof HTMLElement &&
    document.activeElement !== document.body
  ) {
    modal.__focusReturn = document.activeElement;
  }

  modal.classList.add("show");
  document.body.classList.add("modal-open");

  /* Tunggu satu frame agar modal sudah terlihat sebelum difokuskan. */
  window.requestAnimationFrame(() => focusModal(modal));
}

function closeModal(id) {
  const modal = document.getElementById(id);

  if (modal) {
    modal.classList.remove("show");

    /* Halaman hanya dibuka lagi kalau masih ada modal terbuka. */
    if (!document.querySelector(".modal-overlay.show")) {
      document.body.classList.remove("modal-open");
    }

    /* Kembalikan fokus ke pemicu (dipasang confirmLogout) — berlaku
       untuk semua jalur penutupan: tombol, klik area luar, dan ESC. */
    const trigger = modal.__focusReturn;
    if (trigger && trigger.isConnected) {
      trigger.focus();
      modal.__focusReturn = null;
    }
  }
}

/* Jebakan fokus (focus trap) untuk modal yang sedang terbuka:
   Tab / Shift+Tab tidak bisa keluar ke halaman di belakang. */
function trapModalFocus(event) {
  if (event.key !== "Tab") return;

  const terbuka = [...document.querySelectorAll(".modal-overlay.show")];
  if (!terbuka.length) return;

  const overlay = terbuka[terbuka.length - 1];
  const modal = overlay.querySelector(".modal") || overlay;
  const focusable = getModalFocusable(modal);

  if (!focusable.length) {
    event.preventDefault();
    modal.setAttribute("tabindex", "-1");
    modal.focus({ preventScroll: true });
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (!modal.contains(active)) {
    event.preventDefault();
    first.focus({ preventScroll: true });
    return;
  }

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus({ preventScroll: true });
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus({ preventScroll: true });
  }
}

/* =========================================
   DETAIL SERVICE (RIWAYAT & KEUANGAN)
   Dipakai bersama oleh portal admin & customer
   supaya isi detail, stepper status, dan invoice
   selalu tampil sama di semua halaman.
   ========================================= */

var SERVICE_STATUS_STEPS = [
  "Menunggu",
  "Dikerjakan",
  "Quality Check",
  "Selesai",
];

/* Stepper progress service (sudah / sedang / belum). */
function buildServiceSteps(status) {
  const currentIndex = SERVICE_STATUS_STEPS.indexOf(status);

  return SERVICE_STATUS_STEPS.map((step, index) => {
    let className = "status-step";

    if (currentIndex >= 0 && index < currentIndex) {
      className += " done";
    } else if (index === currentIndex) {
      className += " current";
    }

    const icon = className.includes("done")
      ? '<i class="fa-solid fa-check" aria-hidden="true"></i>'
      : String(index + 1);

    return `
      <div class="${className}">
        <span class="step-dot">${icon}</span>
        <span class="step-label">${escapeHTML(step)}</span>
      </div>
    `;
  }).join("");
}

/* Item yang ditagihkan: biaya jasa + sparepart. */
function getServiceItems(service) {
  const items = [];
  const biayaJasa = Number(service.biayaJasa) || 0;

  if (biayaJasa > 0) {
    items.push({ nama: "Biaya Jasa", harga: biayaJasa, jumlah: 1 });
  }

  (service.spareparts || []).forEach((part) => {
    items.push({
      nama: part.nama || "Sparepart",
      harga: Number(part.harga) || 0,
      jumlah: Number(part.jumlah) || 0,
    });
  });

  return items;
}

/* Tandai pembayaran sebuah service menjadi Lunas.
   Dipakai admin (bukan customer) sebelum struk dicetak. */
function setServicePaid(id) {
  const kendaraan = getKendaraan();
  const index = kendaraan.findIndex((item) => Number(item.id) === Number(id));

  if (index === -1) return false;
  if (kendaraan[index].status !== "Selesai") return false;
  if ((kendaraan[index].pembayaran || "Belum Lunas") === "Lunas") return false;

  kendaraan[index] = { ...kendaraan[index], pembayaran: "Lunas" };

  saveKendaraan(kendaraan);

  return true;
}

/* =========================================
   ANTREAN SERVICE
   Nomor urut service yang BELUM selesai, diurut
   dari yang masuk paling dulu (id naik).
   Admin & mode lokal menghitung dari data lengkap;
   sesi customer memakai RPC queue_positions() karena
   RLS hanya memberikan service miliknya sendiri.
   ========================================= */

function getAntrianList() {
  return getKendaraan()
    .filter(
      (item) =>
        item.status !== "Selesai" &&
        /* Hanya ajuan yang sudah disetujui yang masuk antrean —
           ajuan menunggu persetujuan & yang ditolak tidak dihitung. */
        getApprovalValue(item) === "Disetujui",
    )
    .sort((a, b) => Number(a.id) - Number(b.id));
}

function getNomorAntrian(id) {
  const nomorId = Number(id);
  const hitungLokal = () => {
    const index = getAntrianList().findIndex(
      (item) => Number(item.id) === nomorId,
    );
    return index === -1 ? null : index + 1;
  };

  /* Admin & mode lokal punya data lengkap, jadi hitung langsung —
     selalu sinkron walau status baru saja berubah. */
  if (DB.mode !== "supabase" || dbIsAdmin()) {
    return hitungLokal();
  }

  /* Customer: posisi global hanya bisa datang dari RPC. */
  return DB.antrian ? DB.antrian.get(nomorId) || null : null;
}

function formatNomorAntrian(nomor) {
  if (!nomor) return "-";
  return `A-${String(nomor).padStart(2, "0")}`;
}

/* Badge nomor antrean untuk tabel (admin & customer). */
function buildAntrianBadge(id) {
  const nomor = getNomorAntrian(id);
  return `<span class="badge antrian${nomor ? "" : " off"}">${formatNomorAntrian(nomor)}</span>`;
}

/* Panel urutan antrean di dashboard admin. */
function renderAntrian() {
  const list = document.getElementById("antrianList");
  if (!list) return;

  const antre = getAntrianList();
  setText("antrianCount", `${antre.length} service`);

  const button = document.getElementById("btnPanggilBerikutnya");
  if (button) {
    button.disabled = !antre.some((item) => item.status === "Menunggu");
  }

  if (!antre.length) {
    list.innerHTML =
      '<li class="antrian-empty">Tidak ada service dalam antrean.</li>';
    return;
  }

  list.innerHTML = antre
    .map((item, index) => {
      const nomor = index + 1;
      const nomorMap = getNomorAntrian(item.id);
      return `
        <li class="antrian-item">
          <span class="antrian-nomor">${formatNomorAntrian(nomorMap || nomor)}</span>
          <span class="antrian-info">
            <strong>${escapeHTML(item.polisi || "-")}</strong>
            <span>${escapeHTML(item.pelanggan || "-")}</span>
          </span>
          <span class="badge ${getStatusClass(item.status)}">
            ${escapeHTML(item.status || "-")}
          </span>
        </li>
      `;
    })
    .join("");
}

/* Aksi admin: service "Menunggu" pertama menjadi "Dikerjakan". */
function panggilBerikutnya(button) {
  const berikut = getAntrianList().find(
    (item) => item.status === "Menunggu",
  );

  if (!berikut) {
    showPageNotice("Tidak ada service yang menunggu untuk dipanggil.");
    return;
  }

  if (!armConfirmButton(button)) return;

  const nomor = getNomorAntrian(berikut.id);
  const kendaraan = getKendaraan();
  const index = kendaraan.findIndex(
    (item) => Number(item.id) === Number(berikut.id),
  );
  if (index === -1) return;

  kendaraan[index] = { ...kendaraan[index], status: "Dikerjakan" };
  saveKendaraan(kendaraan);

  addLog(
    "Update",
    "Service",
    `Antrean ${formatNomorAntrian(nomor)} dipanggil — ${kendaraan[index].polisi} mulai dikerjakan`,
    getKode("kendaraan", kendaraan[index]),
  );

  showPageNotice(
    `Service ${kendaraan[index].polisi} dipanggil (antrean ${formatNomorAntrian(nomor)}).`,
    "success",
  );

  if (typeof updateDashboard === "function") updateDashboard();
}
/* =========================================
   PERSETUJUAN AJUAN SERVICE
   Ajuan customer (requestedBy "customer") selalu
   dimulai dengan approval "Menunggu". Admin memilih
   "Disetujui" (masuk antrean) atau "Ditolak" —
   ditolak tetap tampil di daftar dengan alasan.
   ========================================= */

function getApprovalValue(item) {
  if (item?.approval) return item.approval;

  /* Data lama (sebelum kolom approval ada). */
  return item?.requestedBy === "customer" && item?.status === "Menunggu"
    ? "Menunggu"
    : "Disetujui";
}

function isAjuanMenunggu(item) {
  return (
    item?.requestedBy === "customer" &&
    getApprovalValue(item) === "Menunggu"
  );
}

function isAjuanDitolak(item) {
  return getApprovalValue(item) === "Ditolak";
}

/* Penyaring status bersama (tabel admin & customer): ajuan yang
   ditolak tidak dihitung sebagai "Menunggu" supaya angka & filter
   tetap konsisten dengan badge Ditolak. */
function cocokFilterStatus(item, statusFilter) {
  if (!statusFilter) return true;
  if (item.status !== statusFilter) return false;
  if (statusFilter === "Menunggu" && isAjuanDitolak(item)) return false;
  return true;
}

/* Keterangan ajuan untuk detail service (customer & admin). */
function describeAjuan(item) {
  const approval = getApprovalValue(item);

  if (approval === "Ditolak") {
    const alasan = String(item.approvalNote || "").trim();
    return alasan ? `Ditolak — ${alasan}` : "Ditolak bengkel";
  }

  if (approval === "Menunggu") return "Menunggu persetujuan bengkel";

  return "Disetujui";
}

/* Badge persetujuan pada kolom Status (kosong untuk service admin). */
function buildAjuanBadge(item) {
  if (item?.requestedBy !== "customer") return "";

  const approval = getApprovalValue(item);

  if (approval === "Menunggu") {
    return '<span class="badge waiting ajuan">Ajuan menunggu</span>';
  }

  if (approval === "Ditolak") {
    const alasan = String(item.approvalNote || "").trim();
    return `<span class="badge danger ajuan" title="${escapeHTML(alasan ? `Ditolak: ${alasan}` : "Ajuan ditolak bengkel")}">Ditolak</span>`;
  }

  return "";
}

function getAjuanMenungguList() {
  return getKendaraan()
    .filter((item) => isAjuanMenunggu(item))
    .sort((a, b) => Number(a.id) - Number(b.id));
}

/* Terima / tolak ajuan (hanya admin yang memanggil fungsi ini). */
function setServiceApproval(id, approval, alasan = "") {
  const kendaraan = getKendaraan();
  const index = kendaraan.findIndex(
    (item) => Number(item.id) === Number(id),
  );

  if (index === -1) return false;

  const service = kendaraan[index];
  if (service.requestedBy !== "customer") return false;
  if (getApprovalValue(service) === approval) return false;

  kendaraan[index] = {
    ...service,
    approval,
    approvalNote: approval === "Ditolak" ? alasan : "",
  };
  saveKendaraan(kendaraan);

  const kata = approval === "Disetujui" ? "diterima" : "ditolak";

  addLog(
    "Update",
    "Service",
    `Ajuan ${service.polisi} ${kata}${alasan ? ` — ${alasan}` : ""}`,
    getKode("kendaraan", service),
  );

  showPageNotice(`Ajuan service ${service.polisi} ${kata}.`, "success");

  if (typeof updateDashboard === "function") updateDashboard();
  if (typeof updateServiceStats === "function") updateServiceStats();
  if (typeof renderServicePage === "function") {
    renderServicePage(document.getElementById("searchService")?.value || "");
  }

  return true;
}

function terimaAjuan(id, button = null) {
  const service = getKendaraan().find(
    (item) => Number(item.id) === Number(id),
  );

  if (!service || !isAjuanMenunggu(service)) return;
  if (button && !armConfirmButton(button, "Klik lagi untuk menerima")) return;

  setServiceApproval(id, "Disetujui");
}

/* Modal alasan penolakan — dibuat sekali lewat JS supaya bisa dipakai
   di dashboard & halaman service tanpa menduplikasi markup. */
var ajuanDitolakId = null;

function bukaTolakAjuan(id) {
  const service = getKendaraan().find(
    (item) => Number(item.id) === Number(id),
  );

  if (!service || !isAjuanMenunggu(service)) return;

  let overlay = document.getElementById("tolakAjuanModal");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "tolakAjuanModal";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="tolakAjuan-title">
        <div class="modal-header">
          <div>
            <h3 id="tolakAjuan-title">Tolak Ajuan Service</h3>
            <p>Alasan penolakan akan dilihat oleh customer.</p>
          </div>
          <button type="button" class="modal-close" data-close-modal="tolakAjuanModal" aria-label="Tutup">×</button>
        </div>
        <form id="tolakAjuanForm">
          <div class="modal-body">
            <p class="ajuan-ringkasan" id="tolakAjuanRingkasan"></p>
            <div class="form-group">
              <label class="form-label" for="tolakAjuanAlasan">Alasan penolakan</label>
              <textarea
                id="tolakAjuanAlasan"
                class="form-control"
                rows="3"
                placeholder="Contoh: keluhan di luar kapasitas bengkel"
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-close-modal="tolakAjuanModal">Batal</button>
            <button type="submit" class="btn btn-danger" id="btnTolakAjuan">Tolak Ajuan</button>
          </div>
        </form>
      </div>`;

    document.body.appendChild(overlay);

    /* Boot sudah lewat, jadi listener close dipasang manual di sini. */
    overlay.querySelectorAll("[data-close-modal]").forEach((button) => {
      button.dataset.globalBound = "true";
      button.addEventListener("click", () =>
        closeModal(button.dataset.closeModal),
      );
    });
    overlay.dataset.globalBound = "true";
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeModal(overlay.id);
    });

    overlay
      .querySelector("form")
      .addEventListener("submit", konfirmasiTolakAjuan);
  }

  ajuanDitolakId = service.id;

  const form = overlay.querySelector("form");
  clearFormError("tolakAjuanForm");
  form.reset();

  document.getElementById("tolakAjuanRingkasan").textContent =
    `${service.polisi} — ${service.pelanggan || "-"}: ${service.keluhan || "-"}`;

  openModal("tolakAjuanModal");
}

function konfirmasiTolakAjuan(event) {
  event.preventDefault();
  clearFormError("tolakAjuanForm");

  const alasan = document
    .getElementById("tolakAjuanAlasan")
    .value.trim();

  if (!alasan) {
    showFormError("tolakAjuanForm", "Alasan penolakan wajib diisi.");
    return;
  }

  const button = document.getElementById("btnTolakAjuan");
  if (!armConfirmButton(button, "Klik lagi untuk menolak")) return;

  const id = ajuanDitolakId;
  ajuanDitolakId = null;

  closeModal("tolakAjuanModal");
  setServiceApproval(id, "Ditolak", alasan);
}

/* Panel daftar ajuan menunggu (dashboard admin). */
function renderAjuan() {
  const list = document.getElementById("ajuanList");
  if (!list) return;

  const ajuan = getAjuanMenungguList();

  setText(
    "ajuanCount",
    ajuan.length ? `${ajuan.length} ajuan menunggu` : "Tidak ada ajuan",
  );

  if (!ajuan.length) {
    list.innerHTML =
      '<li class="ajuan-empty">Tidak ada ajuan service yang menunggu persetujuan.</li>';
    return;
  }

  list.innerHTML = ajuan
    .map(
      (item) => `
        <li class="ajuan-item">
          <div class="ajuan-info">
            <strong>${escapeHTML(item.polisi || "-")}</strong>
            <span>${escapeHTML(item.pelanggan || "-")} — ${escapeHTML(item.keluhan || "-")}</span>
          </div>
          <div class="ajuan-aksi">
            <button type="button" class="action-btn" data-terima-ajuan="${item.id}">✔ Terima</button>
            <button type="button" class="action-btn" data-tolak-ajuan="${item.id}">✖ Tolak</button>
          </div>
        </li>
      `,
    )
    .join("");
}

/* Ringkasan biaya service (dipakai di detail transaksi). */
function getServiceRingkasan(service) {
  const items = getServiceItems(service);
  const biayaJasa = Number(service.biayaJasa) || 0;
  const subtotalSparepart = items
    .filter((item) => item.nama !== "Biaya Jasa")
    .reduce((sum, item) => sum + item.harga * item.jumlah, 0);
  const total = getServiceTotal(service);
  const lunas = (service.pembayaran || "Belum Lunas") === "Lunas";

  return {
    biayaJasa,
    subtotalSparepart,
    jumlahSparepart: items.filter((item) => item.nama !== "Biaya Jasa").length,
    total,
    lunas,
    sisa: lunas ? 0 : total,
  };
}

/* Kartu data service untuk modal detail. */
function buildServiceDetailGrid(service, options = {}) {
  const customer = service.pelangganId
    ? getCustomerById(service.pelangganId)
    : null;

  const mekanik = getMekanik().find(
    (item) => Number(item.id) === Number(service.mekanikId),
  );

  const pembayaran = service.pembayaran || "Belum Lunas";
  const customerLabel = options.customerLabel || "Pelanggan";

  const item = (label, value, full = false) => `
    <div class="detail-item${full ? " full" : ""}">
      <span class="detail-label">${escapeHTML(label)}</span>
      <span class="detail-value">${value}</span>
    </div>
  `;

  const parts = [];

  parts.push(item("ID Service", escapeHTML(getKode("kendaraan", service))));
  parts.push(
    item("Tanggal Service", escapeHTML(service.tanggalService || "-")),
  );
  parts.push(item("No. Polisi", escapeHTML(service.polisi || "-")));
  parts.push(
    item(
      "Merk / Jenis",
      `${escapeHTML(service.merk || "-")} — ${escapeHTML(service.jenis || "-")}`,
    ),
  );
  parts.push(
    item(
      customerLabel,
      escapeHTML(service.pelanggan || customer?.nama || "-"),
    ),
  );

  if (options.showCustomerContact !== false) {
    parts.push(
      item("No. HP Pelanggan", escapeHTML(customer?.telepon || "-")),
    );
  }

  parts.push(
    item(
      "Mekanik",
      escapeHTML(
        mekanik?.nama || service.mekanik || "Belum ditugaskan",
      ),
    ),
  );

  if (options.showMechanicContact !== false) {
    parts.push(
      item("No. HP Mekanik", escapeHTML(mekanik?.telepon || "-")),
    );
  }

  parts.push(item("Keluhan", escapeHTML(service.keluhan || "-"), true));

  parts.push(
    item(
      "Status Service",
      `<span class="badge ${getStatusClass(service.status)}">${escapeHTML(
        service.status || "-",
      )}</span>`,
    ),
  );

  parts.push(
    item(
      "Status Pembayaran",
      `<span class="badge ${pembayaran === "Lunas" ? "done" : "waiting"}">${escapeHTML(
        pembayaran,
      )}</span>`,
    ),
  );

  /* Item tambahan (mis. rincian transaksi di halaman Keuangan). */
  (options.extraItems || []).forEach((extra) => {
    if (!extra) return;
    parts.push(
      item(
        extra.label,
        extra.value,
        extra.full === true,
      ),
    );
  });

  return parts.join("");
}

/* Blok rincian tagihan (dipakai di modal detail). */
function buildServiceInvoice(service) {
  const pembayaran = service.pembayaran || "Belum Lunas";
  const items = getServiceItems(service);
  const ringkasan = getServiceRingkasan(service);

  const rows = items.length
    ? items
        .map(
          (item) => `
            <tr>
              <td>${escapeHTML(item.nama)}</td>
              <td class="num">${formatRupiah(item.harga)}</td>
              <td class="num">${escapeHTML(item.jumlah)}</td>
              <td class="num">${formatRupiah(item.harga * item.jumlah)}</td>
            </tr>
          `,
        )
        .join("")
    : '<tr><td colspan="4" class="empty">Tidak ada item tagihan.</td></tr>';

  return `
    <div class="invoice-head">
      <div>
        <div class="invoice-title">Rincian Tagihan</div>
        <div class="invoice-meta">
          ${escapeHTML(getKode("kendaraan", service))} ·
          ${escapeHTML(service.polisi || "-")} ·
          ${escapeHTML(service.tanggalService || "-")}
        </div>
      </div>
      <span class="badge ${pembayaran === "Lunas" ? "done" : "waiting"}">
        ${escapeHTML(pembayaran)}
      </span>
    </div>
    <div class="invoice-body">
      <table class="invoice-table">
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col" class="num">Harga</th>
            <th scope="col" class="num">Qty</th>
            <th scope="col" class="num">Subtotal</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="invoice-row">
        <span>Biaya Jasa</span>
        <span>${formatRupiah(ringkasan.biayaJasa)}</span>
      </div>
      <div class="invoice-row">
        <span>Subtotal Sparepart (${ringkasan.jumlahSparepart} item)</span>
        <span>${formatRupiah(ringkasan.subtotalSparepart)}</span>
      </div>
      <div class="invoice-row total">
        <span>Total Tagihan</span>
        <span>${formatRupiah(ringkasan.total)}</span>
      </div>
      ${
        ringkasan.lunas
          ? ""
          : `<div class="invoice-row">
              <span>Sisa Tagihan</span>
              <span>${formatRupiah(ringkasan.sisa)}</span>
            </div>`
      }
    </div>
  `;
}

/* =========================================
   RIWAYAT OVERHAUL PER KENDARAAN
   Semua service yang pernah dilakukan pada
   plat kendaraan yang sama.
   ========================================= */

function getServiceOverhaul(service) {
  const plat = String(service.polisi || "").toUpperCase();

  return getKendaraan()
    .filter((item) => String(item.polisi || "").toUpperCase() === plat)
    .sort(
      (a, b) =>
        String(b.tanggalService || "").localeCompare(
          String(a.tanggalService || ""),
        ) || Number(b.id) - Number(a.id),
    );
}

function buildServiceOverhaul(service) {
  const rows = getServiceOverhaul(service);

  if (!rows.length) {
    return '<p class="form-hint">Belum ada riwayat service untuk kendaraan ini.</p>';
  }

  return `
    <div class="overhaul-list">
      ${rows
        .map(
          (item) => `
            <div class="overhaul-item">
              <div class="overhaul-head">
                <strong>${escapeHTML(item.tanggalService || "-")}</strong>
                <span class="badge ${getStatusClass(item.status)}">${escapeHTML(
                  item.status || "-",
                )}</span>
              </div>
              <div class="overhaul-body">
                <span>${escapeHTML(item.keluhan || "-")}</span>
                <span>
                  ${escapeHTML(getMekanikNama(item.mekanikId))} ·
                  ${formatRupiah(getServiceTotal(item))}
                </span>
              </div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

/* =========================================
   CETAK INVOICE
   ========================================= */

/* Area print tersembunyi di layar, hanya tampil saat dicetak. */
function ensurePrintArea() {
  let area = document.getElementById("printArea");

  if (!area) {
    area = document.createElement("div");
    area.id = "printArea";
    area.className = "print-area";
    area.setAttribute("aria-hidden", "true");
    document.body.appendChild(area);
  }

  return area;
}

/* Dokumen struk / resi siap cetak (gaya thermal printer). */
function buildPrintInvoice(service) {
  const info = getBengkelInfoLengkap();
  const customer = service.pelangganId
    ? getCustomerById(service.pelangganId)
    : null;
  const mekanik = getMekanik().find(
    (item) => Number(item.id) === Number(service.mekanikId),
  );
  const items = getServiceItems(service);
  const pembayaran = service.pembayaran || "Belum Lunas";
  const total = getServiceTotal(service);
  const kode = getKode("kendaraan", service);

  const rows = items.length
    ? items
        .map(
          (item) => `
            <div class="struk-item">
              <span class="struk-item-nama">${escapeHTML(item.nama)}</span>
              <span class="struk-item-sub">
                ${escapeHTML(item.jumlah)} x ${formatRupiah(item.harga)}
              </span>
              <span class="struk-item-total">${formatRupiah(
                item.harga * item.jumlah,
              )}</span>
            </div>
          `,
        )
        .join("")
    : '<div class="struk-item"><span>Tidak ada item tagihan.</span></div>';

  const baris = (label, value) => `
    <div class="struk-row">
      <span>${escapeHTML(label)}</span>
      <span>${value}</span>
    </div>
  `;

  return `
    <div class="struk">
      <div class="struk-head">
        <div class="struk-nama">${escapeHTML(info.nama)}</div>
        ${info.alamat ? `<div>${escapeHTML(info.alamat)}</div>` : ""}
        ${info.kontak ? `<div>Telp. ${escapeHTML(info.kontak)}</div>` : ""}
        ${info.email ? `<div>${escapeHTML(info.email)}</div>` : ""}
        ${
          info.hariBuka || info.jamBuka
            ? `<div>Buka: ${escapeHTML(
                [info.hariBuka, info.jamBuka].filter(Boolean).join(" "),
              )}</div>`
            : ""
        }
        <div class="struk-judul">KUITANSI SERVICE</div>
      </div>

      <div class="struk-separator"></div>

      ${baris("No. Struk", escapeHTML(kode))}
      ${baris("Tanggal", escapeHTML(service.tanggalService || "-"))}
      ${baris("Pelanggan", escapeHTML(customer?.nama || service.pelanggan || "-"))}
      ${baris("No. Telp", escapeHTML(customer?.telepon || "-"))}
      ${baris("Kendaraan", escapeHTML(service.polisi || "-"))}
      ${baris("Mekanik", escapeHTML(mekanik?.nama || service.mekanik || "-"))}

      <div class="struk-separator"></div>

      ${rows}

      <div class="struk-separator"></div>

      ${baris("Total Tagihan", `<strong>${formatRupiah(total)}</strong>`)}
      ${baris("Status Bayar", escapeHTML(pembayaran))}

      <div class="struk-footer">
        <div>Terima kasih telah berkunjung</div>
        <div>Barang yang sudah dibeli tidak dapat ditukar</div>
        <div>Dicetak: ${escapeHTML(new Date().toLocaleString("id-ID"))}</div>
      </div>
    </div>
  `;
}

/* Cetak dokumen HTML apa pun lewat area print. */
function printHtmlDocument(html) {
  const area = ensurePrintArea();

  area.innerHTML = html;

  document.body.classList.add("printing");

  let done = false;

  const cleanup = () => {
    if (done) return;
    done = true;
    document.body.classList.remove("printing");
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);

  window.print();

  window.setTimeout(cleanup, 1500);
}

/* Cetak invoice service ke printer.
   Hanya service berstatus "Selesai" yang boleh dicetak. */
function printServiceInvoice(service) {
  if (!service) {
    return;
  }

  /* Struk hanya boleh dicetak oleh admin bengkel. */
  if (!dbIsAdmin()) {
    showPageNotice(
      "Struk invoice hanya bisa dicetak oleh admin bengkel.",
      "error",
    );
    return;
  }

  if (service.status !== "Selesai") {
    showPageNotice(
      "Invoice hanya bisa dicetak setelah service berstatus Selesai.",
      "error",
    );
    return;
  }

  printHtmlDocument(buildPrintInvoice(service));
}

/* DASHBOARD */

/* Id baru.
   Memakai basis timestamp supaya id tetap unik walau ada dua browser
   yang menambah data pada saat bersamaan (aman untuk multi-user). */

var idSequence = Math.floor(Math.random() * 1000);

/* Sisipkan gallery foto service ke dalam container (async).
   Dipanggil setelah detail modal di-render; tidak fatal kalau
   tidak ada foto (container dibiarkan seperti adanya). */
async function renderServicePhotos(container, serviceId) {
  if (
    !container ||
    !supabaseClient ||
    typeof getServicePhotos !== "function"
  ) {
    return;
  }

  try {
    const photos = await getServicePhotos(serviceId);

    /* Container mungkin sudah tertutup/diganti sementara menunggu. */
    if (!photos.length || !container.isConnected) {
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "photo-gallery";

    wrap.innerHTML = photos
      .map(
        (photo) => `
        <figure>
          <a href="${escapeHTML(photo.url)}" target="_blank" rel="noopener">
            <img src="${escapeHTML(photo.url)}" alt="Foto service" loading="lazy" />
          </a>
          <figcaption class="photo-caption">${escapeHTML(photo.keterangan || "Foto")}</figcaption>
        </figure>`,
      )
      .join("");

    container.appendChild(wrap);
  } catch (error) {
    console.warn("[foto]", error?.message || error);
  }
}

function nextNumericId(items) {
  const max = items.length
    ? Math.max(...items.map((item) => Number(item.id) || 0))
    : 0;

  const base = Math.max(max + 1, Date.now() * 1000);

  idSequence = (idSequence + 1) % 1000;

  return base + idSequence;
}

/* =========================================
   PENGURUTAN (SORTING)
   =========================================
   ID adalah primary key pada setiap tabel, jadi
   selalu tersedia sebagai pengurutan default. */

function compareBy(key, direction = "asc") {
  const factor = direction === "desc" ? -1 : 1;

  return function (a, b) {
    /* ID ditampilkan sebagai kode (knd-001), jadi urutannya
       mengikuti kode, bukan angka internal. */
    if (key === "id" && a?.kode && b?.kode && a.kode !== b.kode) {
      return (
        String(a.kode).localeCompare(String(b.kode), "id", { numeric: true }) *
        factor
      );
    }

    const valueA = a?.[key];
    const valueB = b?.[key];

    if (valueA === valueB) {
      return 0;
    }

    const emptyA = valueA === undefined || valueA === null || valueA === "";
    const emptyB = valueB === undefined || valueB === null || valueB === "";

    if (emptyA && emptyB) return 0;
    if (emptyA) return 1;
    if (emptyB) return -1;

    if (typeof valueA === "number" && typeof valueB === "number") {
      return (valueA - valueB) * factor;
    }

    return (
      String(valueA).localeCompare(String(valueB), "id", { numeric: true }) *
      factor
    );
  };
}

function sortRows(rows, sortKey, direction = "asc") {
  if (!sortKey) {
    return rows;
  }

  return [...rows].sort(compareBy(sortKey, direction));
}

/* Ambil nilai sorting dari dropdown (format: "field:arah") */
function getSortValue(selectId) {
  const raw = document.getElementById(selectId)?.value || "";
  const [key, direction = "asc"] = raw.split(":");

  return { key: key || null, direction };
}

/* =========================================
   HALAMAN SERVICE
   ========================================= */

function getMekanikNama(mekanikId) {
  const mekanik = getMekanik().find(
    (item) => Number(item.id) === Number(mekanikId),
  );
  return mekanik ? mekanik.nama : "Belum ditugaskan";
}

/* =========================================
   RATING & ULASAN
   ========================================= */

var RATING_LABELS = {
  5: "Sangat Puas",
  4: "Puas",
  3: "Cukup",
  2: "Kurang",
  1: "Sangat Kurang",
};

function getRatingLabel(rating) {
  return RATING_LABELS[Number(rating)] || "Belum dinilai";
}

/* Deret bintang untuk menampilkan rating (bukan input).
   Semua bintang memakai ikon solid: yang terisi kuning, yang kosong abu. */
function buildStarsHTML(rating, options = {}) {
  const value = Math.min(5, Math.max(0, Number(rating) || 0));
  const sizeClass = options.small ? " stars-small" : "";

  let html = `<span class="stars${sizeClass}" role="img" aria-label="Rating ${value} dari 5 bintang">`;

  for (let i = 1; i <= 5; i++) {
    html += `<i class="fa-solid fa-star ${
      i <= value ? "star-on" : "star-off"
    }" aria-hidden="true"></i>`;
  }

  return `${html}</span>`;
}

/* Ringkas teks ulasan untuk tabel (komentar panjang dipotong). */
function truncateText(value, max = 80) {
  const text = String(value || "").trim();

  if (!text) return "—";
  if (text.length <= max) return text;

  return `${text.slice(0, max).trimEnd()}…`;
}

/* URUTAN STATUS & KUNCI DATA SELESAI */
var STATUS_ORDER = {
  Menunggu: 0,
  Dikerjakan: 1,
  "Quality Check": 2,
  Selesai: 3,
};

/* Urutan pembayaran: belum lunas dulu, lunas di paling bawah. */
var PAYMENT_ORDER = {
  "Belum Lunas": 0,
  Lunas: 1,
};

/* Urutkan data service:
   1. status  (Menunggu → Dikerjakan → Quality Check → Selesai)
   2. pembayaran (Belum Lunas → Lunas), sehingga service Selesai + Lunas
      selalu berada di paling bawah data yang lain
   3. tanggal service (terbaru di atas), fallback ke id (baru → lama) */
function compareStatusOrder(a, b) {
  const status =
    (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
  if (status !== 0) return status;

  const bayar =
    (PAYMENT_ORDER[a.pembayaran || "Belum Lunas"] ?? 99) -
    (PAYMENT_ORDER[b.pembayaran || "Belum Lunas"] ?? 99);
  if (bayar !== 0) return bayar;

  const tanggal = String(b.tanggalService || "").localeCompare(
    String(a.tanggalService || ""),
  );
  if (tanggal !== 0) return tanggal;

  return Number(b.id) - Number(a.id);
}

function isLocked(item) {
  return !!item && item.status === "Selesai";
}

function showFormError(formId, message) {
  const form = document.getElementById(formId);
  if (!form) return;
  let box = form.querySelector(".form-error");
  if (!box) {
    box = document.createElement("p");
    box.className = "form-error";
    box.setAttribute("role", "alert");
    const body = form.querySelector(".modal-body");
    if (body) body.prepend(box);
    else form.prepend(box);
  }
  if (!message) {
    box.hidden = true;
    box.textContent = "";
    return;
  }
  box.hidden = false;
  box.textContent = message;
}

function clearFormError(formId) {
  showFormError(formId, "");
}

/* Notifikasi mengambang untuk halaman auth (index & register),
   gaya sama dengan halaman dashboard — tidak mendorong layout /
   menutupi form. ID loginNotice dipakai bersama login & register
   (keduanya tidak pernah aktif bersamaan). */
function showNotice(message, type = "error") {
  let notice = document.getElementById("loginNotice");

  if (!notice) {
    notice = document.createElement("div");
    notice.id = "loginNotice";
    notice.setAttribute("role", "status");
    notice.className = "page-notice";
    document.body.appendChild(notice);
  }

  if (showNotice._timer) {
    window.clearTimeout(showNotice._timer);
    showNotice._timer = undefined;
  }

  notice.hidden = false;
  notice.className =
    "page-notice " + (type === "success" ? "success" : "error");
  notice.textContent = message;

  showNotice._timer = window.setTimeout(() => {
    notice.hidden = true;
    notice.textContent = "";
    notice.className = "page-notice";
    showNotice._timer = undefined;
  }, type === "success" ? 3000 : 4000);
}

function showError(message) {
  showNotice(message, "error");
}

function showSuccess(message) {
  showNotice(message, "success");
}

function hideMessages() {
  const notice = document.getElementById("loginNotice");

  if (!notice) return;

  notice.hidden = true;
  notice.textContent = "";
  notice.className = "page-notice";

  if (showNotice._timer) {
    window.clearTimeout(showNotice._timer);
    showNotice._timer = undefined;
  }
}

function showPageNotice(message, type = "error") {
  let notice = document.getElementById("pageNotice");
  if (!notice) {
    notice = document.createElement("div");
    notice.id = "pageNotice";
    notice.setAttribute("role", "status");
    const main = document.querySelector(".main");
    const header = main ? main.querySelector(".page-header") : null;
    if (main && header && header.nextSibling) {
      main.insertBefore(notice, header.nextSibling);
    } else if (main) {
      main.prepend(notice);
    } else {
      document.body.prepend(notice);
    }
  }
  if (typeof showPageNotice._timer !== "undefined") {
    window.clearTimeout(showPageNotice._timer);
    showPageNotice._timer = undefined;
  }
  if (!message) {
    notice.hidden = true;
    notice.textContent = "";
    notice.className = "page-notice";
    return;
  }
  notice.hidden = false;
  notice.className =
    "page-notice " + (type === "success" ? "success" : "error");
  notice.textContent = message;
  const delay = type === "success" ? 2000 : 3500;
  showPageNotice._timer = window.setTimeout(() => {
    if (notice.textContent === message) {
      notice.hidden = true;
      notice.textContent = "";
      notice.className = "page-notice";
    }
    showPageNotice._timer = undefined;
  }, delay);
}

function clearPageNotice() {
  showPageNotice("", "error");
}

function armConfirmButton(button, label = "Klik lagi untuk yakin") {
  if (!(button instanceof HTMLElement)) return true;
  if (button.dataset.armed !== "true") {
    if (!button.dataset.originalLabel) {
      button.dataset.originalLabel = button.textContent;
    }
    button.dataset.armed = "true";
    button.textContent = label;
    button.classList.add("armed");
    window.clearTimeout(button._disarmTimer);
    button._disarmTimer = window.setTimeout(() => {
      button.dataset.armed = "false";
      button.textContent = button.dataset.originalLabel || button.textContent;
      button.classList.remove("armed");
    }, 3000);
    return false;
  }
  window.clearTimeout(button._disarmTimer);
  button.dataset.armed = "false";
  if (button.dataset.originalLabel) {
    button.textContent = button.dataset.originalLabel;
  }
  button.classList.remove("armed");
  return true;
}

function confirmUnlock(item, aksi = "mengubah", button = null) {
  if (!isLocked(item)) return true;
  const label = item.polisi || item.nama || "";
  const msg =
    `Data ${label} berstatus Selesai dan terkunci agar tidak berubah sembarangan. ` +
    `Perubahan tetap dicatat sebagai tulisan, bukan popup. ` +
    (button
      ? `Klik tombol yang sama sekali lagi untuk tetap lanjutkan ${aksi}.`
      : `Tetap melanjutkan ${aksi} data.`);
  if (button instanceof HTMLElement) {
    if (!armConfirmButton(button, "Klik lagi — tetap lanjutkan 🔒")) {
      showPageNotice(msg, "error");
      return false;
    }
    clearPageNotice();
    return true;
  }
  showPageNotice(msg, "error");
  return true;
}

/* =========================================
   PAGINASI TABEL (UMUM)
   Dipakai halaman Riwayat, Keuangan, Aktivitas,
   dan halaman customer.
   ========================================= */

function renderTablePagination(containerId, currentPage, totalPages, onPage) {
  const pagination = document.getElementById(containerId);

  if (!pagination) {
    return;
  }

  pagination.innerHTML = "";

  if (totalPages <= 1) {
    return;
  }

  const addButton = (label, page, active = false, disabled = false) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "page-btn";
    button.textContent = label;
    button.disabled = disabled;

    if (active) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => onPage(page));

    pagination.appendChild(button);
  };

  addButton("‹", currentPage - 1, false, currentPage === 1);

  for (let page = 1; page <= totalPages; page++) {
    addButton(String(page), page, page === currentPage);
  }

  addButton("›", currentPage + 1, false, currentPage === totalPages);
}

/* TABEL KENDARAAN */

function renderKendaraan(search = "", page = 1) {
  const table = document.getElementById("kendaraanTable");

  if (!table) {
    return;
  }

  const kendaraan = getKendaraan();

  const keyword = String(search).toLowerCase().trim();

  const statusFilter =
    document.getElementById("filterStatus")?.value ||
    document.getElementById("filterStatusDashboard")?.value ||
    "";

  const sort = getSortValue("sortKendaraan");

  const isDashboard = !document.getElementById("btnTambahKendaraan");
  const hariIni = getTodayLocalDate();

  const hasil = kendaraan
    .filter((item) => {
      if (isDashboard) {
        const tanggal = String(item.tanggalService || "").slice(0, 10);
        const belumSelesai = item.status !== "Selesai";
        const dariHariSebelumnya = !tanggal || tanggal < hariIni;

        /* Dashboard menampilkan kendaraan hari ini + service yang belum
           selesai dari hari sebelumnya supaya pekerjaan tidak hilang
           saat berganti hari. */
        if (
          tanggal !== hariIni &&
          (!belumSelesai || !dariHariSebelumnya)
        ) {
          return false;
        }
      }

      if (!cocokFilterStatus(item, statusFilter)) return false;
      return [
        item.kode,
        item.polisi,
        item.jenis,
        item.merk,
        item.pelanggan,
        item.keluhan,
        item.status,
        item.tanggalService,
        getMekanikNama(item.mekanikId),
      ].some((value) => {
        return String(value || "")
          .toLowerCase()
          .includes(keyword);
      });
    })
    .sort(compareStatusOrder);

  const hasilWithTotal = hasil.map((item) => ({
    ...item,
    total: getServiceTotal(item),
  }));

  const hasilSorted = sortRows(hasilWithTotal, sort.key, sort.direction);

  const perPage = isDashboard ? 5 : 10;

  const totalPages = Math.max(1, Math.ceil(hasilSorted.length / perPage));

  if (page < 1) {
    page = 1;
  }

  if (page > totalPages) {
    page = totalPages;
  }

  const startIndex = (page - 1) * perPage;

  const endIndex = startIndex + perPage;

  const dataHalaman = hasilSorted.slice(startIndex, endIndex);

  table.innerHTML = "";

  if (hasilSorted.length === 0) {
    const colspan = isDashboard ? 13 : 12;

    /* Kosong gara-gara cari/filter? Jangan menawarkan tombol tambah. */
    const tersaring = Boolean(keyword || statusFilter);

    const ctaDashboard =
      '<button type="button" class="action-btn" data-empty-cta="btnInputTerpadu">+ Input Data</button>';
    const ctaKendaraan =
      '<button type="button" class="action-btn" data-empty-cta="btnTambahKendaraan">+ Tambah Kendaraan</button>';

    table.innerHTML = `
      <tr>
        <td
          colspan="${colspan}"
          style="
            text-align:center;
            padding:30px;
          "
        >
          ${
            tersaring
              ? "Tidak ada data yang cocok dengan pencarian / filter."
              : `Belum ada data kendaraan. ${isDashboard ? ctaDashboard : ctaKendaraan}`
          }
        </td>
      </tr>
    `;

    const emptyCta = table.querySelector("[data-empty-cta]");
    if (emptyCta) {
      emptyCta.addEventListener("click", () => {
        document.getElementById(emptyCta.dataset.emptyCta)?.click();
      });
    }

    setText("kendaraanInfo", "Menampilkan 0 kendaraan");

    renderKendaraanPagination(1, 1, search);

    return;
  }

  dataHalaman.forEach((item, index) => {
    const statusClass = getStatusClass(item.status);

    const pembayaran = item.pembayaran || "Belum Lunas";

    const nomor = startIndex + index + 1;

    if (isDashboard) {
      table.innerHTML += `
          <tr>

            <td>
              ${nomor}
            </td>

            <td>
              <span class="cell-id">${escapeHTML(getKode("kendaraan", item))}</span>
            </td>

            <td>
              <strong>
                ${escapeHTML(item.polisi)}
              </strong>
            </td>

            <td>
              ${escapeHTML(item.jenis)}
            </td>

            <td>
              ${escapeHTML(item.merk)}
            </td>

            <td>
              ${escapeHTML(item.pelanggan)}
            </td>

            <td>
              ${escapeHTML(item.keluhan)}
            </td>

            <td>
              ${escapeHTML(getMekanikNama(item.mekanikId))}
            </td>

            <td>
              <strong>
                ${formatRupiah(getServiceTotal(item))}
              </strong>
            </td>

            <td>
              ${escapeHTML(item.tanggalService || "-")}
            </td>

            <td>
              <div class="status-cell">
                <span class="badge ${statusClass}">
                  ${escapeHTML(item.status)}${item.status === "Selesai" ? " 🔒" : ""}
                </span>
                ${buildAjuanBadge(item)}
              </div>
            </td>

            <td>
              <span class="badge ${pembayaran === "Lunas" ? "done" : "waiting"}">
                ${escapeHTML(pembayaran)}
              </span>
            </td>

            <td>
              <div class="action-buttons">
                ${
                  pembayaran !== "Lunas"
                    ? `<button
                        type="button"
                        class="action-btn"
                        data-dashboard-paid="${item.id}"
                        ${item.status === "Selesai" ? "" : "disabled"}
                        title="${
                          item.status === "Selesai"
                            ? `Tandai transaksi ${escapeHTML(item.polisi)} lunas`
                            : "Service harus berstatus Selesai sebelum bisa dilunasi"
                        }"
                      >
                        💰 Lunas
                      </button>`
                    : ""
                }
                ${
                  item.status === "Selesai"
                    ? `<button
                        type="button"
                        class="action-btn"
                        data-dashboard-detail="${item.id}"
                        title="Lihat detail service"
                      >
                        Detail
                      </button>`
                    : ""
                }
                <button
                  type="button"
                  class="action-btn"
                  data-dashboard-edit="${item.id}"
                  title="Ubah data service"
                >
                  ${item.status === "Selesai" ? "🔒 Ubah" : "Ubah"}
                </button>
              </div>
            </td>

          </tr>
        `;
    } else {
      table.innerHTML += `
          <tr>

            <td>
              ${nomor}
            </td>

            <td>
              <span class="cell-id">${escapeHTML(getKode("kendaraan", item))}</span>
            </td>

            <td>
              <strong>
                ${escapeHTML(item.polisi)}
              </strong>
            </td>

            <td>
              ${escapeHTML(item.jenis)}
            </td>

            <td>
              ${escapeHTML(item.merk)}
            </td>

            <td>
              ${escapeHTML(item.pelanggan)}
            </td>

            <td>
              ${escapeHTML(item.keluhan)}
            </td>

            <td>
              ${formatRupiah(item.biayaJasa || 0)}
            </td>

            <td>
              <strong>
                ${formatRupiah(getServiceTotal(item))}
              </strong>
            </td>

            <td>
              ${escapeHTML(item.tanggalService || "-")}
            </td>

            <td>
              <div class="status-cell">
                <span class="badge ${statusClass}">
                  ${escapeHTML(item.status)}${item.status === "Selesai" ? " 🔒" : ""}
                </span>
                ${buildAjuanBadge(item)}
              </div>
            </td>

            <td>

              <div
                class="action-buttons"
              >

                <button
                  type="button"
                  class="action-btn"
                  data-kendaraan-detail="${item.id}"
                >
                  Detail
                </button>

                <button
                  type="button"
                  class="action-btn"
                  data-kendaraan-edit="${item.id}"
                >
                  Edit
                </button>

                <button
                  type="button"
                  class="action-btn danger"
                  data-kendaraan-delete="${item.id}"
                >
                  Hapus
                </button>

              </div>

            </td>

          </tr>
        `;
    }
  });

  setText(
    "kendaraanInfo",
    `Menampilkan ${startIndex + 1}-${Math.min(
      endIndex,
      hasilSorted.length,
    )} dari ${hasilSorted.length} kendaraan`,
  );

  /* Listener tombol aksi (tanpa inline onclick -> CSP friendly) */
  table.querySelectorAll("[data-dashboard-edit]").forEach((button) => {
    button.addEventListener("click", () =>
      openDashboardEdit(button.dataset.dashboardEdit, button),
    );
  });

  /* Aksi cepat "Lunas" dari dashboard — konfirmasi dua klik. */
  table.querySelectorAll("[data-dashboard-paid]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.dashboardPaid;
      if (!armConfirmButton(button, "Klik lagi untuk lunas")) {
        showPageNotice(
          "Klik Lunas sekali lagi untuk menandai transaksi ini lunas.",
          "error",
        );
        return;
      }
      const item = getKendaraan().find(
        (row) => Number(row.id) === Number(id),
      );
      if (!item) return;
      if (item.status !== "Selesai") {
        showPageNotice(
          "Transaksi hanya bisa dilunasi setelah status service Selesai.",
          "error",
        );
        return;
      }
      if (!setServicePaid(id)) {
        showPageNotice("Transaksi ini sudah berstatus lunas.", "error");
        return;
      }
      addLog(
        "Bayar",
        "Service",
        `Transaksi ${item.polisi} ditandai lunas`,
        getKode("kendaraan", item),
      );
      if (typeof updateDashboard === "function") updateDashboard();
      showPageNotice("Transaksi ditandai lunas.", "success");
    });
  });

  /* Detail service hanya ditampilkan untuk data yang sudah Selesai. */
  table.querySelectorAll("[data-dashboard-detail]").forEach((button) => {
    button.addEventListener("click", () => {
      if (typeof showDashboardDetail === "function") {
        showDashboardDetail(button.dataset.dashboardDetail);
      }
    });
  });

  table.querySelectorAll("[data-kendaraan-detail]").forEach((button) => {
    button.addEventListener("click", () =>
      showKendaraanDetail(button.dataset.kendaraanDetail),
    );
  });

  table.querySelectorAll("[data-kendaraan-edit]").forEach((button) => {
    button.addEventListener("click", () =>
      editKendaraan(button.dataset.kendaraanEdit, button),
    );
  });

  table.querySelectorAll("[data-kendaraan-delete]").forEach((button) => {
    button.addEventListener("click", () =>
      deleteKendaraan(button.dataset.kendaraanDelete, button),
    );
  });

  renderKendaraanPagination(page, totalPages, search);
}

/* =========================================
  PAGINATION KENDARAAN
========================================= */

function renderKendaraanPagination(currentPage, totalPages, search = "") {
  const pagination = document.getElementById("kendaraanPagination");

  if (!pagination) {
    return;
  }

  pagination.innerHTML = "";

  if (totalPages <= 1) {
    return;
  }

  const prevButton = document.createElement("button");

  prevButton.type = "button";

  prevButton.className = "page-btn";

  prevButton.textContent = "‹";

  prevButton.disabled = currentPage === 1;

  prevButton.addEventListener("click", function () {
    renderKendaraan(search, currentPage - 1);
  });

  pagination.appendChild(prevButton);

  for (let page = 1; page <= totalPages; page++) {
    const pageButton = document.createElement("button");

    pageButton.type = "button";

    pageButton.className = "page-btn";

    pageButton.textContent = page;

    if (page === currentPage) {
      pageButton.classList.add("active");
    }

    pageButton.addEventListener("click", function () {
      renderKendaraan(search, page);
    });

    pagination.appendChild(pageButton);
  }

  const nextButton = document.createElement("button");

  nextButton.type = "button";

  nextButton.className = "page-btn";

  nextButton.textContent = "›";

  nextButton.disabled = currentPage === totalPages;

  nextButton.addEventListener("click", function () {
    renderKendaraan(search, currentPage + 1);
  });

  pagination.appendChild(nextButton);
}

/* TABEL MEKANIK */

function initSidebar() {
  const burger = document.getElementById("burgerBtn");
  const sidebar = document.getElementById("sidebar");

  if (!burger || !sidebar) {
    return;
  }

  function closeSidebar() {
    document.body.classList.remove("sidebar-open");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Buka menu");
    burger.setAttribute("title", "Buka menu");
  }

  function openSidebar() {
    document.body.classList.add("sidebar-open");
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", "Tutup menu");
    burger.setAttribute("title", "Tutup menu");
  }

  let overlay = document.getElementById("sidebarOverlay");

  if (!overlay) {
    overlay = document.createElement("button");
    overlay.type = "button";
    overlay.id = "sidebarOverlay";
    overlay.className = "sidebar-overlay";
    overlay.setAttribute("aria-label", "Tutup menu navigasi");
    overlay.addEventListener("click", closeSidebar);
    document.body.appendChild(overlay);
  }

  burger.addEventListener("click", () => {
    if (document.body.classList.contains("sidebar-open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  sidebar.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", closeSidebar);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSidebar();
    }
  });

  if (window.matchMedia) {
    window
      .matchMedia("(max-width: 700px)")
      .addEventListener("change", (event) => {
        if (!event.matches) {
          closeSidebar();
        }
      });
  }
}

/* =========================================
   KONFIRMASI KELUAR KE HALAMAN LOGIN
   Dipakai semua tombol Keluar: ikon keluar di topbar (portal admin &
   customer) serta tombol "Keluar dari Akun" di halaman Pengaturan
   customer. Markup modal disuntik sekali lewat JS supaya tidak perlu
   menambah HTML yang sama di 19 file halaman.
   ========================================= */

var LOGOUT_MODAL_ID = "logoutConfirmModal";

function ensureLogoutModal() {
  if (document.getElementById(LOGOUT_MODAL_ID)) return;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = LOGOUT_MODAL_ID;
  overlay.innerHTML = `
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logoutConfirmModal-title"
      aria-describedby="logoutConfirmModal-desc"
    >
      <div class="modal-header">
        <div>
          <h3 id="logoutConfirmModal-title">Keluar dari akun?</h3>
          <p id="logoutConfirmModal-desc">
            Sesi akan diakhiri dan Anda kembali ke halaman masuk.
          </p>
        </div>
        <button
          type="button"
          class="modal-close"
          data-logout-dismiss
          aria-label="Tutup"
        >
          ×
        </button>
      </div>
      <div class="modal-body">
        <p class="lock-note">
          ⚠️ Anda perlu masuk kembali untuk mengakses halaman ini.
        </p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-logout-dismiss>
          Batal
        </button>
        <button type="button" class="btn btn-danger" data-logout-confirm>
          <i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
          Ya, Keluar
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  /* Klik area gelap di luar dialog = batal. */
  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) closeModal(LOGOUT_MODAL_ID);
  });

  /* Tombol × dan "Batal" (ESC sudah ditangani global.js; pengembalian
     fokus ke pemicu dilakukan closeModal). */
  overlay.querySelectorAll("[data-logout-dismiss]").forEach(function (button) {
    button.addEventListener("click", function () {
      closeModal(LOGOUT_MODAL_ID);
    });
  });

  overlay.querySelector("[data-logout-confirm]").addEventListener(
    "click",
    function () {
      const onConfirm = overlay.__logoutConfirm;
      overlay.__logoutConfirm = null;
      closeModal(LOGOUT_MODAL_ID);

      if (typeof onConfirm === "function") onConfirm();
    },
  );
}

/* Tampilkan dialog; onConfirm dipanggil hanya saat "Ya, Keluar". */
function confirmLogout(options) {
  const opts = options || {};

  ensureLogoutModal();

  const overlay = document.getElementById(LOGOUT_MODAL_ID);
  overlay.__logoutConfirm = opts.onConfirm || null;
  overlay.__focusReturn = document.activeElement;

  openModal(LOGOUT_MODAL_ID);
  overlay.querySelector("[data-logout-confirm]")?.focus();
}

/* TOPBAR: NAMA PENGGUNA, TOMBOL TEMA, LOGOUT */

function initTopbar() {
  const userChip = document.getElementById("userChip");
  const userName = document.getElementById("userChipName");
  const logoutButton = document.getElementById("btnLogout");

  if (userChip && userName) {
    const profile = getCurrentProfile();
    const nama =
      profile?.nama ||
      sessionStorage.getItem("workshopUserName") ||
      sessionStorage.getItem("workshopCustomerName") ||
      "";

    if (nama) {
      userName.textContent = nama;
      userChip.hidden = false;
    }
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", function () {
      confirmLogout({
        onConfirm: async function () {
          if (typeof Auth !== "undefined") {
            await Auth.signOut();
          }

          sessionStorage.removeItem("workshopLoggedIn");
          sessionStorage.removeItem("workshopUserName");
          sessionStorage.removeItem("workshopCustomerSession");
          sessionStorage.removeItem("workshopCustomerName");

          /* Fallback: root sudah di-rewrite ke halaman login di vercel.json. */
          window.location.href = logoutButton.dataset.logoutTarget || "/";
        },
      });
    });
  }
}

/* =========================================
   SKELETON LOADING
   Definisi showSkeleton() ada di js/theme.js (dimuat dari
   <head>) dan dipanggil tiap halaman lewat inline script
   tepat setelah tag <body>, supaya skeleton tampil sejak
   paint pertama — bukan setelah layout kosong terlanjur
   dirender. global.js hanya MENGHILANGKAN skeleton setelah
   data + sesi siap.
   ========================================= */

function hideSkeleton() {
  const skeleton = document.getElementById("appSkeleton");

  if (skeleton) {
    skeleton.classList.add("hidden");
    window.setTimeout(() => skeleton.remove(), 150);
  }
}

/* Fallback kalau sebuah halaman ber-role lupa memanggil
   showSkeleton() via inline script setelah <body>. Pada halaman
   yang benar, skeleton sudah ada sejak paint pertama dan baris ini
   hanya no-op (showSkeleton() langsung return). Halaman tanpa
   __APP_ROLE (login index) tidak memakai skeleton — jangan
   dibuatkan, nanti tertimpa halaman login sebentar. */
if (window.__APP_ROLE) {
  showSkeleton();
}

/* =========================================
   BOOT SEQUENCE
   ========================================= */

document.addEventListener("DOMContentLoaded", async function () {
  if (typeof initTheme === "function") initTheme();

  if (window.__APP_ROLE) {
    showSkeleton();
  }

  const role = window.__APP_ROLE;

  /* 1+2. Cek sesi dan muat data dijalankan BERBARENGAN.
     Waktu tunggu = yang paling lama di antara keduanya, bukan
     jumlah keduanya (dulu berurutan: data dulu, baru sesi). */
  const sessionReady = (async function () {
    if (role === "admin" && typeof requireAdminAuth === "function") {
      return requireAdminAuth();
    }

    if (role === "customer" && typeof requireCustomerAuth === "function") {
      return requireCustomerAuth();
    }

    return true;
  })();

  const results = await Promise.all([
    typeof dbInit === "function" ? dbInit() : Promise.resolve(),
    sessionReady,
  ]);
  const allowed = results[1];

  if (!allowed) {
    hideSkeleton();
    return;
  }

  /* 3. Sembunyikan skeleton SEGERA setelah data + sesi siap.
     Renderer di langkah berikutnya berjalan SINKRON dari data cache,
     jadi skeleton tidak perlu menunggu mereka selesai — tampilan
     terasa jauh lebih cepat. */
  hideSkeleton();

  /* 4. Tampilan umum */
  initTopbar();
  initSidebar();
  document.querySelectorAll("[data-close-modal]").forEach(function (button) {
    if (button.dataset.globalBound) return;
    button.dataset.globalBound = "true";
    button.addEventListener("click", function () {
      closeModal(button.dataset.closeModal);
    });
  });
  document.querySelectorAll(".modal-overlay").forEach(function (modal) {
    if (modal.dataset.globalBound) return;
    modal.dataset.globalBound = "true";
    modal.addEventListener("click", function (event) {
      if (event.target === modal) closeModal(modal.id);
    });
  });

  /* Tekan ESC = tutup modal yang paling atas. */
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;

    const terbuka = [...document.querySelectorAll(".modal-overlay.show")];

    if (terbuka.length) {
      closeModal(terbuka[terbuka.length - 1].id);
    }
  });

  /* Tab / Shift+Tab tetap berada di dalam modal aktif. */
  document.addEventListener("keydown", trapModalFocus);

  /* 5. Halaman aktif */
  if (
    document.getElementById("btnInputTerpadu") &&
    typeof initDashboardInput === "function"
  ) {
    updateDashboard();
    if (typeof renderMekanik === "function") renderMekanik();
    initDashboardInput();
  }
  /* Portal customer: inisialisasi dijalankan di sini (setelah sesi
     customer terbentuk), bukan dari listener DOMContentLoaded sendiri. */
  if (role === "customer" && typeof initCustomerApp === "function") {
    initCustomerApp();
  }
  if (typeof initKendaraanPage === "function") initKendaraanPage();
  if (typeof initCustomerPage === "function") initCustomerPage();
  if (typeof initMekanikPage === "function") initMekanikPage();
  if (typeof initServicePage === "function") initServicePage();
  if (typeof initRiwayatPage === "function") initRiwayatPage();
  if (typeof initSparepartPage === "function") initSparepartPage();
  if (typeof initPengaturanPage === "function") initPengaturanPage();
  if (typeof initKeuanganPage === "function") initKeuanganPage();
  if (typeof initUlasanPage === "function") initUlasanPage();
});
