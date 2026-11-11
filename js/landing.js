/* =========================================
   LANDING PAGE — DATA PUBLIK & NAVIGASI
   ---------------------------------------------------------------
   Tema dan topbar ditangani oleh js/global.js
   (komponen yang sama dengan portal admin).
   File ini hanya:
     * memuat info bengkel & ulasan lewat RPC publik;
     * merender kartu ulasan memakai kelas admin;
     * menandai menu navigasi sesuai bagian yang terlihat;
     * mengubah tombol masuk menjadi profil untuk customer yang login.
   ========================================= */

(function () {
  "use strict";

  /* ---------- HELPER ---------- */

  function setText(id, value) {
    var element = document.getElementById(id);
    if (!element || value === undefined || value === null) return;
    var text = String(value).trim();
    if (text) element.textContent = text;
  }

  function setStars(container, rating) {
    if (!container) return;

    container.textContent = "";

    for (var i = 1; i <= 5; i += 1) {
      var icon = document.createElement("i");
      icon.className =
        i <= Math.round(rating) ? "fa-solid fa-star" : "fa-regular fa-star";
      icon.setAttribute("aria-hidden", "true");
      container.appendChild(icon);
    }
  }

  function formatTanggal(value) {
    if (!value) return "";
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("id-ID", {
      month: "short",
      year: "numeric",
    });
  }

  /* ---------- DATA PUBLIK ---------- */

  async function fetchRpc(name) {
    if (typeof supabaseClient === "undefined" || !supabaseClient) {
      return null;
    }

    try {
      var result = await supabaseClient.rpc(name);
      if (result.error) return null;
      return result.data;
    } catch (error) {
      return null;
    }
  }

  function renderInfo(rows) {
    var info = Array.isArray(rows) ? rows[0] : rows;
    if (!info) return;

    setText("lpInfoAlamat", info.alamat);
    /* Alamat di baris trust hero memakai data bengkel yang sama. */
    setText("lpHeroAlamat", info.alamat);
    setText("lpInfoKontak", info.kontak);
    setText("lpInfoEmail", info.email);
    setText("lpInfoHari", info.hari_buka);
    setText("lpInfoJam", info.jam_buka);

    var phone = document.getElementById("lpInfoKontak");
    if (phone && info.kontak) {
      phone.setAttribute(
        "href",
        "tel:" + String(info.kontak).replace(/[^\d+]/g, ""),
      );
    }

    var email = document.getElementById("lpInfoEmail");
    if (email && info.email) {
      email.setAttribute("href", "mailto:" + String(info.email).trim());
    }

    /* Teks hero (judul, deskripsi, label) diatur admin lewat Pengaturan.
       Kosong -> teks default yang sudah ada di HTML dipertahankan. */
    setText("lpHeroLabel", info.hero_label);
    setText("lpHeroJudul", info.hero_judul);
    setText("lpHeroDeskripsi", info.hero_deskripsi);

    /* Foto latar hero (diatur admin lewat halaman Pengaturan).
       Kosong / gagal dimuat -> gradien tema tetap dipakai. */
    var hero = document.querySelector(".lp-hero");
    if (hero) {
      var heroUrl = String(info.hero_foto || "").trim();

      if (!heroUrl) {
        hero.style.removeProperty("--lp-hero-image");
        return;
      }

      var preload = new Image();
      preload.onload = function () {
        hero.style.setProperty(
          "--lp-hero-image",
          'url("' + heroUrl.replace(/"/g, '%22') + '")',
        );
      };
      preload.onerror = function () {
        hero.style.removeProperty("--lp-hero-image");
      };
      preload.src = heroUrl;
    }
  }

  /* Rating bintang di baris trust hero memakai data ulasan yang sama
     dengan bagian ulasan (rata-rata + jumlah ulasan asli). */
  function renderHeroRating(average, total) {
    var stars = document.getElementById("lpHeroStars");
    var label = document.getElementById("lpHeroRating");

    if (!average || !total) {
      if (stars) stars.textContent = "";
      setText("lpHeroRating", "Belum ada ulasan");
      return;
    }

    setStars(stars, average);
    if (label) {
      label.textContent =
        average.toFixed(1).replace(".", ",") + " · " + total + " ulasan";
    }
  }

  /* ---------- ULASAN: FILTER BINTANG ---------- */

  var reviewState = { rows: [], total: 0, active: 0 };

  function averageOf(rows) {
    if (!rows.length) return 0;
    var sum = rows.reduce(function (acc, row) {
      return acc + (Number(row.rating) || 0);
    }, 0);
    return sum / rows.length;
  }

  function formatAverage(value) {
    return value.toFixed(1).replace(".", ",");
  }

  function filteredReviews() {
    if (!reviewState.active) return reviewState.rows;
    return reviewState.rows.filter(function (row) {
      return (Number(row.rating) || 0) === reviewState.active;
    });
  }

  function countByRating(rating) {
    return reviewState.rows.filter(function (row) {
      return (Number(row.rating) || 0) === rating;
    }).length;
  }

  function renderReviewFilter() {
    var wrap = document.getElementById("lpReviewFilter");
    if (!wrap) return;

    wrap.hidden = !reviewState.rows.length;

    Array.prototype.forEach.call(
      wrap.querySelectorAll("button[data-rating]"),
      function (button) {
        var rating = Number(button.getAttribute("data-rating")) || 0;
        var count = rating ? countByRating(rating) : reviewState.rows.length;
        var active = rating === reviewState.active;

        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
        button.disabled = rating !== 0 && count === 0;

        var countEl = button.querySelector(".lp-filter-count");
        if (countEl) countEl.textContent = String(count);
      },
    );
  }

  /* Ringkasan mengikuti filter aktif: angka & bintang menampilkan
     hasil yang sedang dilihat, bukan seluruh ulasan. */
  function renderReviewSummary() {
    var rows = filteredReviews();
    var average = averageOf(rows);
    var value = document.getElementById("lpRatingValue");
    var count = document.getElementById("lpReviewCount");

    if (value) value.textContent = rows.length ? formatAverage(average) : "-";

    if (count) {
      var jumlah = reviewState.active ? rows.length : reviewState.total;
      count.textContent = jumlah ? jumlah + " ulasan" : "Belum ada ulasan";
    }

    setStars(document.getElementById("lpRatingStars"), average);
  }

  function buildReviewCard(row) {
    var card = document.createElement("article");
    card.className = "review-card";

    var head = document.createElement("div");
    head.className = "review-card-head";

    var name = document.createElement("strong");
    name.textContent = row.nama || "Pelanggan";

    var date = document.createElement("span");
    date.className = "review-card-meta";
    date.textContent = formatTanggal(row.created_at) || "Pelanggan bengkel";

    head.appendChild(name);
    head.appendChild(date);

    var rating = document.createElement("div");
    rating.className = "review-card-rating";
    var stars = document.createElement("span");
    stars.className = "lp-stars";
    stars.setAttribute("aria-hidden", "true");
    setStars(stars, Number(row.rating) || 0);
    rating.appendChild(stars);

    var comment = document.createElement("p");
    comment.className = "review-card-body";

    var text = String(row.komentar || "").trim();
    if (!text) {
      comment.classList.add("review-card-empty");
      text = "Memberi penilaian tanpa menulis komentar.";
    }
    comment.textContent = text;

    card.appendChild(head);
    card.appendChild(rating);
    card.appendChild(comment);
    return card;
  }

  function renderReviewList() {
    var list = document.getElementById("lpReviewList");
    if (!list) return;

    var rows = filteredReviews();
    list.textContent = "";

    if (!rows.length) {
      var empty = document.createElement("div");
      empty.className = "review-card review-card-empty";
      empty.textContent = reviewState.active
        ? "Belum ada ulasan bintang " + reviewState.active + "."
        : "Belum ada ulasan. Ulasan muncul setelah customer menyelesaikan service.";
      list.appendChild(empty);
      return;
    }

    rows.slice(0, 6).forEach(function (row) {
      list.appendChild(buildReviewCard(row));
    });
  }

  function renderReviewEmpty() {
    reviewState.rows = [];
    reviewState.total = 0;
    reviewState.active = 0;

    renderReviewFilter();
    renderReviewSummary();
    renderReviewList();
    renderHeroRating(0, 0);
  }

  function renderReviews(rows) {
    if (!Array.isArray(rows) || !rows.length) {
      renderReviewEmpty();
      return;
    }

    reviewState.rows = rows;
    reviewState.total = Number(rows[0].total) || rows.length;
    reviewState.active = 0;

    renderHeroRating(averageOf(rows), reviewState.total);
    renderReviewFilter();
    renderReviewSummary();
    renderReviewList();
  }

  function initReviewFilter() {
    var wrap = document.getElementById("lpReviewFilter");
    if (!wrap) return;

    wrap.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-rating]");
      if (!button || button.disabled) return;

      var rating = Number(button.getAttribute("data-rating")) || 0;
      if (rating === reviewState.active) return;

      reviewState.active = rating;
      renderReviewFilter();
      renderReviewSummary();
      renderReviewList();
    });
  }

  function scrollToHash() {
    if (!window.location.hash) return;

    var target = document.getElementById(window.location.hash.slice(1));
    if (!target) return;

    /* Data ulasan/info dapat mengubah tinggi halaman setelah browser
       melakukan scroll awal ke anchor. Posisikan ulang setelah render
       supaya deep link (#promo, #kontak, ...) mendarat tepat. */
    requestAnimationFrame(function () {
      target.scrollIntoView({ block: "start" });
      window.dispatchEvent(new Event("scroll"));
    });
  }

  /* ---------- PROMO / DISKON (dinamis, dikelola admin) ---------- */

  async function getPublicPromos() {
    var rows = await fetchRpc("public_promos");
    return Array.isArray(rows) ? rows : [];
  }

  function formatPromoValue(promo) {
    var nilai = Number(promo.nilai) || 0;
    if (promo.tipe === "nominal") {
      return "Hemat Rp" + nilai.toLocaleString("id-ID");
    }
    return "Hemat " + nilai + "%";
  }

  function formatPromoPeriode(promo) {
    function fmt(v) {
      if (!v) return "";
      var d = new Date(String(v));
      if (isNaN(d)) return String(v);
      return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    }
    var a = fmt(promo.mulai);
    var b = fmt(promo.sampai);
    if (a && b) return a + " – " + b;
    if (a) return "Mulai " + a;
    if (b) return "Sampai " + b;
    return "Periode terbatas";
  }

  function renderPromos(rows) {
    var grid = document.querySelector(".lp-promo-grid");
    var countEl = document.getElementById("lpPromoCount");
    if (countEl) {
      var n = Array.isArray(rows) ? rows.length : 0;
      countEl.textContent = n ? n + " promo berlaku" : "Promo tersedia";
    }
    if (!grid) return;
    grid.textContent = "";
    if (!Array.isArray(rows) || !rows.length) {
      var empty = document.createElement("div");
      empty.className = "review-card review-card-empty";
      empty.textContent = "Belum ada promo yang sedang berlaku.";
      grid.appendChild(empty);
      return;
    }
    rows.forEach(function (promo) {
      var code = String(promo.kode || "").trim();
      var loggedHref = "customers-page/kendaraan.html?ajukan=1" + (code ? "&promo=" + encodeURIComponent(code) : "");
      /* Saat belum login, bawa tujuan klaim lewat ?next= supaya promo
         tetap terpilih setelah customer berhasil masuk. */
      var href = "index.html?role=customer&next=" + encodeURIComponent(loggedHref);
      var card = document.createElement("article");
      card.className = "stat-card lp-promo-card";
      card.innerHTML =
        '<div class="lp-promo-head">' +
          '<span class="lp-promo-icon"><i class="fa-solid fa-tag"></i></span>' +
          '<span class="badge done"></span>' +
        "</div>" +
        "<h4></h4>" +
        "<p></p>" +
        '<div class="lp-promo-code"><span>Kode promo</span><strong></strong></div>' +
        '<div class="lp-promo-foot"><span><i class="fa-solid fa-calendar" aria-hidden="true"></i> <span class="lp-promo-period"></span></span>' +
          '<a data-auth-link data-loggedin-label="Klaim">Klaim <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>' +
        "</div>";
      card.querySelector(".badge").textContent = formatPromoValue(promo);
      card.querySelector("h4").textContent = promo.nama || "Promo";
      card.querySelector("p").textContent = promo.deskripsi || "Promo berlaku sesuai ketentuan bengkel.";
      card.querySelector(".lp-promo-code strong").textContent = code || "-";
      card.querySelector(".lp-promo-period").textContent = formatPromoPeriode(promo);
      var link = card.querySelector("a");
      link.setAttribute("href", href);
      link.setAttribute("data-loggedin-href", loggedHref);
      grid.appendChild(card);
    });
    applyAuthLinks(grid);
  }

  var landingCustomerProfile = null;

  function applyAuthLinks(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var links = Array.from(scope.querySelectorAll("[data-auth-link]"));
    if (!links.length) return;
    var profile = landingCustomerProfile;
    var role = profile && profile.role ? normalizeRole(profile.role) : null;
    var isCustomer = role === "customer" && profile.customer_id;
    var isStaff = role === "admin" || role === "super_admin";
    links.forEach(function (link) {
      if (link.getAttribute("data-auth-applied") === "1") return;
      if (!isCustomer && !isStaff) return;
      var loggedInHref = link.getAttribute("data-loggedin-href");
      /* Tampilkan NAMA user yang login (bukan label "Profil");
         label eksplisit lewat data-loggedin-label tetap dihormati. */
      var namaProfil = profile.nama ? String(profile.nama).trim() : "";
      var label =
        link.getAttribute("data-loggedin-label") ||
        namaProfil ||
        link.getAttribute("data-profile-label") ||
        "Profil";
      var span = link.querySelector("span");
      var icon = link.querySelector("i");
      /* Customer -> dashboard portal customer; admin & super -> dashboard
         admin, jadi tidak perlu login lagi saat membuka halaman login. */
      var targetHref = isStaff
        ? "admin-page/dashboard.html"
        : loggedInHref || "customers-page/dashboard.html";
      link.setAttribute("href", targetHref);
      link.title = getRoleLabel(profile.role);
      var ariaLabel = label;
      if (namaProfil) {
        ariaLabel =
          label === namaProfil
            ? getRoleLabel(profile.role) + " " + namaProfil
            : label + " " + namaProfil;
      }
      link.setAttribute("aria-label", ariaLabel);
      if (span) span.textContent = label;
      if (!loggedInHref && icon) {
        icon.className = isStaff
          ? role === "super_admin"
            ? "fa-solid fa-crown"
            : "fa-solid fa-user-shield"
          : "fa-solid fa-user";
      }
      link.setAttribute("data-auth-applied", "1");
    });
  }

  async function loadPublicData() {
    var info = await fetchRpc("public_workshop_info");
    if (info) renderInfo(info);

    var promos = await getPublicPromos();
    renderPromos(promos);

    var reviews = await fetchRpc("public_reviews");
    renderReviews(reviews);
    scrollToHash();
  }

  /* ---------- MENU SIDEBAR AKTIF ---------- */

  async function initAuthLinks() {
    var links = Array.from(document.querySelectorAll("[data-auth-link]"));
    if (
      !links.length ||
      typeof Auth === "undefined" ||
      typeof Auth.restoreSession !== "function"
    ) {
      return;
    }
    try {
      landingCustomerProfile = await Auth.restoreSession();
    } catch (error) {
      landingCustomerProfile = null;
      return;
    }
    applyAuthLinks(document);
  }

  function initLandingNav() {
    var links = Array.from(
      document.querySelectorAll(".lp-landing-nav .nav-link"),
    ).filter(function (link) {
      return String(link.getAttribute("href") || "").startsWith("#");
    });

    if (!links.length) return;

    var sections = links
      .map(function (link) {
        var id = String(link.getAttribute("href") || "").slice(1);
        var section = document.getElementById(id);
        return section ? { link: link, section: section } : null;
      })
      .filter(Boolean);

    if (!sections.length) return;

    function updateActive() {
      var offset = 135;
      var current = sections[0];

      sections.forEach(function (item) {
        if (item.section.getBoundingClientRect().top <= offset) {
          current = item;
        }
      });

      sections.forEach(function (item) {
        var active = item === current;
        item.link.classList.toggle("active", active);

        if (active) {
          item.link.setAttribute("aria-current", "page");
        } else {
          item.link.removeAttribute("aria-current");
        }
      });
    }

    window.addEventListener("scroll", updateActive, { passive: true });

    links.forEach(function (link) {
      link.addEventListener("click", function () {
        links.forEach(function (item) {
          var active = item === link;
          item.classList.toggle("active", active);

          if (active) {
            item.setAttribute("aria-current", "page");
          } else {
            item.removeAttribute("aria-current");
          }
        });
      });
    });

    updateActive();
  }

  /* ---------- INIT ---------- */

  var year = document.getElementById("lpYear");
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  initLandingNav();
  initAuthLinks();
  initReviewFilter();
  loadPublicData();
})();
