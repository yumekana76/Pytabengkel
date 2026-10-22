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

/* HELPER */

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* MODAL */

function openModal(id) {
  const modal = document.getElementById(id);

  if (modal) {
    modal.classList.add("show");
    document.body.classList.add("modal-open");
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);

  if (modal) {
    modal.classList.remove("show");

    /* Halaman hanya dibuka lagi kalau masih ada modal terbuka. */
    if (!document.querySelector(".modal-overlay.show")) {
      document.body.classList.remove("modal-open");
    }
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
  if ((kendaraan[index].pembayaran || "Belum Lunas") === "Lunas") return false;

  kendaraan[index] = { ...kendaraan[index], pembayaran: "Lunas" };

  saveKendaraan(kendaraan);

  return true;
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
            <th>Item</th>
            <th class="num">Harga</th>
            <th class="num">Qty</th>
            <th class="num">Subtotal</th>
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
        <div>Terima kasih telah-li 🤝</div>
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

/* URUTAN STATUS & KUNCI DATA SELESAI */
var STATUS_ORDER = {
  Menunggu: 0,
  Dikerjakan: 1,
  "Quality Check": 2,
  Selesai: 3,
};

function compareStatusOrder(a, b) {
  const order = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
  if (order !== 0) return order;
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

  const hasil = kendaraan
    .filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false;
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

  const isDashboard = !document.getElementById("btnTambahKendaraan");

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

    table.innerHTML = `
      <tr>
        <td
          colspan="${colspan}"
          style="
            text-align:center;
            padding:30px;
          "
        >
          Tidak ada data kendaraan
        </td>
      </tr>
    `;

    setText("kendaraanInfo", "Menampilkan 0 kendaraan");

    renderKendaraanPagination(1, 1, search);

    return;
  }

  dataHalaman.forEach((item, index) => {
    const statusClass = getStatusClass(item.status);

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
              <span
                class="badge ${statusClass}"
              >
                ${escapeHTML(item.status)}${item.status === "Selesai" ? " 🔒" : ""}
              </span>
            </td>

            <td>
              <button
                type="button"
                class="action-btn"
                data-dashboard-edit="${item.id}"
                title="Ubah status & mekanik"
              >
                Ubah
              </button>
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
              <span
                class="badge ${statusClass}"
              >
                ${escapeHTML(item.status)}${item.status === "Selesai" ? " 🔒" : ""}
              </span>
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
    logoutButton.addEventListener("click", async function () {
      if (typeof Auth !== "undefined") {
        await Auth.signOut();
      }

      sessionStorage.removeItem("workshopLoggedIn");
      sessionStorage.removeItem("workshopUserName");
      sessionStorage.removeItem("workshopCustomerSession");
      sessionStorage.removeItem("workshopCustomerName");

      window.location.href =
        logoutButton.dataset.logoutTarget || "../index.html";
    });
  }
}

/* =========================================
   SKELETON LOADING
   ========================================= */

function showSkeleton() {
  if (document.getElementById("appSkeleton")) {
    return;
  }

  const skeleton = document.createElement("div");
  skeleton.id = "appSkeleton";
  skeleton.className = "skeleton";
  skeleton.setAttribute("role", "status");
  skeleton.setAttribute("aria-live", "polite");
  skeleton.innerHTML = `
    <div class="skeleton-inner">
      <div class="skeleton-bar title"></div>
      <div class="skeleton-bar medium"></div>
      <div class="skeleton-bar short"></div>
      <p class="skeleton-text">Memuat data…</p>
    </div>
  `;

  document.body.appendChild(skeleton);
}

function hideSkeleton() {
  const skeleton = document.getElementById("appSkeleton");

  if (skeleton) {
    skeleton.classList.add("hidden");
    window.setTimeout(() => skeleton.remove(), 300);
  }
}

/* =========================================
   BOOT SEQUENCE
   ========================================= */

document.addEventListener("DOMContentLoaded", async function () {
  if (typeof initTheme === "function") initTheme();

  showSkeleton();

  /* 1. Muat data (Supabase atau localStorage) */
  if (typeof dbInit === "function") {
    await dbInit();
  }

  /* 2. Cek sesi login sesuai role halaman ini */
  const role = window.__APP_ROLE;

  if (role === "admin" && typeof requireAdminAuth === "function") {
    const allowed = await requireAdminAuth();
    if (!allowed) {
      hideSkeleton();
      return;
    }
  }

  if (role === "customer" && typeof requireCustomerAuth === "function") {
    const allowed = await requireCustomerAuth();
    if (!allowed) {
      hideSkeleton();
      return;
    }
  }

  /* 3. Tampilan umum */
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

  /* 4. Halaman aktif */
  if (
    document.getElementById("btnInputTerpadu") &&
    typeof initDashboardInput === "function"
  ) {
    updateDashboard();
    if (typeof renderMekanik === "function") renderMekanik();
    initDashboardInput();
  }
  if (typeof initKendaraanPage === "function") initKendaraanPage();
  if (typeof initCustomerPage === "function") initCustomerPage();
  if (typeof initMekanikPage === "function") initMekanikPage();
  if (typeof initServicePage === "function") initServicePage();
  if (typeof initRiwayatPage === "function") initRiwayatPage();
  if (typeof initSparepartPage === "function") initSparepartPage();
  if (typeof initPengaturanPage === "function") initPengaturanPage();
  if (typeof initKeuanganPage === "function") initKeuanganPage();

  hideSkeleton();
});
