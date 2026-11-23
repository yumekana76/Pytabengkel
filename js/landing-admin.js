/* =====================================================================
   HALAMAN KELOLA LANDING PAGE (SUPER ADMIN)
   ---------------------------------------------------------------------
   Satu halaman untuk semua yang bisa mengubah landing page:
   - Hero landing (foto + teks)      → workshop_info.hero_*
   - Informasi bengkel               → workshop_info.*
   - Promo & diskon                  → js/diskon.js
   - Blok informasi terbaru          → js/blok.js
   - Ulasan (lihat / hapus)          → js/ulasan.js
   ===================================================================== */

/* ---------------- PRATINJAU ISI LANDING ---------------- */

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

  const foto = info.heroFoto
    ? '<div class="detail-item full">' +
        '<span class="detail-label">Foto Latar Hero</span>' +
        '<span class="detail-value">' +
        '<img src="' + escapeHTML(info.heroFoto) + '" alt="Foto hero landing" ' +
        'style="max-width:100%; max-height:160px; border-radius:10px; object-fit:cover;" />' +
        "</span>" +
        "</div>"
    : "";

  box.innerHTML =
    item("Nama Bengkel", info.nama) +
    item("Label Hero", info.heroLabel) +
    item("Judul Hero", info.heroJudul, true) +
    item("Deskripsi Hero", info.heroDeskripsi, true) +
    foto +
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
     Foto latar (bucket site-assets) + teks (label, judul, deskripsi)
     yang tampil di hero landing page. Khusus super admin — halaman ini
     dijaga requireSuperAdminAuth lewat window.__APP_ROLE. */
  const HERO_DEFAULTS = {
    heroLabel: "Promo bulan ini",
    heroJudul: "Rawat kendaraan tanpa antre dan tanpa ribet.",
    heroDeskripsi:
      "Dari servis berkala, tune-up, ganti oli, hingga perbaikan " +
      "menyeluruh. Dapatkan promo terbaik, cek review jujur pelanggan " +
      "kami, dan konsultasi langsung dengan teknisi bengkel.",
  };

  const heroFotoButton = document.getElementById("btnHeroFoto");
  const heroFotoInput = document.getElementById("heroFotoInput");
  const heroFotoPreview = document.getElementById("heroFotoPreview");
  const heroFotoEmpty = document.getElementById("heroFotoEmpty");
  const heroFotoError = document.getElementById("heroFotoFormError");
  const heroFotoHapus = document.getElementById("btnHapusHeroFoto");
  const heroFotoSimpan = document.getElementById("btnSimpanHeroFoto");
  const heroLabelInput = document.getElementById("heroLabel");
  const heroJudulInput = document.getElementById("heroJudul");
  const heroDeskripsiInput = document.getElementById("heroDeskripsi");

  let heroFotoPending = null; /* File baru yang belum diunggah. */

  function readHeroText() {
    return {
      heroLabel: heroLabelInput ? heroLabelInput.value.trim() : "",
      heroJudul: heroJudulInput ? heroJudulInput.value.trim() : "",
      heroDeskripsi: heroDeskripsiInput ? heroDeskripsiInput.value.trim() : "",
    };
  }

  function showHeroFotoError(message) {
    if (!heroFotoError) return;
    heroFotoError.textContent = message || "";
    heroFotoError.hidden = !message;
  }

  function refreshHeroFotoPreview() {
    if (!heroFotoPreview) return;

    const current = getBengkelInfoLengkap().heroFoto;

    function show(url) {
      if (url) {
        heroFotoPreview.src = url;
        heroFotoPreview.hidden = false;
        if (heroFotoEmpty) heroFotoEmpty.hidden = true;
      } else {
        heroFotoPreview.removeAttribute("src");
        heroFotoPreview.hidden = true;
        if (heroFotoEmpty) heroFotoEmpty.hidden = false;
      }
    }

    if (heroFotoHapus) {
      heroFotoHapus.hidden = !current;
    }

    if (heroFotoPending) {
      /* data: URL — blob: diblokir CSP img-src halaman ini. */
      const reader = new FileReader();
      reader.onload = () => show(String(reader.result || ""));
      reader.readAsDataURL(heroFotoPending);
    } else {
      show(current || "");
    }
  }

  if (heroFotoButton) {
    heroFotoButton.addEventListener("click", () => {
      const current = getBengkelInfoLengkap();

      heroFotoPending = null;
      showHeroFotoError("");
      if (heroFotoInput) heroFotoInput.value = "";
      if (heroLabelInput) {
        heroLabelInput.value = current.heroLabel || HERO_DEFAULTS.heroLabel;
      }
      if (heroJudulInput) {
        heroJudulInput.value = current.heroJudul || HERO_DEFAULTS.heroJudul;
      }
      if (heroDeskripsiInput) {
        heroDeskripsiInput.value =
          current.heroDeskripsi || HERO_DEFAULTS.heroDeskripsi;
      }
      refreshHeroFotoPreview();
      openModal("heroFotoModal");
    });
  }

  if (heroFotoInput) {
    heroFotoInput.addEventListener("change", () => {
      const file = heroFotoInput.files && heroFotoInput.files[0];
      showHeroFotoError("");

      if (!file) {
        heroFotoPending = null;
        refreshHeroFotoPreview();
        return;
      }

      if (!String(file.type || "").startsWith("image/")) {
        heroFotoPending = null;
        heroFotoInput.value = "";
        showHeroFotoError("File harus berupa gambar (jpg/png/webp).");
        refreshHeroFotoPreview();
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        heroFotoPending = null;
        heroFotoInput.value = "";
        showHeroFotoError("Ukuran foto maksimal 5 MB.");
        refreshHeroFotoPreview();
        return;
      }

      heroFotoPending = file;
      refreshHeroFotoPreview();
    });
  }

  if (heroFotoSimpan) {
    heroFotoSimpan.addEventListener("click", async () => {
      const teks = readHeroText();

      if (!teks.heroJudul) {
        showHeroFotoError("Judul hero wajib diisi.");
        return;
      }

      heroFotoSimpan.disabled = true;
      showHeroFotoError("");

      try {
        const lama = getBengkelInfoLengkap().heroFoto;
        let url = lama;

        if (heroFotoPending) {
          url = await uploadHeroPhoto(heroFotoPending);
          if (lama && lama !== url) {
            removeHeroPhoto(lama).catch(() => {});
          }
        }

        /* Foto (kalau baru diunggah) & teks disimpan bersama supaya
           hero langsung tampil sesuai isian. */
        saveWorkshopInfo({
          ...getBengkelInfoLengkap(),
          ...teks,
          heroFoto: url,
        });

        heroFotoPending = null;
        if (heroFotoInput) heroFotoInput.value = "";
        refreshHeroFotoPreview();
        closeModal("heroFotoModal");
        renderLandingPreview();
        showPageNotice("Hero landing disimpan.", "success");
      } catch (error) {
        showHeroFotoError(error.message || "Gagal menyimpan hero landing.");
      } finally {
        heroFotoSimpan.disabled = false;
        refreshHeroFotoPreview();
      }
    });
  }

  if (heroFotoHapus) {
    heroFotoHapus.addEventListener("click", async () => {
      const lama = getBengkelInfoLengkap().heroFoto;
      if (!lama) return;

      heroFotoHapus.disabled = true;

      try {
        saveWorkshopInfo({ ...getBengkelInfoLengkap(), heroFoto: "" });
        removeHeroPhoto(lama).catch(() => {});
        refreshHeroFotoPreview();
        closeModal("heroFotoModal");
        renderLandingPreview();
        showPageNotice("Foto latar hero landing dihapus.", "success");
      } finally {
        heroFotoHapus.disabled = false;
      }
    });
  }
}
