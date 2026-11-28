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
  { key: "hero_sisi", label: "Foto hero samping" },
  { key: "hero_mini", label: "Foto mini hero (Quality Check)" },
  { key: "fitur", label: "Foto Keunggulan" },
  { key: "layanan_servis", label: "Kartu layanan: Servis Rutin & Tune Up" },
  {
    key: "layanan_diagnosa",
    label: "Kartu layanan: Perbaikan & Diagnosa Mesin",
  },
  { key: "layanan_suku", label: "Kartu layanan: Suku Cadang & Kaki-kaki" },
  {
    key: "layanan_qc",
    label: "Kartu layanan: Quality Control & Test Drive",
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
  const mediaKeys = Object.keys(mediaFoto);
  const mediaPreview = mediaKeys.length
    ? '<div class="detail-item full">' +
        '<span class="detail-label">Foto Halaman (' +
        mediaKeys.length +
        " slot)</span>" +
        '<span class="detail-value landing-galeri-preview">' +
        mediaKeys
          .map(function (slot) {
            const label = (
              MEDIA_SLOTS.find(function (item) {
                return item.key === slot;
              }) || { label: slot }
            ).label;
            return (
              '<img src="' +
              escapeHTML(mediaFoto[slot]) +
              '" alt="' +
              escapeHTML(label) +
              '" />'
            );
          })
          .join("") +
        "</span>" +
        "</div>"
    : "";

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
     sebagai { slot: url }; slot yang kosong memakai foto bawaan di
     html/index.html. Daftar slot ada di MEDIA_SLOTS (top-level). */
  const mediaButton = document.getElementById("btnMediaFoto");
  const mediaManager = document.getElementById("mediaManager");
  const mediaInput = document.getElementById("mediaFotoInput");
  const mediaSimpan = document.getElementById("btnSimpanMedia");
  const mediaErrorEl = document.getElementById("mediaFormError");
  const mediaSimpanHTML = mediaSimpan ? mediaSimpan.innerHTML : "";

  let mediaItems = [];
  let mediaPickIndex = -1;

  function showMediaError(message) {
    if (!mediaErrorEl) return;
    mediaErrorEl.textContent = message || "";
    mediaErrorEl.hidden = !message;
  }

  function renderMediaManager() {
    if (!mediaManager) return;

    mediaManager.innerHTML = mediaItems
      .map(function (item, index) {
        const sumberFoto = item.preview || item.url || "";
        const thumb = sumberFoto
          ? '<img class="galeri-admin-thumb" src="' +
            escapeHTML(sumberFoto) +
            '" alt="Pratinjau ' +
            escapeHTML(item.label) +
            '" />'
          : '<span class="galeri-admin-thumb" style="display:grid; place-items:center; color:var(--secondary); font-size:26px;" aria-hidden="true"><i class="fa-solid fa-image"></i></span>';

        return (
          '<div class="galeri-admin-item">' +
          thumb +
          '<div class="galeri-admin-fields">' +
          "<label>" +
          escapeHTML(item.label) +
          "</label>" +
          '<span class="setting-description">' +
          (item.url
            ? "Foto baru dipakai setelah disimpan."
            : "Memakai foto bawaan landing page.") +
          "</span>" +
          "</div>" +
          '<div class="galeri-admin-actions">' +
          '<button type="button" class="action-btn" data-media-pick="' +
          index +
          '"><i class="fa-solid fa-upload" aria-hidden="true"></i> Ganti</button>' +
          '<button type="button" class="action-btn danger" data-media-reset="' +
          index +
          '"' +
          (item.url ? "" : " disabled") +
          '><i class="fa-solid fa-rotate-left" aria-hidden="true"></i> Foto Bawaan</button>' +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  if (mediaButton) {
    mediaButton.addEventListener("click", function () {
      const media = getBengkelInfoLengkap().mediaFoto || {};

      mediaItems = MEDIA_SLOTS.map(function (slot) {
        return {
          key: slot.key,
          label: slot.label,
          url: String(media[slot.key] || "").trim(),
          file: null,
          preview: "",
        };
      });

      showMediaError("");
      renderMediaManager();
      openModal("landingMediaModal");
    });
  }

  if (mediaManager) {
    mediaManager.addEventListener("click", function (event) {
      const pick = event.target.closest("[data-media-pick]");
      const reset = event.target.closest("[data-media-reset]");

      if (pick) {
        mediaPickIndex = Number(pick.dataset.mediaPick);
        /* Reset value dulu supaya memilih file yang sama tetap memicu
           event change. */
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
        renderMediaManager();
      }
    });
  }

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
          if (item.url) payload[item.key] = item.url;
        });

        saveWorkshopInfo({
          ...getBengkelInfoLengkap(),
          mediaFoto: payload,
        });

        /* Hapus dari storage foto yang sudah tidak dipakai slot mana pun
           supaya bucket tidak menumpuk file tak terpakai. */
        Object.keys(sebelum).forEach(function (key) {
          const url = sebelum[key];
          if (url && payload[key] !== url) {
            removeSiteAsset(url).catch(function () {});
          }
        });

        closeModal("landingMediaModal");
        renderLandingPreview();
        showPageNotice("Foto halaman disimpan.", "success");
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
