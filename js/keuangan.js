var NAMA_BULAN_PENDEK = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

var NAMA_BULAN_PANJANG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

var keuanganPaymentFilter = "semua";

/* Label periode (bulan + tahun) dari tanggal service. */
function getPeriodeLabel(tanggal) {
  const bulan = Number(String(tanggal || "").slice(5, 7));
  const tahun = String(tanggal || "").slice(0, 4);

  if (!bulan || bulan < 1 || bulan > 12 || !tahun) {
    return tanggal || "-";
  }

  return `${NAMA_BULAN_PANJANG[bulan - 1]} ${tahun}`;
}

function getTahunTersedia() {
  const years = new Set(
    getKendaraan()
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

function getSelectedTahunKeuangan() {
  const fallback = getTahunTersedia()[0];
  return document.getElementById("filterTahunKeuangan")?.value || fallback;
}

function getSelesaiByTahun(tahun) {
  return getKendaraan().filter(
    (item) =>
      item.status === "Selesai" &&
      String(item.tanggalService || "").slice(0, 4) === String(tahun),
  );
}

function getMonthlyFinance(tahun) {
  const months = Array.from({ length: 12 }, (_, index) => ({
    bulan: index + 1,
    jumlah: 0,
    pendapatan: 0,
  }));
  /* Grafik pendapatan per bulan hanya menghitung service yang SUDAH
     LUNAS — tagihan belum lunas tidak dihitung sebagai pendapatan,
     sama dengan kartu "Pendapatan Lunas (Tahun Berjalan)". */
  getSelesaiByTahun(tahun)
    .filter((item) => (item.pembayaran || "Belum Lunas") === "Lunas")
    .forEach((item) => {
      const bulan = Number(String(item.tanggalService || "").slice(5, 7));
      if (bulan >= 1 && bulan <= 12) {
        months[bulan - 1].jumlah += 1;
        months[bulan - 1].pendapatan += getServiceTotal(item);
      }
    });
  return months;
}

function formatSingkatRp(value) {
  const number = Number(value) || 0;
  if (number >= 1000000) {
    const jt = number / 1000000;
    return `${Number(jt.toFixed(1))} jt`;
  }
  if (number >= 1000) {
    const rb = Math.round(number / 1000);
    return `${rb} rb`;
  }
  return String(number);
}

function updateKeuanganStats() {
  if (!document.getElementById("keuanganTable")) return;
  const tahun = getSelectedTahunKeuangan();
  const data = getSelesaiByTahun(tahun);

  /* Pendapatan & rata-rata hanya menghitung service yang SUDAH LUNAS. */
  const lunas = data.filter(
    (item) => (item.pembayaran || "Belum Lunas") === "Lunas",
  );
  const belumLunas = data.filter(
    (item) => (item.pembayaran || "Belum Lunas") !== "Lunas",
  );

  const pendapatan = lunas.reduce(
    (total, item) => total + getServiceTotal(item),
    0,
  );
  const nominalBelum = belumLunas.reduce(
    (total, item) => total + getServiceTotal(item),
    0,
  );

  setText("totalPendapatanTahun", formatRupiah(pendapatan));
  setText("totalServiceTahun", data.length);
  setText("rataRataBulanan", formatRupiah(Math.round(pendapatan / 12)));

  setText("nominalLunas", formatRupiah(pendapatan));
  setText("statLunasLabel", `Sudah Lunas — ${lunas.length} transaksi`);
  setText("nominalBelumLunas", formatRupiah(nominalBelum));
  setText(
    "countBelumLunas",
    `Belum Lunas — ${belumLunas.length} transaksi`,
  );

  /* Nominal yang lebih besar ditampilkan lebih dulu dengan angka
     lebih besar; yang lebih kecil jadi angka kecil. */
  const grid = document.getElementById("keuanganStats");
  const cardLunas = document.getElementById("cardLunas");
  const cardBelum = document.getElementById("cardBelumLunas");

  if (grid && cardLunas && cardBelum) {
    const besar = pendapatan >= nominalBelum ? cardLunas : cardBelum;
    const kecil = pendapatan >= nominalBelum ? cardBelum : cardLunas;

    /* Tukar posisi kedua kartu (tidak menggeser kartu lain). */
    grid.insertBefore(besar, kecil);

    besar.classList.remove("stat-card-small");
    kecil.classList.add("stat-card-small");
  }
}

/* Isi pilihan hari sesuai data pada tahun (dan bulan) terpilih. */
function populateFilterHari() {
  const select = document.getElementById("filterHariKeuangan");

  if (!select) return;

  const tahun = getSelectedTahunKeuangan();
  const bulan = document.getElementById("filterBulanKeuangan")?.value || "";
  const previous = select.value;

  const hariTersedia = new Set(
    getSelesaiByTahun(tahun)
      .filter(
        (item) =>
          !bulan || String(item.tanggalService || "").slice(5, 7) === bulan,
      )
      .map((item) => String(item.tanggalService || "").slice(8, 10))
      .filter(Boolean),
  );

  const hari = [...hariTersedia].sort();

  select.innerHTML =
    '<option value="">Semua Hari</option>' +
    hari
      .map(
        (item) =>
          `<option value="${escapeHTML(item)}">Tanggal ${escapeHTML(item)}</option>`,
      )
      .join("");

  select.value = hari.includes(previous) ? previous : "";
}

function renderKeuanganChart() {
  const chart = document.getElementById("keuanganChart");
  if (!chart) return;
  const tahun = getSelectedTahunKeuangan();
  const months = getMonthlyFinance(tahun);
  const bulanAktif =
    document.getElementById("filterBulanKeuangan")?.value || "";
  const max = Math.max(1, ...months.map((item) => item.pendapatan));

  chart.innerHTML = months
    .map((item) => {
      const kode = String(item.bulan).padStart(2, "0");
      const tinggi = Math.round(8 + (item.pendapatan / max) * 170);
      return `
      <button
        type="button"
        class="chart-bar${kode === bulanAktif ? " active" : ""}"
        data-bulan="${kode}"
        title="${NAMA_BULAN_PENDEK[item.bulan - 1]} ${tahun}: ${formatRupiah(item.pendapatan)} (${item.jumlah} service)"
        aria-label="Filter bulan ${NAMA_BULAN_PENDEK[item.bulan - 1]}"
      >
        <span class="chart-value">${formatSingkatRp(item.pendapatan)}</span>
        <span class="chart-column" style="height: ${tinggi}px;"></span>
        <span class="chart-month">${NAMA_BULAN_PENDEK[item.bulan - 1]}</span>
      </button>`;
    })
    .join("");

  chart.querySelectorAll("[data-bulan]").forEach((bar) => {
    bar.addEventListener("click", () => {
      const select = document.getElementById("filterBulanKeuangan");
      // Klik ulang bulan aktif = lepas filter (kembali Semua Bulan).
      select.value =
        select.value === bar.dataset.bulan ? "" : bar.dataset.bulan;
      renderKeuanganChart();
      if (typeof renderKeuanganTable === "function")
        renderKeuanganTable(document.getElementById("searchKeuangan").value);
    });
  });
}

function renderKeuanganTable(search = "", page = 1) {
  const table = document.getElementById("keuanganTable");
  if (!table) return;
  const tahun = getSelectedTahunKeuangan();
  const bulan = document.getElementById("filterBulanKeuangan")?.value || "";
  const hari = document.getElementById("filterHariKeuangan")?.value || "";
  const keyword = String(search).toLowerCase().trim();
  const sort = getSortValue("sortKeuangan");

  const semua = getSelesaiByTahun(tahun);

  const rows = semua
    .filter(
      (item) =>
        !bulan || String(item.tanggalService || "").slice(5, 7) === bulan,
    )
    .filter(
      (item) => !hari || String(item.tanggalService || "").slice(8, 10) === hari,
    )
    .filter((item) => {
      const pembayaran = item.pembayaran || "Belum Lunas";

      if (
        keuanganPaymentFilter !== "semua" &&
        pembayaran !== keuanganPaymentFilter
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
        item.tanggalService,
        pembayaran,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(keyword),
      );
    })
    .map((item) => ({ ...item, total: getServiceTotal(item) }));

  const sorted = sortRows(rows, sort.key, sort.direction);

  /* Jumlah per status pembayaran */
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

  if (!sorted.length) {
    table.innerHTML =
      '<tr class="empty-row"><td colspan="9" style="text-align: center; padding: 30px;">Belum ada transaksi pada filter ini.</td></tr>';
    setText("keuanganInfo", "Tidak ada data");
    renderTablePagination("keuanganPagination", 1, 1, () => {});
    return;
  }

  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));

  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;

  const start = (page - 1) * perPage;
  const dataHalaman = sorted.slice(start, start + perPage);

  const total = sorted.reduce((sum, item) => sum + getServiceTotal(item), 0);
  table.innerHTML = dataHalaman
    .map(
      (item, index) => `
      <tr>
        <td>${start + index + 1}</td>
        <td><span class="cell-id">${escapeHTML(getKode("kendaraan", item))}</span></td>
        <td>${escapeHTML(item.tanggalService || "-")}</td>
        <td><strong>${escapeHTML(item.polisi)}</strong></td>
        <td>${escapeHTML(item.pelanggan)}</td>
        <td>${escapeHTML(getMekanikNama(item.mekanikId))}</td>
        <td><span class="badge ${(item.pembayaran || "Belum Lunas") === "Lunas" ? "done" : "waiting"}">${escapeHTML(item.pembayaran || "Belum Lunas")}</span></td>
        <td><strong>${formatRupiah(getServiceTotal(item))}</strong></td>
        <td>
          <button
            type="button"
            class="action-btn"
            data-keuangan-detail="${item.id}"
          >
            Detail
          </button>
        </td>
      </tr>`,
    )
    .join("");

  table.querySelectorAll("[data-keuangan-detail]").forEach((button) => {
    button.addEventListener("click", () =>
      showKeuanganDetail(button.dataset.keuanganDetail),
    );
  });

  setText(
    "keuanganInfo",
    `Menampilkan ${start + 1}-${Math.min(
      start + perPage,
      sorted.length,
    )} dari ${sorted.length} transaksi • Total ${formatRupiah(total)}`,
  );

  renderTablePagination("keuanganPagination", page, totalPages, (next) =>
    renderKeuanganTable(search, next),
  );
}

/* DETAIL TRANSAKSI */

var activeKeuanganId = null;

function showKeuanganDetail(id) {
  const item = getKendaraan().find((row) => Number(row.id) === Number(id));

  if (!item) return;

  activeKeuanganId = item.id;

  const content = document.getElementById("keuanganDetailContent");
  const steps = document.getElementById("keuanganDetailSteps");
  const invoice = document.getElementById("keuanganInvoice");

  if (content) {
    const ringkasan = getServiceRingkasan(item);

    content.innerHTML = buildServiceDetailGrid(item, {
      customerLabel: "Pelanggan",
      extraItems: [
        { label: "Periode", value: escapeHTML(getPeriodeLabel(item.tanggalService)) },
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

  const overhaul = document.getElementById("keuanganOverhaul");

  if (overhaul) {
    overhaul.innerHTML = buildServiceOverhaul(item);
  }

  const lunasButton = document.getElementById("btnLunaskanKeuangan");

  if (lunasButton) {
    lunasButton.hidden = (item.pembayaran || "Belum Lunas") === "Lunas";
  }

  /* Invoice hanya boleh dicetak setelah service selesai. */
  const cetakButton = document.getElementById("btnCetakKeuangan");

  if (cetakButton) {
    cetakButton.hidden = item.status !== "Selesai";
    cetakButton.title =
      item.status === "Selesai"
        ? "Cetak invoice service"
        : "Invoice bisa dicetak setelah service selesai";
  }

  openModal("keuanganDetailModal");
}

/* Admin menandai transaksi lunas. */
function tandaiKeuanganLunas() {
  const item = getKendaraan().find(
    (row) => Number(row.id) === Number(activeKeuanganId),
  );

  if (!item) return;

  if (!setServicePaid(item.id)) {
    showPageNotice("Transaksi ini sudah berstatus lunas.", "error");
    return;
  }

  addLog(
    "Bayar",
    "Service",
    `Transaksi ${item.polisi} ditandai lunas`,
    getKode("kendaraan", item),
  );

  showKeuanganDetail(item.id);
  renderKeuanganTable(document.getElementById("searchKeuangan")?.value || "");
  updateKeuanganStats();

  showPageNotice("Transaksi ditandai lunas.", "success");
}

function printKeuanganDetail() {
  const item = getKendaraan().find(
    (row) => Number(row.id) === Number(activeKeuanganId),
  );

  if (!item) return;

  printServiceInvoice(item);
}

/* =========================================
   REKAP KEUANGAN (CETAK & CSV)
   ========================================= */

/* Data transaksi sesuai filter aktif (tahun, bulan, hari, status, pencarian). */
function getKeuanganFiltered(search = "") {
  const tahun = getSelectedTahunKeuangan();
  const bulan = document.getElementById("filterBulanKeuangan")?.value || "";
  const hari = document.getElementById("filterHariKeuangan")?.value || "";
  const keyword = String(search).toLowerCase().trim();

  return getSelesaiByTahun(tahun)
    .filter(
      (item) =>
        !bulan || String(item.tanggalService || "").slice(5, 7) === bulan,
    )
    .filter(
      (item) => !hari || String(item.tanggalService || "").slice(8, 10) === hari,
    )
    .filter((item) => {
      const pembayaran = item.pembayaran || "Belum Lunas";

      if (keuanganPaymentFilter !== "semua" && pembayaran !== keuanganPaymentFilter) {
        return false;
      }

      return [
        item.kode,
        item.id,
        item.polisi,
        item.pelanggan,
        item.keluhan,
        getMekanikNama(item.mekanikId),
        item.tanggalService,
        pembayaran,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(keyword),
      );
    })
    .map((item) => ({ ...item, total: getServiceTotal(item) }));
}

/* Dokumen rekap per bulan (siap cetak). */
function buildRekapKeuangan() {
  const tahun = getSelectedTahunKeuangan();
  const bulan = document.getElementById("filterBulanKeuangan")?.value || "";
  const hari = document.getElementById("filterHariKeuangan")?.value || "";
  const data = getKeuanganFiltered(
    document.getElementById("searchKeuangan")?.value || "",
  );

  const bulanDipilih = bulan
    ? Number(bulan)
    : Array.from({ length: 12 }, (_, index) => index + 1);

  const baris = bulanDipilih
    .map((nomorBulan) => {
      const rows = data.filter(
        (item) => Number(String(item.tanggalService || "").slice(5, 7)) === nomorBulan,
      );
      const lunas = rows.filter(
        (item) => (item.pembayaran || "Belum Lunas") === "Lunas",
      );
      const belum = rows.filter(
        (item) => (item.pembayaran || "Belum Lunas") !== "Lunas",
      );
      const pendapatan = lunas.reduce((sum, item) => sum + item.total, 0);
      const tagihan = belum.reduce((sum, item) => sum + item.total, 0);

      return `
        <tr>
          <td>${NAMA_BULAN_PENDEK[nomorBulan - 1]}</td>
          <td class="num">${rows.length}</td>
          <td class="num">${lunas.length}</td>
          <td class="num">${belum.length}</td>
          <td class="num">${formatRupiah(pendapatan)}</td>
          <td class="num">${formatRupiah(tagihan)}</td>
        </tr>
      `;
    })
    .join("");

  const totalLunas = data.filter(
    (item) => (item.pembayaran || "Belum Lunas") === "Lunas",
  );
  const totalBelum = data.filter(
    (item) => (item.pembayaran || "Belum Lunas") !== "Lunas",
  );
  const totalPendapatan = totalLunas.reduce((sum, item) => sum + item.total, 0);
  const totalTagihan = totalBelum.reduce((sum, item) => sum + item.total, 0);

  const info = getBengkelInfoLengkap();
  const periode = [
    bulan ? NAMA_BULAN_PENDEK[Number(bulan) - 1] : "Semua Bulan",
    hari ? `tanggal ${hari}` : "",
    tahun,
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <div class="rekap-doc">
      <div class="rekap-head">
        <div>
          <h1>${escapeHTML(info.nama)}</h1>
          <p>${escapeHTML(info.alamat)} · ${escapeHTML(info.kontak)}</p>
        </div>
        <div class="rekap-head-right">
          <h2>REKAP KEUANGAN</h2>
          <p>Periode: ${escapeHTML(periode)}</p>
          <p>Dicetak: ${escapeHTML(new Date().toLocaleString("id-ID"))}</p>
        </div>
      </div>

      <table class="rekap-table">
        <thead>
          <tr>
            <th scope="col">Bulan</th>
            <th scope="col" class="num">Service</th>
            <th scope="col" class="num">Lunas</th>
            <th scope="col" class="num">Belum Lunas</th>
            <th scope="col" class="num">Pendapatan Lunas</th>
            <th scope="col" class="num">Sisa Tagihan</th>
          </tr>
        </thead>
        <tbody>
          ${baris}
        </tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td class="num">${data.length}</td>
            <td class="num">${totalLunas.length}</td>
            <td class="num">${totalBelum.length}</td>
            <td class="num">${formatRupiah(totalPendapatan)}</td>
            <td class="num">${formatRupiah(totalTagihan)}</td>
          </tr>
        </tfoot>
      </table>

      <p class="rekap-note">
        Pendapatan hanya menghitung service yang sudah lunas. Sisa tagihan
        menampilkan service yang belum dibayar.
      </p>
    </div>
  `;
}

function printRekapKeuangan() {
  if (!dbIsAdmin()) {
    showPageNotice("Rekap keuangan hanya bisa dicetak oleh admin.", "error");
    return;
  }

  printHtmlDocument(buildRekapKeuangan());
}

/* Unduh transaksi yang sedang difilter sebagai file CSV. */
function exportKeuanganCsv() {
  const data = getKeuanganFiltered(
    document.getElementById("searchKeuangan")?.value || "",
  );

  if (!data.length) {
    showPageNotice("Tidak ada transaksi untuk diekspor.", "error");
    return;
  }

  const header = [
    "Kode",
    "Tanggal",
    "No. Polisi",
    "Pelanggan",
    "Mekanik",
    "Keluhan",
    "Biaya Jasa",
    "Sparepart",
    "Total",
    "Pembayaran",
  ];

  const rows = data.map((item) => [
    getKode("kendaraan", item),
    item.tanggalService || "",
    item.polisi || "",
    item.pelanggan || "",
    getMekanikNama(item.mekanikId),
    item.keluhan || "",
    item.biayaJasa || 0,
    item.total - (item.biayaJasa || 0),
    item.total,
    item.pembayaran || "Belum Lunas",
  ]);

  const csv = [header, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(";"),
    )
    .join("\n");

  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `rekap-keuangan-${getSelectedTahunKeuangan()}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  showPageNotice(`${data.length} transaksi diekspor ke CSV.`, "success");
}

function initKeuanganPage() {
  const table = document.getElementById("keuanganTable");
  if (!table) return;

  // Isi dropdown tahun (pertahankan pilihan bila masih tersedia).
  const yearSelect = document.getElementById("filterTahunKeuangan");
  const previous = yearSelect.value;
  const years = getTahunTersedia();
  yearSelect.innerHTML = years
    .map((tahun) => `<option value="${tahun}">${tahun}</option>`)
    .join("");
  yearSelect.value = years.includes(previous) ? previous : years[0];

  populateFilterHari();

  renderKeuanganChart();
  renderKeuanganTable();
  if (typeof updateKeuanganStats === "function") updateKeuanganStats();

  yearSelect.addEventListener("change", () => {
    document.getElementById("filterBulanKeuangan").value = "";
    populateFilterHari();
    renderKeuanganChart();
    renderKeuanganTable(document.getElementById("searchKeuangan").value);
    if (typeof updateKeuanganStats === "function") updateKeuanganStats();
  });
  document
    .getElementById("filterBulanKeuangan")
    .addEventListener("change", () => {
      populateFilterHari();
      renderKeuanganChart();
      renderKeuanganTable(document.getElementById("searchKeuangan").value);
    });
  document
    .getElementById("filterHariKeuangan")
    ?.addEventListener("change", () => {
      renderKeuanganTable(document.getElementById("searchKeuangan").value);
    });

  document
    .getElementById("btnCetakRekap")
    ?.addEventListener("click", printRekapKeuangan);

  document
    .getElementById("btnExportCsv")
    ?.addEventListener("click", exportKeuanganCsv);
  document
    .getElementById("sortKeuangan")
    .addEventListener("change", () =>
      renderKeuanganTable(document.getElementById("searchKeuangan").value),
    );
  document
    .getElementById("searchKeuangan")
    .addEventListener("input", (event) =>
      renderKeuanganTable(event.target.value),
    );

  document
    .getElementById("btnCetakKeuangan")
    ?.addEventListener("click", printKeuanganDetail);

  document
    .getElementById("btnLunaskanKeuangan")
    ?.addEventListener("click", tandaiKeuanganLunas);

  /* Tab lunas / belum lunas */
  document.querySelectorAll("#keuanganTabs .status-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("#keuanganTabs .status-tab").forEach((item) => {
        item.classList.toggle("active", item === tab);
        item.setAttribute("aria-selected", item === tab ? "true" : "false");
      });

      keuanganPaymentFilter = tab.dataset.bayar || "semua";

      renderKeuanganTable(
        document.getElementById("searchKeuangan")?.value || "",
      );
    });
  });
}
