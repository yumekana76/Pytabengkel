/* Riwayat diturunkan dari service kendaraan berstatus selesai. */

let riwayatPaymentFilter = "semua";

function renderRiwayatPage(search = "", page = 1) {
  const table = document.getElementById("riwayatTable");
  if (!table) return;

  const keyword = String(search).toLowerCase().trim();
  const bulanFilter =
    document.getElementById("filterBulanRiwayat")?.value || "";
  const sort = getSortValue("sortRiwayat");

  const semua = getKendaraan().filter((item) => item.status === "Selesai");

  /* Pisahkan data lunas dan belum lunas */
  const riwayat = semua.filter((item) => {
    if (
      bulanFilter &&
      String(item.tanggalService || "").slice(0, 7) !== bulanFilter
    )
      return false;

    const pembayaran = item.pembayaran || "Belum Lunas";

    if (
      riwayatPaymentFilter !== "semua" &&
      pembayaran !== riwayatPaymentFilter
    ) {
      return false;
    }

    return [
      item.kode,
      item.id,
      item.polisi,
      item.pelanggan,
      item.keluhan,
      getMekanikNama(item.mekanikId),
      pembayaran,
    ].some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(keyword),
    );
  });

  const withTotal = riwayat.map((item) => ({
    ...item,
    total: getServiceTotal(item),
  }));

  const sorted = sortRows(withTotal, sort.key, sort.direction);

  /* Hitung jumlah per status pembayaran */
  setText("countSemua", semua.length);
  setText(
    "countBelum",
    semua.filter((item) => (item.pembayaran || "Belum Lunas") !== "Lunas")
      .length,
  );
  setText(
    "countLunas",
    semua.filter((item) => (item.pembayaran || "Belum Lunas") === "Lunas")
      .length,
  );

  table.innerHTML = "";
  if (!sorted.length) {
    table.innerHTML =
      '<tr class="empty-row"><td colspan="10" style="text-align: center; padding: 30px;">Belum ada service yang selesai.</td></tr>';
    setText("riwayatInfo", "Tidak ada riwayat");
    renderTablePagination("riwayatPagination", 1, 1, () => {});
    return;
  }

  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));

  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;

  const start = (page - 1) * perPage;
  const dataHalaman = sorted.slice(start, start + perPage);

  dataHalaman.forEach((item, index) => {
    const pembayaran = item.pembayaran || "Belum Lunas";
    table.innerHTML += `
      <tr>
        <td>${start + index + 1}</td>
        <td><span class="cell-id">${escapeHTML(getKode("kendaraan", item))}</span></td>
        <td>${escapeHTML(item.tanggalService || "-")}</td>
        <td><strong>${escapeHTML(item.polisi)}</strong></td>
        <td>${escapeHTML(item.pelanggan)}</td>
        <td>${escapeHTML(item.keluhan)}</td>
        <td>${escapeHTML(getMekanikNama(item.mekanikId))}</td>
        <td><span class="badge ${pembayaran === "Lunas" ? "done" : "waiting"}">${escapeHTML(pembayaran)}</span></td>
        <td><strong>${formatRupiah(getServiceTotal(item))}</strong></td>
        <td>
          <button
            type="button"
            class="action-btn"
            data-riwayat-detail="${item.id}"
          >
            Detail
          </button>
        </td>
      </tr>`;
  });

  table.querySelectorAll("[data-riwayat-detail]").forEach((button) => {
    button.addEventListener("click", () =>
      showRiwayatDetail(button.dataset.riwayatDetail),
    );
  });

  setText(
    "riwayatInfo",
    `Menampilkan ${start + 1}-${Math.min(
      start + perPage,
      sorted.length,
    )} dari ${sorted.length} riwayat service`,
  );

  renderTablePagination("riwayatPagination", page, totalPages, (next) =>
    renderRiwayatPage(search, next),
  );
}

/* DETAIL RIWAYAT */

var activeRiwayatId = null;

function showRiwayatDetail(id) {
  const item = getKendaraan().find((row) => Number(row.id) === Number(id));

  if (!item) return;

  activeRiwayatId = item.id;

  const content = document.getElementById("riwayatDetailContent");
  const steps = document.getElementById("riwayatDetailSteps");
  const invoice = document.getElementById("riwayatInvoice");

  if (content) {
    const ringkasan = getServiceRingkasan(item);

    content.innerHTML = buildServiceDetailGrid(item, {
      customerLabel: "Pelanggan",
      extraItems: [
        { label: "Biaya Jasa", value: formatRupiah(ringkasan.biayaJasa) },
        {
          label: "Subtotal Sparepart",
          value: formatRupiah(ringkasan.subtotalSparepart),
        },
        {
          label: "Jumlah Sparepart",
          value: `${ringkasan.jumlahSparepart} item`,
        },
        { label: "Total Tagihan", value: formatRupiah(ringkasan.total) },
        {
          label: "Sisa Tagihan",
          value: ringkasan.lunas
            ? '<span class="badge done">Lunas</span>'
            : formatRupiah(ringkasan.sisa),
        },
      ],
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

  const lunasButton = document.getElementById("btnLunaskanRiwayat");

  if (lunasButton) {
    lunasButton.hidden =
      item.status !== "Selesai" ||
      (item.pembayaran || "Belum Lunas") === "Lunas";
    lunasButton.title =
      item.status === "Selesai"
        ? "Tandai tagihan ini lunas"
        : "Service harus berstatus Selesai sebelum bisa dilunasi";
  }

  /* Invoice hanya boleh dicetak setelah service selesai. */
  const cetakButton = document.getElementById("btnCetakRiwayat");

  if (cetakButton) {
    cetakButton.hidden = item.status !== "Selesai";
    cetakButton.title =
      item.status === "Selesai"
        ? "Cetak invoice service"
        : "Invoice bisa dicetak setelah service selesai";
  }

  openModal("riwayatDetailModal");
}

/* Admin menandai tagihan lunas. */
function tandaiRiwayatLunas() {
  const item = getKendaraan().find(
    (row) => Number(row.id) === Number(activeRiwayatId),
  );

  if (!item) return;

  if (item.status !== "Selesai") {
    showPageNotice(
      "Tagihan hanya bisa dilunasi setelah status service Selesai.",
      "error",
    );
    return;
  }

  if (!setServicePaid(item.id)) {
    showPageNotice("Tagihan ini sudah berstatus lunas.", "error");
    return;
  }

  addLog(
    "Bayar",
    "Service",
    `Tagihan ${item.polisi} ditandai lunas`,
    getKode("kendaraan", item),
  );

  showRiwayatDetail(item.id);
  renderRiwayatPage(document.getElementById("searchRiwayat")?.value || "");
  updateRiwayatStats();

  showPageNotice("Tagihan ditandai lunas.", "success");
}

function printRiwayatDetail() {
  const item = getKendaraan().find(
    (row) => Number(row.id) === Number(activeRiwayatId),
  );

  if (!item) return;

  printServiceInvoice(item);
}

function updateRiwayatStats() {
  const riwayat = getKendaraan().filter((item) => item.status === "Selesai");
  /* Pendapatan hanya dihitung dari tagihan yang SUDAH LUNAS —
     service belum lunas tidak masuk angka pendapatan. */
  const pendapatan = riwayat
    .filter((item) => (item.pembayaran || "Belum Lunas") === "Lunas")
    .reduce((total, item) => total + getServiceTotal(item), 0);
  const pelanggan = new Set(
    riwayat.map((item) => item.pelangganId).filter(Boolean),
  );
  setText("totalRiwayat", riwayat.length);
  setText("pendapatanSelesai", formatRupiah(pendapatan));
  setText("pelangganSelesai", pelanggan.size);
}

/* =========================================
   RIWAYAT AKTIVITAS (AUDIT)
   ========================================= */

/* Badge warna untuk jenis aksi pada tabel riwayat aktivitas. */
const LOG_AKSI_BADGE = {
  Tambah: "done",
  Update: "working",
  Hapus: "danger",
  Bayar: "done",
};

function renderAktivitasTable() {
  const table = document.getElementById("logTable");
  if (!table) return;

  const aksiFilter = document.getElementById("filterLogAksi")?.value || "";
  const keyword = (document.getElementById("searchLog")?.value || "")
    .toLowerCase()
    .trim();

  const logs = getLogs()
    .filter((log) => !aksiFilter || log.aksi === aksiFilter)
    .filter((log) =>
      [log.aktor, log.role, log.aksi, log.entitas, log.kode, log.keterangan].some(
        (value) =>
          String(value || "")
            .toLowerCase()
            .includes(keyword),
      ),
    )
    .sort((a, b) => String(b.waktu || "").localeCompare(String(a.waktu || "")));

  table.innerHTML = "";
  if (!logs.length) {
    table.innerHTML =
      '<tr><td colspan="5" style="text-align: center; padding: 30px;">Tidak ada aktivitas tercatat.</td></tr>';
    setText("logInfo", "Tidak ada data");
    return;
  }

  table.innerHTML = logs
    .slice(0, 200)
    .map((log) => {
      const badgeClass = LOG_AKSI_BADGE[log.aksi] || "waiting";
      const waktu = new Date(log.waktu);
      const waktuTeks = Number.isNaN(waktu.getTime())
        ? String(log.waktu || "-")
        : waktu.toLocaleString("id-ID");
      return `
      <tr>
        <td>${escapeHTML(waktuTeks)}</td>
        <td><strong>${escapeHTML(log.aktor || "-")}</strong> <span style="color: var(--secondary); font-size: 12px;">(${escapeHTML(log.role || "-")})</span></td>
        <td><span class="badge ${badgeClass}">${escapeHTML(log.aksi || "-")}</span></td>
        <td>${escapeHTML(log.entitas || "-")}${log.kode ? ` <span class="cell-id">${escapeHTML(log.kode)}</span>` : ""}</td>
        <td>${escapeHTML(log.keterangan || "-")}</td>
      </tr>`;
    })
    .join("");

  setText(
    "logInfo",
    `Menampilkan ${Math.min(logs.length, 200)} dari ${getLogs().length} aktivitas`,
  );
}

function initAktivitasRiwayat() {
  if (!document.getElementById("logTable")) return;
  renderAktivitasTable();
  document
    .getElementById("filterLogAksi")
    ?.addEventListener("change", () => renderAktivitasTable());
  document
    .getElementById("searchLog")
    ?.addEventListener("input", () => renderAktivitasTable());
}

function initRiwayatPage() {
  const table = document.getElementById("riwayatTable");

  if (table) {
    if (typeof renderRiwayatPage === "function") renderRiwayatPage();
    if (typeof updateRiwayatStats === "function") updateRiwayatStats();
    document
      .getElementById("searchRiwayat")
      .addEventListener(
        "input",
        (event) =>
          typeof renderRiwayatPage === "function" &&
          renderRiwayatPage(event.target.value),
      );
    document
      .getElementById("filterBulanRiwayat")
      ?.addEventListener(
        "change",
        (event) =>
          typeof renderRiwayatPage === "function" &&
          renderRiwayatPage(document.getElementById("searchRiwayat").value),
      );
    document
      .getElementById("sortRiwayat")
      ?.addEventListener(
        "change",
        () =>
          typeof renderRiwayatPage === "function" &&
          renderRiwayatPage(document.getElementById("searchRiwayat").value),
      );

    document
      .getElementById("btnCetakRiwayat")
      ?.addEventListener("click", printRiwayatDetail);

    document
      .getElementById("btnLunaskanRiwayat")
      ?.addEventListener("click", tandaiRiwayatLunas);

    /* Tab lunas / belum lunas */
    document.querySelectorAll("#riwayatTabs .status-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll("#riwayatTabs .status-tab").forEach((item) => {
          item.classList.toggle("active", item === tab);
          item.setAttribute("aria-selected", item === tab ? "true" : "false");
        });

        riwayatPaymentFilter = tab.dataset.bayar || "semua";

        if (typeof renderRiwayatPage === "function") {
          renderRiwayatPage(
            document.getElementById("searchRiwayat")?.value || "",
          );
        }
      });
    });
  }

  initAktivitasRiwayat();
}
