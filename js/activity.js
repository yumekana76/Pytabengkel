/* =========================================
   HALAMAN AKTIVITAS (JEJAK PERUBAHAN)
   Mencatat siapa mengubah data apa.
   ========================================= */

var AKSI_LIST = ["Tambah", "Update", "Hapus", "Proses", "Bayar", "Akun"];
var ENTITAS_LIST = ["Customer", "Kendaraan", "Service", "Mekanik", "Sparepart"];

function formatWaktu(iso) {
  if (!iso) return "-";

  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return iso;
  }
}

function getAksiClass(aksi) {
  switch (aksi) {
    case "Tambah":
      return "done";
    case "Update":
      return "working";
    case "Hapus":
      return "danger";
    case "Bayar":
      return "done";
    case "Proses":
      return "qc";
    default:
      return "neutral";
  }
}

function renderActivityPage(search = "", page = 1) {
  const table = document.getElementById("activityTable");

  if (!table) return;

  const keyword = String(search).toLowerCase().trim();
  const aksiFilter = document.getElementById("filterAksi")?.value || "";
  const entitasFilter = document.getElementById("filterEntitas")?.value || "";
  const sort = getSortValue("sortActivity");

  const rows = getLogs()
    .filter((item) => {
      if (aksiFilter && item.aksi !== aksiFilter) return false;
      if (entitasFilter && item.entitas !== entitasFilter) return false;

      return [
        item.waktu,
        item.aktor,
        item.aksi,
        item.entitas,
        item.kode,
        item.keterangan,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(keyword),
      );
    })
    .map((item) => ({ ...item, waktu: item.waktu || "" }));

  const sorted = sortRows(rows, sort.key, sort.direction).reverse();

  const perPage = 15;
  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));

  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;

  const start = (page - 1) * perPage;
  const data = sorted.slice(start, start + perPage);

  setText("totalActivity", getLogs().length);
  setText("activityToday", getLogs().filter((item) =>
    String(item.waktu || "").slice(0, 10) === new Date().toISOString().slice(0, 10),
  ).length);

  table.innerHTML = "";
  if (!data.length) {
    table.innerHTML =
      '<tr class="empty-row"><td colspan="6" style="text-align: center; padding: 30px;">Belum ada aktivitas tercatat.</td></tr>';
    setText("activityInfo", "Tidak ada aktivitas");
    renderTablePagination("activityPagination", page, totalPages, (next) =>
      renderActivityPage(search, next),
    );
    return;
  }

  table.innerHTML = data
    .map(
      (item, index) => `
        <tr>
          <td>${start + index + 1}</td>
          <td>${escapeHTML(formatWaktu(item.waktu))}</td>
          <td>${escapeHTML(item.aktor || "-")}</td>
          <td>
            <span class="badge ${getAksiClass(item.aksi)}">${escapeHTML(
              item.aksi || "-",
            )}</span>
          </td>
          <td>${escapeHTML(item.entitas || "-")}</td>
          <td><span class="cell-id">${escapeHTML(item.kode || "-")}</span></td>
          <td>${escapeHTML(item.keterangan || "-")}</td>
        </tr>
      `,
    )
    .join("");

  setText(
    "activityInfo",
    `Menampilkan ${start + 1}-${Math.min(start + perPage, sorted.length)} dari ${sorted.length} aktivitas`,
  );

  renderTablePagination("activityPagination", page, totalPages, (next) =>
    renderActivityPage(search, next),
  );
}

function initActivityPage() {
  const table = document.getElementById("activityTable");

  if (!table) return;

  const aksiSelect = document.getElementById("filterAksi");
  const entitasSelect = document.getElementById("filterEntitas");

  if (aksiSelect) {
    aksiSelect.innerHTML =
      '<option value="">Semua Aksi</option>' +
      AKSI_LIST.map((aksi) => `<option value="${aksi}">${aksi}</option>`).join("");
  }

  if (entitasSelect) {
    entitasSelect.innerHTML =
      '<option value="">Semua Entitas</option>' +
      ENTITAS_LIST.map(
        (entitas) => `<option value="${entitas}">${entitas}</option>`,
      ).join("");
  }

  renderActivityPage();

  document
    .getElementById("searchActivity")
    ?.addEventListener("input", (event) =>
      renderActivityPage(event.target.value, 1),
    );

  aksiSelect?.addEventListener("change", () =>
    renderActivityPage(document.getElementById("searchActivity")?.value || "", 1),
  );

  entitasSelect?.addEventListener("change", () =>
    renderActivityPage(document.getElementById("searchActivity")?.value || "", 1),
  );

  document.getElementById("sortActivity")?.addEventListener("change", () =>
    renderActivityPage(document.getElementById("searchActivity")?.value || "", 1),
  );
}
