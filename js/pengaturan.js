function initPengaturanPage() {
  const resetButton = document.getElementById("btnResetData");
  if (!resetButton) return;

  /* ---------------- LOG ERROR KLIEN ---------------- */
  const errorLogButton = document.getElementById("btnErrorLog");
  if (errorLogButton) {
    errorLogButton.addEventListener("click", () => {
      openModal("errorLogModal");
      renderErrorLog();
    });
  }

  const clearErrorLogButton = document.getElementById("btnClearErrorLog");
  if (clearErrorLogButton) {
    clearErrorLogButton.addEventListener("click", async () => {
      window.__errorLogger?.clearLocalRows();

      /* Baris server dibersihkan lewat RLS admin (delete policy). */
      if (supabaseClient && dbIsAdmin()) {
        const { error } = await supabaseClient
          .from("client_errors")
          .delete()
          .neq("id", 0);

        if (error) {
          showPageNotice(
            "Log lokal bersih, tetapi gagal membersihkan server: " +
              error.message,
            "error",
          );
          renderErrorLog();
          return;
        }
      }

      renderErrorLog();
      showPageNotice("Log error klien dibersihkan.", "success");
    });
  }
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
      showPageNotice("Informasi bengkel disimpan.", "success");
    });
  }

  /* ---------------- HERO LANDING ----------------
     Foto latar (bucket site-assets) + teks (label, judul, deskripsi)
     yang tampil di hero landing page. Admin dan super_admin sama-sama
     bisa mengubahnya (halaman ini sudah dijaga requireAdminAuth lewat
     window.__APP_ROLE). */
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
        showPageNotice("Foto latar hero landing dihapus.", "success");
      } finally {
        heroFotoHapus.disabled = false;
      }
    });
  }

  const backupButton = document.getElementById("btnBackupData");
  if (backupButton) {
    backupButton.addEventListener("click", () => {
      const backup = {
        exportedAt: new Date().toISOString(),
        info: getBengkelInfoLengkap(),
        customers: getCustomers(),
        customerAccounts: getCustomerAccounts(),
        kendaraan: getKendaraan(),
        mekanik: getMekanik(),
        sparepart: getSparepart(),
        reviews: getReviews(),
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "workshop-backup.json";
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  const restoreButton = document.getElementById("btnRestoreData");
  const restoreFile = document.getElementById("restoreFile");
  if (restoreButton && restoreFile) {
    restoreButton.addEventListener("click", () => restoreFile.click());
    restoreFile.addEventListener("change", () => {
      const file = restoreFile.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const data = JSON.parse(reader.result);
          if (Array.isArray(data.customers)) saveCustomers(data.customers);
          if (Array.isArray(data.customerAccounts))
            saveCustomerAccounts(data.customerAccounts);
          if (Array.isArray(data.kendaraan)) saveKendaraan(data.kendaraan);
          if (Array.isArray(data.mekanik)) saveMekanik(data.mekanik);
          if (Array.isArray(data.sparepart)) saveSparepart(data.sparepart);
          /* Ulasan ikut dipulihkan — dulu tidak disertakan backup
             maupun restore sehingga rating hilang permanen saat pindah
             perangkat. */
          if (Array.isArray(data.reviews)) saveReviews(data.reviews);
          if (data.info) saveWorkshopInfo(data.info);

          /* Tunggu antrean sinkronisasi Supabase selesai dulu: tanpa ini
             redirect 400 ms membatalkan fetch yang masih berjalan dan
             restore bisa berhenti separuh di server. */
          const tersinkron = await dbFlush();

          if (!tersinkron) {
            showPageNotice(
              "Data dipulihkan di halaman, tetapi gagal dikirim ke server. Periksa koneksi lalu coba lagi.",
              "error",
            );
            return;
          }

          showPageNotice(
            "Restore data berhasil. Membuka dashboard…",
            "success",
          );
          window.setTimeout(() => {
            window.location.href = "dashboard.html";
          }, 400);
        } catch (error) {
          showPageNotice("File backup tidak valid.", "error");
        }
      };
      reader.readAsText(file);
      restoreFile.value = "";
    });
  }

  /* Reset lewat modal konfirmasi (gaya Input Data), bukan popup confirm(). */

  resetButton.addEventListener("click", () => {
    populateResetAccountOptions();
    openModal("resetModal");
  });

  document
    .getElementById("btnConfirmReset")
    ?.addEventListener("click", async () => {
      /* Lewat lapisan data (save*), BUKAN storage langsung:
         cache dalam memori di-reset lalu baris di server ikut terhapus
         (fungsi save*) — jadi reset benar-benar berlaku, bukan hanya
         "kelihatan" sukses. Tidak ada lagi mirror localStorage.

         Akun admin & customer TIDAK ikut dihapus. Data customer yang
         tertaut ke akun juga dipertahankan supaya customer_id pada sesi
         tetap valid dan portal customer tidak menolak login setelah reset.
         Karena itu saveCustomerAccounts([]) tidak boleh dipanggil di sini. */
      const accounts = await dbReloadCustomerAccounts();

      /* Kalau daftar akun gagal dimuat, jangan lanjut: tanpa data akun
         kita tidak bisa membedakan customer yang tertaut dari yang bukan,
         sehingga reset berisiko menghapus data customer milik akun. */
      if (accounts === null) {
        showPageNotice(
          "Reset dibatalkan: daftar akun tidak bisa dimuat. Coba lagi setelah koneksi pulih.",
          "error",
        );
        return;
      }

      const selectedScope =
        document.getElementById("resetAccount")?.value || "admin";
      const customers = getCustomers();
      const accountCustomerIds = new Set(
        accounts
          .map((account) => Number(account.customerId))
          .filter((id) => Number.isFinite(id) && id > 0),
      );
      const accountEmails = new Set(
        accounts
          .map((account) => String(account.email || "").toLowerCase())
          .filter(Boolean),
      );
      const retainedCustomers = customers.filter(
        (customer) =>
          accountCustomerIds.has(Number(customer.id)) ||
          (customer.email &&
            accountEmails.has(String(customer.email).toLowerCase())),
      );

      /* ADMIN / SEMUA CUSTOMER:
         hapus seluruh data, bukan hanya kendaraan/service. Akun tetap
         tersimpan. Baris customer yang tertaut ke akun dipertahankan
         supaya akun customer tetap punya customer_id dan bisa login. */
      if (
        selectedScope === "admin" ||
        selectedScope === "all-customers"
      ) {
        saveCustomers(retainedCustomers);
        saveKendaraan([]);
        saveReviews([]);

        if (selectedScope === "admin") {
          saveMekanik([]);
          saveSparepart([]);

          /* Log aktivitas bukan data operasional akun, tapi ikut
             dibersihkan saat reset penuh dari sisi Admin. */
          if (typeof clearActivityLogs === "function") {
            await clearActivityLogs();
          }
        }

        /* Tunggu antrean sinkronisasi Supabase selesai sebelum menyatakan
           sukses & redirect — reset bisa berhenti separuh di server kalau
           fetch yang masih jalan dibatalkan oleh perpindahan halaman. */
        const tersinkron = await dbFlush();

        if (!tersinkron) {
          showPageNotice(
            "Data dihapus di halaman, tetapi gagal dikirim ke server. Periksa koneksi lalu coba lagi.",
            "error",
          );
          return;
        }

        closeModal("resetModal");
        showPageNotice(
          selectedScope === "admin"
            ? "Semua data bengkel berhasil dihapus. Akun admin/customer dan data customer yang tertaut tetap tersimpan."
            : "Semua data customer berhasil dihapus. Akun dan data customer yang tertaut tetap tersimpan.",
          "success",
        );
        window.setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 400);
        return;
      }

      /* SATU AKUN CUSTOMER:
         hapus semua data milik akun tersebut (kendaraan/service dan
         ulasannya). Akun & baris customer tetap ada. */
      const account = accounts.find(
        (item) => String(item.id) === String(selectedScope),
      );
      const targetCustomer = findCustomerForAccount(account, customers);

      if (!account || !targetCustomer) {
        showPageNotice(
          "Data customer untuk akun yang dipilih tidak ditemukan. Reset dibatalkan.",
          "error",
        );
        return;
      }

      const removedServices = getKendaraan().filter(
        (service) =>
          Number(service.pelangganId) === Number(targetCustomer.id),
      );
      const removedServiceIds = new Set(
        removedServices.map((service) => Number(service.id)),
      );
      const remainingServices = getKendaraan().filter(
        (service) =>
          Number(service.pelangganId) !== Number(targetCustomer.id),
      );

      saveKendaraan(remainingServices);

      if (removedServiceIds.size) {
        saveReviews(
          getReviews().filter(
            (review) => !removedServiceIds.has(Number(review.serviceId)),
          ),
        );
      }

      /* Sama seperti reset di atas: tunggu antrean sinkronisasi selesai
         sebelum menyatakan sukses & redirect. */
      const tersinkron = await dbFlush();

      if (!tersinkron) {
        showPageNotice(
          "Data dihapus di halaman, tetapi gagal dikirim ke server. Periksa koneksi lalu coba lagi.",
          "error",
        );
        return;
      }

      closeModal("resetModal");
      showPageNotice(
        `Data operasional akun ${targetCustomer.nama} berhasil dihapus. Akun dan data customer tetap tersimpan.`,
        "success",
      );
      window.setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 400);
    });
}

/* Cari baris customer yang tertaut ke sebuah akun (berdasarkan id atau
   email). Dipakai saat admin memilih akun pada modal Reset Data. */
function findCustomerForAccount(account, customers) {
  if (!account) {
    return null;
  }

  const customerId = Number(account.customerId);
  const email = String(account.email || "")
    .trim()
    .toLowerCase();

  if (Number.isFinite(customerId) && customerId > 0) {
    const byId = customers.find(
      (customer) => Number(customer.id) === customerId,
    );

    if (byId) {
      return byId;
    }
  }

  if (!email) {
    return null;
  }

  return (
    customers.find(
      (customer) =>
        customer.email &&
        String(customer.email).trim().toLowerCase() === email,
    ) || null
  );
}

/* Isi pilihan pada modal Reset Data: Admin (semua data bengkel), semua
   data customer, lalu akun customer satu per satu. Akun admin tidak
   ditampilkan sebagai akun terpisah karena reset Admin bersifat global. */
function populateResetAccountOptions() {
  const select = document.getElementById("resetAccount");

  if (!select) {
    return;
  }

  const previousValue = select.value;
  const customers = getCustomers();
  const options = [];
  const seenCustomerIds = new Set();

  getCustomerAccounts()
    .filter((account) => !isAdminRole(account.role))
    .forEach((account) => {
      const customer = findCustomerForAccount(account, customers);

      if (!customer) {
        return;
      }

      const customerId = Number(customer.id);

      if (seenCustomerIds.has(customerId)) {
        return;
      }

      seenCustomerIds.add(customerId);
      options.push({ account, customer });
    });

  options.sort((a, b) =>
    String(a.customer.nama || "").localeCompare(
      String(b.customer.nama || ""),
      "id",
    ),
  );

  select.innerHTML = "";

  const adminOption = document.createElement("option");
  adminOption.value = "admin";
  adminOption.textContent = "Admin — semua data bengkel";
  select.appendChild(adminOption);

  const allOption = document.createElement("option");
  allOption.value = "all-customers";
  allOption.textContent = "Semua data customer";
  select.appendChild(allOption);

  options.forEach(({ account, customer }) => {
    const option = document.createElement("option");
    option.value = String(account.id);
    option.textContent = `${customer.nama || "Customer"} — ${
      account.email || customer.email || "-"
    }`;
    select.appendChild(option);
  });

  if ([...select.options].some((option) => option.value === previousValue)) {
    select.value = previousValue;
  }

  const hint = document.getElementById("resetAccountHint");

  if (hint) {
    hint.textContent = options.length
      ? "Pilih Admin untuk semua data bengkel, semua data customer, atau satu akun customer tertentu."
      : "Belum ada akun customer yang tertaut ke data customer. Pilih Admin untuk menghapus semua data bengkel.";
  }
}

/* ---------------------------------------------------------------------
   LOG ERROR KLIEN
   Sumber: localStorage (error-logger.js, perangkat ini) + tabel
   client_errors (dilaporkan semua pengguna, dibaca admin di sini).
   --------------------------------------------------------------------- */

function formatErrorLogTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || "-");
  return date.toLocaleString("id-ID");
}

async function renderErrorLog() {
  const list = document.getElementById("errorLogList");
  if (!list) return;

  const rows = [];

  /* Error dari perangkat ini (localStorage). */
  const localRows =
    (window.__errorLogger && window.__errorLogger.getLocalRows()) || [];

  localRows.forEach((row) => {
    rows.push({ ...row, sumber: "lokal" });
  });

  /* Error dari semua pengguna (server) — hanya admin yang boleh baca. */
  if (supabaseClient && dbIsAdmin()) {
    const { data, error } = await supabaseClient
      .from("client_errors")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error && Array.isArray(data)) {
      data.forEach((row) => {
        rows.push({
          pesan: row.pesan,
          stack: row.stack,
          halaman: row.halaman,
          waktu: row.created_at,
          jumlah: 1,
          sumber: "server",
        });
      });
    }
  }

  if (!rows.length) {
    list.innerHTML =
      '<p class="error-log-empty">Belum ada error tercatat. 🎉</p>';
    return;
  }

  rows.sort((a, b) =>
    String(b.waktu || "").localeCompare(String(a.waktu || "")),
  );

  list.innerHTML = rows
    .slice(0, 100)
    .map((row) => {
      const jumlah = Number(row.jumlah) || 1;

      return `
        <div class="error-log-item">
          <div class="error-log-meta">
            <span class="error-log-badge">${escapeHTML(row.sumber || "?")}</span>
            <strong>${escapeHTML(row.pesan || "(tanpa pesan)")}</strong>
            ${jumlah > 1 ? `<span class="error-log-count">&times;${jumlah}</span>` : ""}
          </div>
          <div class="error-log-sub">
            <span><i class="fa-solid fa-file" aria-hidden="true"></i> ${escapeHTML(row.halaman || "-")}</span>
            <span><i class="fa-solid fa-clock" aria-hidden="true"></i> ${escapeHTML(formatErrorLogTime(row.waktu))}</span>
          </div>
          ${
            row.stack
              ? `<details>
                   <summary>Lihat stack</summary>
                   <pre class="error-log-stack">${escapeHTML(row.stack)}</pre>
                 </details>`
              : ""
          }
        </div>`;
    })
    .join("");
}
