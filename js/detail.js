/* =========================================
   HALAMAN DETAIL — ROUTING DARI LANDING PAGE
   ---------------------------------------------------------------
   Dibuka dari kartu di halaman utama (html/index.html) lewat query
   string, tanpa framework:

     detail.html?type=promo&id=12            → detail promo
     detail.html?type=informasi&id=8         → detail blok informasi
     detail.html?type=layanan&id=servis-rutin-tune-up → detail layanan
     detail.html?type=ulasan&id=<created_at> → detail ulasan pelanggan

   Sumber data:
     * promo      → RPC publik public_promos()      (Supabase)
     * informasi  → RPC publik public_page_blocks() (Supabase)
     * ulasan     → RPC publik public_reviews()     (Supabase;
                    kunci route-nya created_at karena RPC tidak
                    mengeluarkan id)
     * layanan    → daftar statis di bawah ini (sama dengan
                    kartu "Layanan Bengkel" di landing page)

   Setelah render, tombol CTA memakai pola data-auth-link yang sama
   dengan landing page: tamu → halaman login, customer → form ajukan
   service, admin/super → dashboard.
   ========================================= */

(function () {
  "use strict";

  /* ---------- ROUTE ---------- */

  var TYPE_ALIAS = {
    promo: "promo",
    diskon: "promo",
    "promo-diskon": "promo",
    informasi: "informasi",
    info: "informasi",
    blok: "informasi",
    layanan: "layanan",
    service: "layanan",
    jasa: "layanan",
    ulasan: "ulasan",
    review: "ulasan",
    testimoni: "ulasan",
  };

  var TYPES = {
    promo: {
      label: "Promo & Diskon",
      crumb: "Promo",
      section: "index.html#promo",
      icon: "fa-tag",
      badge: "done",
      badgeIcon: "fa-tags",
      subtitle: "Penawaran yang sedang berlaku di Pytabengkel.",
      emptyTitle: "Promo tidak ditemukan",
      emptyText:
        "Promo ini sudah tidak berlaku atau tidak sedang ditampilkan.",
      emptyAlt: "Lihat promo lainnya",
    },
    informasi: {
      label: "Informasi Terbaru",
      crumb: "Informasi",
      section: "index.html#blok",
      icon: "fa-newspaper",
      badge: "working",
      badgeIcon: "fa-newspaper",
      subtitle: "Kabar, penawaran, dan info pilihan dari bengkel kami.",
      emptyTitle: "Informasi tidak ditemukan",
      emptyText:
        "Informasi ini sudah tidak ditampilkan di halaman utama.",
      emptyAlt: "Lihat informasi terbaru",
    },
    layanan: {
      label: "Layanan Bengkel",
      crumb: "Layanan",
      section: "index.html#layanan",
      icon: "fa-screwdriver-wrench",
      badge: "done",
      badgeIcon: "fa-screwdriver-wrench",
      subtitle: "Pekerjaan dan perawatan kendaraan yang tersedia di bengkel kami.",
      emptyTitle: "Layanan tidak ditemukan",
      emptyText: "Layanan dengan nama tersebut tidak tersedia.",
      emptyAlt: "Lihat semua layanan",
    },
    ulasan: {
      label: "Ulasan Pelanggan",
      crumb: "Ulasan",
      section: "index.html#ulasan",
      icon: "fa-star",
      badge: "done",
      badgeIcon: "fa-star",
      subtitle: "Penilaian dikirim setelah service berstatus selesai.",
      emptyTitle: "Ulasan tidak ditemukan",
      emptyText: "Ulasan ini sudah tidak ditampilkan di halaman utama.",
      emptyAlt: "Lihat semua ulasan",
    },
  };

  /* RPC publik yang dipakai tiap jenis — layanan memakai data statis. */
  var RPC_BY_TYPE = {
    promo: "public_promos",
    informasi: "public_page_blocks",
    ulasan: "public_reviews",
  };

  function parseRoute() {
    var params = new URLSearchParams(window.location.search);
    var rawType = String(params.get("type") || "")
      .trim()
      .toLowerCase();
    var rawId = String(params.get("id") || params.get("kode") || "").trim();
    return { type: TYPE_ALIAS[rawType] || "", id: rawId };
  }

  /* ---------- HELPER DOM ---------- */

  function qs(id) {
    return document.getElementById(id);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function icon(className) {
    var node = el("i", className);
    node.setAttribute("aria-hidden", "true");
    return node;
  }

  function showState(state) {
    qs("detailLoading").hidden = state !== "loading";
    qs("detailContent").hidden = state !== "content";
    qs("detailError").hidden = state !== "error";
    /* CTA dirender ulang tiap kali konten tampil — pastikan tujuan
       auth-nya ikut disesuaikan kalau sesi sudah terbaca lebih dulu. */
    if (state === "content") applyAuthLinks();
  }

  function setPanelType(type) {
    var conf = TYPES[type];
    if (!conf) return;

    qs("detailKicker").textContent = "Detail " + conf.label;
    qs("detailSubtitle").textContent = conf.subtitle;

    var badge = qs("detailBadge");
    badge.className = "badge " + conf.badge;
    badge.textContent = "";
    badge.appendChild(icon("fa-solid " + conf.badgeIcon));
    badge.appendChild(document.createTextNode(" " + conf.crumb));

    /* Breadcrumb: Beranda / Jenis / Judul */
    var path = qs("detailPath");
    path.textContent = "";
    var home = el("li");
    var homeLink = el("a", "", "Beranda");
    homeLink.href = "index.html";
    home.appendChild(homeLink);
    path.appendChild(home);

    var kind = el("li");
    var kindLink = el("a", "", conf.crumb);
    kindLink.href = conf.section;
    kind.appendChild(kindLink);
    path.appendChild(kind);

    path.appendChild(el("li", "", "\u00a0"));

    /* Tombol kembali ikut menunjuk ke section yang sesuai */
    qs("detailBack").setAttribute("href", conf.section);
    qs("detailBack").querySelector("span").textContent =
      "Kembali ke " + conf.crumb;

    var alt = qs("detailErrorAlt");
    alt.setAttribute("href", conf.section);
    alt.querySelector("span").textContent = conf.emptyAlt;
  }

  function setError(title, text) {
    showState("error");
    if (title) qs("detailErrorTitle").textContent = title;
    if (text) qs("detailErrorText").textContent = text;

    var badge = qs("detailBadge");
    badge.className = "badge neutral";
    badge.textContent = "";
    badge.appendChild(icon("fa-solid fa-circle-exclamation"));
    badge.appendChild(document.createTextNode(" Tidak tersedia"));
  }

  function setRouteTitle(name) {
    document.title = name + " | Pytabengkel";
    var current = qs("detailPath").lastElementChild;
    if (current) current.textContent = name;
    qs("detailBadge").setAttribute("title", name);
  }

  function addMeta(chips) {
    var box = qs("detailMeta");
    box.textContent = "";
    (chips || []).forEach(function (chip) {
      if (!chip || !chip.text) return;
      var item = el("span", "lp-detail-chip");
      item.appendChild(icon("fa-solid " + (chip.icon || "fa-circle-info")));
      item.appendChild(document.createTextNode(" " + chip.text));
      box.appendChild(item);
    });
    box.hidden = !box.childNodes.length;
  }

  function addBody(text) {
    var box = qs("detailBody");
    box.textContent = "";
    String(text || "")
      .split(/\n+/)
      .map(function (part) {
        return part.trim();
      })
      .filter(Boolean)
      .forEach(function (part) {
        box.appendChild(el("p", "", part));
      });
    box.hidden = !box.childNodes.length;
  }

  function addPoints(points) {
    var list = qs("detailPoints");
    list.textContent = "";
    (points || []).forEach(function (point) {
      if (!point) return;
      var item = el("li");
      item.appendChild(icon("fa-solid fa-circle-check"));
      item.appendChild(el("span", "", point));
      list.appendChild(item);
    });
    list.hidden = !list.childNodes.length;
  }

  function addImage(src, altText) {
    var figure = qs("detailFigure");
    var img = qs("detailImg");
    if (!src) {
      figure.hidden = true;
      return;
    }
    figure.hidden = false;
    img.alt = altText || "";
    img.onerror = function () {
      figure.hidden = true;
    };
    img.src = src;
  }

  function addHead(iconClass, kicker) {
    var box = qs("detailIcon");
    box.textContent = "";
    box.appendChild(icon("fa-solid " + (iconClass || "fa-circle-info")));
    qs("detailKickerChip").textContent = kicker || "";
  }

  function renderHeading(title, lead) {
    qs("detailTitle").textContent = title;
    var leadEl = qs("detailLead");
    leadEl.textContent = lead || "";
    leadEl.hidden = !lead;
  }

  /* ---------- TOMBOL CTA (sadar login, seperti landing) ---------- */

  function makeButton(opts) {
    var link = el("a", "btn " + (opts.primary ? "btn-primary" : "btn-secondary"));
    link.href = opts.href || "#";
    link.appendChild(
      icon(opts.icon || "fa-solid fa-arrow-right"),
    );
    link.appendChild(el("span", "", opts.label));
    if (opts.loggedinHref) link.setAttribute("data-loggedin-href", opts.loggedinHref);
    if (opts.adminHref) link.setAttribute("data-admin-href", opts.adminHref);
    if (opts.loggedinLabel) link.setAttribute("data-loggedin-label", opts.loggedinLabel);
    if (opts.loggedinHref || opts.adminHref) link.setAttribute("data-auth-link", "");
    if (opts.external) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    return link;
  }

  function addCta(buttons) {
    var box = qs("detailCta");
    box.textContent = "";
    (buttons || []).forEach(function (button) {
      if (button) box.appendChild(button);
    });
  }

  var currentProfile = null;

  /* Versi ringkas applyAuthLinks() milik landing page: menukar tujuan
     tautan berstatus data-auth-link sesuai role yang sedang login. */
  function applyAuthLinks() {
    var links = Array.prototype.slice.call(
      document.querySelectorAll("[data-auth-link]"),
    );
    if (!links.length) return;

    var profile = currentProfile;
    var role =
      profile && profile.role && typeof normalizeRole === "function"
        ? normalizeRole(profile.role)
        : null;
    var isCustomer = role === "customer" && profile.customer_id;
    var isStaff = role === "admin" || role === "super_admin";

    links.forEach(function (link) {
      if (link.getAttribute("data-auth-applied") === "1") return;
      if (!isCustomer && !isStaff) return;

      var loggedInHref = link.getAttribute("data-loggedin-href");
      var namaProfil = profile.nama ? String(profile.nama).trim() : "";
      var label =
        link.getAttribute("data-loggedin-label") ||
        namaProfil ||
        link.getAttribute("data-profile-label") ||
        "Profil";
      var targetHref = isStaff
        ? link.getAttribute("data-admin-href") || "admin-page/dashboard.html"
        : loggedInHref || "customers-page/dashboard.html";

      link.setAttribute("href", targetHref);
      if (typeof getRoleLabel === "function") {
        link.title = getRoleLabel(profile.role);
      }

      var span = link.querySelector("span");
      if (span) span.textContent = label;

      if (!loggedInHref) {
        var i = link.querySelector("i");
        if (i) {
          i.className = isStaff
            ? role === "super_admin"
              ? "fa-solid fa-crown"
              : "fa-solid fa-user-shield"
            : "fa-solid fa-user";
        }
      }
      link.setAttribute("data-auth-applied", "1");
    });
  }

  async function initAuth() {
    if (typeof Auth === "undefined" || typeof Auth.restoreSession !== "function") {
      return;
    }
    try {
      currentProfile = await Auth.restoreSession();
    } catch (error) {
      currentProfile = null;
      return;
    }
    applyAuthLinks();
  }

  /* ---------- DATA: RPC PUBLIK ---------- */

  async function fetchRpc(name) {
    if (typeof supabaseClient === "undefined" || !supabaseClient) return null;
    try {
      var result = await supabaseClient.rpc(name);
      if (result.error) return null;
      return result.data;
    } catch (error) {
      return null;
    }
  }

  /* ---------- DATA: LAYANAN (statis, sama dengan kartu landing) ---------- */

  var LAYANAN = [
    {
      slug: "servis-rutin-tune-up",
      judul: "Servis Rutin & Tune Up",
      ringkas:
        "Ganti oli mesin/transmisi, filter oli, busi, dan pembersihan filter udara.",
      durasi: "45 - 60 Menit",
      tag: "Servis Rutin",
      icon: "fa-oil-can",
      detail:
        "Servis rutin menjaga performa mesin dan konsumsi bahan bakar tetap optimal. " +
        "Pekerjaan dilakukan mengikuti jadwal kilometer kendaraan, dimulai dari pemeriksaan " +
        "kondisi mesin sebelum komponen diganti.\n" +
        "Setiap penggantian part tercatat di riwayat servis digital Anda, sehingga " +
        "perawatan berikutnya mudah dijadwalkan dan tidak ada pekerjaan yang terlewat.",
      poin: [
        "Ganti oli mesin dan oli transmisi sesuai kebutuhan kendaraan",
        "Pembersihan filter udara dan penggantian filter oli",
        "Pemeriksaan busi serta kondisi kelistrikan ringan",
        "Estimasi biaya disampaikan sebelum pekerjaan dimulai",
      ],
    },
    {
      slug: "perbaikan-diagnosa-mesin",
      judul: "Perbaikan & Diagnosa Mesin",
      ringkas:
        "Computerized engine scanner, diagnosa keluhan suara/getaran, dan overhaul mesin.",
      durasi: "Sesuai temuan",
      tag: "Scanning Akurat",
      icon: "fa-wrench",
      detail:
        "Keluhan mesin, suara aneh, atau getaran tidak selalu mudah ditebak. Kami memakai " +
        "computerized engine scanner untuk membaca kode kerja dan sensor mesin sebelum " +
        "pekerjaan bongkar dimulai.\n" +
        "Hasil diagnosa dijelaskan kepada Anda apa adanya: bagian yang harus diganti, " +
        "bagian yang masih layak pakai, dan urutan perbaikan beserta estimasi biayanya.",
      poin: [
        "Scanning komputer mesin untuk membaca sensor dan kode error",
        "Analisa keluhan suara, getaran, dan performa bersama teknisi",
        "Penjelasan temuan dan estimasi biaya sebelum perbaikan",
        "Overhaul mesin dikerjakan bertahap dengan persetujuan Anda",
      ],
    },
    {
      slug: "suku-cadang-kaki-kaki",
      judul: "Suku Cadang & Kaki-kaki",
      ringkas:
        "Rem, shockbreaker, bearing, rack end, dan penggantian sparepart original bergaransi.",
      durasi: "45 - 90 Menit",
      tag: "Garansi Suku Cadang",
      icon: "fa-gears",
      detail:
        "Kaki-kaki menentukan kenyamanan dan keselamatan berkendara. Pemeriksaan mencakup " +
        "rem, shockbreaker, bearing, rack end, dan komponen penopang lainnya.\n" +
        "Suku cadang yang kami pasang menggunakan part original dan tercatat di buku " +
        "riwayat servis digital beserta garansinya.",
      poin: [
        "Pemeriksaan sistem rem dan kampas rem",
        "Penggantian shockbreaker, bearing, dan rack end",
        "Suku cadang original yang tercatat di riwayat servis",
        "Garansi suku cadang mengikuti part yang dipasang",
      ],
    },
    {
      slug: "quality-control-test-drive",
      judul: "Quality Control & Test Drive",
      ringkas:
        "Pemeriksaan 25 titik standar keamanan dan uji jalan sebelum diserahkan ke pelanggan.",
      durasi: "20 - 30 Menit",
      tag: "25 Titik Cek",
      icon: "fa-clipboard-check",
      detail:
        "Sebelum kendaraan diserahkan, teknisi melakukan pemeriksaan 25 titik standar " +
        "keamanan yang mencakup lampu, rem, ban, steer, dan fungsi kabin.\n" +
        "Uji jalan terakhir memastikan tidak ada keluhan baru yang muncul setelah " +
        "pekerjaan service selesai.",
      poin: [
        "Checklist 25 titik standar keamanan kendaraan",
        "Pemeriksaan lampu, rem, ban, dan sistem steer",
        "Uji jalan singkat oleh teknisi",
        "Kendaraan diserahkan bersama ringkasan pekerjaan",
      ],
    },
  ];

  function findLayanan(slug) {
    var key = String(slug || "").toLowerCase();
    for (var i = 0; i < LAYANAN.length; i += 1) {
      if (LAYANAN[i].slug === key) return LAYANAN[i];
    }
    return null;
  }

  /* ---------- FORMATTER (sama dengan landing) ---------- */

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
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
    var a = fmt(promo.mulai);
    var b = fmt(promo.sampai);
    if (a && b) return a + " \u2013 " + b;
    if (a) return "Mulai " + a;
    if (b) return "Sampai " + b;
    return "Periode terbatas";
  }

  /* ---------- RENDER PER JENIS ---------- */

  function renderPromo(promo) {
    var code = String(promo.kode || "").trim();
    var loggedHref =
      "customers-page/kendaraan.html?ajukan=1" +
      (code ? "&promo=" + encodeURIComponent(code) : "");
    var adminHref =
      "admin-page/dashboard.html" +
      (code ? "?klaim=" + encodeURIComponent(code) : "");

    setPanelType("promo");
    addHead("fa-tag", "Promo & Diskon");
    renderHeading(promo.nama || "Promo", promo.deskripsi || "");
    setRouteTitle(promo.nama || "Promo");

    addMeta([
      { icon: "fa-tags", text: formatPromoValue(promo) },
      { icon: "fa-calendar", text: formatPromoPeriode(promo) },
      code ? { icon: "fa-ticket", text: "Kode: " + code } : null,
    ]);

    addBody(
      promo.deskripsi ||
        "Promo berlaku sesuai ketentuan bengkel selama periode masih berlangsung.",
    );

    addPoints([
      "Berlaku untuk kendaraan terdaftar dan selama periode promo masih berlangsung",
      "Satu service boleh memakai lebih dari satu promo \u2014 centang beberapa promo di form service",
      "Kode promo otomatis tercentang saat Anda membuka form ajukan service",
    ]);

    addImage("", "");

    var claim =
      "login.html?role=customer&next=" +
      encodeURIComponent(loggedHref) +
      (code ? "&klaim=" + encodeURIComponent(code) : "");

    addCta([
      makeButton({
        primary: true,
        label: "Klaim Promo",
        loggedinLabel: "Klaim Sekarang",
        icon: "fa-solid fa-tag",
        href: claim,
        loggedinHref: loggedHref,
        adminHref: adminHref,
      }),
      makeButton({
        label: "Lihat Promo Lainnya",
        icon: "fa-solid fa-arrow-rotate-left",
        href: TYPES.promo.section,
      }),
    ]);

    showState("content");
  }

  function renderInformasi(block) {
    var judul = String(block.judul || "").trim();
    var tautan = String(block.tautan || "").trim();
    var label = String(block.tautan_label || "").trim();
    var tipe = String(block.tipe || "teks");

    setPanelType("informasi");
    addHead(
      tipe === "gambar"
        ? "fa-image"
        : tipe === "cta"
          ? "fa-hand-point-right"
          : "fa-newspaper",
      tipe === "gambar" ? "Galeri" : tipe === "cta" ? "Ajakan" : "Informasi",
    );
    renderHeading(judul || "Informasi Terbaru", "");
    setRouteTitle(judul || "Informasi Terbaru");

    addMeta([
      {
        icon: "fa-circle-info",
        text: tipe === "gambar" ? "Info gambar" : tipe === "cta" ? "Ajakan" : "Artikel singkat",
      },
    ]);

    addBody(String(block.deskripsi || "").trim());
    addPoints([]);
    addImage(String(block.gambar_url || "").trim(), judul);

    var buttons = [];
    if (tautan) {
      buttons.push(
        makeButton({
          primary: true,
          label: label || "Buka Tautan",
          icon: /^https?:\/\//i.test(tautan)
            ? "fa-solid fa-arrow-up-right-from-square"
            : "fa-solid fa-arrow-right",
          href: tautan,
          external: /^https?:\/\//i.test(tautan),
        }),
      );
    }
    buttons.push(
      makeButton({
        label: "Lihat Informasi Lainnya",
        icon: "fa-solid fa-arrow-rotate-left",
        href: TYPES.informasi.section,
      }),
    );
    addCta(buttons);

    showState("content");
  }

  function renderLayanan(item) {
    setPanelType("layanan");
    addHead(item.icon, "Layanan Bengkel");
    renderHeading(item.judul, item.ringkas);
    setRouteTitle(item.judul);

    addMeta([
      { icon: "fa-clock", text: "Estimasi " + item.durasi },
      { icon: "fa-circle-check", text: item.tag },
    ]);

    addBody(item.detail);
    addPoints(item.poin);
    addImage("", "");

    var next = "customers-page/kendaraan.html?ajukan=1";
    addCta([
      makeButton({
        primary: true,
        label: "Ajukan Service",
        loggedinLabel: "Ajukan Service",
        icon: "fa-solid fa-calendar-plus",
        href: "login.html?role=customer&next=" + encodeURIComponent(next),
        loggedinHref: next,
        adminHref: "admin-page/dashboard.html",
      }),
      makeButton({
        label: "Lihat Layanan Lainnya",
        icon: "fa-solid fa-arrow-rotate-left",
        href: TYPES.layanan.section,
      }),
    ]);

    showState("content");
  }

  function formatTanggalPanjang(value) {
    if (!value) return "";
    var d = new Date(String(value));
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function renderUlasan(row) {
    var nama = String(row.nama || "").trim() || "Pelanggan";
    var rating = Number(row.rating) || 0;
    var komentar = String(row.komentar || "").trim();

    setPanelType("ulasan");
    addHead("fa-star", "Ulasan Pelanggan");
    renderHeading(nama, "");
    setRouteTitle(nama);

    addMeta([
      { icon: "fa-star", text: rating + " dari 5 bintang" },
      {
        icon: "fa-calendar",
        text: formatTanggalPanjang(row.created_at) || "Baru saja",
      },
    ]);

    addBody(komentar || "Memberi penilaian tanpa menulis komentar.");
    addPoints([]);
    addImage("", "");

    /* Customer menulis ulasan dari Riwayat; admin mengelolanya dari
       halaman Kelola Landing. Tamu diarahkan lewat halaman login. */
    var next = "customers-page/riwayat.html";
    addCta([
      makeButton({
        primary: true,
        label: "Beri Ulasan Anda",
        loggedinLabel: "Beri Ulasan Anda",
        icon: "fa-solid fa-star",
        href: "login.html?role=customer&next=" + encodeURIComponent(next),
        loggedinHref: next,
        adminHref: "admin-page/landing.html",
      }),
      makeButton({
        label: "Lihat Ulasan Lainnya",
        icon: "fa-solid fa-arrow-rotate-left",
        href: TYPES.ulasan.section,
      }),
    ]);

    showState("content");
  }

  /* ---------- INTI ---------- */

  async function init() {
    var route = parseRoute();
    var conf = TYPES[route.type];

    /* Route tidak dikenal → langsung tampilkan keadaan "tidak ditemukan". */
    if (!conf) {
      qs("detailKicker").textContent = "Detail";
      qs("detailSubtitle").textContent = "Tautan yang dibuka tidak dikenali.";
      qs("detailBack").setAttribute("href", "index.html");
      setError(
        "Halaman detail tidak ditemukan",
        "Tautan yang Anda buka tidak cocok dengan jenis konten mana pun. " +
          "Silakan kembali ke halaman utama Pytabengkel.",
      );
      qs("detailErrorAlt").setAttribute("href", "index.html");
      qs("detailErrorAlt").querySelector("span").textContent = "Ke halaman utama";
      return;
    }

    setPanelType(route.type);
    showState("loading");

    if (!route.id) {
      setError(
        conf.emptyTitle,
        conf.emptyText + " Buka halaman utama untuk melihat daftar lengkapnya.",
      );
      return;
    }

    if (route.type === "layanan") {
      var item = findLayanan(route.id);
      if (item) {
        renderLayanan(item);
      } else {
        setError(conf.emptyTitle, conf.emptyText);
      }
      return;
    }

    var rows = await fetchRpc(RPC_BY_TYPE[route.type]);

    if (!rows) {
      setError(
        "Data gagal dimuat",
        "Koneksi ke Supabase belum tersedia atau data sedang tidak dapat " +
          "diakses. Coba muat ulang halaman ini.",
      );
      var alt = qs("detailErrorAlt");
      alt.setAttribute("href", window.location.href);
      alt.querySelector("span").textContent = "Muat ulang";
      return;
    }

    var wanted = route.id.toLowerCase();
    var found = null;
    (Array.isArray(rows) ? rows : []).forEach(function (row) {
      if (found) return;
      var cocokId = String(row.id || "") === route.id;
      var cocokKode =
        route.type === "promo" &&
        String(row.kode || "").toLowerCase() === wanted;
      /* public_reviews() tidak mengeluarkan id — created_at dipakai
         sebagai kunci route (presisi penuh, praktis tidak mungkin dobel). */
      var cocokWaktu =
        route.type === "ulasan" &&
        String(row.created_at || "") === route.id;
      if (cocokId || cocokKode || cocokWaktu) found = row;
    });

    if (!found) {
      setError(conf.emptyTitle, conf.emptyText);
      return;
    }

    if (route.type === "promo") {
      renderPromo(found);
    } else if (route.type === "ulasan") {
      renderUlasan(found);
    } else {
      renderInformasi(found);
    }
  }

  function initYear() {
    var year = qs("lpYear");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  document.addEventListener("DOMContentLoaded", function () {
    initYear();
    init();
    initAuth();
  });
})();
