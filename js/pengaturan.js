function initPengaturanPage() {
  const resetButton = document.getElementById("btnResetData");
  if (!resetButton) return;
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
          }, 800);
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
    [
      "workshop_customers",
      "workshop_customer_accounts",
      "workshop_kendaraan",
      "workshop_mekanik",
      "workshop_sparepart",
    ].forEach((key) => localStorage.setItem(key, "[]"));
    closeModal("resetModal");
    showPageNotice(
      "Data harian berhasil dikosongkan. Membuka dashboard…",
      "success",
    );
    window.setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 800);
  });
}
