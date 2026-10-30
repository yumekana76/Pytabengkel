/* =========================================
   APLIKASI HALAMAN CUSTOMER
   Semua data di halaman ini bersumber dari tabel
   yang sama dengan sisi admin (workshop_customers
   & workshop_kendaraan), sehingga selalu sinkron.
   ========================================= */

/* UTILITAS */

function customerVehiclesByPlate(vehicles) {
  const map = new Map();

  vehicles.forEach((item) => {
    const key = String(item.polisi || "").toUpperCase();

    if (!map.has(key)) {
      map.set(key, {
        polisi: item.polisi,
        jenis: item.jenis,
        merk: item.merk,
        records: [],
      });
    }

    map.get(key).records.push(item);
  });

  return [...map.values()].map((group) => {
    const latest = [...group.records].sort(
      (a, b) =>
        String(b.tanggalService || "").localeCompare(
          String(a.tanggalService || ""),
        ) || Number(b.id) - Number(a.id),
    )[0];

    return { ...group, latest };
  });
}

/* Stepper status service memakai helper bersama di js/global.js
   (buildServiceSteps) supaya sama dengan portal admin. */

/* Informasi bengkel diambil dari data layer (sinkron dengan admin). */
function getBengkelInfo() {
  return getBengkelInfoLengkap();
}

function customerInitials(nama) {
  return String(nama || "C")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

async function customerLogout() {
  /* Tutup sesi Supabase (kalau mode Supabase) SEBELUM redirect —
     tanpa ini token tetap tersimpan dan pengguna langsung masuk
     lagi saat membuka halaman customer berikutnya. */
  if (typeof Auth !== "undefined") {
    await Auth.signOut();
  }

  clearCustomerSession();
  window.location.href = "/html/index.html?role=customer";
}

/* HEADER */

function initCustomerHeader() {
  const customer = getCurrentCustomer();

  if (!customer) {
    return null;
  }

  const name = document.getElementById("userChipName");

  if (name) {
    name.textContent = customer.nama;
  }

  const chip = document.getElementById("userChip");

  if (chip) {
    chip.hidden = false;
  }

  return customer;
}

/* =========================================
   DASHBOARD
   ========================================= */

function initCustomerDashboard() {
  const customer = getCurrentCustomer();

  if (!customer) {
    return;
  }

  const vehicles = getCustomerVehicles();
  const berjalan = vehicles.filter((item) => item.status !== "Selesai");
  const selesai = vehicles.filter((item) => item.status === "Selesai");
  const total = vehicles.reduce((sum, item) => sum + getServiceTotal(item), 0);

  setText("customerGreeting", `Halo, ${customer.nama}!`);
  setText(
    "customerSubGreeting",
    "Berikut ringkasan kendaraan dan service Anda di Pytabengkel.",
  );
  setText("heroVehicleCount", `${vehicles.length} kendaraan`);
  setText("statKendaraan", vehicles.length);
  setText("statBerjalan", berjalan.length);
  setText("statSelesai", selesai.length);
  setText("statTagihan", formatRupiah(total));

  const counts = {
    Menunggu: vehicles.filter((item) => item.status === "Menunggu").length,
    Dikerjakan: vehicles.filter((item) => item.status === "Dikerjakan").length,
    "Quality Check": vehicles.filter((item) => item.status === "Quality Check")
      .length,
    Selesai: selesai.length,
  };

  setText("totalServiceCircle", vehicles.length);
  setText("circleMenunggu", counts.Menunggu);
  setText("circleDikerjakan", counts.Dikerjakan);
  setText("circleQC", counts["Quality Check"]);
  setText("circleSelesai", counts.Selesai);

  const circle = document.getElementById("customerProgressCircle");

  if (circle) {
    if (!vehicles.length) {
      circle.style.background = "conic-gradient(var(--border) 0 100%)";
    } else {
      const waitingEnd = (counts.Menunggu / vehicles.length) * 100;
      const workingEnd =
        waitingEnd + (counts.Dikerjakan / vehicles.length) * 100;
      const qcEnd =
        workingEnd + (counts["Quality Check"] / vehicles.length) * 100;

      circle.style.background = `conic-gradient(
        var(--waiting) 0% ${waitingEnd}%,
        var(--working) ${waitingEnd}% ${workingEnd}%,
        var(--qc) ${workingEnd}% ${qcEnd}%,
        var(--done) ${qcEnd}% 100%
      )`;
    }
  }

  renderBengkelInfo();
  renderRecentServices();
}

function renderBengkelInfo() {
  const container = document.getElementById("bengkelInfo");

  if (!container) {
    return;
  }

  const info = getBengkelInfo();

  const items = [
    {
      icon: "fa-solid fa-store",
      title: info.nama || "Pytabengkel",
      value: info.alamat || "Alamat bengkel belum diisi admin.",
    },
    {
      icon: "fa-solid fa-phone",
      title: "Kontak",
      value: info.kontak || "Hubungi admin bengkel melalui nomor resmi.",
    },
    {
      icon: "fa-solid fa-envelope",
      title: "Email",
      value: info.email || "Email bengkel belum diisi admin.",
    },
    {
      icon: "fa-solid fa-calendar-week",
      title: "Hari Buka",
      value: info.hariBuka || "Hari buka belum diisi admin.",
    },
    {
      icon: "fa-solid fa-clock",
      title: "Jam Operasional",
      value: info.jamBuka || "Jam buka belum diisi admin.",
    },
  ];

  container.innerHTML = items
    .map(
      (item) => `
        <div class="info-item">
          <i class="${item.icon}" aria-hidden="true"></i>
          <div>
            <strong>${escapeHTML(item.title)}</strong>
            <span>${escapeHTML(item.value)}</span>
          </div>
        </div>
      `,
    )
    .join("");
}

function renderRecentServices() {
  const table = document.getElementById("customerRecentTable");

  if (!table) {
    return;
  }

  const vehicles = [...getCustomerVehicles()].sort(
    (a, b) =>
      String(b.tanggalService || "").localeCompare(
        String(a.tanggalService || ""),
      ) || Number(b.id) - Number(a.id),
  );

  const recent = vehicles.slice(0, 5);

  if (!recent.length) {
    table.innerHTML = `
      <tr class="empty-row">
        <td colspan="8">
          Belum ada service. Ajukan service pertama Anda di halaman Kendaraan.
        </td>
      </tr>
    `;
    return;
  }

  table.innerHTML = recent
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td><span class="cell-id">${escapeHTML(getKode("kendaraan", item))}</span></td>
          <td>${escapeHTML(item.tanggalService || "-")}</td>
          <td><strong>${escapeHTML(item.polisi)}</strong></td>
          <td>${escapeHTML(item.keluhan || "-")}</td>
          <td>${escapeHTML(getMekanikNama(item.mekanikId))}</td>
          <td>
            <span class="badge ${getStatusClass(item.status)}">
              ${escapeHTML(item.status || "-")}
            </span>
          </td>
          <td><strong>${formatRupiah(getServiceTotal(item))}</strong></td>
        </tr>
      `,
    )
    .join("");
}

/* =========================================
   KENDARAAN SAYA
   ========================================= */

function initCustomerVehicles() {
  const cards = document.getElementById("vehicleCards");

  if (!cards) {
    return;
  }

  renderVehicleCards();

  document
    .getElementById("searchKendaraan")
    ?.addEventListener("input", renderVehicleCards);

  document
    .getElementById("filterKendaraanStatus")
    ?.addEventListener("change", renderVehicleCards);

  document
    .getElementById("sortKendaraan")
    ?.addEventListener("change", renderVehicleCards);

  document
    .getElementById("btnAjukanService")
    ?.addEventListener("click", openRequestModal);

  document
    .getElementById("requestMode")
    ?.addEventListener("change", toggleRequestVehicleFields);

  document
    .getElementById("requestForm")
    ?.addEventListener("submit", submitServiceRequest);
}

function renderVehicleCards() {
  const container = document.getElementById("vehicleCards");

  if (!container) {
    return;
  }

  const keyword = String(
    document.getElementById("searchKendaraan")?.value || "",
  )
    .toLowerCase()
    .trim();

  const statusFilter =
    document.getElementById("filterKendaraanStatus")?.value || "";

  const sort = getSortValue("sortKendaraan");

  const groups = customerVehiclesByPlate(getCustomerVehicles()).filter(
    (group) => {
      if (statusFilter && group.latest.status !== statusFilter) {
        return false;
      }

      return [group.polisi, group.jenis, group.merk, group.latest.keluhan].some(
        (value) =>
          String(value || "")
            .toLowerCase()
            .includes(keyword),
      );
    },
  );

  const belumLunas = getCustomerBelumLunas().reduce(
    (sum, item) => sum + getServiceTotal(item),
    0,
  );

  setText(
    "statTotalKendaraan",
    customerVehiclesByPlate(getCustomerVehicles()).length,
  );
  setText(
    "statSedangProses",
    getCustomerVehicles().filter((item) => item.status !== "Selesai").length,
  );
  setText("statTotalService", getCustomerVehicles().length);
  setText("statBelumLunas", formatRupiah(belumLunas));

  if (!groups.length) {
    container.innerHTML = `
      <p class="form-hint" style="grid-column: 1 / -1">
        Belum ada kendaraan yang sesuai. Ajukan service pertama Anda.
      </p>
    `;
    return;
  }

  groups.sort((a, b) => {
    if (!sort.key) return 0;
    return compareBy(sort.key, sort.direction)(a.latest, b.latest);
  });

  container.innerHTML = groups
    .map((group) => {
      const services = group.records.length;
      const total = group.records.reduce(
        (sum, item) => sum + getServiceTotal(item),
        0,
      );

      return `
        <article class="vehicle-card">
          <div class="vehicle-card-head">
            <span class="vehicle-plate">
              <i class="fa-solid fa-car" aria-hidden="true"></i>
              ${escapeHTML(group.polisi)}
            </span>
            <span class="badge ${getStatusClass(group.latest.status)}">
              ${escapeHTML(group.latest.status || "-")}
            </span>
          </div>
          <div>
            <div class="vehicle-card-title">
              ${escapeHTML(group.merk || "-")} — ${escapeHTML(group.jenis || "-")}
            </div>
            <div class="vehicle-card-meta">
              ID Kendaraan:
              <span>${escapeHTML(group.latest.id)}</span> · Keluhan terakhir:
              <span>${escapeHTML(group.latest.keluhan || "-")}</span>
            </div>
          </div>
          <div class="vehicle-card-meta">
            Total service: <span>${services}</span> · Tanggal:
            <span>${escapeHTML(group.latest.tanggalService || "-")}</span>
          </div>
          <div class="vehicle-card-foot">
            <strong>${formatRupiah(total)}</strong>
            <button
              type="button"
              class="action-btn"
              data-vehicle-detail="${escapeHTML(group.polisi)}"
            >
              Detail
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  container.querySelectorAll("[data-vehicle-detail]").forEach((button) => {
    button.addEventListener("click", () =>
      showVehicleDetail(button.dataset.vehicleDetail),
    );
  });
}

function showVehicleDetail(polisi) {
  const content = document.getElementById("vehicleDetailContent");

  if (!content) {
    return;
  }

  const groups = customerVehiclesByPlate(getCustomerVehicles());
  const group = groups.find(
    (item) =>
      String(item.polisi || "").toUpperCase() ===
      String(polisi || "").toUpperCase(),
  );

  if (!group) {
    return;
  }

  const services = group.records
    .map(
      (item) => `
        <div class="detail-item full">
          <span class="detail-label">
            ${escapeHTML(item.tanggalService || "-")} ·
            ${escapeHTML(item.keluhan || "-")}
          </span>
          <span class="detail-value">
            ${escapeHTML(item.status || "-")} ·
            ${escapeHTML(getMekanikNama(item.mekanikId))} ·
            ${formatRupiah(getServiceTotal(item))}
          </span>
        </div>
      `,
    )
    .join("");

  content.innerHTML = `
    <div class="detail-item">
      <span class="detail-label">No. Polisi</span>
      <span class="detail-value">${escapeHTML(group.polisi)}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Merk / Jenis</span>
      <span class="detail-value">
        ${escapeHTML(group.merk || "-")} — ${escapeHTML(group.jenis || "-")}
      </span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Jumlah Service</span>
      <span class="detail-value">${group.records.length}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Status Terakhir</span>
      <span class="detail-value">${escapeHTML(group.latest.status || "-")}</span>
    </div>
    <div class="detail-item full">
      <span class="detail-label">Riwayat Service</span>
      <span class="detail-value">${services || "-"}</span>
    </div>
  `;

  openModal("vehicleDetailModal");
}

/* AJUKAN SERVICE */

function openRequestModal() {
  const customer = getCurrentCustomer();
  const select = document.getElementById("requestVehicle");

  if (!customer || !select) {
    return;
  }

  const groups = customerVehiclesByPlate(getCustomerVehicles());

  select.innerHTML = groups.length
    ? groups
        .map(
          (group) =>
            `<option value="${escapeHTML(group.polisi)}">${escapeHTML(
              group.polisi,
            )} — ${escapeHTML(group.merk || "")}</option>`,
        )
        .join("")
    : '<option value="">-- Tambah kendaraan baru --</option>';

  const mode = document.getElementById("requestMode");

  if (!groups.length && mode) {
    mode.value = "new";
  }

  const tanggal = document.getElementById("requestTanggal");

  if (tanggal && !tanggal.value) {
    tanggal.value = new Date().toISOString().slice(0, 10);
  }

  const error = document.getElementById("requestError");

  if (error) {
    error.hidden = true;
  }

  toggleRequestVehicleFields();
  openModal("requestModal");
}

function toggleRequestVehicleFields() {
  const mode = document.getElementById("requestMode")?.value || "existing";
  const isNew = mode === "new";

  const toggle = (id, visible) => {
    const element = document.getElementById(id);

    if (element) {
      element.hidden = !visible;
    }
  };

  toggle("existingVehicleGroup", !isNew);
  toggle("newVehicleGroup", isNew);
  toggle("newJenisGroup", isNew);
  toggle("newMerkGroup", isNew);
}

function submitServiceRequest(event) {
  event.preventDefault();

  const error = document.getElementById("requestError");
  const customer = getCurrentCustomer();

  const showError = (message) => {
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
  };

  if (!customer) {
    showError("Sesi login berakhir. Silakan masuk kembali.");
    return;
  }

  const mode = document.getElementById("requestMode")?.value || "existing";
  const keluhan = document.getElementById("requestKeluhan").value.trim();
  const tanggal =
    document.getElementById("requestTanggal").value ||
    new Date().toISOString().slice(0, 10);

  if (!keluhan) {
    showError("Tuliskan keluhan kendaraan Anda.");
    return;
  }

  const kendaraan = getKendaraan();

  let polisi = "";
  let jenis = "";
  let merk = "";

  if (mode === "new") {
    polisi = document
      .getElementById("requestPolisi")
      .value.trim()
      .toUpperCase();
    jenis = document.getElementById("requestJenis").value;
    merk = document.getElementById("requestMerk").value.trim();

    if (!polisi || !merk) {
      showError("No. polisi dan merk kendaraan wajib diisi.");
      return;
    }

    const sudahAda = kendaraan.some(
      (item) =>
        String(item.polisi || "").toUpperCase() === polisi &&
        Number(item.pelangganId) === Number(customer.id),
    );

    if (sudahAda) {
      showError("No. polisi tersebut sudah terdaftar pada akun Anda.");
      return;
    }
  } else {
    polisi = document.getElementById("requestVehicle").value;

    if (!polisi) {
      showError("Pilih kendaraan terlebih dahulu.");
      return;
    }

    const asal = kendaraan.find(
      (item) =>
        String(item.polisi || "").toUpperCase() ===
          String(polisi).toUpperCase() &&
        Number(item.pelangganId) === Number(customer.id),
    );

    jenis = asal?.jenis || "";
    merk = asal?.merk || "";
  }

  const record = {
    id: nextNumericId(kendaraan),
    kode: nextKode("kendaraan", kendaraan),
    polisi,
    jenis,
    merk,
    pelanggan: customer.nama,
    pelangganId: customer.id,
    keluhan,
    status: "Menunggu",
    mekanikId: null,
    mekanik: "",
    tanggalService: tanggal,
    biayaJasa: 0,
    spareparts: [],
    pembayaran: "Belum Lunas",
    requestedBy: "customer",
  };

  kendaraan.push(record);
  saveKendaraan(kendaraan);

  closeModal("requestModal");
  document.getElementById("requestForm").reset();

  showPageNotice(
    "Permintaan service terkirim. Bengkel akan segera menghubungi Anda.",
    "success",
  );

  renderVehicleCards();
  renderCustomerServiceTable();
  renderCustomerHistoryTable();
}

/* =========================================
   SERVICE SAYA
   ========================================= */

function initCustomerService() {
  const table = document.getElementById("customerServiceTable");

  if (!table) {
    return;
  }

  renderCustomerServiceTable();

  document
    .getElementById("searchService")
    ?.addEventListener("input", renderCustomerServiceTable);

  document
    .getElementById("filterServiceStatus")
    ?.addEventListener("change", renderCustomerServiceTable);

  document
    .getElementById("sortService")
    ?.addEventListener("change", renderCustomerServiceTable);
}

function renderCustomerServiceTable() {
  const table = document.getElementById("customerServiceTable");

  if (!table) {
    return;
  }

  const vehicles = getCustomerVehicles();

  const keyword = String(document.getElementById("searchService")?.value || "")
    .toLowerCase()
    .trim();

  const statusFilter =
    document.getElementById("filterServiceStatus")?.value || "";

  const sort = getSortValue("sortService");

  const data = vehicles
    .filter((item) => {
      if (statusFilter && item.status !== statusFilter) {
        return false;
      }

      return [
        item.polisi,
        item.keluhan,
        item.status,
        getMekanikNama(item.mekanikId),
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(keyword),
      );
    })
    .map((item) => ({ ...item, total: getServiceTotal(item) }));

  const sorted = sortRows(data, sort.key, sort.direction);

  setText("statTotalService", vehicles.length);
  setText(
    "statMenunggu",
    vehicles.filter((item) => item.status === "Menunggu").length,
  );
  setText(
    "statDikerjakan",
    vehicles.filter((item) => item.status === "Dikerjakan").length,
  );
  setText(
    "statQC",
    vehicles.filter((item) => item.status === "Quality Check").length,
  );

  if (!sorted.length) {
    table.innerHTML = `
      <tr class="empty-row">
        <td colspan="9">Belum ada data service.</td>
      </tr>
    `;
    setText("customerServiceInfo", "Tidak ada data");
    return;
  }

  table.innerHTML = sorted
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td><span class="cell-id">${escapeHTML(getKode("kendaraan", item))}</span></td>
          <td><strong>${escapeHTML(item.polisi)}</strong></td>
          <td>${escapeHTML(item.keluhan || "-")}</td>
          <td>${escapeHTML(getMekanikNama(item.mekanikId))}</td>
          <td>${escapeHTML(item.tanggalService || "-")}</td>
          <td>
            <span class="badge ${getStatusClass(item.status)}">
              ${escapeHTML(item.status || "-")}
            </span>
          </td>
          <td>${formatRupiah(getServiceTotal(item))}</td>
          <td>
            <button
              type="button"
              class="action-btn"
              data-service-detail="${item.id}"
            >
              Detail
            </button>
          </td>
        </tr>
      `,
    )
    .join("");

  table.querySelectorAll("[data-service-detail]").forEach((button) => {
    button.addEventListener("click", () =>
      showServiceDetail(button.dataset.serviceDetail),
    );
  });

  setText(
    "customerServiceInfo",
    `Menampilkan ${sorted.length} dari ${vehicles.length} service`,
  );
}

function showServiceDetail(id) {
  const item = getCustomerVehicles().find(
    (vehicle) => Number(vehicle.id) === Number(id),
  );

  if (!item) {
    return;
  }

  const steps = document.getElementById("serviceDetailSteps");
  const content = document.getElementById("serviceDetailContent");

  if (steps) {
    steps.innerHTML = `<div class="status-steps">${buildServiceSteps(item.status)}</div>`;
  }

  if (content) {
    content.innerHTML = `
      <div class="detail-item">
        <span class="detail-label">No. Polisi</span>
        <span class="detail-value">${escapeHTML(item.polisi)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Merk / Jenis</span>
        <span class="detail-value">
          ${escapeHTML(item.merk || "-")} — ${escapeHTML(item.jenis || "-")}
        </span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Keluhan</span>
        <span class="detail-value">${escapeHTML(item.keluhan || "-")}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Mekanik</span>
        <span class="detail-value">${escapeHTML(getMekanikNama(item.mekanikId))}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Tanggal Service</span>
        <span class="detail-value">${escapeHTML(item.tanggalService || "-")}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Status</span>
        <span class="detail-value">${escapeHTML(item.status || "-")}</span>
      </div>
      <div class="detail-item full">
        <span class="detail-label">Perkiraan Biaya</span>
        <span class="detail-value">${formatRupiah(getServiceTotal(item))}</span>
      </div>
    `;
  }

  openModal("serviceDetailModal");
}

/* =========================================
   RIWAYAT SERVICE & TAGIHAN
   ========================================= */

function initCustomerHistory() {
  const table = document.getElementById("customerRiwayatTable");

  if (!table) {
    return;
  }

  renderCustomerHistoryTable();

  document
    .getElementById("searchRiwayat")
    ?.addEventListener("input", () => renderCustomerHistoryTable(1));

  document
    .getElementById("filterRiwayatStatus")
    ?.addEventListener("change", () => renderCustomerHistoryTable(1));

  document
    .getElementById("sortRiwayat")
    ?.addEventListener("change", () => renderCustomerHistoryTable(1));
}

let customerHistoryPage = 1;

function renderCustomerHistoryTable(page = 1) {
  const table = document.getElementById("customerRiwayatTable");

  if (!table) {
    return;
  }

  customerHistoryPage = page;

  const vehicles = getCustomerVehicles();
  const selesai = vehicles.filter((item) => item.status === "Selesai");

  const keyword = String(document.getElementById("searchRiwayat")?.value || "")
    .toLowerCase()
    .trim();

  const paymentFilter =
    document.getElementById("filterRiwayatStatus")?.value || "";

  const sort = getSortValue("sortRiwayat");

  const data = selesai
    .filter((item) => {
      const pembayaran = item.pembayaran || "Belum Lunas";

      if (paymentFilter && pembayaran !== paymentFilter) {
        return false;
      }

      return [
        item.kode,
        item.polisi,
        item.keluhan,
        getMekanikNama(item.mekanikId),
      ].some(
        (value) =>
          String(value || "")
            .toLowerCase()
            .includes(keyword),
      );
    })
    .map((item) => ({ ...item, total: getServiceTotal(item) }));

  const sorted = sortRows(data, sort.key, sort.direction);

  const totalBelanja = selesai.reduce(
    (sum, item) => sum + getServiceTotal(item),
    0,
  );

  const belumLunas = selesai
    .filter((item) => (item.pembayaran || "Belum Lunas") !== "Lunas")
    .reduce((sum, item) => sum + getServiceTotal(item), 0);

  setText("statRiwayat", selesai.length);
  setText("statTotalBelanja", formatRupiah(totalBelanja));
  setText("statBelumLunas", formatRupiah(belumLunas));
  setText(
    "statServiceTerakhir",
    selesai.length ? selesai[0].tanggalService || "-" : "-",
  );

  if (!sorted.length) {
    table.innerHTML = `
      <tr class="empty-row">
        <td colspan="10">Belum ada service yang selesai.</td>
      </tr>
    `;
    setText("customerRiwayatInfo", "Tidak ada riwayat");
    renderTablePagination("customerRiwayatPagination", 1, 1, () => {});
    return;
  }

  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));

  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;

  const start = (page - 1) * perPage;
  const dataHalaman = sorted.slice(start, start + perPage);

  table.innerHTML = dataHalaman
    .map((item, index) => {
      const review = getReviewByServiceId(item.id);

      return `
        <tr>
          <td>${start + index + 1}</td>
          <td><span class="cell-id">${escapeHTML(getKode("kendaraan", item))}</span></td>
          <td>${escapeHTML(item.tanggalService || "-")}</td>
          <td><strong>${escapeHTML(item.polisi)}</strong></td>
          <td>${escapeHTML(item.keluhan || "-")}</td>
          <td>${escapeHTML(getMekanikNama(item.mekanikId))}</td>
          <td><strong>${formatRupiah(getServiceTotal(item))}</strong></td>
          <td>
            <span class="badge ${
              (item.pembayaran || "Belum Lunas") === "Lunas"
                ? "done"
                : "waiting"
            }">
              ${escapeHTML(item.pembayaran || "Belum Lunas")}
            </span>
          </td>
          <td>${
            review
              ? buildStarsHTML(review.rating, { small: true })
              : '<span class="rating-empty">Belum dinilai</span>'
          }</td>
          <td class="aksi-cell">
            ${
              !review && item.status === "Selesai"
                ? `<button
                    type="button"
                    class="action-btn review-btn"
                    data-riwayat-review="${item.id}"
                  >
                    <i class="fa-solid fa-star" aria-hidden="true"></i>
                    Beri Ulasan
                  </button>`
                : ""
            }
            <button
              type="button"
              class="action-btn"
              data-riwayat-detail="${item.id}"
            >
              Detail
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  table.querySelectorAll("[data-riwayat-detail]").forEach((button) => {
    button.addEventListener("click", () =>
      showCustomerServiceDetail(button.dataset.riwayatDetail),
    );
  });

  table.querySelectorAll("[data-riwayat-review]").forEach((button) => {
    button.addEventListener("click", () =>
      openCustomerReviewForm(button.dataset.riwayatReview),
    );
  });

  setText(
    "customerRiwayatInfo",
    `Menampilkan ${start + 1}-${Math.min(
      start + perPage,
      sorted.length,
    )} dari ${selesai.length} service selesai`,
  );

  renderTablePagination("customerRiwayatPagination", page, totalPages, (next) =>
    renderCustomerHistoryTable(next),
  );
}

/* Detail service: data lengkap, stepper status, dan rincian tagihan.
   Dipakai halaman Riwayat dan halaman Keuangan customer. */
function showCustomerServiceDetail(id) {
  const item = getCustomerVehicles().find(
    (vehicle) => Number(vehicle.id) === Number(id),
  );

  if (!item) {
    return;
  }

  const content = document.getElementById("riwayatDetailContent");
  const steps = document.getElementById("riwayatDetailSteps");
  const invoice = document.getElementById("riwayatDetailInvoice");

  if (content) {
    content.innerHTML = buildServiceDetailGrid(item, {
      customerLabel: "Pemilik",
      showCustomerContact: false,
    });
  }

  if (steps) {
    steps.innerHTML = `<div class="status-steps">${buildServiceSteps(
      item.status,
    )}</div>`;
  }

  if (invoice) {
    invoice.innerHTML = buildServiceInvoice(item);
  }

  const overhaul = document.getElementById("riwayatOverhaul");

  if (overhaul) {
    overhaul.innerHTML = buildServiceOverhaul(item);
  }

  renderCustomerReviewSection(item);

  openModal("riwayatDetailModal");
}

/* =========================================
   ULASAN / RATING SERVICE
   Customer menilai service yang sudah selesai.
   ========================================= */

var activeReviewServiceId = null;
var activeReviewRating = 0;

function renderCustomerReviewSection(item) {
  const section = document.getElementById("customerReviewSection");

  if (!section) {
    return;
  }

  /* Hanya service selesai yang boleh dinilai. */
  if (item.status !== "Selesai") {
    section.innerHTML =
      '<p class="review-hint">Ulasan bisa diberikan setelah service selesai.</p>';
    return;
  }

  const review = getReviewByServiceId(item.id);

  activeReviewServiceId = item.id;
  activeReviewRating = review ? Number(review.rating) : 0;

  const tanggalUlasan = review?.createdAt
    ? String(review.createdAt).slice(0, 10)
    : "";

  section.innerHTML = `
    <div class="review-box">
      <p class="review-hint">
        ${
          review
            ? `Anda menilai service ini <strong>${escapeHTML(
                tanggalUlasan,
              )}</strong>. Anda tetap bisa memperbarui ulasan.`
            : "Beri rating 1–5 bintang dan ceritakan pengalaman Anda."
        }
      </p>
      <div
        class="star-input"
        id="reviewStarInput"
        role="group"
        aria-label="Pilih rating 1 sampai 5 bintang"
      >
        ${[1, 2, 3, 4, 5]
          .map(
            (value) => `
          <button
            type="button"
            class="star-btn${value <= activeReviewRating ? " active" : ""}"
            data-star="${value}"
            aria-label="Rating ${value} — ${getRatingLabel(value)}"
            aria-pressed="${value <= activeReviewRating}"
          >
            <i class="fa-solid fa-star" aria-hidden="true"></i>
          </button>`,
          )
          .join("")}
        <span class="star-label" id="reviewRatingLabel">${escapeHTML(
          getRatingLabel(activeReviewRating),
        )}</span>
      </div>
      <label class="review-label" for="reviewComment">Komentar (opsional)</label>
      <textarea
        id="reviewComment"
        class="form-control"
        rows="3"
        maxlength="500"
        placeholder="Contoh: servis cepat, mekanik ramah, harga wajar..."
      >${escapeHTML(review?.komentar || "")}</textarea>
      <div class="review-actions">
        <span class="review-current">${
          review ? `Ulasan Anda: ${buildStarsHTML(review.rating, { small: true })}` : "Belum ada ulasan untuk service ini."
        }</span>
        <button type="button" class="btn btn-primary" id="btnSaveReview">
          <i class="fa-solid fa-star" aria-hidden="true"></i>
          ${review ? "Perbarui Ulasan" : "Kirim Ulasan"}
        </button>
      </div>
    </div>
  `;

  /* Bintang hanya berubah warna saat DIKLIK (bukan saat kursor
     lewat) — warna kuning = pilihan yang benar-benar Anda ambil. */
  section.querySelectorAll(".star-btn").forEach((button) => {
    button.addEventListener("click", () => {
      activeReviewRating = Number(button.dataset.star);
      paintReviewStars(activeReviewRating);
      setText("reviewRatingLabel", getRatingLabel(activeReviewRating));
    });
  });

  section
    .querySelector("#btnSaveReview")
    ?.addEventListener("click", saveCustomerReview);
}

/* Warnai bintang input: semua bintang ≤ value menjadi kuning. */
function paintReviewStars(value) {
  const section = document.getElementById("customerReviewSection");

  if (!section) return;

  section.querySelectorAll(".star-btn").forEach((star) => {
    const aktif = Number(star.dataset.star) <= Number(value);
    star.classList.toggle("active", aktif);
  });
}

/* Tombol "Beri Ulasan" di tabel: buka modal + langsung ke form ulasan. */
function openCustomerReviewForm(id) {
  const item = getCustomerVehicles().find(
    (vehicle) => Number(vehicle.id) === Number(id),
  );

  if (!item) return;

  showCustomerServiceDetail(id);

  window.requestAnimationFrame(() => {
    document
      .getElementById("customerReviewSection")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

/* Simpan ulasan (baru / pembaruan) untuk service yang sedang dibuka. */
function saveCustomerReview() {
  const item = getCustomerVehicles().find(
    (vehicle) => Number(vehicle.id) === Number(activeReviewServiceId),
  );

  if (!item) return;

  if (!activeReviewRating) {
    showPageNotice("Pilih rating bintang 1–5 terlebih dahulu.", "error");
    return;
  }

  const profile = getCurrentProfile();
  const customerId = profile?.customer_id
    ? Number(profile.customer_id)
    : Number(item.pelangganId);

  if (isSupabaseMode() && !customerId) {
    showPageNotice(
      "Akun Anda belum terhubung ke data customer. Hubungi bengkel.",
      "error",
    );
    return;
  }

  const komentar = String(
    document.getElementById("reviewComment")?.value || "",
  ).trim();

  const existing = getReviewByServiceId(item.id);

  const entry = {
    id: existing ? existing.id : nextNumericId(getReviews()),
    kode: existing?.kode || nextKode("reviews", getReviews()),
    serviceId: item.id,
    customerId: customerId || null,
    rating: activeReviewRating,
    komentar,
    createdAt: existing?.createdAt || new Date().toISOString(),
  };

  const lain = getReviews().filter(
    (review) => Number(review.serviceId) !== Number(item.id),
  );

  saveReviews([...lain, entry]);

  showPageNotice(
    existing
      ? "Ulasan Anda telah diperbarui. Terima kasih!"
      : "Terima kasih atas ulasan Anda!",
    "success",
  );

  addLog(
    existing ? "Ubah" : "Tambah",
    "Ulasan",
    `Rating ${activeReviewRating} untuk service ${item.polisi}`,
    getKode("kendaraan", item),
  );

  /* Perbarui tampilan tabel & isi modal. */
  renderCustomerHistoryTable(customerHistoryPage);
  renderCustomerReviewSection(item);
}

/* =========================================
   KEUANGAN SAYA
   Ringkasan seluruh tagihan service customer:
   total pengeluaran, yang sudah lunas, dan yang
   masih outstanding (belum lunas).
   ========================================= */

function getCustomerFinanceYears() {
  const years = new Set(
    getCustomerVehicles()
      .filter(
        (item) =>
          item.status === "Selesai" &&
          String(item.tanggalService || "").length >= 4,
      )
      .map((item) => String(item.tanggalService).slice(0, 4)),
  );

  if (!years.size) years.add(String(new Date().getFullYear()));

  return [...years].sort().reverse();
}

function initCustomerFinance() {
  const table = document.getElementById("customerKeuanganTable");

  if (!table) {
    return;
  }

  const yearSelect = document.getElementById("filterTahunKeuangan");

  if (yearSelect) {
    const previous = yearSelect.value;
    const years = getCustomerFinanceYears();

    yearSelect.innerHTML = years
      .map((tahun) => `<option value="${tahun}">${tahun}</option>`)
      .join("");

    yearSelect.value = years.includes(previous) ? previous : years[0];

    yearSelect.addEventListener("change", () => renderCustomerFinanceTable(1));
  }

  document
    .getElementById("filterStatusKeuangan")
    ?.addEventListener("change", () => renderCustomerFinanceTable(1));

  document
    .getElementById("sortKeuangan")
    ?.addEventListener("change", () => renderCustomerFinanceTable(1));

  document
    .getElementById("searchKeuangan")
    ?.addEventListener("input", () => renderCustomerFinanceTable(1));

  renderCustomerFinanceTable();
}

function renderCustomerFinanceTable(page = 1) {
  const table = document.getElementById("customerKeuanganTable");

  if (!table) {
    return;
  }

  const selesai = getCustomerVehicles().filter(
    (item) => item.status === "Selesai",
  );

  const tahun = document.getElementById("filterTahunKeuangan")?.value || "";
  const statusFilter =
    document.getElementById("filterStatusKeuangan")?.value || "";
  const keyword = String(
    document.getElementById("searchKeuangan")?.value || "",
  )
    .toLowerCase()
    .trim();
  const sort = getSortValue("sortKeuangan");

  const data = selesai
    .filter((item) => {
      if (tahun && String(item.tanggalService || "").slice(0, 4) !== tahun) {
        return false;
      }

      const pembayaran = item.pembayaran || "Belum Lunas";

      if (statusFilter && pembayaran !== statusFilter) {
        return false;
      }

      return [item.id, item.polisi, item.keluhan, getMekanikNama(item.mekanikId)]
        .some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(keyword),
        );
    })
    .map((item) => ({ ...item, total: getServiceTotal(item) }));

  const sorted = sortRows(data, sort.key, sort.direction);

  const totalTagihan = selesai.reduce(
    (sum, item) => sum + getServiceTotal(item),
    0,
  );

  const totalLunas = selesai
    .filter((item) => (item.pembayaran || "Belum Lunas") === "Lunas")
    .reduce((sum, item) => sum + getServiceTotal(item), 0);

  const totalBelumLunas = selesai
    .filter((item) => (item.pembayaran || "Belum Lunas") !== "Lunas")
    .reduce((sum, item) => sum + getServiceTotal(item), 0);

  setText("statTotalTagihan", formatRupiah(totalTagihan));
  setText("statTagihanLunas", formatRupiah(totalLunas));
  setText("statTagihanBelumLunas", formatRupiah(totalBelumLunas));
  setText("statJumlahTagihan", selesai.length);

  if (!sorted.length) {
    table.innerHTML = `
      <tr class="empty-row">
        <td colspan="9">Belum ada tagihan pada filter ini.</td>
      </tr>
    `;
    setText("customerKeuanganInfo", "Tidak ada data");
    renderTablePagination("customerKeuanganPagination", 1, 1, () => {});
    return;
  }

  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));

  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;

  const start = (page - 1) * perPage;
  const dataHalaman = sorted.slice(start, start + perPage);

  table.innerHTML = dataHalaman
    .map(
      (item, index) => `
        <tr>
          <td>${start + index + 1}</td>
          <td><span class="cell-id">${escapeHTML(getKode("kendaraan", item))}</span></td>
          <td>${escapeHTML(item.tanggalService || "-")}</td>
          <td><strong>${escapeHTML(item.polisi)}</strong></td>
          <td>${escapeHTML(item.keluhan || "-")}</td>
          <td>${escapeHTML(getMekanikNama(item.mekanikId))}</td>
          <td><strong>${formatRupiah(getServiceTotal(item))}</strong></td>
          <td>
            <span class="badge ${
              (item.pembayaran || "Belum Lunas") === "Lunas"
                ? "done"
                : "waiting"
            }">
              ${escapeHTML(item.pembayaran || "Belum Lunas")}
            </span>
          </td>
          <td>
            <button
              type="button"
              class="action-btn"
              data-riwayat-detail="${item.id}"
            >
              Detail
            </button>
          </td>
        </tr>
      `,
    )
    .join("");

  table.querySelectorAll("[data-riwayat-detail]").forEach((button) => {
    button.addEventListener("click", () =>
      showCustomerServiceDetail(button.dataset.riwayatDetail),
    );
  });

  const total = sorted.reduce((sum, item) => sum + getServiceTotal(item), 0);

  setText(
    "customerKeuanganInfo",
    `Menampilkan ${start + 1}-${Math.min(
      start + perPage,
      sorted.length,
    )} dari ${selesai.length} tagihan • Total ${formatRupiah(total)}`,
  );

  renderTablePagination("customerKeuanganPagination", page, totalPages, (next) =>
    renderCustomerFinanceTable(next),
  );
}

/* =========================================
   PROFIL
   ========================================= */

function initCustomerProfile() {
  const form = document.getElementById("profileForm");

  if (!form) {
    return;
  }

  const customer = getCurrentCustomer();

  if (!customer) {
    return;
  }

  document.getElementById("profileNama").value = customer.nama || "";
  document.getElementById("profileTelepon").value = customer.telepon || "";
  document.getElementById("profileEmail").value = customer.email || "";
  document.getElementById("profileAlamat").value = customer.alamat || "";
  document.getElementById("profileCatatan").value = customer.catatan || "";
  document.getElementById("profileName").textContent = customer.nama;
  document.getElementById("profileAvatar").textContent = customerInitials(
    customer.nama,
  );
  document.getElementById("profileMeta").innerHTML = `
    <i class="fa-solid fa-envelope" aria-hidden="true"></i>
    ${escapeHTML(customer.email || "-")} ·
    <i class="fa-solid fa-phone" aria-hidden="true"></i>
    ${escapeHTML(customer.telepon || "-")} ·
    <i class="fa-solid fa-car" aria-hidden="true"></i>
    ${getCustomerVehicles().length} kendaraan
  `;

  form.addEventListener("submit", saveProfile);

  document
    .getElementById("passwordForm")
    ?.addEventListener("submit", changePassword);
}

async function saveProfile(event) {
  event.preventDefault();

  const error = document.getElementById("profileError");
  const customer = getCurrentCustomer();

  const showError = (message) => {
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
  };

  if (!customer) {
    showError("Sesi login berakhir. Silakan masuk kembali.");
    return;
  }

  const nama = document.getElementById("profileNama").value.trim();
  const telepon = document.getElementById("profileTelepon").value.trim();
  const email = document.getElementById("profileEmail").value.trim();
  const alamat = document.getElementById("profileAlamat").value.trim();
  const catatan = document.getElementById("profileCatatan").value.trim();

  if (!nama || !telepon || !email) {
    showError("Nama, no. HP, dan email wajib diisi.");
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError("Masukkan alamat email yang valid.");
    return;
  }

  const customers = getCustomers();
  const index = customers.findIndex(
    (item) => Number(item.id) === Number(customer.id),
  );

  if (index === -1) {
    showError("Data customer tidak ditemukan.");
    return;
  }

  /* Email dipakai untuk login, pastikan tidak bentrok. */

  const emailBentrok = customers.some(
    (item) =>
      Number(item.id) !== Number(customer.id) &&
      String(item.email || "").toLowerCase() === email.toLowerCase(),
  );

  if (emailBentrok) {
    showError("Email tersebut sudah dipakai customer lain.");
    return;
  }

  /* Email di sini = email LOGIN. Di mode Supabase tabel customers
     tidak otoritatif — yang menentukan email masuk adalah Supabase
     Auth. Tanpa langkah ini pengguna bisa mengganti email di Profil,
     semuanya terlihat tersimpan, tetapi email lama tetap dipakai untuk
     masuk. */

  const emailSebelum = String(customers[index].email || "").toLowerCase();
  const emailBerubah = emailSebelum !== email.toLowerCase();
  let emailLoginMenungguKonfirmasi = false;

  if (emailBerubah && typeof Auth !== "undefined" && isSupabaseMode()) {
    const hasil = await Auth.updateEmail(email);

    if (!hasil.ok) {
      showError(
        hasil.error || "Gagal mengubah email login. Data profil tidak disimpan.",
      );
      return;
    }

    /* applied = false -> Supabase mengaktifkan "secure email change",
       email masuk baru berlaku setelah tautan konfirmasi dibuka. */
    emailLoginMenungguKonfirmasi = hasil.applied === false;
  }

  customers[index] = {
    ...customers[index],
    nama,
    telepon,
    email,
    alamat,
    catatan,
  };

  saveCustomers(customers);

  /* Sinkronkan email akun login. */

  const accounts = getCustomerAccounts();
  const accountIndex = accounts.findIndex(
    (item) =>
      Number(item.id) === Number(customer.id) ||
      Number(item.customerId) === Number(customer.id),
  );

  if (accountIndex !== -1) {
    accounts[accountIndex] = {
      ...accounts[accountIndex],
      nama,
      email,
    };
    saveCustomerAccounts(accounts);
  }

  /* Perbarui data kendaraan agar nama & tampilan ikut berubah. */

  const kendaraan = getKendaraan();
  let kendaraanChanged = false;

  kendaraan.forEach((item) => {
    if (Number(item.pelangganId) === Number(customer.id)) {
      item.pelanggan = nama;
      kendaraanChanged = true;
    }
  });

  if (kendaraanChanged) {
    saveKendaraan(kendaraan);
  }

  /* Perbarui sesi & profil agar nama pada topbar ikut berubah. */

  setCurrentProfile({ nama, email });
  updateCustomerSession({ nama, email });

  if (typeof dbUpdateProfile === "function") {
    const hasil = await dbUpdateProfile({ nama, telepon, email, alamat });

    if (!hasil.ok) {
      showError(
        "Data customer tersimpan, tetapi profil akun gagal disimpan ke server.",
      );
      return;
    }
  }

  if (error) {
    error.hidden = true;
  }

  showPageNotice(
    emailLoginMenungguKonfirmasi
      ? "Profil diperbarui. Email login baru akan aktif setelah tautan konfirmasi di inbox email baru dibuka."
      : "Profil berhasil diperbarui.",
    "success",
  );

  document.getElementById("profileName").textContent = nama;
  document.getElementById("profileAvatar").textContent = customerInitials(nama);
  initCustomerHeader();
}

async function changePassword(event) {
  event.preventDefault();

  const error = document.getElementById("passwordError");
  const customer = getCurrentCustomer();

  const showError = (message) => {
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
  };

  if (!customer) {
    showError("Sesi login berakhir. Silakan masuk kembali.");
    return;
  }

  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("newPasswordConfirm").value;

  if (!currentPassword || !newPassword) {
    showError("Password saat ini dan password baru wajib diisi.");
    return;
  }

  if (newPassword.length < 6) {
    showError("Password baru minimal 6 karakter.");
    return;
  }

  if (newPassword !== confirmPassword) {
    showError("Konfirmasi password tidak sama.");
    return;
  }

  if (newPassword === currentPassword) {
    showError("Password baru tidak boleh sama dengan password saat ini.");
    return;
  }

  /* WAJIB: cek dulu password lama. Sebelumnya mode Supabase langsung
     memanggil Auth.updatePassword() tanpa pernah membaca kolom
     "Password Saat Ini", jadi kolom itu cuma hiasan dan password apa
     pun diterima. */

  if (typeof Auth !== "undefined" && typeof Auth.verifyPassword === "function") {
    const cek = await Auth.verifyPassword(currentPassword);

    if (!cek.ok) {
      showError(cek.error || "Password saat ini salah.");
      return;
    }
  }

  /* Mode Supabase: password diatur lewat Supabase Auth. */

  if (typeof Auth !== "undefined" && isSupabaseMode()) {
    const result = await Auth.updatePassword(newPassword);

    if (!result.ok) {
      showError(result.error || "Gagal memperbarui password.");
      return;
    }

    if (error) {
      error.hidden = true;
    }

    event.target.reset();
    showPageNotice("Password berhasil diperbarui.", "success");
    return;
  }

  /* Mode lokal: password disimpan di localStorage. */

  const accounts = getCustomerAccounts();
  const index = accounts.findIndex(
    (item) => Number(item.customerId) === Number(customer.id),
  );

  if (index === -1) {
    showError("Akun login tidak ditemukan.");
    return;
  }

  if (accounts[index].password !== currentPassword) {
    showError("Password saat ini salah.");
    return;
  }

  accounts[index] = { ...accounts[index], password: newPassword };
  saveCustomerAccounts(accounts);

  if (error) {
    error.hidden = true;
  }

  event.target.reset();
  showPageNotice("Password berhasil diperbarui.", "success");
}

/* =========================================
   PENGATURAN
   ========================================= */

function initCustomerSettings() {
  const container = document.getElementById("themeOptions");

  if (!container) {
    return;
  }

  /* Posisi aktif kartu tema diisi oleh syncThemeOptions() (dipanggil
     dari updateThemeButtons) — satu sumber kebenaran untuk semua
     pemicu perubahan tema. */
  syncThemeOptions();

  container.querySelectorAll("[data-theme-value]").forEach((option) => {
    option.addEventListener("click", () => {
      const selected = option.dataset.themeValue;

      if (selected === "system") {
        localStorage.removeItem("workshop_theme");
        const prefersDark =
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches;

        /* persist = false: jangan langsung menulis kembali kunci yang
           baru saja dihapus, kalau tidak "Ikuti Sistem" tidak pernah
           tersimpan. */
        applyTheme(prefersDark ? "dark" : "light", false);
      } else {
        applyTheme(selected);
      }

      /* updateThemeButtons() juga menyetel ulang kartu yang aktif di
         sini dan tombol header (aria-pressed/label/tooltip). */
      updateThemeButtons();
      showPageNotice("Tampilan berhasil diperbarui.", "success");
    });
  });

  /* Info akun */

  const customer = getCurrentCustomer();
  const info = document.getElementById("accountInfo");

  if (customer && info) {
    const session = getCustomerSession();

    info.innerHTML = `
      <div class="detail-item">
        <span class="detail-label">Nama</span>
        <span class="detail-value">${escapeHTML(customer.nama)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Email</span>
        <span class="detail-value">${escapeHTML(customer.email || "-")}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">No. HP</span>
        <span class="detail-value">${escapeHTML(customer.telepon || "-")}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Terdaftar sejak</span>
        <span class="detail-value">
          ${
            customer.registeredAt
              ? new Date(customer.registeredAt).toLocaleDateString("id-ID")
              : "-"
          }
        </span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Kendaraan</span>
        <span class="detail-value">
          ${customerVehiclesByPlate(getCustomerVehicles()).length} kendaraan
        </span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Login terakhir</span>
        <span class="detail-value">
          ${
            session?.loginAt
              ? new Date(session.loginAt).toLocaleString("id-ID")
              : "-"
          }
        </span>
      </div>
    `;
  }

  document.getElementById("btnRefreshData")?.addEventListener("click", () => {
    window.location.reload();
  });

  document
    .getElementById("btnLogoutPage")
    ?.addEventListener("click", function () {
      /* Lewati dialog konfirmasi global (js/global.js) dulu; fallback
         langsung kalau global.js gagal dimuat. */
      if (typeof confirmLogout === "function") {
        confirmLogout({ onConfirm: customerLogout });
      } else {
        customerLogout();
      }
    });
}

/* =========================================
   ENTRY POINT
   ----------------------------------------
   DIPANGGIL OLEH js/global.js SETELAH dbInit() + requireCustomerAuth()
   selesai. Jangan didaftarkan langsung ke DOMContentLoaded: listener
   global.js masih menunggu jaringan (mode Supabase), jadi profil belum
   terbentuk saat event berapi dan isCustomerLoggedIn() selalu false —
   akibatnya seluruh halaman customer tidak pernah ter-render. */

function initCustomerApp() {
  if (!isCustomerLoggedIn()) {
    return;
  }

  initCustomerHeader();

  if (document.getElementById("customerProgressCircle")) {
    initCustomerDashboard();
  }

  if (document.getElementById("vehicleCards")) {
    initCustomerVehicles();
  }

  if (document.getElementById("customerServiceTable")) {
    initCustomerService();
  }

  if (document.getElementById("customerRiwayatTable")) {
    initCustomerHistory();
  }

  if (document.getElementById("customerKeuanganTable")) {
    initCustomerFinance();
  }

  if (document.getElementById("profileForm")) {
    initCustomerProfile();
  }

  if (document.getElementById("themeOptions")) {
    initCustomerSettings();
  }
}
