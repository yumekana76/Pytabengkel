/* Riwayat diturunkan dari service kendaraan berstatus selesai. */

function renderRiwayatPage(search = "") {
  const table = document.getElementById("riwayatTable");
  if (!table) return;

  const keyword = String(search).toLowerCase().trim();
  const bulanFilter =
    document.getElementById("filterBulanRiwayat")?.value || "";
  const riwayat = getKendaraan().filter((item) => {
    if (
      bulanFilter &&
      String(item.tanggalService || "").slice(0, 7) !== bulanFilter
    )
      return false;
    return (
      item.status === "Selesai" &&
      [
        item.polisi,
        item.pelanggan,
        item.keluhan,
        getMekanikNama(item.mekanikId),
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(keyword),
      )
    );
  }).sort(
    (a, b) =>
      String(b.tanggalService || "").localeCompare(
        String(a.tanggalService || ""),
      ) || Number(b.id) - Number(a.id),
  );

  table.innerHTML = "";
  if (!riwayat.length) {
    table.innerHTML =
      '<tr><td colspan="7" style="text-align: center; padding: 30px;">Belum ada service yang selesai.</td></tr>';
    setText("riwayatInfo", "Tidak ada riwayat");
    return;
  }

  riwayat.forEach((item, index) => {
    table.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHTML(item.tanggalService || "-")}</td>
        <td><strong>${escapeHTML(item.polisi)}</strong></td>
        <td>${escapeHTML(item.pelanggan)}</td>
        <td>${escapeHTML(item.keluhan)}</td>
        <td>${escapeHTML(getMekanikNama(item.mekanikId))}</td>
        <td>${formatRupiah(getServiceTotal(item))}</td>
      </tr>`;
  });
  setText("riwayatInfo", `Menampilkan ${riwayat.length} riwayat service`);
}

function updateRiwayatStats() {
  const riwayat = getKendaraan().filter((item) => item.status === "Selesai");
  const pendapatan = riwayat.reduce(
    (total, item) => total + getServiceTotal(item),
    0,
  );
  const pelanggan = new Set(
    riwayat.map((item) => item.pelangganId).filter(Boolean),
  );
  setText("totalRiwayat", riwayat.length);
  setText("pendapatanSelesai", formatRupiah(pendapatan));
  setText("pelangganSelesai", pelanggan.size);
}

function initRiwayatPage() {
  const table = document.getElementById("riwayatTable");
  if (!table) return;
  if (typeof renderRiwayatPage === "function") renderRiwayatPage();
  if (typeof updateRiwayatStats === "function") updateRiwayatStats();
  document
    .getElementById("searchRiwayat")
    .addEventListener("input", (event) =>
      (typeof renderRiwayatPage === "function" && renderRiwayatPage(event.target.value)),
    );
  document
    .getElementById("filterBulanRiwayat")
    ?.addEventListener("change", (event) =>
      (typeof renderRiwayatPage === "function" && renderRiwayatPage(document.getElementById("searchRiwayat").value)),
    );
}