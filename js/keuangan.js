const NAMA_BULAN_PENDEK = [
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

function getTahunTersedia() {
  const years = new Set(
    getKendaraan()
      .filter(
        (item) =>
          item.status === "Selesai" && String(item.tanggalService || "").length >= 4,
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
  getSelesaiByTahun(tahun).forEach((item) => {
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
  const pendapatan = data.reduce(
    (total, item) => total + getServiceTotal(item),
    0,
  );
  setText("totalPendapatanTahun", formatRupiah(pendapatan));
  setText("totalServiceTahun", data.length);
  setText("rataRataBulanan", formatRupiah(Math.round(pendapatan / 12)));
}

function renderKeuanganChart() {
  const chart = document.getElementById("keuanganChart");
  if (!chart) return;
  const tahun = getSelectedTahunKeuangan();
  const months = getMonthlyFinance(tahun);
  const bulanAktif = document.getElementById("filterBulanKeuangan")?.value || "";
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
      select.value = select.value === bar.dataset.bulan ? "" : bar.dataset.bulan;
      renderKeuanganChart();
      if (typeof renderKeuanganTable === "function")
        renderKeuanganTable(document.getElementById("searchKeuangan").value);
    });
  });
}

function renderKeuanganTable(search = "") {
  const table = document.getElementById("keuanganTable");
  if (!table) return;
  const tahun = getSelectedTahunKeuangan();
  const bulan = document.getElementById("filterBulanKeuangan")?.value || "";
  const keyword = String(search).toLowerCase().trim();

  const rows = getSelesaiByTahun(tahun)
    .filter(
      (item) =>
        !bulan || String(item.tanggalService || "").slice(5, 7) === bulan,
    )
    .filter((item) =>
      [
        item.polisi,
        item.pelanggan,
        item.keluhan,
        getMekanikNama(item.mekanikId),
        item.tanggalService,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(keyword),
      ),
    )
    .sort(
      (a, b) =>
        String(b.tanggalService || "").localeCompare(
          String(a.tanggalService || ""),
        ) || Number(b.id) - Number(a.id),
    );

  if (!rows.length) {
    table.innerHTML =
      '<tr><td colspan="6" style="text-align: center; padding: 30px;">Belum ada transaksi pada filter ini.</td></tr>';
    setText("keuanganInfo", "Tidak ada data");
    return;
  }

  const total = rows.reduce((sum, item) => sum + getServiceTotal(item), 0);
  table.innerHTML = rows
    .map(
      (item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHTML(item.tanggalService || "-")}</td>
        <td><strong>${escapeHTML(item.polisi)}</strong></td>
        <td>${escapeHTML(item.pelanggan)}</td>
        <td>${escapeHTML(getMekanikNama(item.mekanikId))}</td>
        <td>${formatRupiah(getServiceTotal(item))}</td>
      </tr>`,
    )
    .join("");
  setText(
    "keuanganInfo",
    `Menampilkan ${rows.length} transaksi • Total ${formatRupiah(total)}`,
  );
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

  renderKeuanganChart();
  renderKeuanganTable();
  if (typeof updateKeuanganStats === "function") updateKeuanganStats();

  yearSelect.addEventListener("change", () => {
    document.getElementById("filterBulanKeuangan").value = "";
    renderKeuanganChart();
    renderKeuanganTable(document.getElementById("searchKeuangan").value);
    if (typeof updateKeuanganStats === "function") updateKeuanganStats();
  });
  document
    .getElementById("filterBulanKeuangan")
    .addEventListener("change", () => {
      renderKeuanganChart();
      renderKeuanganTable(document.getElementById("searchKeuangan").value);
    });
  document
    .getElementById("searchKeuangan")
    .addEventListener("input", (event) => renderKeuanganTable(event.target.value));
}
