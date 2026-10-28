/* =====================================================================
   HALAMAN ULASAN (ADMIN)
   ---------------------------------------------------------------------
   Rating & ulasan customer untuk service yang sudah selesai.
   Data diambil dari tabel reviews (lihat js/db.js).
   ===================================================================== */

var activeUlasanId = null;

/* Pasangkan tiap ulasan dengan service-nya. */
function getUlasanRows() {
  const services = getKendaraan();

  return getReviews()
    .map((review) => {
      const service =
        services.find((item) => Number(item.id) === Number(review.serviceId)) ||
        null;

      return {
        ...review,
        service,
        kodeService: service ? getKode("kendaraan", service) : "-",
        polisi: service?.polisi || "",
        pelanggan: service?.pelanggan || "",
        tanggalService: service?.tanggalService || "",
      };
    })
    .filter((row) => row.service);
}

function renderUlasanPage(search = "", page = 1) {
  const table = document.getElementById("ulasanTable");

  if (!table) return;

  const keyword = String(search).toLowerCase().trim();
  const ratingFilter =
    document.getElementById("filterRatingUlasan")?.value || "";
  const sort = getSortValue("sortUlasan");

  const filtered = getUlasanRows().filter((row) => {
    if (ratingFilter && Number(row.rating) !== Number(ratingFilter)) {
      return false;
    }

    return [
      row.kodeService,
      row.polisi,
      row.pelanggan,
      row.komentar,
      getRatingLabel(row.rating),
    ].some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(keyword),
    );
  });

  const sorted = sortRows(filtered, sort.key, sort.direction);

  table.innerHTML = "";

  if (!sorted.length) {
    table.innerHTML = `
      <tr class="empty-row">
        <td colspan="8" style="text-align: center; padding: 30px;">
          ${
            getReviews().length
              ? "Tidak ada ulasan pada filter ini."
              : "Belum ada ulasan masuk."
          }
        </td>
      </tr>
    `;
    setText("ulasanInfo", "Tidak ada ulasan");
    renderTablePagination("ulasanPagination", 1, 1, () => {});
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
      (row, index) => `
        <tr>
          <td>${start + index + 1}</td>
          <td><span class="cell-id">${escapeHTML(getKode("reviews", row))}</span></td>
          <td>${escapeHTML(row.tanggalService || "-")}</td>
          <td><strong>${escapeHTML(row.polisi || "-")}</strong></td>
          <td>${escapeHTML(row.pelanggan || "-")}</td>
          <td>
            <span class="ulasan-rating-cell">
              ${buildStarsHTML(row.rating, { small: true })}
              <span class="rating-label">${escapeHTML(getRatingLabel(row.rating))}</span>
            </span>
          </td>
          <td>
            <span class="review-comment">${escapeHTML(truncateText(row.komentar, 80))}</span>
          </td>
          <td>
            <button
              type="button"
              class="action-btn"
              data-ulasan-detail="${row.id}"
            >
              Detail
            </button>
          </td>
        </tr>
      `,
    )
    .join("");

  table.querySelectorAll("[data-ulasan-detail]").forEach((button) => {
    button.addEventListener("click", () =>
      showUlasanDetail(button.dataset.ulasanDetail),
    );
  });

  setText(
    "ulasanInfo",
    `Menampilkan ${start + 1}-${Math.min(
      start + perPage,
      sorted.length,
    )} dari ${sorted.length} ulasan`,
  );

  renderTablePagination("ulasanPagination", page, totalPages, (next) =>
    renderUlasanPage(search, next),
  );
}

/* DETAIL ULASAN */

function showUlasanDetail(id) {
  const row = getUlasanRows().find(
    (item) => Number(item.id) === Number(id),
  );

  if (!row) return;

  activeUlasanId = row.id;

  const content = document.getElementById("ulasanDetailContent");
  const reviewBox = document.getElementById("ulasanDetailReview");

  if (content) {
    content.innerHTML = buildServiceDetailGrid(row.service, {
      customerLabel: "Pelanggan",
    });
  }

  if (reviewBox) {
    reviewBox.innerHTML = `
      <div class="review-card">
        <div class="review-card-head">
          <span>
            ${buildStarsHTML(row.rating)}
            <strong class="review-card-rating">${escapeHTML(getRatingLabel(row.rating))}</strong>
          </span>
          <span class="review-card-meta">
            ${escapeHTML(row.pelanggan || "Customer")} •
            ${escapeHTML(String(row.createdAt || "").slice(0, 10) || "-")}
          </span>
        </div>
        <p class="review-card-body">${
          row.komentar
            ? escapeHTML(row.komentar)
            : '<span class="review-card-empty">Tidak ada komentar.</span>'
        }</p>
      </div>
    `;
  }

  openModal("ulasanDetailModal");
}

/* HAPUS ULASAN (admin) */

function hapusUlasan() {
  const button = document.getElementById("btnHapusUlasan");
  const row = getUlasanRows().find(
    (item) => Number(item.id) === Number(activeUlasanId),
  );

  if (!row) return;

  if (!armConfirmButton(button, "Klik lagi untuk hapus")) {
    showPageNotice(
      "Ulasan akan dihapus permanen. Klik tombol sekali lagi untuk memastikan.",
      "error",
    );
    return;
  }

  saveReviews(
    getReviews().filter((item) => Number(item.id) !== Number(row.id)),
  );

  addLog(
    "Hapus",
    "Ulasan",
    `Ulasan rating ${row.rating} untuk service ${row.polisi || row.kodeService}`,
    row.kodeService,
  );

  closeModal("ulasanDetailModal");

  showPageNotice("Ulasan dihapus.", "success");

  renderUlasanPage(document.getElementById("searchUlasan")?.value || "");
  updateUlasanStats();
}

/* STATISTIK */

function updateUlasanStats() {
  const reviews = getReviews();
  const total = reviews.length;

  const rata = total
    ? reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / total
    : 0;

  const bulanIni = new Date().toISOString().slice(0, 7);

  const bulanCount = reviews.filter(
    (item) => String(item.createdAt || "").slice(0, 7) === bulanIni,
  ).length;

  const sudahDinilai = new Set(reviews.map((item) => Number(item.serviceId)));

  const belumDinilai = getKendaraan().filter(
    (item) =>
      item.status === "Selesai" && !sudahDinilai.has(Number(item.id)),
  ).length;

  setText("statRataRating", total ? `${rata.toFixed(1).replace(".", ",")} ★` : "-");
  setText("statTotalUlasan", total);
  setText("statUlasanBulanIni", bulanCount);
  setText("statBelumDinilai", belumDinilai);
}

/* INISIALISASI */

function initUlasanPage() {
  const table = document.getElementById("ulasanTable");

  if (!table) return;

  renderUlasanPage();
  updateUlasanStats();

  document
    .getElementById("searchUlasan")
    ?.addEventListener(
      "input",
      (event) => renderUlasanPage(event.target.value),
    );

  document
    .getElementById("filterRatingUlasan")
    ?.addEventListener("change", () =>
      renderUlasanPage(document.getElementById("searchUlasan")?.value || ""),
    );

  document
    .getElementById("sortUlasan")
    ?.addEventListener("change", () =>
      renderUlasanPage(document.getElementById("searchUlasan")?.value || ""),
    );

  document
    .getElementById("btnHapusUlasan")
    ?.addEventListener("click", hapusUlasan);
}
