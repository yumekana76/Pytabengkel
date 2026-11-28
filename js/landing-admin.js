/* =====================================================================
   HALAMAN KELOLA LANDING PAGE (SUPER ADMIN)
   ---------------------------------------------------------------------
   Satu halaman untuk semua yang bisa mengubah landing page:
   - Hero landing (foto + teks)      → workshop_info.hero_*
   - Galeri bengkel (foto + teks)    → workshop_info.galeri_foto
   - Informasi bengkel               → workshop_info.*
   - Promo & diskon                  → js/diskon.js
   - Blok informasi terbaru          → js/blok.js
   - Ulasan (lihat / hapus)          → js/ulasan.js
   ===================================================================== */

/* ---------------- PRATINJAU ISI LANDING ---------------- */

/* Slot foto tetap landing page yang dikelola lewat modal Foto Halaman:
   hero samping, foto mini hero, keunggulan, dan 4 kartu layanan.
   Kunci harus sama dengan MEDIA_FOTO_SLOTS di js/db.js. */
const MEDIA_SLOTS = [
  {
    key: "hero_sisi",
    kategori: "hero",
    label: "Foto Hero Samping",
    deskripsi: "Foto utama di sebelah kanan teks hero pembuka.",
    defaultImg: "../../asset/img/hero-workshop.jpg",
  },
  {
    key: "hero_mini",
    kategori: "hero",
    label: "Foto Mini Hero (Badge Quality)",
    deskripsi: "Foto mengambang kecil pada badge di sudut foto hero samping.",
    defaultImg: "../../asset/img/galeri-detailing.jpg",
  },
  {
    key: "fitur",
    kategori: "keunggulan",
    label: "Foto Keunggulan Bengkel",
    deskripsi: "Foto ilustrasi di sebelah daftar alasan memilih bengkel.",
    defaultImg: "../../asset/img/keunggulan-technician.jpg",
  },
  {
    key: "layanan_servis",
    kategori: "layanan",
    label: "Kartu Layanan: Servis Rutin & Tune Up",
    deskripsi: "Foto cover kartu paket servis berkala dan tune up mesin.",
    defaultImg: "../../asset/img/layanan-servis-rutin.jpg",
  },
  {
    key: "layanan_diagnosa",
    kategori: "layanan",
    label: "Kartu Layanan: Perbaikan & Diagnosa",
    deskripsi: "Foto cover kartu layanan perbaikan mesin dan scan komputer.",
    defaultImg: "../../asset/img/layanan-diagnosa.jpg",
  },
  {
    key: "layanan_suku",
    kategori: "layanan",
    label: "Kartu Layanan: Suku Cadang & Kaki-kaki",
    deskripsi: "Foto cover kartu penggantian onderdil dan suspensi.",
    defaultImg: "../../asset/img/layanan-suku-cadang.jpg",
  },
  {
    key: "layanan_qc",
    kategori: "layanan",
    label: "Kartu Layanan: Quality Control & Test Drive",
    deskripsi: "Foto cover kartu inspeksi akhir dan uji kelayakan jalan.",
    defaultImg: "../../asset/img/layanan-quality-control.jpg",
  },
];

function renderLandingPreview() {
  const box = document.getElementById("landingPreview");
  if (!box || typeof getBengkelInfoLengkap !== "function") return;

  const info = getBengkelInfoLengkap();

  function item(label, value, full) {
    return (
      '<div class="detail-item' + (full ? " full" : "") + '">' +
      '<span class="detail-label">' + escapeHTML(label) + "</span>" +
      '<span class="detail-value">' + escapeHTML(value || "-") + "</span>" +
      "</div>"
    );
  }

  const slides = info.heroSlides || [];
  const foto = slides.length
    ? '<div class="detail-item full">' +
        '<span class="detail-label">Slide Hero (' +
        slides.length +
        (info.heroAutoplay ? " · otomatis" : " · manual") +
        ")</span>" +
        '<span class="detail-value landing-galeri-preview">' +
        slides
          .map(function (slide, index) {
            if (!slide.foto) {
              return (
                '<span class="hero-slide-preview-empty">Slide ' +
                (index + 1) +
                " tanpa foto</span>"
              );
            }
            return (
              '<img src="' +
              escapeHTML(slide.foto) +
              '" alt="' +
              escapeHTML(slide.judul || "Slide hero " + (index + 1)) +
              '" />'
            );
          })
          .join("") +
        "</span>" +
        "</div>"
    : info.heroFoto
      ? '<div class="detail-item full">' +
          '<span class="detail-label">Foto Latar Hero</span>' +
          '<span class="detail-value">' +
          '<img src="' +
          escapeHTML(info.heroFoto) +
          '" alt="Foto hero landing" ' +
          'style="max-width:100%; max-height:160px; border-radius:10px; object-fit:cover;" />' +
          "</span>" +
          "</div>"
      : "";

  const galeri = info.galeriFoto || [];
  const galeriPreview = galeri.length
    ? '<div class="detail-item full">' +
        '<span class="detail-label">Galeri Bengkel (' +
        galeri.length +
        " foto)</span>" +
        '<span class="detail-value landing-galeri-preview">' +
        galeri
          .map(function (fotoGaleri) {
            return (
              '<img src="' +
              escapeHTML(fotoGaleri.url) +
              '" alt="' +
              escapeHTML(fotoGaleri.judul || "Foto galeri landing") +
              '" />'
            );
          })
          .join("") +
        "</span>" +
        "</div>"
    : "";

  const mediaFoto = info.mediaFoto || {};
  const activeMediaCount = MEDIA_SLOTS.filter(function (slot) {
    const val = mediaFoto[slot.key];
    const url = typeof val === "string" ? val : val && typeof val === "object" ? val.url : "";
    return !!url;
  }).length;

  const mediaPreview =
    '<div class="detail-item full">' +
    '<div class="media-admin-preview-header">' +
    '<span class="detail-label"><i class="fa-solid fa-panorama"></i> Pratinjau Foto Halaman (' +
    (activeMediaCount > 0 ? activeMediaCount + " Foto Kustom" : "Semua Bawaan") +
    ")</span>" +
    '<button type="button" class="btn btn-sm btn-secondary" id="btnMediaFotoShortcut"><i class="fa-solid fa-pen-to-square"></i> Kelola Foto Halaman</button>' +
    "</div>" +
    '<div class="media-preview-grid">' +
    MEDIA_SLOTS.map(function (slot) {
      const slotData = mediaFoto[slot.key];
      const slotUrl =
        typeof slotData === "string"
          ? slotData
          : slotData && typeof slotData === "object"
            ? slotData.url || ""
            : "";
      const displayUrl = slotUrl || slot.defaultImg;
      const posisi =
        slotData && typeof slotData === "object" && slotData.posisi
          ? slotData.posisi
          : "50% 50%";
      const zoom =
        slotData && typeof slotData === "object" && slotData.zoom
          ? parseFloat(slotData.zoom) || 1
          : 1;

      return (
        '<div class="media-preview-item" title="' +
        escapeHTML(slot.label) +
        '">' +
        '<div class="media-preview-thumb-wrap">' +
        '<img src="' +
        escapeHTML(displayUrl) +
        '" style="object-position:' +
        escapeHTML(posisi) +
        "; transform:scale(" +
        zoom +
        ');" alt="' +
        escapeHTML(slot.label) +
        '" />' +
        (slotUrl
          ? '<span class="media-preview-badge custom"><i class="fa-solid fa-cloud"></i> Kustom</span>'
          : '<span class="media-preview-badge default">Bawaan</span>') +
        "</div>" +
        '<div class="media-preview-caption">' +
        '<span class="media-preview-title">' +
        escapeHTML(slot.label) +
        "</span>" +
        "</div>" +
        "</div>"
      );
    }).join("") +
    "</div>" +
    "</div>";

  box.innerHTML =
    item("Nama Bengkel", info.nama) +
    item("Label Hero", info.heroLabel) +
    item("Judul Hero", info.heroJudul, true) +
    item("Deskripsi Hero", info.heroDeskripsi, true) +
    item("Ganti Slide Otomatis", info.heroAutoplay ? "Aktif" : "Nonaktif") +
    foto +
    galeriPreview +
    mediaPreview +
    item("Alamat", info.alamat, true) +
    item("Kontak", info.kontak) +
    item("Email", info.email) +
    item("Hari Buka", info.hariBuka) +
    item("Jam Buka", info.jamBuka);
}

/* ---------------- INISIALISASI ---------------- */

function initLandingAdminPage() {
  /* Guard: hanya jalan di html/admin-page/landing.html. */
  if (!document.getElementById("landingMain")) return;

  /* ---------------- TAB KATEGORI ----------------
     Halaman panjang dipecah per kategori supaya admin tidak perlu
     scroll jauh. Hash #landing-promo dsb. bisa dipakai untuk membuka
     tab tertentu langsung. */
  function initLandingTabs() {
    const tabs = Array.prototype.slice.call(
      document.querySelectorAll("[data-landing-tab]"),
    );
    const panels = Array.prototype.slice.call(
      document.querySelectorAll("[data-landing-tab-panel]"),
    );

    if (!tabs.length || !panels.length) return;

    const namaTab = tabs.map(function (tab) {
      return tab.getAttribute("data-landing-tab");
    });

    panels.forEach(function (panel) {
      panel.classList.add("landing-admin-panel");
    });

    function activate(name, updateHash) {
      const aktif = namaTab.indexOf(name) !== -1 ? name : namaTab[0];

      tabs.forEach(function (tab) {
        const dipilih = tab.getAttribute("data-landing-tab") === aktif;
        tab.classList.toggle("is-active", dipilih);
        tab.setAttribute("aria-pressed", dipilih ? "true" : "false");
      });

      panels.forEach(function (panel) {
        panel.hidden =
          panel.getAttribute("data-landing-tab-panel") !== aktif;
      });

      if (updateHash) {
        try {
          history.replaceState(null, "", "#landing-" + aktif);
        } catch (error) {
          /* file:// atau kebijakan browser — hash tidak wajib. */
        }
      }
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        activate(tab.getAttribute("data-landing-tab"), true);
      });
    });

    const hash = String(window.location.hash || "").replace(
      "#landing-",
      "",
    );

    activate(hash || "hero", false);
  }

  initLandingTabs();
  renderLandingPreview();

  const previewBox = document.getElementById("landingPreview");
  if (previewBox) {
    previewBox.addEventListener("click", function (event) {
      const shortcut = event.target.closest("#btnMediaFotoShortcut");
      if (shortcut && mediaButton) {
        mediaButton.click();
      }
    });
  }

  /* ---------------- INFORMASI BENGKEL ---------------- */
  const infoButton = document.getElementById("btnInfoBengkel");
  if (infoButton) {
    infoButton.addEventListener("click", () => {
      clearFormError("infoForm");
      const current = getBengkelInfoLengkap();
      document.getElementById("infoNama").value =
        current.nama || "Pytabengkel";
      document.getElementById("infoAlamat").value = current.alamat || "";
      document.getElementById("infoKontak").value = current.kontak || "";
      document.getElementById("infoEmail").value = current.email || "";
      document.getElementById("infoHariBuka").value = current.hariBuka || "";
      document.getElementById("infoJamBuka").value = current.jamBuka || "";
      openModal("infoModal");
    });
  }

  const infoForm = document.getElementById("infoForm");
  if (infoForm) {
    infoForm.addEventListener("submit", (event) => {
      event.preventDefault();
      clearFormError("infoForm");
      const nama = document.getElementById("infoNama").value.trim();
      if (!nama) {
        showFormError("infoForm", "Nama bengkel wajib diisi.");
        return;
      }
      saveWorkshopInfo({
        nama,
        alamat: document.getElementById("infoAlamat").value.trim(),
        kontak: document.getElementById("infoKontak").value.trim(),
        email: document.getElementById("infoEmail").value.trim(),
        hariBuka: document.getElementById("infoHariBuka").value.trim(),
        jamBuka: document.getElementById("infoJamBuka").value.trim(),
      });
      closeModal("infoModal");
      renderLandingPreview();
      showPageNotice("Informasi bengkel disimpan.", "success");
    });
  }

  /* ---------------- HERO LANDING ----------------
     Hero dapat berisi beberapa slide (foto + teks). Slide disimpan di
     workshop_info.hero_slides; status autoplay di hero_autoplay.
     Kolom hero_* lama tetap diisi dari slide pertama agar kompatibel
     dengan landing versi lama dan data hasil backup. */
  const HERO_SLIDE_MAX = 5;

  const heroFotoButton = document.getElementById("btnHeroFoto");
  const heroAutoplayInput = document.getElementById("heroAutoplay");
  const heroSlideList = document.getElementById("heroSlideList");
  const heroSlideEmpty = document.getElementById("heroSlideEmpty");
  const btnTambahHeroSlide = document.getElementById("btnTambahHeroSlide");
  const heroFotoError = document.getElementById("heroFotoFormError");
  const heroFotoSimpan = document.getElementById("btnSimpanHeroFoto");
  const heroSimpanHTML = heroFotoSimpan ? heroFotoSimpan.innerHTML : "";

  let heroSlideItems = [];
  let heroFotoLama = [];

  function newHeroSlide() {
    return {
      foto: "",
      label: "",
      judul: "",
      deskripsi: "",
      file: null,
      preview: "",
      status: "",
    };
  }

  function showHeroFotoError(message) {
    if (!heroFotoError) return;
    heroFotoError.textContent = message || "";
    heroFotoError.hidden = !message;
  }

  function renderHeroSlides() {
    if (!heroSlideList) return;

    if (heroSlideEmpty) heroSlideEmpty.hidden = heroSlideItems.length > 0;

    if (!heroSlideItems.length) {
      heroSlideList.innerHTML = "";
      return;
    }

    heroSlideList.innerHTML = heroSlideItems
      .map(function (item, index) {
        const foto = item.preview || item.foto || "";
        const gambar = foto
          ? '<img class="hero-slide-thumb" src="' +
            escapeHTML(foto) +
            '" alt="Pratinjau slide ' +
            (index + 1) +
            '" />'
          : '<span class="hero-slide-thumb hero-slide-thumb-empty">' +
            '<i class="fa-solid fa-image" aria-hidden="true"></i></span>';

        return (
          '<div class="hero-slide-card">' +
          '<div class="hero-slide-media">' +
          gambar +
          '<label class="btn btn-secondary btn-sm hero-slide-file">' +
          (foto ? "Ganti Foto" : "Pilih Foto") +
          '<input type="file" accept="image/*" data-hero-file="' +
          index +
          '" hidden />' +
          "</label>" +
          (item.status
            ? '<span class="hero-slide-status">' +
              escapeHTML(item.status) +
              "</span>"
            : "") +
          "</div>" +
          '<div class="hero-slide-fields">' +
          '<div class="hero-slide-head">' +
          "<strong>Slide " +
          (index + 1) +
          "</strong>" +
          (index === 0
            ? '<span class="badge done">Slide utama</span>'
            : "") +
          '<div class="hero-slide-actions">' +
          '<button type="button" class="action-btn" data-hero-up="' +
          index +
          '" aria-label="Naikkan slide ' +
          (index + 1) +
          '"' +
          (index === 0 ? " disabled" : "") +
          '><i class="fa-solid fa-arrow-up" aria-hidden="true"></i></button>' +
          '<button type="button" class="action-btn" data-hero-down="' +
          index +
          '" aria-label="Turunkan slide ' +
          (index + 1) +
          '"' +
          (index === heroSlideItems.length - 1 ? " disabled" : "") +
          '><i class="fa-solid fa-arrow-down" aria-hidden="true"></i></button>' +
          '<button type="button" class="action-btn danger" data-hero-remove="' +
          index +
          '" aria-label="Hapus slide ' +
          (index + 1) +
          '"><i class="fa-solid fa-trash" aria-hidden="true"></i> Hapus</button>' +
          "</div>" +
          "</div>" +
          "<label>Label Kecil</label>" +
          '<input type="text" class="form-control" maxlength="60" ' +
          'data-hero-field="label" data-index="' +
          index +
          '" value="' +
          escapeHTML(item.label || "") +
          '" placeholder="Contoh: Promo bulan ini" />' +
          "<label>Judul</label>" +
          '<input type="text" class="form-control" maxlength="120" ' +
          'data-hero-field="judul" data-index="' +
          index +
          '" value="' +
          escapeHTML(item.judul || "") +
          '" placeholder="Judul slide" />' +
          "<label>Deskripsi</label>" +
          '<textarea class="form-control" rows="2" maxlength="400" ' +
          'data-hero-field="deskripsi" data-index="' +
          index +
          '" placeholder="Deskripsi singkat slide">' +
          escapeHTML(item.deskripsi || "") +
          "</textarea>" +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  function pindahHeroSlide(index, arah) {
    const tujuan = index + arah;
    if (tujuan < 0 || tujuan >= heroSlideItems.length) return;
    const tukar = heroSlideItems[arah > 0 ? index + 1 : index - 1];
    heroSlideItems[arah > 0 ? index + 1 : index - 1] = heroSlideItems[index];
    heroSlideItems[index] = tukar;
    renderHeroSlides();
  }

  function tambahHeroSlide() {
    if (heroSlideItems.length >= HERO_SLIDE_MAX) {
      showHeroFotoError("Maksimal " + HERO_SLIDE_MAX + " slide hero.");
      return;
    }
    showHeroFotoError("");
    heroSlideItems.push(newHeroSlide());
    renderHeroSlides();
  }

  function pilihHeroFile(index, file, input) {
    const item = heroSlideItems[index];
    if (!item || !file) return;

    showHeroFotoError("");

    if (!String(file.type || "").startsWith("image/")) {
      input.value = "";
      showHeroFotoError("File harus berupa gambar (jpg/png/webp).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      input.value = "";
      showHeroFotoError("Ukuran foto maksimal 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = function () {
      item.file = file;
      item.preview = String(reader.result || "");
      item.status = "Siap diunggah";
      renderHeroSlides();
    };
    reader.onerror = function () {
      showHeroFotoError("Foto tidak dapat dibaca.");
    };
    reader.readAsDataURL(file);
  }

  if (heroFotoButton) {
    heroFotoButton.addEventListener("click", function () {
      const current = getBengkelInfoLengkap();

      showHeroFotoError("");
      heroFotoLama = current.heroSlides
        .map(function (slide) {
          return slide.foto;
        })
        .concat(current.heroFoto ? [current.heroFoto] : []);

      heroSlideItems = current.heroSlides.map(function (slide) {
        return {
          foto: slide.foto,
          label: slide.label,
          judul: slide.judul,
          deskripsi: slide.deskripsi,
          file: null,
          preview: "",
          status: "",
        };
      });

      /* Data lama (satu hero tanpa slide) tetap bisa diedit. */
      if (!heroSlideItems.length) {
        const lama = {
          foto: current.heroFoto,
          label: current.heroLabel,
          judul: current.heroJudul,
          deskripsi: current.heroDeskripsi,
        };

        if (lama.foto || lama.label || lama.judul || lama.deskripsi) {
          heroSlideItems.push(Object.assign(newHeroSlide(), lama));
        }
      }

      if (!heroSlideItems.length) heroSlideItems.push(newHeroSlide());

      if (heroAutoplayInput) {
        heroAutoplayInput.checked = current.heroAutoplay === true;
      }

      renderHeroSlides();
      openModal("heroFotoModal");
    });
  }

  if (btnTambahHeroSlide) {
    btnTambahHeroSlide.addEventListener("click", tambahHeroSlide);
  }

  if (heroSlideList) {
    heroSlideList.addEventListener("input", function (event) {
      const input = event.target.closest("[data-hero-field]");
      if (!input) return;
      const item = heroSlideItems[Number(input.dataset.index)];
      if (item) item[input.dataset.heroField] = input.value;
    });

    heroSlideList.addEventListener("change", function (event) {
      const input = event.target.closest("[data-hero-file]");
      if (!input) return;
      pilihHeroFile(
        Number(input.dataset.heroFile),
        input.files && input.files[0],
        input,
      );
    });

    heroSlideList.addEventListener("click", function (event) {
      const up = event.target.closest("[data-hero-up]");
      const down = event.target.closest("[data-hero-down]");
      const remove = event.target.closest("[data-hero-remove]");

      if (up) {
        pindahHeroSlide(Number(up.dataset.heroUp), -1);
        return;
      }

      if (down) {
        pindahHeroSlide(Number(down.dataset.heroDown), 1);
        return;
      }

      if (remove) {
        heroSlideItems.splice(Number(remove.dataset.heroRemove), 1);
        renderHeroSlides();
      }
    });
  }

  if (heroFotoSimpan) {
    heroFotoSimpan.addEventListener("click", async function () {
      if (heroFotoSimpan.disabled) return;

      showHeroFotoError("");

      const slidesSiap = heroSlideItems.filter(function (item) {
        return (
          item.foto ||
          item.file ||
          String(item.label || "").trim() ||
          String(item.judul || "").trim() ||
          String(item.deskripsi || "").trim()
        );
      });

      const tanpaJudul = slidesSiap.find(function (item) {
        return !String(item.judul || "").trim();
      });

      if (tanpaJudul) {
        showHeroFotoError(
          "Judul setiap slide wajib diisi. Lengkapi atau hapus slide kosong.",
        );
        return;
      }

      heroFotoSimpan.disabled = true;
      heroFotoSimpan.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Menyimpan…';

      const uploaded = [];

      try {
        const total = slidesSiap.filter(function (item) {
          return item.file;
        }).length;
        let langkah = 0;

        for (let i = 0; i < slidesSiap.length; i += 1) {
          const item = slidesSiap[i];
          if (!item.file) continue;

          langkah += 1;
          heroFotoSimpan.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Mengunggah ' +
            langkah +
            "/" +
            total +
            "…";

          const url = await uploadHeroPhoto(item.file);
          uploaded.push(url);
          item.fotoBaru = url;
        }

        const payload = slidesSiap
          .map(function (item) {
            return {
              foto: String(item.fotoBaru || item.foto || "").trim(),
              label: String(item.label || "").trim(),
              judul: String(item.judul || "").trim(),
              deskripsi: String(item.deskripsi || "").trim(),
            };
          })
          .slice(0, HERO_SLIDE_MAX);

        const utama = payload[0] || {
          foto: "",
          label: "",
          judul: "",
          deskripsi: "",
        };

        saveWorkshopInfo({
          ...getBengkelInfoLengkap(),
          heroSlides: payload,
          heroAutoplay: Boolean(
            heroAutoplayInput && heroAutoplayInput.checked,
          ),
          heroFoto: utama.foto,
          heroLabel: utama.label,
          heroJudul: utama.judul,
          heroDeskripsi: utama.deskripsi,
        });

        /* Bersihkan foto lama yang tidak lagi dipakai (dihapus/diganti). */
        const dipakai = new Set(
          payload.map(function (item) {
            return item.foto;
          }),
        );
        heroFotoLama.forEach(function (url) {
          if (url && !dipakai.has(url)) {
            removeHeroPhoto(url).catch(function () {});
          }
        });

        closeModal("heroFotoModal");
        renderLandingPreview();
        showPageNotice("Hero landing disimpan.", "success");
      } catch (error) {
        uploaded.forEach(function (url) {
          removeHeroPhoto(url).catch(function () {});
        });
        showHeroFotoError(error.message || "Gagal menyimpan hero landing.");
      } finally {
        heroFotoSimpan.disabled = false;
        heroFotoSimpan.innerHTML = heroSimpanHTML;
        renderHeroSlides();
      }
    });
  }

  /* ---------------- GALERI BENGKEL ----------------
     Daftar foto disimpan pada workshop_info.galeri_foto sebagai array
     [{ url, judul, deskripsi }]. Foto diunggah ke bucket site-assets
     lewat uploadGalleryPhoto, lalu URL-nya disimpan bersama teks. */
  const GALERI_MAX = 8;

  const galeriButton = document.getElementById("btnGaleriFoto");
  const galeriManager = document.getElementById("galeriManager");
  const galeriEmpty = document.getElementById("galeriEmpty");
  const galeriInput = document.getElementById("galeriFotoInput");
  const galeriError = document.getElementById("galeriFormError");
  const galeriSimpan = document.getElementById("btnSimpanGaleri");
  const galeriProgress = document.getElementById("galeriProgress");
  const galeriProgressFill = document.getElementById("galeriProgressFill");
  const galeriProgressText = document.getElementById("galeriProgressText");
  const galeriTombolHTML = galeriSimpan ? galeriSimpan.innerHTML : "";

  let galeriItems = [];
  let galeriRemoved = [];

  function showGaleriError(message) {
    if (!galeriError) return;
    galeriError.textContent = message || "";
    galeriError.hidden = !message;
  }

  function formatFileSize(bytes) {
    const nilai = Number(bytes);

    if (!Number.isFinite(nilai) || nilai <= 0) return "0 KB";

    if (nilai < 1024 * 1024) {
      return Math.max(1, Math.round(nilai / 1024)) + " KB";
    }

    return (nilai / (1024 * 1024)).toFixed(1).replace(".", ",") + " MB";
  }

  function setGaleriProgress(message, percent) {
    if (!galeriProgress) return;

    const nilai = Math.max(0, Math.min(100, Math.round(percent)));
    galeriProgress.hidden = false;
    galeriProgress.setAttribute("aria-valuenow", String(nilai));

    if (galeriProgressFill) galeriProgressFill.style.width = nilai + "%";
    if (galeriProgressText) galeriProgressText.textContent = message || "";
  }

  function resetGaleriProgress() {
    if (!galeriProgress) return;

    galeriProgress.hidden = true;
    galeriProgress.setAttribute("aria-valuenow", "0");

    if (galeriProgressFill) galeriProgressFill.style.width = "0%";
    if (galeriProgressText) galeriProgressText.textContent = "";
  }

  function renderGaleriManager() {
    if (!galeriManager) return;

    if (galeriEmpty) galeriEmpty.hidden = galeriItems.length > 0;

    if (!galeriItems.length) {
      galeriManager.innerHTML = "";
      return;
    }

    galeriManager.innerHTML = galeriItems
      .map(function (item, index) {
        const sumberFoto = item.preview || item.url || "";
        return (
          '<div class="galeri-admin-item">' +
          '<img class="galeri-admin-thumb" src="' +
          escapeHTML(sumberFoto) +
          '" alt="Pratinjau foto galeri ' +
          (index + 1) +
          '" />' +
          '<div class="galeri-admin-fields">' +
          '<label>Judul Foto</label>' +
          '<input type="text" class="form-control" maxlength="80" ' +
          'data-galeri-field="judul" data-index="' +
          index +
          '" value="' +
          escapeHTML(item.judul || "") +
          '" placeholder="Contoh: Area Servis Motor" />' +
          '<label>Keterangan</label>' +
          '<input type="text" class="form-control" maxlength="160" ' +
          'data-galeri-field="deskripsi" data-index="' +
          index +
          '" value="' +
          escapeHTML(item.deskripsi || "") +
          '" placeholder="Keterangan singkat (opsional)" />' +
          '</div>' +
          '<div class="galeri-admin-actions">' +
          '<span class="galeri-admin-size">' +
          (item.sizeBefore
            ? !item.sizeAfter
              ? formatFileSize(item.sizeBefore) +
                (item.status ? " · " + item.status : "")
              : formatFileSize(item.sizeBefore) +
                " → " +
                formatFileSize(item.sizeAfter) +
                (item.sizeAfter < item.sizeBefore ? " (dikompres)" : "")
            : item.status || "") +
          "</span>" +
          '<button type="button" class="action-btn" data-galeri-up="' +
          index +
          '" aria-label="Naikkan foto"' +
          (index === 0 ? " disabled" : "") +
          '><i class="fa-solid fa-arrow-up" aria-hidden="true"></i></button>' +
          '<button type="button" class="action-btn" data-galeri-down="' +
          index +
          '" aria-label="Turunkan foto"' +
          (index === galeriItems.length - 1 ? " disabled" : "") +
          '><i class="fa-solid fa-arrow-down" aria-hidden="true"></i></button>' +
          '<button type="button" class="action-btn danger" data-galeri-remove="' +
          index +
          '"><i class="fa-solid fa-trash" aria-hidden="true"></i> Hapus</button>' +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  if (galeriManager) {
    galeriManager.addEventListener("input", function (event) {
      const input = event.target.closest("[data-galeri-field]");
      if (!input) return;
      const index = Number(input.dataset.index);
      const item = galeriItems[index];
      if (!item) return;
      item[input.dataset.galeriField] = input.value;
    });

    galeriManager.addEventListener("click", function (event) {
      const up = event.target.closest("[data-galeri-up]");
      const down = event.target.closest("[data-galeri-down]");
      const remove = event.target.closest("[data-galeri-remove]");

      if (up) {
        const index = Number(up.dataset.galeriUp);
        if (index > 0) {
          const tukar = galeriItems[index - 1];
          galeriItems[index - 1] = galeriItems[index];
          galeriItems[index] = tukar;
          renderGaleriManager();
        }
        return;
      }

      if (down) {
        const index = Number(down.dataset.galeriDown);
        if (index < galeriItems.length - 1) {
          const tukar = galeriItems[index + 1];
          galeriItems[index + 1] = galeriItems[index];
          galeriItems[index] = tukar;
          renderGaleriManager();
        }
        return;
      }

      if (remove) {
        const index = Number(remove.dataset.galeriRemove);
        const item = galeriItems[index];
        if (!item) return;
        if (item.url) galeriRemoved.push(item.url);
        galeriItems.splice(index, 1);
        renderGaleriManager();
      }
    });
  }

  if (galeriButton) {
    galeriButton.addEventListener("click", function () {
      galeriItems = getBengkelInfoLengkap().galeriFoto.map(function (item) {
        return {
          url: item.url,
          judul: item.judul,
          deskripsi: item.deskripsi,
        };
      });
      galeriRemoved = [];
      if (galeriInput) galeriInput.value = "";
      showGaleriError("");
      resetGaleriProgress();
      renderGaleriManager();
      openModal("galeriModal");
    });
  }

  if (galeriInput) {
    galeriInput.addEventListener("change", function () {
      const files = Array.prototype.slice.call(galeriInput.files || []);
      showGaleriError("");
      resetGaleriProgress();

      if (!files.length) return;

      if (galeriItems.length + files.length > GALERI_MAX) {
        galeriInput.value = "";
        showGaleriError(
          "Maksimal " + GALERI_MAX + " foto galeri. Hapus beberapa foto dulu.",
        );
        return;
      }

      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        if (!String(file.type || "").startsWith("image/")) {
          galeriInput.value = "";
          showGaleriError("Semua file harus berupa gambar (jpg/png/webp).");
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          galeriInput.value = "";
          showGaleriError("Ukuran tiap foto maksimal 5 MB.");
          return;
        }
      }

      /* Kompres saat foto dipilih supaya admin langsung melihat ukuran
         sebelum → sesudah dan proses simpan tinggal mengunggah. */
      const baruList = files.map(function (file) {
        return {
          url: "",
          judul: "",
          deskripsi: "",
          file: null,
          preview: "",
          status: "Mengompres…",
          sizeBefore: file.size,
          sizeAfter: null,
        };
      });

      baruList.forEach(function (item) {
        galeriItems.push(item);
      });
      galeriInput.value = "";
      renderGaleriManager();

      /* Diproses berurutan supaya canvas tidak memuat banyak foto besar
         sekaligus (aman untuk HP/laptop berspesifikasi rendah). */
      let antrean = Promise.resolve();

      files.forEach(function (file, index) {
        antrean = antrean.then(function () {
          const item = baruList[index];

          /* data: URL — blob: diblokir CSP img-src halaman ini. */
          const bacaPreview = new Promise(function (resolve) {
            const reader = new FileReader();
            reader.onload = function () {
              resolve(String(reader.result || ""));
            };
            reader.onerror = function () {
              resolve("");
            };
            reader.readAsDataURL(file);
          });

          return Promise.all([compressLandingPhoto(file), bacaPreview])
            .then(function (hasil) {
              item.file = hasil[0];
              item.preview = hasil[1];
              item.sizeBefore = file.size;
              item.sizeAfter = hasil[0].size;
              item.status = "";
              renderGaleriManager();
            })
            .catch(function (error) {
              item.status = "Gagal dikompres";
              showGaleriError(
                error.message || "Salah satu foto gagal dikompres.",
              );
              renderGaleriManager();
            });
        });
      });
    });
  }

  if (galeriSimpan) {
    galeriSimpan.addEventListener("click", async function () {
      const fotoDiproses = galeriItems.some(function (item) {
        return (
          item.status === "Mengompres…" ||
          item.status === "Gagal dikompres"
        );
      });

      if (fotoDiproses) {
        showGaleriError(
          "Tunggu kompresi selesai atau hapus foto yang gagal dikompres.",
        );
        return;
      }

      galeriSimpan.disabled = true;
      galeriSimpan.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Menyimpan…';
      showGaleriError("");
      resetGaleriProgress();

      const uploaded = [];
      const fileBaru = galeriItems.filter(function (item) {
        return item.file;
      });
      const totalLangkah = fileBaru.length + 1;
      let langkah = 0;
      let persen = 0;

      try {
        setGaleriProgress(
          fileBaru.length
            ? "Menyiapkan " + fileBaru.length + " foto…"
            : "Menyimpan galeri…",
          0,
        );

        for (let i = 0; i < galeriItems.length; i += 1) {
          const item = galeriItems[i];
          if (!item.file) continue;

          langkah += 1;
          persen = ((langkah - 1) / totalLangkah) * 100;
          setGaleriProgress(
            "Mengunggah foto " +
              langkah +
              " dari " +
              fileBaru.length +
              "…",
            persen,
          );

          const url = await uploadGalleryPhoto(item.file, true);
          uploaded.push({ item: item, url: url });
          item.url = url;

          persen = (langkah / totalLangkah) * 100;
          setGaleriProgress(
            "Foto " + langkah + " dari " + fileBaru.length + " selesai.",
            persen,
          );
        }

        persen = (fileBaru.length / totalLangkah) * 100;
        setGaleriProgress("Menyimpan daftar galeri…", persen);

        const payload = galeriItems
          .map(function (item) {
            return {
              url: String(item.url || "").trim(),
              judul: String(item.judul || "").trim(),
              deskripsi: String(item.deskripsi || "").trim(),
            };
          })
          .filter(function (item) {
            return item.url;
          })
          .slice(0, GALERI_MAX);

        const sebelum = getBengkelInfoLengkap().galeriFoto || [];
        const dipakai = new Set(
          payload.map(function (item) {
            return item.url;
          }),
        );

        saveWorkshopInfo({
          ...getBengkelInfoLengkap(),
          galeriFoto: payload,
        });

        uploaded.forEach(function (item) {
          item.item.file = null;
          item.item.preview = "";
        });

        /* Hapus dari storage foto yang dibuang atau diganti supaya
           bucket tidak menumpuk file tak terpakai. */
        galeriRemoved
          .concat(
            sebelum.map(function (item) {
              return item.url;
            }),
          )
          .forEach(function (url) {
            if (url && !dipakai.has(url)) {
              removeGalleryPhoto(url).catch(function () {});
            }
          });

        galeriRemoved = [];
        setGaleriProgress("Galeri berhasil disimpan.", 100);
        closeModal("galeriModal");
        renderLandingPreview();
        showPageNotice("Galeri bengkel disimpan.", "success");
      } catch (error) {
        /* Batalkan unggahan yang sudah jadi supaya tidak ada file yatim. */
        uploaded.forEach(function (item) {
          item.item.url = "";
          removeGalleryPhoto(item.url).catch(function () {});
        });
        setGaleriProgress("Gagal menyimpan galeri.", persen);
        showGaleriError(error.message || "Gagal menyimpan galeri bengkel.");
      } finally {
        galeriSimpan.disabled = false;
        galeriSimpan.innerHTML = galeriTombolHTML;
        renderGaleriManager();
      }
    });
  }

  /* ---------------- FOTO HALAMAN (slot foto tetap landing) ----------------
     Tujuh slot: foto hero samping, foto mini hero, foto keunggulan, dan
     thumbnail 4 kartu layanan. Disimpan di workshop_info.media_foto
     sebagai { slot: { url, posisi, zoom } }; slot yang kosong memakai foto
     bawaan di html/index.html. */
  const mediaButton = document.getElementById("btnMediaFoto");
  const mediaManager = document.getElementById("mediaManager");
  const mediaInput = document.getElementById("mediaFotoInput");
  const mediaSimpan = document.getElementById("btnSimpanMedia");
  const mediaErrorEl = document.getElementById("mediaFormError");
  const mediaFilterChips = document.getElementById("mediaFilterChips");
  const mediaListView = document.getElementById("mediaListView");
  const mediaDetailEditor = document.getElementById("mediaDetailEditor");
  const mediaModalFooter = document.getElementById("mediaModalFooter");
  const mediaSimpanHTML = mediaSimpan ? mediaSimpan.innerHTML : "";

  /* Elemen Studio Editor Detail */
  const btnBackToMediaList = document.getElementById("btnBackToMediaList");
  const editorSlotCategory = document.getElementById("editorSlotCategory");
  const editorSlotTitle = document.getElementById("editorSlotTitle");
  const editorPanCanvas = document.getElementById("editorPanCanvas");
  const editorCanvasImg = document.getElementById("editorCanvasImg");
  const editorTargetPoint = document.getElementById("editorTargetPoint");
  const btnEditorUpload = document.getElementById("btnEditorUpload");
  const btnEditorResetFoto = document.getElementById("btnEditorResetFoto");
  const editorZoomRange = document.getElementById("editorZoomRange");
  const editorZoomValText = document.getElementById("editorZoomValText");
  const btnZoomMinus = document.getElementById("btnZoomMinus");
  const btnZoomPlus = document.getElementById("btnZoomPlus");
  const editorPosValText = document.getElementById("editorPosValText");
  const editorCompassGrid = document.getElementById("editorCompassGrid");
  const btnEditorResetTransform = document.getElementById("btnEditorResetTransform");
  const btnEditorDone = document.getElementById("btnEditorDone");

  let mediaItems = [];
  let mediaPickIndex = -1;
  let mediaActiveFilter = "semua";
  let activeEditorIndex = -1;

  function showMediaError(message) {
    if (!mediaErrorEl) return;
    mediaErrorEl.textContent = message || "";
    mediaErrorEl.hidden = !message;
  }

  function updateMediaChipCounts() {
    const counts = { semua: mediaItems.length, hero: 0, keunggulan: 0, layanan: 0 };
    mediaItems.forEach(function (item) {
      if (item.kategori && counts[item.kategori] !== undefined) {
        counts[item.kategori] += 1;
      }
    });
    const cSemua = document.getElementById("chipCountSemua");
    const cHero = document.getElementById("chipCountHero");
    const cKeunggulan = document.getElementById("chipCountKeunggulan");
    const cLayanan = document.getElementById("chipCountLayanan");
    if (cSemua) cSemua.textContent = counts.semua;
    if (cHero) cHero.textContent = counts.hero;
    if (cKeunggulan) cKeunggulan.textContent = counts.keunggulan;
    if (cLayanan) cLayanan.textContent = counts.layanan;
  }

  function renderMediaManager() {
    if (!mediaManager) return;

    updateMediaChipCounts();

    const itemsToRender = mediaItems
      .map(function (item, index) {
        return { item: item, index: index };
      })
      .filter(function (entry) {
        if (mediaActiveFilter === "semua") return true;
        return entry.item.kategori === mediaActiveFilter;
      });

    if (itemsToRender.length === 0) {
      mediaManager.innerHTML =
        '<div class="media-empty-filter">' +
        '<i class="fa-solid fa-filter-circle-xmark"></i>' +
        '<p>Tidak ada slot foto untuk kategori ini.</p>' +
        '</div>';
      return;
    }

    mediaManager.innerHTML = itemsToRender
      .map(function (entry) {
        const item = entry.item;
        const index = entry.index;
        const sumberFoto = item.preview || item.url || item.defaultImg || "";
        const posisi = item.posisi || "50% 50%";
        const zoom = parseFloat(item.zoom) || 1;
        const zoomPct = Math.round(zoom * 100);

        let badgeStatus = "";
        if (item.preview) {
          badgeStatus =
            '<span class="media-badge-new"><i class="fa-solid fa-sparkles"></i> Foto Baru (Belum Simpan)</span>';
        } else if (item.url) {
          badgeStatus =
            '<span class="media-badge-custom"><i class="fa-solid fa-cloud-arrow-up"></i> Foto Kustom</span>';
        } else {
          badgeStatus =
            '<span class="media-badge-default"><i class="fa-solid fa-image"></i> Foto Bawaan</span>';
        }

        const thumb = sumberFoto
          ? '<div class="media-preview-container">' +
            '<div class="media-admin-pan-box" data-media-open-editor="' +
            index +
            '" title="Klik untuk membuka editor visual lengkap slot ini">' +
            '<img class="media-admin-pan-img" src="' +
            escapeHTML(sumberFoto) +
            '" style="object-position:' +
            escapeHTML(posisi) +
            "; transform:scale(" +
            zoom +
            ');" alt="Pratinjau ' +
            escapeHTML(item.label) +
            '" />' +
            '<span class="media-admin-pan-hint"><i class="fa-solid fa-crop-simple"></i> Klik untuk Edit</span>' +
            "</div>" +
            "</div>"
          : '<div class="media-admin-pan-box" style="display:grid; place-items:center; color:var(--secondary); font-size:32px;"><i class="fa-solid fa-image"></i></div>';

        return (
          '<div class="media-card-item' + (item.preview ? " has-new-image" : "") + '">' +
          '<div class="media-card-head">' +
          '<div class="media-card-title-group">' +
          '<span class="media-card-category-tag">' +
          (item.kategori ? escapeHTML(item.kategori.toUpperCase()) : "LANDING") +
          "</span>" +
          '<h4 class="media-card-title">' +
          escapeHTML(item.label) +
          "</h4>" +
          '<p class="media-card-desc">' +
          escapeHTML(item.deskripsi || "") +
          "</p>" +
          "</div>" +
          '<div class="media-card-badges">' +
          badgeStatus +
          "</div>" +
          "</div>" +
          '<div class="media-card-body">' +
          thumb +
          '<div class="media-card-controls">' +
          '<div class="media-card-meta-row">' +
          '<span class="media-meta-tag"><i class="fa-solid fa-crosshairs"></i> Fokus: <strong>' +
          escapeHTML(posisi) +
          "</strong></span>" +
          '<span class="media-meta-tag"><i class="fa-solid fa-magnifying-glass"></i> Zoom: <strong>' +
          zoomPct +
          "%</strong></span>" +
          "</div>" +
          '<div class="media-card-actions">' +
          '<button type="button" class="btn btn-sm btn-primary" data-media-open-editor="' +
          index +
          '"><i class="fa-solid fa-sliders" aria-hidden="true"></i> Atur Tampilan / Edit Foto</button>' +
          '<button type="button" class="btn btn-sm btn-secondary" data-media-pick="' +
          index +
          '"><i class="fa-solid fa-upload" aria-hidden="true"></i> Ganti File</button>' +
          '<button type="button" class="btn btn-sm btn-danger-outline" data-media-reset="' +
          index +
          '"' +
          (item.url || item.preview ? "" : " disabled") +
          ' title="Kembali ke foto default landing page"><i class="fa-solid fa-rotate-left" aria-hidden="true"></i> Foto Bawaan</button>' +
          "</div>" +
          "</div>" +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  /* ---------------- STUDIO EDITOR DETAIL INTERAKTIF ---------------- */
  function openMediaEditor(index) {
    const item = mediaItems[index];
    if (!item) return;

    activeEditorIndex = index;
    const sumberFoto = item.preview || item.url || item.defaultImg || "";

    if (editorSlotCategory) {
      editorSlotCategory.textContent = (item.kategori || "LANDING").toUpperCase();
    }
    if (editorSlotTitle) {
      editorSlotTitle.textContent = item.label;
    }
    if (editorCanvasImg) {
      editorCanvasImg.src = sumberFoto;
    }

    const zoom = parseFloat(item.zoom) || 1;
    const zoomPct = Math.round(zoom * 100);
    if (editorZoomRange) editorZoomRange.value = zoomPct;
    if (editorZoomValText) editorZoomValText.textContent = zoomPct + "%";

    updateEditorCanvasDisplay(item.posisi || "50% 50%", zoom);

    if (btnEditorResetFoto) {
      btnEditorResetFoto.disabled = !item.url && !item.preview;
    }

    if (mediaListView) mediaListView.hidden = true;
    if (mediaDetailEditor) mediaDetailEditor.hidden = false;
    if (mediaModalFooter) mediaModalFooter.hidden = true;
  }

  function closeMediaEditor() {
    activeEditorIndex = -1;
    if (mediaDetailEditor) mediaDetailEditor.hidden = true;
    if (mediaListView) mediaListView.hidden = false;
    if (mediaModalFooter) mediaModalFooter.hidden = false;
    renderMediaManager();
  }

  function parsePosStr(posStr) {
    const parts = String(posStr || "50% 50%").trim().split(/\s+/);
    const x = parseFloat(parts[0]) || 50;
    const y = parseFloat(parts[1]) || 50;
    return { x: x, y: y };
  }

  function updateEditorCanvasDisplay(posisi, zoom) {
    if (editorCanvasImg) {
      editorCanvasImg.style.objectPosition = posisi;
      editorCanvasImg.style.transform = "scale(" + zoom + ")";
    }
    if (editorPosValText) {
      editorPosValText.textContent = posisi;
    }

    /* Posisikan target point crosshair visual di atas gambar */
    if (editorTargetPoint) {
      const p = parsePosStr(posisi);
      editorTargetPoint.style.left = p.x + "%";
      editorTargetPoint.style.top = p.y + "%";
    }

    /* Sinkronkan tombol compass 9-titik */
    if (editorCompassGrid) {
      editorCompassGrid.querySelectorAll(".compass-cell").forEach(function (btn) {
        btn.classList.toggle("is-active", btn.dataset.compassPos === posisi);
      });
    }
  }

  function initEditorCanvasInteractions() {
    if (!editorPanCanvas) return;

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let initPosX = 50;
    let initPosY = 50;

    editorPanCanvas.addEventListener("pointerdown", function (e) {
      if (activeEditorIndex < 0) return;
      const item = mediaItems[activeEditorIndex];
      if (!item) return;

      dragging = true;
      editorPanCanvas.classList.add("is-dragging");
      editorPanCanvas.setPointerCapture(e.pointerId);
      startX = e.clientX;
      startY = e.clientY;

      const p = parsePosStr(item.posisi);
      initPosX = p.x;
      initPosY = p.y;
    });

    editorPanCanvas.addEventListener("pointermove", function (e) {
      if (!dragging || activeEditorIndex < 0) return;
      const item = mediaItems[activeEditorIndex];
      if (!item) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const rect = editorPanCanvas.getBoundingClientRect();
      const sensitivity = 1.25;
      let newX = initPosX - (dx / rect.width) * 100 * sensitivity;
      let newY = initPosY - (dy / rect.height) * 100 * sensitivity;

      newX = Math.round(Math.min(100, Math.max(0, newX)));
      newY = Math.round(Math.min(100, Math.max(0, newY)));

      item.posisi = newX + "% " + newY + "%";
      updateEditorCanvasDisplay(item.posisi, item.zoom || 1);
    });

    function stopEditorDrag(e) {
      if (dragging) {
        dragging = false;
        editorPanCanvas.classList.remove("is-dragging");
        try {
          editorPanCanvas.releasePointerCapture(e.pointerId);
        } catch (err) {}
      }
    }

    editorPanCanvas.addEventListener("pointerup", stopEditorDrag);
    editorPanCanvas.addEventListener("pointercancel", stopEditorDrag);

    /* Kontrol Zoom slider */
    if (editorZoomRange) {
      editorZoomRange.addEventListener("input", function () {
        if (activeEditorIndex < 0) return;
        const item = mediaItems[activeEditorIndex];
        if (!item) return;

        const val = Number(editorZoomRange.value);
        item.zoom = val / 100;
        if (editorZoomValText) editorZoomValText.textContent = val + "%";
        updateEditorCanvasDisplay(item.posisi || "50% 50%", item.zoom);
      });
    }

    /* Tombol minus zoom */
    if (btnZoomMinus) {
      btnZoomMinus.addEventListener("click", function () {
        if (activeEditorIndex < 0) return;
        const cur = Number(editorZoomRange.value);
        const next = Math.max(100, cur - 10);
        editorZoomRange.value = next;
        editorZoomRange.dispatchEvent(new Event("input"));
      });
    }

    /* Tombol plus zoom */
    if (btnZoomPlus) {
      btnZoomPlus.addEventListener("click", function () {
        if (activeEditorIndex < 0) return;
        const cur = Number(editorZoomRange.value);
        const next = Math.min(220, cur + 10);
        editorZoomRange.value = next;
        editorZoomRange.dispatchEvent(new Event("input"));
      });
    }

    /* Compass 9 titik */
    if (editorCompassGrid) {
      editorCompassGrid.addEventListener("click", function (event) {
        const cell = event.target.closest("[data-compass-pos]");
        if (!cell || activeEditorIndex < 0) return;
        const item = mediaItems[activeEditorIndex];
        if (!item) return;

        item.posisi = cell.dataset.compassPos;
        updateEditorCanvasDisplay(item.posisi, item.zoom || 1);
      });
    }

    /* Reset Transformasi (Posisi 50% 50% & Zoom 100%) */
    if (btnEditorResetTransform) {
      btnEditorResetTransform.addEventListener("click", function () {
        if (activeEditorIndex < 0) return;
        const item = mediaItems[activeEditorIndex];
        if (!item) return;

        item.posisi = "50% 50%";
        item.zoom = 1;
        if (editorZoomRange) editorZoomRange.value = 100;
        if (editorZoomValText) editorZoomValText.textContent = "100%";
        updateEditorCanvasDisplay(item.posisi, item.zoom);
      });
    }

    /* Tombol Ganti Foto di dalam Editor */
    if (btnEditorUpload) {
      btnEditorUpload.addEventListener("click", function () {
        if (activeEditorIndex < 0) return;
        mediaPickIndex = activeEditorIndex;
        mediaInput.value = "";
        mediaInput.click();
      });
    }

    /* Tombol Kembali ke Foto Bawaan di dalam Editor */
    if (btnEditorResetFoto) {
      btnEditorResetFoto.addEventListener("click", function () {
        if (activeEditorIndex < 0) return;
        const item = mediaItems[activeEditorIndex];
        if (!item) return;

        item.url = "";
        item.file = null;
        item.preview = "";
        item.posisi = "50% 50%";
        item.zoom = 1;

        if (editorCanvasImg) editorCanvasImg.src = item.defaultImg;
        if (editorZoomRange) editorZoomRange.value = 100;
        if (editorZoomValText) editorZoomValText.textContent = "100%";
        updateEditorCanvasDisplay(item.posisi, item.zoom);
        btnEditorResetFoto.disabled = true;
      });
    }

    /* Tombol Selesai / Terapkan */
    if (btnEditorDone) {
      btnEditorDone.addEventListener("click", closeMediaEditor);
    }

    /* Tombol Back */
    if (btnBackToMediaList) {
      btnBackToMediaList.addEventListener("click", closeMediaEditor);
    }
  }

  if (mediaFilterChips) {
    mediaFilterChips.addEventListener("click", function (event) {
      const chip = event.target.closest("[data-media-filter]");
      if (!chip) return;
      const filter = chip.dataset.mediaFilter;
      mediaActiveFilter = filter;
      mediaFilterChips.querySelectorAll(".media-filter-chip").forEach(function (btn) {
        btn.classList.toggle("is-active", btn === chip);
      });
      renderMediaManager();
    });
  }

  if (mediaButton) {
    mediaButton.addEventListener("click", function () {
      const media = getBengkelInfoLengkap().mediaFoto || {};

      mediaItems = MEDIA_SLOTS.map(function (slot) {
        const val = media[slot.key];
        const isObj = val && typeof val === "object";
        const url = String((isObj ? val.url : val) || "").trim();
        const posisi = isObj && val.posisi ? String(val.posisi) : "50% 50%";
        const zoom = isObj && val.zoom ? parseFloat(val.zoom) || 1 : 1;

        return {
          key: slot.key,
          kategori: slot.kategori || "layanan",
          label: slot.label,
          deskripsi: slot.deskripsi || "",
          defaultImg: slot.defaultImg,
          url: url,
          posisi: posisi,
          zoom: zoom,
          file: null,
          preview: "",
        };
      });

      mediaActiveFilter = "semua";
      if (mediaFilterChips) {
        mediaFilterChips.querySelectorAll(".media-filter-chip").forEach(function (btn) {
          btn.classList.toggle("is-active", btn.dataset.mediaFilter === "semua");
        });
      }

      showMediaError("");
      closeMediaEditor();
      renderMediaManager();
      openModal("landingMediaModal");
    });
  }

  if (mediaManager) {
    mediaManager.addEventListener("click", function (event) {
      const openEditor = event.target.closest("[data-media-open-editor]");
      const pick = event.target.closest("[data-media-pick]");
      const reset = event.target.closest("[data-media-reset]");

      if (openEditor) {
        const index = Number(openEditor.dataset.mediaOpenEditor);
        openMediaEditor(index);
        return;
      }

      if (pick) {
        mediaPickIndex = Number(pick.dataset.mediaPick);
        mediaInput.value = "";
        mediaInput.click();
        return;
      }

      if (reset) {
        const index = Number(reset.dataset.mediaReset);
        const item = mediaItems[index];
        if (!item) return;
        item.url = "";
        item.file = null;
        item.preview = "";
        item.posisi = "50% 50%";
        item.zoom = 1;
        renderMediaManager();
      }
    });
  }

  initEditorCanvasInteractions();

  if (mediaInput) {
    mediaInput.addEventListener("change", function () {
      const file = mediaInput.files && mediaInput.files[0];
      const item = mediaItems[mediaPickIndex];
      if (!file || !item) return;

      /* Validasi sama dengan uploadSitePhoto — ditolak di sini supaya
         admin langsung tahu sebelum ada unggahan. */
      if (!String(file.type || "").startsWith("image/")) {
        showMediaError("File harus berupa gambar (jpg/png/webp).");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showMediaError("Ukuran foto maksimal 5 MB.");
        return;
      }

      const reader = new FileReader();

      reader.onload = function () {
        item.file = file;
        item.preview = String(reader.result || "");
        showMediaError("");
        if (activeEditorIndex === mediaPickIndex) {
          if (editorCanvasImg) editorCanvasImg.src = item.preview;
          if (btnEditorResetFoto) btnEditorResetFoto.disabled = false;
        }
        renderMediaManager();
      };

      reader.onerror = function () {
        showMediaError("Foto tidak dapat dibaca. Coba pilih lagi.");
      };

      reader.readAsDataURL(file);
    });
  }

  if (mediaSimpan) {
    mediaSimpan.addEventListener("click", async function () {
      mediaSimpan.disabled = true;
      mediaSimpan.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Menyimpan…';
      showMediaError("");

      const uploaded = [];

      try {
        for (let i = 0; i < mediaItems.length; i += 1) {
          const item = mediaItems[i];
          if (!item.file) continue;

          const url = await uploadSitePhoto(item.file);
          uploaded.push({ key: item.key, url: url });
          item.url = url;
          item.file = null;
          item.preview = "";
        }

        /* Salinan URL lama dipakai untuk membersihkan storage setelah
           simpan, ketika cache sudah berisi nilai baru. */
        const sebelum = { ...(getBengkelInfoLengkap().mediaFoto || {}) };

        const payload = {};
        mediaItems.forEach(function (item) {
          const posisi = item.posisi || "50% 50%";
          const zoom = item.zoom || 1;
          if (item.url || posisi !== "50% 50%" || zoom !== 1) {
            payload[item.key] = {
              url: item.url || "",
              posisi: posisi,
              zoom: zoom,
            };
          }
        });

        saveWorkshopInfo({
          ...getBengkelInfoLengkap(),
          mediaFoto: payload,
        });

        /* Hapus dari storage foto yang sudah tidak dipakai slot mana pun
           supaya bucket tidak menumpuk file tak terpakai. */
        Object.keys(sebelum).forEach(function (key) {
          const valLama = sebelum[key];
          const urlLama =
            typeof valLama === "string"
              ? valLama
              : valLama && typeof valLama === "object"
                ? valLama.url
                : "";
          const valBaru = payload[key];
          const urlBaru =
            typeof valBaru === "string"
              ? valBaru
              : valBaru && typeof valBaru === "object"
                ? valBaru.url
                : "";
          if (urlLama && urlBaru !== urlLama) {
            removeSiteAsset(urlLama).catch(function () {});
          }
        });

        closeModal("landingMediaModal");
        renderLandingPreview();
        showPageNotice("Foto halaman berhasil disimpan.", "success");
      } catch (error) {
        /* Batalkan unggahan yang sudah jadi supaya tidak ada file yatim. */
        uploaded.forEach(function (item) {
          removeSiteAsset(item.url).catch(function () {});
        });
        showMediaError(error.message || "Gagal menyimpan foto halaman.");
      } finally {
        mediaSimpan.disabled = false;
        mediaSimpan.innerHTML = mediaSimpanHTML;
        renderMediaManager();
      }
    });
  }
}
