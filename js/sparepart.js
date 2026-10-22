/* START */

function updateSparepartStats() {
  const sparepart = getSparepart();
  setText("totalSparepart", sparepart.length);
  setText(
    "sparepartTersedia",
    sparepart.filter((item) => Number(item.stok) > 0).length,
  );
  setText(
    "sparepartHabis",
    sparepart.filter((item) => Number(item.stok) <= 0).length,
  );
}

function renderSparepartPage(search = "") {
  const table = document.getElementById("sparepartPageTable");
  if (!table) return;
  const keyword = String(search).toLowerCase().trim();
  const stockFilter =
    document.getElementById("filterSparepartStok")?.value || "";
  const sort = getSortValue("sortSparepart");
  const sparepart = sortRows(
    getSparepart()
      .filter((item) => stockFilter !== "tersedia" || Number(item.stok) > 0)
      .filter((item) => stockFilter !== "habis" || Number(item.stok) <= 0)
      .filter((item) =>
        [item.kode, item.id, item.nama, item.kategori].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(keyword),
        ),
      ),
    sort.key,
    sort.direction,
  );
  table.innerHTML = sparepart.length
    ? sparepart
        .map(
          (item, index) => `
    <tr><td>${index + 1}</td><td><span class="cell-id">${escapeHTML(getKode("sparepart", item))}</span></td><td><strong>${escapeHTML(item.nama)}</strong></td><td>${item.stok}</td><td>${formatRupiah(item.harga)}</td>
    <td><div class="action-buttons"><button class="action-btn" type="button" data-edit-sparepart="${item.id}">Edit</button><button class="action-btn danger" type="button" data-delete-sparepart="${item.id}">Hapus</button></div></td></tr>`,
        )
        .join("")
    : '<tr><td colspan="6" style="text-align:center; padding:30px;">Tidak ada data sparepart.</td></tr>';
  setText(
    "sparepartInfo",
    sparepart.length
      ? `Menampilkan ${sparepart.length} sparepart`
      : "Tidak ada data",
  );
  table
    .querySelectorAll("[data-edit-sparepart]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        editSparepart(button.dataset.editSparepart),
      ),
    );
  table
    .querySelectorAll("[data-delete-sparepart]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        deleteSparepart(button.dataset.deleteSparepart, button),
      ),
    );
}

function resetSparepartForm() {
  document.getElementById("sparepartForm")?.reset();
  clearFormError("sparepartForm");
  document.getElementById("sparepartId").value = "";
  setText("sparepartModalTitle", "Tambah Sparepart");
}

function editSparepart(id) {
  const item = getSparepart().find((part) => Number(part.id) === Number(id));
  if (!item) return;
  clearFormError("sparepartForm");
  document.getElementById("sparepartId").value = item.id;
  document.getElementById("sparepartNama").value = item.nama;
  document.getElementById("sparepartStok").value = item.stok;
  document.getElementById("sparepartHarga").value = item.harga;
  setText("sparepartModalTitle", "Edit Sparepart");
  openModal("sparepartModal");
}

function saveSparepartForm(event) {
  event.preventDefault();
  clearFormError("sparepartForm");
  clearPageNotice();
  const id = document.getElementById("sparepartId").value;
  const nama = document.getElementById("sparepartNama").value.trim();
  const stok = Number(document.getElementById("sparepartStok").value);
  const harga = Number(document.getElementById("sparepartHarga").value);
  const sparepart = getSparepart();
  if (
    !nama ||
    !Number.isInteger(stok) ||
    stok < 0 ||
    !Number.isFinite(harga) ||
    harga < 0
  ) {
    showFormError(
      "sparepartForm",
      "Nama, stok, dan harga sparepart harus valid.",
    );
    return;
  }
  if (id) {
    const index = sparepart.findIndex((item) => Number(item.id) === Number(id));
    if (index !== -1)
      sparepart[index] = { ...sparepart[index], nama, stok, harga };
  } else {
    const nextId = sparepart.length
      ? Math.max(...sparepart.map((item) => Number(item.id) || 0)) + 1
      : 1;
    sparepart.push({
      id: nextId,
      kode: nextKode("sparepart", sparepart),
      nama,
      stok,
      harga,
    });
  }
  saveSparepart(sparepart);

  addLog(
    id ? "Update" : "Tambah",
    "Sparepart",
    `${nama} — stok ${stok}, ${formatRupiah(harga)}`,
    getKode(
      "sparepart",
      id
        ? sparepart.find((item) => Number(item.id) === Number(id))
        : sparepart[sparepart.length - 1],
    ),
  );

  closeModal("sparepartModal");
  resetSparepartForm();
  if (typeof renderSparepartPage === "function")
    renderSparepartPage(document.getElementById("searchSparepart").value);
  if (typeof updateSparepartStats === "function") updateSparepartStats();
  showPageNotice("Data sparepart tersimpan di tabel.", "success");
}

function deleteSparepart(id, button = null) {
  const item = getSparepart().find((part) => Number(part.id) === Number(id));
  if (!item) return;
  const dipakai = getKendaraan().some((vehicle) =>
    (vehicle.spareparts || []).some(
      (part) => Number(part.sparepartId) === Number(id),
    ),
  );
  if (dipakai) {
    showPageNotice(
      `Sparepart ${item.nama} tidak dapat dihapus karena sudah dipakai pada service. Lihat tabel Service.`,
      "error",
    );
    return;
  }
  if (!armConfirmButton(button, `Klik lagi untuk hapus ${item.nama}`)) {
    showPageNotice(
      `Klik Hapus sekali lagi untuk menghapus sparepart ${item.nama}.`,
      "error",
    );
    return;
  }
  saveSparepart(
    getSparepart().filter((part) => Number(part.id) !== Number(id)),
  );

  addLog(
    "Hapus",
    "Sparepart",
    `${item.nama} — stok ${item.stok}`,
    getKode("sparepart", item),
  );
  if (typeof renderSparepartPage === "function")
    renderSparepartPage(document.getElementById("searchSparepart").value);
  if (typeof updateSparepartStats === "function") updateSparepartStats();
  showPageNotice(`Sparepart ${item.nama} dihapus dari tabel.`, "success");
}

function initSparepartPage() {
  if (!document.getElementById("sparepartPageTable")) return;
  if (typeof renderSparepartPage === "function") renderSparepartPage();
  if (typeof updateSparepartStats === "function") updateSparepartStats();
  document
    .getElementById("btnTambahSparepart")
    .addEventListener("click", () => {
      resetSparepartForm();
      openModal("sparepartModal");
    });
  document
    .getElementById("sparepartForm")
    .addEventListener("submit", saveSparepartForm);
  document
    .getElementById("searchSparepart")
    .addEventListener(
      "input",
      (event) =>
        typeof renderSparepartPage === "function" &&
        renderSparepartPage(event.target.value),
    );
  document
    .getElementById("filterSparepartStok")
    ?.addEventListener(
      "change",
      (event) =>
        typeof renderSparepartPage === "function" &&
        renderSparepartPage(document.getElementById("searchSparepart").value),
    );
  document
    .getElementById("sortSparepart")
    ?.addEventListener(
      "change",
      (event) =>
        typeof renderSparepartPage === "function" &&
        renderSparepartPage(document.getElementById("searchSparepart").value),
    );
}
