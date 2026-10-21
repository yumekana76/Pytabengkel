function renderServicePage(search = "") {
  const table = document.getElementById("serviceTable");
  if (!table) return;

  const keyword = String(search).toLowerCase().trim();
  const statusFilter =
    document.getElementById("filterStatusService")?.value || "";
  const sort = getSortValue("sortService");

  const services = getKendaraan()
    .filter((item) => !statusFilter || item.status === statusFilter)
    .filter((item) =>
      [
        item.kode,
        item.polisi,
        item.pelanggan,
        item.keluhan,
        item.status,
        getMekanikNama(item.mekanikId),
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(keyword),
      ),
    )
    .sort(compareStatusOrder);

  const servicesSorted = sortRows(services, sort.key, sort.direction);

  table.innerHTML = "";
  if (!servicesSorted.length) {
    table.innerHTML =
      '<tr class="empty-row"><td colspan="11" style="text-align: center; padding: 30px;">Tidak ada data service.</td></tr>';
    setText("serviceInfo", "Tidak ada data");
    return;
  }

  servicesSorted.forEach((item, index) => {
    const statusClass = getStatusClass(item.status);
    const pembayaran = item.pembayaran || "Belum Lunas";
    table.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td><span class="cell-id">${escapeHTML(getKode("kendaraan", item))}</span></td>
        <td><strong>${escapeHTML(item.polisi)}</strong></td>
        <td>${escapeHTML(item.pelanggan)}</td>
        <td>${escapeHTML(item.keluhan)}</td>
        <td>${escapeHTML(getMekanikNama(item.mekanikId))}</td>
        <td><span class="badge ${statusClass}">${escapeHTML(item.status)}${item.status === "Selesai" ? " 🔒" : ""}</span></td>
        <td><span class="badge ${pembayaran === "Lunas" ? "done" : "waiting"}">${escapeHTML(pembayaran)}</span></td>
        <td>${formatRupiah(getServiceTotal(item))}</td>
        <td>${escapeHTML(item.tanggalService || "-")}</td>
        <td><button type="button" class="action-btn" data-edit-service="${item.id}">${item.status === "Selesai" ? "🔒 Proses" : "Proses"}</button></td>
      </tr>`;
  });

  table.querySelectorAll("[data-edit-service]").forEach((button) => {
    button.addEventListener("click", () =>
      editService(button.dataset.editService, button),
    );
  });
  setText("serviceInfo", `Menampilkan ${services.length} service`);
}

function updateServiceStats() {
  const services = getKendaraan();
  setText("totalService", services.length);
  setText(
    "serviceMenunggu",
    services.filter((item) => item.status === "Menunggu").length,
  );
  setText(
    "serviceDikerjakan",
    services.filter((item) => item.status === "Dikerjakan").length,
  );
  setText(
    "serviceSelesai",
    services.filter((item) => item.status === "Selesai").length,
  );
}

function populateServiceForm() {
  const vehicleSelect = document.getElementById("serviceVehicle");
  const mekanikSelect = document.getElementById("serviceMekanik");
  if (!vehicleSelect || !mekanikSelect) return;

  vehicleSelect.innerHTML = '<option value="">Pilih kendaraan</option>';
  getKendaraan().forEach((item) => {
    vehicleSelect.innerHTML += `<option value="${item.id}">${escapeHTML(item.polisi)} — ${escapeHTML(item.pelanggan)}</option>`;
  });

  mekanikSelect.innerHTML = '<option value="">Pilih mekanik</option>';
  getMekanik()
    .filter((item) => item.status === "Aktif")
    .forEach((item) => {
      mekanikSelect.innerHTML += `<option value="${item.id}">${escapeHTML(item.nama)} — ${escapeHTML(item.spesialisasi)}</option>`;
    });
}

function updateServiceTotalPreview() {
  const biayaJasa =
    Number(document.getElementById("serviceBiayaJasa")?.value) || 0;
  const sparepart = getSparepart();
  const totalSparepart = [
    ...document.querySelectorAll(".service-part-row"),
  ].reduce((total, row) => {
    const part = sparepart.find(
      (item) =>
        Number(item.id) ===
        Number(row.querySelector("[data-service-part]")?.value),
    );
    const jumlah =
      Number(row.querySelector("[data-service-part-quantity]")?.value) || 0;
    return total + (Number(part?.harga) || 0) * jumlah;
  }, 0);
  setText("serviceTotalPreview", formatRupiah(biayaJasa + totalSparepart));
}

function addServiceSparepartRow(selectedId = "", jumlah = 1) {
  const list = document.getElementById("serviceSparepartList");
  if (!list) return;

  const options = getSparepart()
    .filter(
      (item) => Number(item.stok) > 0 || Number(item.id) === Number(selectedId),
    )
    .map(
      (item) =>
        `<option value="${item.id}" ${Number(item.id) === Number(selectedId) ? "selected" : ""}>${escapeHTML(item.nama)} — ${formatRupiah(item.harga)} (stok: ${item.stok})</option>`,
    )
    .join("");

  const row = document.createElement("div");
  row.className = "service-part-row";
  row.innerHTML = `
    <select class="form-control" data-service-part required>
      <option value="">Pilih sparepart</option>${options}
    </select>
    <input class="form-control" data-service-part-quantity type="number" min="1" value="${Math.max(1, Number(jumlah) || 1)}" required aria-label="Jumlah sparepart" />
    <button type="button" class="action-btn danger" data-remove-service-part aria-label="Hapus sparepart">Hapus</button>`;
  row
    .querySelectorAll("select, input")
    .forEach((input) =>
      input.addEventListener("input", updateServiceTotalPreview),
    );
  row
    .querySelector("[data-remove-service-part]")
    .addEventListener("click", () => {
      row.remove();
      updateServiceTotalPreview();
    });
  list.appendChild(row);
  updateServiceTotalPreview();
}

function getServiceSparepartsFromForm() {
  const sparepart = getSparepart();
  const selected = [];

  for (const row of document.querySelectorAll(".service-part-row")) {
    const partId = row.querySelector("[data-service-part]").value;
    const jumlah = Number(
      row.querySelector("[data-service-part-quantity]").value,
    );
    if (!partId || !Number.isInteger(jumlah) || jumlah < 1) {
      throw new Error("Pilih sparepart dan isi jumlah minimal 1.");
    }
    const part = sparepart.find((item) => Number(item.id) === Number(partId));
    if (!part) throw new Error("Sparepart yang dipilih tidak tersedia.");
    const existing = selected.find(
      (item) => Number(item.sparepartId) === Number(part.id),
    );
    if (existing) {
      existing.jumlah += jumlah;
    } else {
      selected.push({
        sparepartId: part.id,
        nama: part.nama,
        harga: Number(part.harga) || 0,
        jumlah,
      });
    }
  }
  return selected;
}

function resetServiceForm() {
  const form = document.getElementById("serviceForm");
  if (!form) return;
  form.reset();
  clearFormError("serviceForm");
  populateServiceForm();
  document.getElementById("serviceBiayaJasa").value = "";
  document.getElementById("servicePembayaran").value = "Belum Lunas";
  document.getElementById("serviceSparepartList").innerHTML = "";
  const tanggal = document.getElementById("serviceTanggal");
  if (tanggal && !tanggal.value)
    tanggal.value = new Date().toISOString().slice(0, 10);
  updateServiceTotalPreview();
  document.getElementById("serviceVehicle").disabled = false;
  document.getElementById("serviceModalTitle").textContent = "Proses Service";
}

var activeServiceId = null;

function editService(id, button = null) {
  const service = getKendaraan().find((item) => Number(item.id) === Number(id));
  if (!service) return;
  if (!confirmUnlock(service, "memproses", button)) return;
  clearFormError("serviceForm");
  resetServiceForm();
  activeServiceId = service.id;
  document.getElementById("serviceVehicle").value = service.id;
  document.getElementById("serviceVehicle").disabled = true;
  const mekanikSelect = document.getElementById("serviceMekanik");
  if (
    service.mekanikId &&
    ![...mekanikSelect.options].some(
      (option) => Number(option.value) === Number(service.mekanikId),
    )
  ) {
    const current = getMekanik().find(
      (item) => Number(item.id) === Number(service.mekanikId),
    );
    const option = document.createElement("option");
    option.value = service.mekanikId;
    option.textContent = current
      ? `${current.nama} — ${current.spesialisasi} (${current.status})`
      : `${service.mekanik || "Mekanik"} (tidak terdaftar)`;
    mekanikSelect.appendChild(option);
  }
  mekanikSelect.value = service.mekanikId || "";
  document.getElementById("serviceStatus").value = service.status;
  document.getElementById("servicePembayaran").value =
    service.pembayaran || "Belum Lunas";
  document.getElementById("serviceTanggal").value =
    service.tanggalService || "";
  document.getElementById("serviceBiayaJasa").value =
    Number(service.biayaJasa) || "";
  (service.spareparts || []).forEach((item) =>
    addServiceSparepartRow(item.sparepartId, item.jumlah),
  );
  document.getElementById("serviceModalTitle").textContent =
    `Proses ${service.polisi}`;

  /* Struk hanya bisa dicetak kalau service sudah selesai. */
  const cetakButton = document.getElementById("btnCetakStrukService");

  if (cetakButton) {
    cetakButton.hidden = service.status !== "Selesai";
    cetakButton.title =
      service.status === "Selesai"
        ? "Cetak struk invoice"
        : "Struk bisa dicetak setelah service selesai";
  }

  openModal("serviceModal");
}

/* Cetak struk invoice service yang sedang diproses. */
function printServiceStruk() {
  const service = getKendaraan().find(
    (item) => Number(item.id) === Number(activeServiceId),
  );

  if (!service) return;

  printServiceInvoice(service);
}

function saveServiceForm(event) {
  event.preventDefault();
  clearFormError("serviceForm");
  clearPageNotice();
  const vehicleId = document.getElementById("serviceVehicle").value;
  const mekanikId = document.getElementById("serviceMekanik").value;
  const status = document.getElementById("serviceStatus").value;
  const pembayaran =
    document.getElementById("servicePembayaran")?.value || "Belum Lunas";
  const tanggalService = document.getElementById("serviceTanggal").value;
  const mekanik = getMekanik().find(
    (item) => Number(item.id) === Number(mekanikId),
  );
  const kendaraan = getKendaraan();
  const index = kendaraan.findIndex(
    (item) => Number(item.id) === Number(vehicleId),
  );

  if (index === -1 || !mekanik) {
    showFormError("serviceForm", "Pilih kendaraan dan mekanik aktif.");
    return;
  }

  let spareparts;
  try {
    spareparts = getServiceSparepartsFromForm();
  } catch (error) {
    showFormError("serviceForm", error.message);
    return;
  }

  const previousParts = kendaraan[index].spareparts || [];
  const stokTersedia = getSparepart();
  const previousQuantities = previousParts.reduce((map, item) => {
    map[item.sparepartId] =
      (map[item.sparepartId] || 0) + (Number(item.jumlah) || 0);
    return map;
  }, {});

  for (const item of spareparts) {
    const part = stokTersedia.find(
      (entry) => Number(entry.id) === Number(item.sparepartId),
    );
    if (
      !part ||
      Number(item.jumlah) >
        Number(part.stok) + (previousQuantities[item.sparepartId] || 0)
    ) {
      showFormError("serviceForm", `Stok ${item.nama} tidak mencukupi.`);
      return;
    }
  }

  const nextQuantities = spareparts.reduce((map, item) => {
    map[item.sparepartId] = (map[item.sparepartId] || 0) + Number(item.jumlah);
    return map;
  }, {});
  stokTersedia.forEach((part) => {
    const restored = previousQuantities[part.id] || 0;
    const used = nextQuantities[part.id] || 0;
    part.stok = Number(part.stok) + restored - used;
  });

  kendaraan[index] = {
    ...kendaraan[index],
    mekanikId: mekanik.id,
    mekanik: mekanik.nama,
    status,
    pembayaran,
    tanggalService,
    biayaJasa: Number(document.getElementById("serviceBiayaJasa").value) || 0,
    spareparts,
  };
  saveKendaraan(kendaraan);
  saveSparepart(stokTersedia);

  addLog(
    "Proses",
    "Service",
    `${kendaraan[index].polisi} — status ${status}, pembayaran ${pembayaran}`,
    getKode("kendaraan", kendaraan[index]),
  );

  closeModal("serviceModal");
  if (typeof renderServicePage === "function")
    renderServicePage(document.getElementById("searchService").value);
  if (typeof updateServiceStats === "function") updateServiceStats();
  if (typeof updateDashboard === "function") updateDashboard();
  showPageNotice("Service tersimpan di tabel.", "success");
}

function initServicePage() {
  const table = document.getElementById("serviceTable");
  if (!table) return;

  if (typeof renderServicePage === "function") renderServicePage();
  if (typeof updateServiceStats === "function") updateServiceStats();
  document.getElementById("btnProsesService").addEventListener("click", () => {
    resetServiceForm();
    openModal("serviceModal");
  });
  document
    .getElementById("serviceForm")
    .addEventListener("submit", saveServiceForm);
  document
    .getElementById("btnTambahServiceSparepart")
    .addEventListener("click", () => addServiceSparepartRow());
  document
    .getElementById("btnCetakStrukService")
    ?.addEventListener("click", printServiceStruk);
  document
    .getElementById("serviceBiayaJasa")
    .addEventListener("input", updateServiceTotalPreview);
  document
    .getElementById("searchService")
    .addEventListener(
      "input",
      (event) =>
        typeof renderServicePage === "function" &&
        renderServicePage(event.target.value),
    );
  document
    .getElementById("filterStatusService")
    ?.addEventListener(
      "change",
      () =>
        typeof renderServicePage === "function" &&
        renderServicePage(document.getElementById("searchService").value),
    );
  document
    .getElementById("sortService")
    ?.addEventListener(
      "change",
      () =>
        typeof renderServicePage === "function" &&
        renderServicePage(document.getElementById("searchService").value),
    );
  /* Penutupan modal sudah ditangani global.js */
}
