/* HALAMAN MEKANIK */

function updateMekanikStats() {
  const mekanik = getMekanik();
  setText("totalMekanik", mekanik.length);
  setText(
    "mekanikAktif",
    mekanik.filter((item) => item.status === "Aktif").length,
  );
  setText(
    "mekanikIzin",
    mekanik.filter((item) => item.status === "Izin").length,
  );
}

function renderMekanikPage(search = "") {
  const table = document.getElementById("mekanikPageTable");
  if (!table) return;

  const keyword = String(search).toLowerCase().trim();
  const statusFilter =
    document.getElementById("filterMekanikStatus")?.value || "";
  const sort = getSortValue("sortMekanik");
  const mekanik = sortRows(
    getMekanik()
      .filter((item) => !statusFilter || item.status === statusFilter)
      .filter((item) =>
        [item.kode, item.id, item.nama, item.spesialisasi, item.status].some(
          (value) =>
          String(value || "")
            .toLowerCase()
            .includes(keyword),
        ),
      ),
    sort.key,
    sort.direction,
  );

  table.innerHTML = "";
  if (!mekanik.length) {
    table.innerHTML =
      '<tr><td colspan="7" style="text-align: center; padding: 30px;">Tidak ada data mekanik.</td></tr>';
    setText("mekanikInfo", "Tidak ada data");
    return;
  }

  mekanik.forEach((item, index) => {
    table.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td><span class="cell-id">${escapeHTML(getKode("mekanik", item))}</span></td>
        <td><strong>${escapeHTML(item.nama)}</strong></td>
        <td>${escapeHTML(item.spesialisasi)}</td>
        <td>${escapeHTML(item.telepon || "-")}</td>
        <td>${escapeHTML(item.status)}</td>
        <td><div class="action-buttons">
          <button type="button" class="action-btn" data-edit-mekanik="${item.id}">Edit</button>
          <button type="button" class="action-btn danger" data-delete-mekanik="${item.id}">Hapus</button>
        </div></td>
      </tr>`;
  });

  table.querySelectorAll("[data-edit-mekanik]").forEach((button) => {
    button.addEventListener("click", () =>
      editMekanik(button.dataset.editMekanik),
    );
  });
  table.querySelectorAll("[data-delete-mekanik]").forEach((button) => {
    button.addEventListener("click", () =>
      deleteMekanik(button.dataset.deleteMekanik, button),
    );
  });
  setText("mekanikInfo", `Menampilkan ${mekanik.length} mekanik`);
}

function resetMekanikForm() {
  const form = document.getElementById("mekanikForm");
  if (!form) return;
  form.reset();
  clearFormError("mekanikForm");
  document.getElementById("mekanikId").value = "";
  setText("mekanikModalTitle", "Tambah Mekanik");
}

function editMekanik(id) {
  const mekanik = getMekanik().find((item) => Number(item.id) === Number(id));
  if (!mekanik) return;
  clearFormError("mekanikForm");
  document.getElementById("mekanikId").value = mekanik.id;
  document.getElementById("mekanikNama").value = mekanik.nama;
  document.getElementById("mekanikSpesialisasi").value = mekanik.spesialisasi;
  document.getElementById("mekanikTelepon").value = mekanik.telepon || "";
  document.getElementById("mekanikStatus").value = mekanik.status;
  setText("mekanikModalTitle", "Edit Mekanik");
  openModal("mekanikModal");
}

function saveMekanikForm(event) {
  event.preventDefault();
  clearFormError("mekanikForm");
  clearPageNotice();
  const id = document.getElementById("mekanikId").value;
  const nama = document.getElementById("mekanikNama").value.trim();
  const spesialisasi = document
    .getElementById("mekanikSpesialisasi")
    .value.trim();
  const telepon = document.getElementById("mekanikTelepon").value.trim();
  if (!nama || !spesialisasi) {
    showFormError("mekanikForm", "Nama dan spesialisasi mekanik wajib diisi.");
    return;
  }
  if (!telepon) {
    showFormError("mekanikForm", "Nomor HP mekanik wajib diisi.");
    return;
  }
  const status = document.getElementById("mekanikStatus").value;
  const mekanik = getMekanik();
  if (id) {
    const index = mekanik.findIndex((item) => Number(item.id) === Number(id));
    if (index !== -1)
      mekanik[index] = {
        ...mekanik[index],
        nama,
        spesialisasi,
        telepon,
        status,
      };
  } else {
    const nextId = mekanik.length
      ? Math.max(...mekanik.map((item) => Number(item.id) || 0)) + 1
      : 1;
    mekanik.push({
      id: nextId,
      kode: nextKode("mekanik", mekanik),
      nama,
      spesialisasi,
      telepon,
      status,
    });
  }

  saveMekanik(mekanik);

  addLog(
    id ? "Update" : "Tambah",
    "Mekanik",
    `${nama} — ${spesialisasi} (${status})`,
    getKode(
      "mekanik",
      id
        ? mekanik.find((item) => Number(item.id) === Number(id))
        : mekanik[mekanik.length - 1],
    ),
  );

  closeModal("mekanikModal");
  resetMekanikForm();
  if (typeof renderMekanikPage === "function")
    renderMekanikPage(document.getElementById("searchMekanik").value);
  if (typeof updateMekanikStats === "function") updateMekanikStats();
  if (typeof renderMekanik === "function") renderMekanik();
  showPageNotice("Data mekanik tersimpan di tabel.", "success");
}

function deleteMekanik(id, button = null) {
  const mekanik = getMekanik();
  const item = mekanik.find((entry) => Number(entry.id) === Number(id));
  const serviceCount = getKendaraan().filter(
    (vehicle) => Number(vehicle.mekanikId) === Number(id),
  ).length;

  if (!item) return;
  if (serviceCount) {
    showPageNotice(
      `Mekanik ${item.nama} masih ditugaskan pada ${serviceCount} service. Data tidak dihapus, lihat tabel Service.`,
      "error",
    );
    return;
  }
  if (!armConfirmButton(button, `Klik lagi untuk hapus ${item.nama}`)) {
    showPageNotice(
      `Klik Hapus sekali lagi untuk menghapus mekanik ${item.nama}.`,
      "error",
    );
    return;
  }

  saveMekanik(mekanik.filter((entry) => Number(entry.id) !== Number(id)));

  addLog(
    "Hapus",
    "Mekanik",
    `${item.nama} — ${item.spesialisasi}`,
    getKode("mekanik", item),
  );
  if (typeof renderMekanikPage === "function")
    renderMekanikPage(document.getElementById("searchMekanik").value);
  if (typeof updateMekanikStats === "function") updateMekanikStats();
  if (typeof renderMekanik === "function") renderMekanik();
  showPageNotice(`Mekanik ${item.nama} dihapus dari tabel.`, "success");
}

function initMekanikPage() {
  const table = document.getElementById("mekanikPageTable");
  if (!table) return;

  if (typeof renderMekanikPage === "function") renderMekanikPage();
  if (typeof updateMekanikStats === "function") updateMekanikStats();
  document.getElementById("btnTambahMekanik").addEventListener("click", () => {
    resetMekanikForm();
    openModal("mekanikModal");
  });
  document
    .getElementById("mekanikForm")
    .addEventListener("submit", saveMekanikForm);
  document
    .getElementById("searchMekanik")
    .addEventListener(
      "input",
      (event) =>
        typeof renderMekanikPage === "function" &&
        renderMekanikPage(event.target.value),
    );
  document
    .getElementById("filterMekanikStatus")
    ?.addEventListener(
      "change",
      (event) =>
        typeof renderMekanikPage === "function" &&
        renderMekanikPage(document.getElementById("searchMekanik").value),
    );
  document
    .getElementById("sortMekanik")
    ?.addEventListener(
      "change",
      (event) =>
        typeof renderMekanikPage === "function" &&
        renderMekanikPage(document.getElementById("searchMekanik").value),
    );
  /* Penutupan modal sudah ditangani global.js */
}
