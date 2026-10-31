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

/* Tombol filter bintang — dipakai panel login-info (desktop) dan
   modal HP. Kontainer yang sudah diisi tidak diisi ulang (dataset.bound). */
function buildTestimoniFilter(filterEl, listEl) {
  if (!filterEl || filterEl.dataset.bound === "true") return;
  filterEl.dataset.bound = "true";
  filterEl.innerHTML = [0, 5, 4, 3, 2, 1]
    .map((n) => {
      const label = n === 0 ? "Semua" : `${n}★`;
      return `<button type="button" class="filter-btn${n === 0 ? " active" : ""}" data-star="${n}">${label}</button>`;
    })
    .join("");
  filterEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-star]");
    if (!btn) return;
    filterEl
      .querySelectorAll(".filter-btn")
      .forEach((b) => b.classList.toggle("active", b === btn));
    renderTestimoniList(listEl, Number(btn.dataset.star));
  });
}

/* Isi daftar ulasan sesuai filter bintang (0 = semua). */
function renderTestimoniList(listEl, star = 0) {
  if (!listEl) return;
  const data = Array.isArray(window.__publicReviews) ? window.__publicReviews : [];
  const filtered = star === 0 ? data : data.filter((r) => Number(r.rating) === star);
  listEl.innerHTML = filtered.map(buildTestimoniCard).join("") || "<p>Belum ada ulasan.</p>";
}

async function initPublicTestimoni() {
  const section = document.getElementById("testimoniSection");
  const list = document.getElementById("publicTestimoni");

  if (!section || !list) return;


  try {
    const { items: reviews, total } = await loadPublicReviews();
    window.__publicReviews = Array.isArray(reviews) ? reviews.slice() : [];

    /* Section SELALU tampil — termasuk saat 0 ulasan — supaya tinggi
       konten halaman tidak pernah berubah mengikuti jumlah data. */
    section.hidden = false;

    /* Panel login-info (desktop): daftar ulasan + filter bintang,
       tampil seperti isi modal tombol ulasan. */
    buildTestimoniFilter(document.getElementById("testimoniFilter"), list);

    const toggle = document.getElementById("reviewsToggle");
    if (toggle && toggle.dataset.bound !== "true") {
      toggle.dataset.bound = "true";
      toggle.addEventListener("click", () => {
        const modal = document.getElementById("testimoniModal");
        const listEl = document.getElementById("testimoniModalList");
        const filter = document.getElementById("testimoniModalFilter");
        buildTestimoniFilter(filter, listEl);
        /* Setiap kali dibuka, kembali ke filter "Semua". */
        if (filter) {
          filter
            .querySelectorAll(".filter-btn")
            .forEach((b) => b.classList.toggle("active", b.dataset.star === "0"));
        }
        renderTestimoniList(listEl, 0);
        if (modal) modal.hidden = false;
      });
    }
    const closeBtn = document.getElementById("testimoniModalClose");
    if (closeBtn && closeBtn.dataset.bound !== "true") {
      closeBtn.dataset.bound = "true";
      closeBtn.addEventListener("click", () => {
        const modal = document.getElementById("testimoniModal");
        if (modal) modal.hidden = true;
      });
    }
    const modalOverlay = document.getElementById("testimoniModal");
    if (modalOverlay && modalOverlay.dataset.bound !== "true") {
      modalOverlay.dataset.bound = "true";
      modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) {
          modalOverlay.hidden = true;
        }
      });
    }

    const rata =
      reviews.length > 0
        ? reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length
        : 0;

    testimoniSetText("testimoniRata", rata.toFixed(1).replace(".", ","));
    testimoniSetHTML("testimoniStars", testimoniStars(Math.round(rata)));
    testimoniSetText(
      "testimoniJumlah",
      `${total} ulasan${total > reviews.length ? " • terbaru ditampilkan" : ""}`,
    );

    /* Semua ulasan tampil di panel (daftarnya bisa di-scroll). */
    renderTestimoniList(list, 0);
  } catch (error) {
    console.warn("Gagal memuat testimoni:", error);
    section.hidden = true;
  }
}

initPublicTestimoni();
