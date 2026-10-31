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
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (Array.isArray(data.customers)) saveCustomers(data.customers);
          if (Array.isArray(data.customerAccounts))
            saveCustomerAccounts(data.customerAccounts);
          if (Array.isArray(data.kendaraan)) saveKendaraan(data.kendaraan);
          if (Array.isArray(data.mekanik)) saveMekanik(data.mekanik);
          if (Array.isArray(data.sparepart)) saveSparepart(data.sparepart);
          if (data.info) saveWorkshopInfo(data.info);
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
    openModal("resetModal");
  });

  document.getElementById("btnConfirmReset")?.addEventListener("click", () => {
    /* Lewat lapisan data (save*), BUKAN localStorage langsung:
       - mode lokal : cache + mirror localStorage ikut dikosongkan
       - mode Supabase : baris di server ikut terhapus (fungsi save*)
         sehingga reset benar-benar berlaku, bukan hanya "kelihatan" sukses */
    saveCustomers([]);
    saveKendaraan([]);
    saveMekanik([]);
    saveSparepart([]);
    saveCustomerAccounts([]);

    closeModal("resetModal");
    showPageNotice(
      "Data harian berhasil dikosongkan. Membuka dashboard…",
      "success",
    );
    window.setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 400);
  });

  /* ---------------- RIWAYAT AKTIVITAS ---------------- */
  renderAktivitasTable();
  document
    .getElementById("filterLogAksi")
    ?.addEventListener("change", () => renderAktivitasTable());
  document
    .getElementById("searchLog")
    ?.addEventListener("input", () => renderAktivitasTable());
}

/* Badge warna untuk jenis aksi pada tabel riwayat aktivitas. */
const LOG_AKSI_BADGE = {
  Tambah: "done",
  Update: "working",
  Hapus: "danger",
  Bayar: "done",
};

/* Tabel riwayat aktivitas (audit) di halaman Pengaturan. */
function renderAktivitasTable() {
  const table = document.getElementById("logTable");
  if (!table) return;

  const aksiFilter = document.getElementById("filterLogAksi")?.value || "";
  const keyword = (
    document.getElementById("searchLog")?.value || ""
  )
    .toLowerCase()
    .trim();

  const logs = getLogs()
    .filter((log) => !aksiFilter || log.aksi === aksiFilter)
    .filter((log) =>
      [log.aktor, log.role, log.aksi, log.entitas, log.kode, log.keterangan].some(
        (value) =>
          String(value || "")
            .toLowerCase()
            .includes(keyword),
      ),
    )
    .sort((a, b) => String(b.waktu || "").localeCompare(String(a.waktu || "")));

  table.innerHTML = "";
  if (!logs.length) {
    table.innerHTML =
      '<tr><td colspan="5" style="text-align: center; padding: 30px;">Tidak ada aktivitas tercatat.</td></tr>';
    setText("logInfo", "Tidak ada data");
    return;
  }

  table.innerHTML = logs
    .slice(0, 200)
    .map((log) => {
      const badgeClass = LOG_AKSI_BADGE[log.aksi] || "waiting";
      const waktu = new Date(log.waktu);
      const waktuTeks = Number.isNaN(waktu.getTime())
        ? String(log.waktu || "-")
        : waktu.toLocaleString("id-ID");
      return `
      <tr>
        <td>${escapeHTML(waktuTeks)}</td>
        <td><strong>${escapeHTML(log.aktor || "-")}</strong> <span style="color: var(--secondary); font-size: 12px;">(${escapeHTML(log.role || "-")})</span></td>
        <td><span class="badge ${badgeClass}">${escapeHTML(log.aksi || "-")}</span></td>
        <td>${escapeHTML(log.entitas || "-")}${log.kode ? ` <span class="cell-id">${escapeHTML(log.kode)}</span>` : ""}</td>
        <td>${escapeHTML(log.keterangan || "-")}</td>
      </tr>`;
    })
    .join("");

  setText(
    "logInfo",
    `Menampilkan ${Math.min(logs.length, 200)} dari ${getLogs().length} aktivitas`,
  );
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
