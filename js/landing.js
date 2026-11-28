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

  /* Galeri di HP: satu baris foto yang digeser dengan tombol sebelumnya /
     berikutnya. Di layar lebar tombol disembunyikan dan grid mosaik tetap. */
  function initGallerySlider() {
    var grid = document.getElementById("lpGalleryGrid");
    var nav = document.querySelector(".lp-gallery-nav");
    var prev = document.getElementById("lpGalleryPrev");
    var next = document.getElementById("lpGalleryNext");
    if (!grid || !nav || !prev || !next) return;

    var mobile = window.matchMedia("(max-width: 720px)");

    function langkah() {
      var item = grid.querySelector(".lp-gallery-item");
      return item
        ? item.getBoundingClientRect().width + 10
        : grid.clientWidth * 0.8;
    }

    function update() {
      nav.hidden = !mobile.matches;
      if (!mobile.matches) {
        grid.scrollLeft = 0;
        return;
      }
      var sisa = grid.scrollWidth - grid.clientWidth;
      prev.disabled = grid.scrollLeft <= 2;
      next.disabled = grid.scrollLeft >= sisa - 2;
    }

    if (grid.dataset.sliderReady !== "1") {
      grid.dataset.sliderReady = "1";
      prev.addEventListener("click", function () {
        grid.scrollBy({ left: -langkah(), behavior: "smooth" });
      });
      next.addEventListener("click", function () {
        grid.scrollBy({ left: langkah(), behavior: "smooth" });
      });
      grid.addEventListener("scroll", update, { passive: true });
      window.addEventListener("resize", update);
      if (typeof mobile.addEventListener === "function") {
        mobile.addEventListener("change", update);
      } else if (typeof mobile.addListener === "function") {
        mobile.addListener(update);
      }
    }

    update();
  }

  /* Galeri bengkel dari admin. Data berupa array [{ url, judul, deskripsi }].
     Tanpa data (atau format lama) galeri bawaan di HTML dibiarkan. */
  function renderGallery(rows) {
    var grid = document.querySelector(".lp-gallery-grid");
    if (!grid) return;

    var list = rows;

    if (typeof list === "string") {
      try {
        list = JSON.parse(list);
      } catch (error) {
        list = null;
      }
    }

    if (!Array.isArray(list)) return;

    var items = list
      .filter(function (item) {
        return item && typeof item === "object" && String(item.url || "").trim();
      })
      .slice(0, 8);

    if (!items.length) return;

    grid.textContent = "";
    /* Mosaik hanya untuk 4 foto (1 besar + 3 kecil); jumlah lain dibuat
       rata supaya tidak ada lubang di grid. */
    grid.classList.toggle("lp-gallery-mosaic", items.length === 4);

    items.forEach(function (item, index) {
      var figure = document.createElement("figure");
      figure.className =
        "lp-gallery-item" +
        (items.length === 4 && index === 0 ? " lp-gallery-wide" : "");

      var img = document.createElement("img");
      img.src = String(item.url).trim();
      img.alt = String(item.judul || "Foto bengkel Pytabengkel").trim();
      img.loading = "lazy";

      var caption = document.createElement("figcaption");
      var judul = document.createElement("strong");
      judul.textContent = String(item.judul || "Galeri Bengkel").trim();
      caption.appendChild(judul);

      if (item.deskripsi) {
        var detail = document.createElement("span");
        detail.textContent = String(item.deskripsi).trim();
        caption.appendChild(detail);
      }

      figure.appendChild(img);
      figure.appendChild(caption);
      grid.appendChild(figure);
    });

    initGallerySlider();
    siapkanItemGaleri(grid);
  }

  /* ---------- LIGHTBOX GALERI ----------
     Kartu galeri hanya menampilkan foto + judul (keterangan disembunyikan
     oleh CSS); deskripsi muncul di lightbox setelah fotonya diklik. */
  var lightboxFokusSebelum = null;

  function siapkanItemGaleri(grid) {
    Array.prototype.forEach.call(
      grid.querySelectorAll(".lp-gallery-item"),
      function (item) {
        if (item.dataset.lightboxReady === "1") return;
        item.dataset.lightboxReady = "1";
        item.setAttribute("tabindex", "0");
        item.setAttribute("role", "button");

        var judul = item.querySelector("figcaption strong");
        item.setAttribute(
          "aria-label",
          "Lihat detail foto: " +
            (judul && judul.textContent.trim()
              ? judul.textContent.trim()
              : "Galeri Bengkel"),
        );
      },
    );
  }

  function tutupLightbox() {
    var box = document.getElementById("lpLightbox");
    if (!box || box.hidden) return;

    box.hidden = true;
    document.body.style.removeProperty("overflow");

    if (lightboxFokusSebelum && document.contains(lightboxFokusSebelum)) {
      lightboxFokusSebelum.focus();
    }
    lightboxFokusSebelum = null;
  }

  function bukaLightbox(item) {
    var box = document.getElementById("lpLightbox");
    if (!box) return;

    var sumber = item.querySelector("img");
    var judul = item.querySelector("figcaption strong");
    var deskripsi = item.querySelector("figcaption span");
    var lbImg = document.getElementById("lpLightboxImg");
    var lbPlaceholder = document.getElementById("lpLightboxPlaceholder");
    var lbJudul = document.getElementById("lpLightboxJudul");
    var lbDeskripsi = document.getElementById("lpLightboxDeskripsi");

    if (sumber && sumber.getAttribute("src")) {
      lbImg.src = sumber.getAttribute("src");
      lbImg.alt = sumber.getAttribute("alt") || "";
      lbImg.hidden = false;
      lbPlaceholder.hidden = true;
    } else {
      /* Galeri bawaan belum punya foto asli — tampilkan blok gradasi
         dengan ikon yang sama seperti di kartu. */
      var fallback = item.querySelector(".lp-media-fallback");
      lbPlaceholder.innerHTML = fallback
        ? fallback.innerHTML
        : '<i class="fa-solid fa-motorcycle"></i>';
      lbImg.hidden = true;
      lbImg.removeAttribute("src");
      lbPlaceholder.hidden = false;
    }

    lbJudul.textContent =
      (judul && judul.textContent.trim()) || "Galeri Bengkel";

    var teks = deskripsi ? deskripsi.textContent.trim() : "";
    lbDeskripsi.textContent = teks;
    lbDeskripsi.hidden = !teks;

    lightboxFokusSebelum = item;
    box.hidden = false;
    document.body.style.overflow = "hidden";
    document.getElementById("lpLightboxClose").focus();
  }

  function initLightbox() {
    var box = document.getElementById("lpLightbox");
    if (!box || box.dataset.lightboxReady === "1") return;
    box.dataset.lightboxReady = "1";

    var grid = document.querySelector(".lp-gallery-grid");

    if (grid) {
      grid.addEventListener("click", function (event) {
        var item = event.target && event.target.closest
          ? event.target.closest(".lp-gallery-item")
          : null;
        if (item && grid.contains(item)) bukaLightbox(item);
      });

      grid.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        var item = event.target && event.target.closest
          ? event.target.closest(".lp-gallery-item")
          : null;
        if (!item) return;
        event.preventDefault();
        bukaLightbox(item);
      });

      siapkanItemGaleri(grid);
    }

    document
      .getElementById("lpLightboxClose")
      .addEventListener("click", tutupLightbox);

    /* Klik area gelap di luar gambar ikut menutup. */
    box.addEventListener("click", function (event) {
      if (event.target === box) tutupLightbox();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") tutupLightbox();
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

  /* ---------- HERO SLIDES ----------
     Hero bisa memakai beberapa slide (foto + teks) dan berganti otomatis
     bila admin mengaktifkannya. Tanpa data slide, teks/foto tunggal dari
     kolom hero_* (perilaku lama) atau HTML bawaan tetap dipakai. */

  var HERO_TEXT_DEFAULT = {
    label: "Promo bulan ini",
    judul: "Rawat kendaraan tanpa antre dan tanpa ribet.",
    deskripsi:
      "Dari servis berkala, tune-up, ganti oli, hingga perbaikan " +
      "menyeluruh. Dapatkan promo terbaik, cek review jujur pelanggan " +
      "kami, dan konsultasi langsung dengan teknisi bengkel.",
  };

  var heroSlides = [];
  var heroSlideIndex = 0;
  var heroAutoplayAktif = false;
  var heroTimer = null;
  var heroAutoplayBound = false;
  var heroChangeToken = 0;
  var heroAutoplayManual = false;

  function prefersReducedMotion() {
    return Boolean(
      window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }

  function parseHeroSlides(info) {
    var list = info.hero_slides;

    if (typeof list === "string") {
      try {
        list = JSON.parse(list);
      } catch (error) {
        list = null;
      }
    }

    var slides = Array.isArray(list)
      ? list
          .filter(function (item) {
            return item && typeof item === "object";
          })
          .map(function (item) {
            return {
              foto: String(item.foto || "").trim(),
              label: String(item.label || "").trim(),
              judul: String(item.judul || "").trim(),
              deskripsi: String(item.deskripsi || "").trim(),
            };
          })
          .filter(function (item) {
            return item.foto || item.label || item.judul || item.deskripsi;
          })
          .slice(0, 5)
      : [];

    /* Kompatibilitas data lama: satu hero tanpa tabel slide. */
    if (!slides.length) {
      var lama = {
        foto: String(info.hero_foto || "").trim(),
        label: String(info.hero_label || "").trim(),
        judul: String(info.hero_judul || "").trim(),
        deskripsi: String(info.hero_deskripsi || "").trim(),
      };

      if (lama.foto || lama.label || lama.judul || lama.deskripsi) {
        slides.push(lama);
      }
    }

    return slides;
  }

  function setHeroBackground(foto) {
    var hero = document.querySelector(".lp-hero");
    if (!hero) return;

    var url = String(foto || "").trim();

    if (!url) {
      hero.style.removeProperty("--lp-hero-image");
      return;
    }

    var preload = new Image();
    preload.onload = function () {
      hero.style.setProperty(
        "--lp-hero-image",
        'url("' + url.replace(/"/g, "%22") + '")',
      );
    };
    preload.onerror = function () {
      hero.style.removeProperty("--lp-hero-image");
    };
    preload.src = url;
  }

  function updateHeroDots() {
    var dots = document.getElementById("lpHeroDots");
    if (!dots) return;

    Array.prototype.forEach.call(
      dots.querySelectorAll("button"),
      function (button, index) {
        var aktif = index === heroSlideIndex;
        button.classList.toggle("is-active", aktif);
        if (aktif) {
          button.setAttribute("aria-current", "true");
        } else {
          button.removeAttribute("aria-current");
        }
      },
    );
  }

  function renderHeroDots() {
    var dots = document.getElementById("lpHeroDots");
    if (!dots) return;

    dots.textContent = "";

    if (heroSlides.length < 2) {
      dots.hidden = true;
      return;
    }

    heroSlides.forEach(function (slide, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "lp-hero-slide-dot";
      button.setAttribute("aria-label", "Slide " + (index + 1));
      button.addEventListener("click", function () {
        /* Memilih slide manual menghentikan autoplay agar teks tidak
           langsung berganti lagi sebelum sempat dibaca. */
        heroAutoplayManual = true;
        stopHeroAutoplay();
        showHeroSlide(index, true);
      });
      dots.appendChild(button);
    });

    dots.hidden = false;
    updateHeroDots();
  }

  function stopHeroAutoplay() {
    if (heroTimer) {
      window.clearInterval(heroTimer);
      heroTimer = null;
    }
  }

  function startHeroAutoplay() {
    stopHeroAutoplay();

    if (
      !heroAutoplayAktif ||
      heroAutoplayManual ||
      heroSlides.length < 2 ||
      prefersReducedMotion()
    ) {
      return;
    }

    heroTimer = window.setInterval(function () {
      showHeroSlide((heroSlideIndex + 1) % heroSlides.length, true);
    }, 6500);
  }

  function showHeroSlide(index, animate) {
    if (!heroSlides.length) return;

    heroSlideIndex =
      ((Number(index) || 0) + heroSlides.length) % heroSlides.length;

    var slide = heroSlides[heroSlideIndex];
    var token = (heroChangeToken += 1);
    var copy = document.querySelector(".lp-hero-copy");

    function apply() {
      if (token !== heroChangeToken) return;

      var label = document.getElementById("lpHeroLabel");
      var judul = document.getElementById("lpHeroJudul");
      var deskripsi = document.getElementById("lpHeroDeskripsi");

      if (label) label.textContent = slide.label || HERO_TEXT_DEFAULT.label;
      if (judul) judul.textContent = slide.judul || HERO_TEXT_DEFAULT.judul;
      if (deskripsi) {
        deskripsi.textContent =
          slide.deskripsi || HERO_TEXT_DEFAULT.deskripsi;
      }

      setHeroBackground(slide.foto);
      updateHeroDots();
    }

    if (animate && copy && !prefersReducedMotion()) {
      copy.classList.add("is-hero-fading");
      window.setTimeout(function () {
        apply();
        copy.classList.remove("is-hero-fading");
      }, 220);
      return;
    }

    apply();
  }

  function renderHero(info) {
    var slides = parseHeroSlides(info);
    if (!slides.length) return;

    heroSlides = slides;
    heroAutoplayAktif =
      info.hero_autoplay === true ||
      String(info.hero_autoplay || "").toLowerCase() === "true";
    heroSlideIndex = 0;

    renderHeroDots();
    showHeroSlide(0, false);
    startHeroAutoplay();

    if (!heroAutoplayBound) {
      var hero = document.querySelector(".lp-hero");

      if (hero) {
        hero.addEventListener("mouseenter", stopHeroAutoplay);
        hero.addEventListener("mouseleave", startHeroAutoplay);
        hero.addEventListener("focusin", stopHeroAutoplay);
        hero.addEventListener("focusout", startHeroAutoplay);
      }

      document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
          stopHeroAutoplay();
        } else {
          startHeroAutoplay();
        }
      });

      heroAutoplayBound = true;
    }
  }

  /* Foto slot tetap (hero samping, hero mini, keunggulan, kartu layanan).
     Kosong = foto bawaan di html/index.html; URL admin menggantikannya. */
  var MEDIA_FOTO_IDS = {
    hero_sisi: "lpMediaHeroSisi",
    hero_mini: "lpMediaHeroMini",
    fitur: "lpMediaFitur",
    layanan_servis: "lpMediaLayananServis",
    layanan_diagnosa: "lpMediaLayananDiagnosa",
    layanan_suku: "lpMediaLayananSuku",
    layanan_qc: "lpMediaLayananQc",
  };

  function renderMediaFoto(info) {
    var media = info.media_foto;

    if (typeof media === "string") {
      try {
        media = JSON.parse(media);
      } catch (error) {
        media = null;
      }
    }

    Object.keys(MEDIA_FOTO_IDS).forEach(function (slot) {
      var img = document.getElementById(MEDIA_FOTO_IDS[slot]);
      if (!img) return;

      /* Gambar gagal dimuat (URL dihapus/diblokir) → lepas <img>
         supaya ikon fallback di bawahnya tampil lagi. */
      img.onerror = function () {
        img.remove();
      };

      var url =
        media && typeof media === "object"
          ? String(media[slot] || "").trim()
          : "";

      if (url) img.src = url;
    });
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
    setText("lpStatJam", info.jam_buka);

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

    /* Hero (foto + teks) diatur admin; bisa satu slide atau berganti
       otomatis bila autoplay diaktifkan. Tanpa data, HTML bawaan tetap. */
    renderHero(info);

    /* Galeri bengkel diatur admin lewat halaman Landing Page. Kalau
       kosong, galeri bawaan di HTML tetap tampil. */
    renderGallery(info.galeri_foto);

    /* Foto slot tetap (hero samping, keunggulan, kartu layanan) mengikuti
       data admin; kosong = foto bawaan di html/index.html. */
    renderMediaFoto(info);

  }

  /* Kartu rating di hero (satu-satunya tampilan ulasan di hero) memakai
     data yang sama dengan bagian ulasan: rata-rata + jumlah ulasan asli. */
  function renderHeroRating(average, total) {
    if (!average || !total) {
      setText("lpHeroMediaRating", "Belum ada ulasan");
      return;
    }

    setText(
      "lpHeroMediaRating",
      average.toFixed(1).replace(".", ",") + " · " + total + " ulasan",
    );
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

    /* Routing ke halaman detail — kunci route memakai created_at karena
       RPC publik public_reviews() tidak mengeluarkan id ulasan. */
    if (row.created_at) {
      var detailLink = document.createElement("a");
      detailLink.className = "lp-card-detail";
      detailLink.href =
        "detail.html?type=ulasan&id=" +
        encodeURIComponent(String(row.created_at));
      detailLink.appendChild(document.createTextNode("Lihat detail "));
      var detailArrow = document.createElement("i");
      detailArrow.className = "fa-solid fa-arrow-right";
      detailArrow.setAttribute("aria-hidden", "true");
      detailLink.appendChild(detailArrow);
      card.appendChild(detailLink);
    }

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

    setText("lpStatRating", "-");
    setText("lpStatUlasan", "0");

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

    var average = averageOf(rows);
    setText(
      "lpStatRating",
      average ? average.toFixed(1).replace(".", ",") : "-",
    );
    setText("lpStatUlasan", String(reviewState.total));

    renderHeroRating(average, reviewState.total);
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
    var statEl = document.getElementById("lpStatPromo");
    var n = Array.isArray(rows) ? rows.length : 0;
    if (countEl) {
      countEl.textContent = n ? n + " promo berlaku" : "Promo tersedia";
    }
    if (statEl) {
      statEl.textContent = String(n);
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
      /* Admin/super: langsung buka form Input Data service di dashboard.
         Customer: form ajukan service. Keduanya tetap membawa kode promo
         supaya diskonnya langsung tercentang. */
      var adminHref = "admin-page/dashboard.html" + (code ? "?klaim=" + encodeURIComponent(code) : "");
      /* Saat belum login, bawa tujuan klaim lewat ?next= supaya promo
         tetap terpilih setelah berhasil masuk. next diarahkan ke form
         customer; login admin/super memiliki tujuan sendiri. */
      var href =
        "login.html?role=customer&next=" +
        encodeURIComponent(loggedHref) +
        (code ? "&klaim=" + encodeURIComponent(code) : "");
      var card = document.createElement("article");
      card.className = "stat-card lp-promo-card";
      card.innerHTML =
        '<div class="lp-promo-head">' +
          '<span class="lp-promo-icon"><i class="fa-solid fa-tag"></i></span>' +
          '<span class="badge done"></span>' +
        "</div>" +
        "<h4></h4>" +
        "<p></p>" +
        '<a class="lp-card-detail" href="#">Lihat detail <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>' +
        '<div class="lp-promo-code"><span>Kode promo</span><strong></strong></div>' +
        '<div class="lp-promo-foot"><span><i class="fa-solid fa-calendar" aria-hidden="true"></i> <span class="lp-promo-period"></span></span>' +
          '<a data-auth-link data-loggedin-label="Klaim">Klaim <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>' +
        "</div>";
      card.querySelector(".badge").textContent = formatPromoValue(promo);
      card.querySelector("h4").textContent = promo.nama || "Promo";
      card.querySelector("p").textContent = promo.deskripsi || "Promo berlaku sesuai ketentuan bengkel.";
      card.querySelector(".lp-promo-code strong").textContent = code || "-";
      card.querySelector(".lp-promo-period").textContent = formatPromoPeriode(promo);
      /* Routing ke halaman detail — id utama, kode promo cadangan. */
      card
        .querySelector(".lp-card-detail")
        .setAttribute(
          "href",
          "detail.html?type=promo&id=" + encodeURIComponent(String(promo.id || code)),
        );
      var link = card.querySelector(".lp-promo-foot a");
      link.setAttribute("href", href);
      link.setAttribute("data-loggedin-href", loggedHref);
      link.setAttribute("data-admin-href", adminHref);
      grid.appendChild(card);
    });
    applyAuthLinks(grid);
  }

  var landingCustomerProfile = null;

  /* ---------- BLOK KONTEN (dinamis, dikelola admin) ---------- */

  async function getPublicBlocks() {
    var rows = await fetchRpc("public_page_blocks");
    return Array.isArray(rows) ? rows : [];
  }

  function buildBlockCard(block) {
    var tipe = String(block.tipe || "teks");
    var judul = String(block.judul || "").trim();
    var isi = String(block.deskripsi || "").trim();
    var gambar = String(block.gambar_url || "").trim();
    var tautan = String(block.tautan || "").trim();
    var label = String(block.tautan_label || "").trim();

    var card = document.createElement("article");
    card.className = "stat-card lp-block-card";

    /* Routing ke halaman detail — hanya bila blok punya id. */
    var detailHref = block.id
      ? "detail.html?type=informasi&id=" + encodeURIComponent(String(block.id))
      : "";

    var head = document.createElement("div");
    head.className = "lp-block-head";

    var icon = document.createElement("span");
    icon.className = "lp-block-icon";
    var iconEl = document.createElement("i");
    iconEl.className =
      "fa-solid " +
      (tipe === "gambar"
        ? "fa-image"
        : tipe === "cta"
          ? "fa-hand-point-right"
          : "fa-newspaper");
    iconEl.setAttribute("aria-hidden", "true");
    icon.appendChild(iconEl);
    head.appendChild(icon);

    var badge = document.createElement("span");
    badge.className = "badge working";
    badge.textContent =
      tipe === "gambar" ? "Gambar" : tipe === "cta" ? "Ajakan" : "Info";
    head.appendChild(badge);
    card.appendChild(head);

    /* Gambar opsional (URL apa pun yang diizinkan CSP halaman).
       Gagal dimuat -> elemen dilepas, kartu tetap terbaca. */
    if (gambar) {
      var img = document.createElement("img");
      img.className = "lp-block-img";
      img.src = gambar;
      img.alt = judul || "Gambar informasi";
      img.loading = "lazy";
      img.addEventListener("error", function () {
        img.remove();
      });
      card.appendChild(img);
    }

    if (judul) {
      var heading = document.createElement("h4");
      if (detailHref) {
        var titleLink = document.createElement("a");
        titleLink.className = "lp-card-detail-title";
        titleLink.href = detailHref;
        titleLink.textContent = judul;
        heading.appendChild(titleLink);
      } else {
        heading.textContent = judul;
      }
      card.appendChild(heading);
    }

    if (isi) {
      var body = document.createElement("p");
      body.textContent = isi;
      card.appendChild(body);
    }

    if (tautan && label) {
      var foot = document.createElement("div");
      foot.className = "lp-block-foot";
      var link = document.createElement("a");
      link.href = tautan;
      link.textContent = label;
      /* Tautan eksternal terbuka di tab baru & tanpa akses window. */
      if (/^https?:\/\//i.test(tautan)) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
      var arrow = document.createElement("i");
      arrow.className = "fa-solid fa-arrow-right";
      arrow.setAttribute("aria-hidden", "true");
      link.appendChild(arrow);
      foot.appendChild(link);
      card.appendChild(foot);
    } else if (detailHref) {
      /* Tanpa tautan eksternal → tawarkan buka halaman detail. */
      var detailFoot = document.createElement("div");
      detailFoot.className = "lp-block-foot";
      var detailLink = document.createElement("a");
      detailLink.className = "lp-card-detail";
      detailLink.href = detailHref;
      detailLink.appendChild(document.createTextNode("Lihat detail "));
      var detailArrow = document.createElement("i");
      detailArrow.className = "fa-solid fa-arrow-right";
      detailArrow.setAttribute("aria-hidden", "true");
      detailLink.appendChild(detailArrow);
      detailFoot.appendChild(detailLink);
      card.appendChild(detailFoot);
    }

    return card;
  }

  function renderBlocks(rows) {
    var list = document.getElementById("lpBlockList");
    if (!list) return;

    list.textContent = "";

    if (!Array.isArray(rows) || !rows.length) {
      var empty = document.createElement("div");
      empty.className = "review-card review-card-empty";
      empty.textContent = "Belum ada informasi terbaru.";
      list.appendChild(empty);
      return;
    }

    rows.forEach(function (block) {
      list.appendChild(buildBlockCard(block));
    });
  }

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
        ? link.getAttribute("data-admin-href") || "admin-page/dashboard.html"
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

    var blocks = await getPublicBlocks();
    renderBlocks(blocks);

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

  /* Animasi muncul saat di-scroll (progressive enhancement):
     kelas .lp-reveal hanya ditambahkan kalau IntersectionObserver
     tersedia, jadi tanpa JS/IO halaman tetap tampil normal. */
  function initReveal() {
    try {
      if (!("IntersectionObserver" in window)) return;
      if (
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }

      /* Hero sengaja tidak ikut animasi reveal: elemen pertama di layar
         harus langsung terlihat, bukan sempat transparan saat load. */
      var targets = document.querySelectorAll(
        ".lp-stats-strip, .lp-layout .panel, .lp-cta-banner",
      );
      if (!targets.length) return;

      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("lp-reveal-in");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.06, rootMargin: "0px 0px -30px 0px" },
      );

      Array.prototype.forEach.call(targets, function (el, index) {
        el.classList.add("lp-reveal");
        el.style.setProperty("--lp-reveal-delay", (index % 4) * 70 + "ms");
        observer.observe(el);
      });
    } catch (error) {
      /* Animasi hanya hiasan — kegagalan tidak boleh mengganggu
         konten; bila kelas sempat terpasang, paksa tampil. */
      document
        .querySelectorAll(".lp-reveal")
        .forEach(function (el) {
          el.classList.add("lp-reveal-in");
        });
    }
  }

  var year = document.getElementById("lpYear");
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  initReveal();
  initLandingNav();
  initGallerySlider();
  initLightbox();
  initAuthLinks();
  initReviewFilter();
  loadPublicData();
})();
