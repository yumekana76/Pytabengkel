/* =====================================================================
   TESTIMONI PUBLIK (halaman index / login)
   ---------------------------------------------------------------------
   Menampilkan rating rata-rata + ulasan terbaru tanpa harus login.

   MODE SUPABASE : lewat RPC public_reviews() (aman dibaca anon,
                   hanya nama depan + rating + komentar + tanggal).
   MODE LOKAL     : dibangun dari cache reviews + nama customer.

   Helper kecil (bintang, escape, label) diduplikasi di file ini supaya
   halaman login tidak perlu memuat js/global.js yang penuh side-effect.
   ===================================================================== */

var TESTIMONI_RATING_LABELS = {
  5: "Sangat Puas",
  4: "Puas",
  3: "Cukup",
  2: "Kurang",
  1: "Sangat Kurang",
};

function testimoniEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function testimoniStars(rating) {
  const value = Math.min(5, Math.max(0, Number(rating) || 0));

  let html = `<span class="stars stars-small" role="img" aria-label="Rating ${value} dari 5 bintang">`;

  for (let i = 1; i <= 5; i++) {
    html += `<i class="fa-solid fa-star ${
      i <= value ? "star-on" : "star-off"
    }" aria-hidden="true"></i>`;
  }

  return `${html}</span>`;
}

function testimoniSetText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* Untuk isi berupa markup (mis. deret bintang). */
function testimoniSetHTML(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = value;
}

async function loadPublicReviews() {
  if (isSupabaseMode()) {
    const { data, error } = await supabaseClient.rpc("public_reviews");

    if (error) {
      console.warn("Gagal memuat testimoni:", error.message);
      return { items: [], total: 0 };
    }

    const items = (data || []).map((row) => ({
      nama: row.nama || "Pelanggan",
      rating: Number(row.rating) || 0,
      komentar: row.komentar || "",
      createdAt: row.created_at || "",
    }));

    /* `total` = jumlah seluruh ulasan (di luar limit 60 baris terbaru). */
    const total = Number(data?.[0]?.total) || items.length;

    return { items, total };
  }

  /* Mode lokal: pakai data yang sama dengan portal admin/customer. */
  await dbInit();

  const semua = getReviews()
    .map((review) => {
      const customer = review.customerId
        ? getCustomerById(review.customerId)
        : null;
      const nama =
        String(customer?.nama || "Pelanggan").trim().split(" ")[0] ||
        "Pelanggan";

      return {
        nama,
        rating: Number(review.rating) || 0,
        komentar: review.komentar || "",
        createdAt: review.createdAt || "",
      };
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  return { items: semua.slice(0, 60), total: semua.length };
}

/* "2026-10-14T..." -> "14 Okt 2026" */
function formatTanggalUlasan(value) {
  const date = new Date(String(value || "").slice(0, 10));

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function buildTestimoniCard(item) {
  const tanggal = formatTanggalUlasan(item.createdAt);

  return `
    <article class="testimoni-card">
      <div class="testimoni-card-head">
        <span class="testimoni-nama">
          <i class="fa-solid fa-circle-user" aria-hidden="true"></i>
          ${testimoniEscape(item.nama)}
        </span>
        <span class="testimoni-tgl">${testimoniEscape(tanggal)}</span>
      </div>
      <div class="testimoni-card-rating">
        ${testimoniStars(item.rating)}
        <span class="testimoni-rating-label">${
          TESTIMONI_RATING_LABELS[item.rating] || "Belum dinilai"
        }</span>
      </div>
      ${
        item.komentar
          ? `<p class="testimoni-teks">&ldquo;${testimoniEscape(item.komentar)}&rdquo;</p>`
          : ""
      }
    </article>
  `;
}

/* =====================================================================
   STATE & RENDER
   ---------------------------------------------------------------------
   - Panel login menampilkan MAKS 2 ulasan terbaru + tombol "Lihat
     semua ulasan" yang membuka modal berisi seluruh ulasan.
   - Filter bintang (Semua / 5..1) dipakai bersama oleh panel & modal;
     tiap tombol memuat jumlah ulasannya sendiri.
   ===================================================================== */

/* Maksimal ulasan tampil di panel login; sisanya lewat modal. */
var TESTIMONI_MAX_VISIBLE = 2;

var TESTIMONI_STATE = {
  reviews: [],
  total: 0,
  filter: "all", /* "all" | "1".."5" */
  modalOpen: false,
};

function testimoniCounts(reviews) {
  const counts = { all: reviews.length, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  for (const item of reviews) {
    const key = Math.min(5, Math.max(1, Number(item.rating) || 0));
    counts[key] += 1;
  }

  return counts;
}

function testimoniFiltered() {
  const { reviews, filter } = TESTIMONI_STATE;

  if (filter === "all") return reviews;

  return reviews.filter((item) => Number(item.rating) === Number(filter));
}

/* Chips filter: "Semua (n)" + bintang yang punya ulasan (>0). */
function renderTestimoniChips(container) {
  const counts = testimoniCounts(TESTIMONI_STATE.reviews);
  const active = TESTIMONI_STATE.filter;

  let html = `<button type="button" class="testimoni-chip${
    active === "all" ? " active" : ""
  }" data-filter="all" aria-pressed="${active === "all"}">
    Semua <span class="testimoni-chip-count">${counts.all}</span>
  </button>`;

  for (let rating = 5; rating >= 1; rating--) {
    if (!counts[rating]) continue;

    html += `<button type="button" class="testimoni-chip${
      active === String(rating) ? " active" : ""
    }" data-filter="${rating}" aria-pressed="${active === String(rating)}">
      <i class="fa-solid fa-star" aria-hidden="true"></i>${rating}
      <span class="testimoni-chip-count">${counts[rating]}</span>
    </button>`;
  }

  container.innerHTML = html;

  for (const chip of container.querySelectorAll(".testimoni-chip")) {
    chip.addEventListener("click", () =>
      setTestimoniFilter(chip.dataset.filter),
    );
  }
}

/* Satu sumber filter: panel login & modal ikut berubah bersama. */
function setTestimoniFilter(value) {
  TESTIMONI_STATE.filter = value === "all" ? "all" : String(value);

  for (const id of ["testimoniFilter", "testimoniModalFilter"]) {
    const container = document.getElementById(id);

    if (container) renderTestimoniChips(container);
  }

  renderMainTestimoni();

  if (TESTIMONI_STATE.modalOpen) renderTestimoniModalList();
}

/* Panel login: maksimal 2 ulasan + tombol "lihat semua". */
function renderMainTestimoni() {
  const list = document.getElementById("publicTestimoni");
  const moreBtn = document.getElementById("testimoniMore");

  if (!list || !moreBtn) return;

  const items = testimoniFiltered();

  list.innerHTML = items.length
    ? items.slice(0, TESTIMONI_MAX_VISIBLE).map(buildTestimoniCard).join("")
    : `<p class="testimoni-kosong">Belum ada ulasan untuk filter ini.</p>`;

  const moreCount = document.getElementById("testimoniMoreCount");

  if (items.length > TESTIMONI_MAX_VISIBLE) {
    moreBtn.hidden = false;

    if (moreCount) {
      moreCount.textContent = `(${items.length})`;
    }
  } else {
    moreBtn.hidden = true;
  }
}

/* Modal: seluruh ulasan sesuai filter yang aktif. */
function renderTestimoniModalList() {
  const modalList = document.getElementById("testimoniModalList");
  const sub = document.getElementById("testimoniModalSub");

  if (!modalList) return;

  const items = testimoniFiltered();

  modalList.innerHTML = items.length
    ? items.map(buildTestimoniCard).join("")
    : `<p class="testimoni-kosong">Belum ada ulasan untuk filter ini.</p>`;

  if (sub) {
    sub.textContent = items.length
      ? `${items.length} dari ${TESTIMONI_STATE.total} ulasan ditemukan`
      : `Dari ${TESTIMONI_STATE.total} ulasan`;
  }
}

function openTestimoniModal() {
  const modal = document.getElementById("testimoniModal");

  if (!modal) return;

  TESTIMONI_STATE.modalOpen = true;

  const chips = document.getElementById("testimoniModalFilter");

  if (chips) renderTestimoniChips(chips);

  renderTestimoniModalList();
  modal.hidden = false;
}

function closeTestimoniModal() {
  const modal = document.getElementById("testimoniModal");

  if (!modal) return;

  TESTIMONI_STATE.modalOpen = false;
  modal.hidden = true;
}

async function initPublicTestimoni() {
  const section = document.getElementById("testimoniSection");
  const list = document.getElementById("publicTestimoni");

  if (!section || !list) return;

  try {
    const { items: reviews, total } = await loadPublicReviews();

    /* Belum ada ulasan -> sembunyikan seluruh section. */
    if (!reviews.length) {
      section.hidden = true;
      return;
    }

    section.hidden = false;

    TESTIMONI_STATE.reviews = reviews;
    TESTIMONI_STATE.total = total;

    const rata = reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length;

    testimoniSetText("testimoniRata", rata.toFixed(1).replace(".", ","));
    testimoniSetHTML("testimoniStars", testimoniStars(Math.round(rata)));
    testimoniSetText("testimoniJumlah", `${total} ulasan`);

    renderTestimoniChips(document.getElementById("testimoniFilter"));
    renderMainTestimoni();

    /* Tombol "Lihat semua ulasan" -> modal seluruh ulasan. */
    const moreBtn = document.getElementById("testimoniMore");

    if (moreBtn) moreBtn.addEventListener("click", openTestimoniModal);

    document
      .getElementById("testimoniModalClose")
      ?.addEventListener("click", closeTestimoniModal);

    const modal = document.getElementById("testimoniModal");

    modal?.addEventListener("click", (event) => {
      if (event.target === modal) closeTestimoniModal();
    });

    /* Esc juga menutup modal. */
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && TESTIMONI_STATE.modalOpen) {
        closeTestimoniModal();
      }
    });
  } catch (error) {
    console.warn("Gagal memuat testimoni:", error);
    section.hidden = true;
  }
}

initPublicTestimoni();
