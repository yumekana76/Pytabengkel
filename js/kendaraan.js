/* RESET FORM KENDARAAN */

function resetKendaraanForm() {
  const form = document.getElementById("vehicleForm");

  if (!form) {
    return;
  }

  form.reset();

  clearFormError("vehicleForm");

  populateVehicleFormRelations();

  const list = document.getElementById("vehicleSparepartList");
  if (list) {
    list.innerHTML = "";
    addVehicleSparepartRow();
  }

  const id = document.getElementById("vehicleId");

  if (id) {
    id.value = "";
  }

  const title = document.getElementById("vehicleModalTitle");

  if (title) {
    title.textContent = "Tambah Kendaraan";
  }
}

function populateVehicleFormRelations() {
  const customerSelect = document.getElementById("vehicleCustomerId");
  const mekanikSelect = document.getElementById("vehicleMekanikId");
  if (!customerSelect || !mekanikSelect) return;

  customerSelect.innerHTML =
    '<option value="">Tambah pelanggan baru</option>' +
    getCustomers()
      .map(
        (item) =>
          `<option value="${item.id}">#${item.id} — ${escapeHTML(item.nama)}</option>`,
      )
      .join("");
  mekanikSelect.innerHTML =
    '<option value="">Tambah mekanik baru</option>' +
    getMekanik()
      .map(
        (item) =>
          `<option value="${item.id}">#${item.id} — ${escapeHTML(item.nama)}</option>`,
      )
      .join("");

  customerSelect.onchange = () => {
    const customer = getCustomers().find(
      (item) => Number(item.id) === Number(customerSelect.value),
    );
    if (!customer) return;
    document.getElementById("vehiclePelanggan").value = customer.nama;
    document.getElementById("vehicleCustomerTelepon").value =
      customer.telepon || "";
    document.getElementById("vehicleCustomerEmail").value =
      customer.email || "";
    document.getElementById("vehicleCustomerAlamat").value =
      customer.alamat || "";
  };
  mekanikSelect.onchange = () => {
    const mekanik = getMekanik().find(
      (item) => Number(item.id) === Number(mekanikSelect.value),
    );
    if (!mekanik) return;
    document.getElementById("vehicleMekanikNama").value = mekanik.nama;
    document.getElementById("vehicleMekanikSpesialisasi").value =
      mekanik.spesialisasi || "";
  };
}

function vehicleSparepartOptions(selectedId = "") {
  return (
    '<option value="">Tambah sparepart baru</option>' +
    getSparepart()
      .map(
        (item) =>
          `<option value="${item.id}"${Number(item.id) === Number(selectedId) ? " selected" : ""}>#${item.id} — ${escapeHTML(item.nama)} (${item.stok})</option>`,
      )
      .join("")
  );
}

function addVehicleSparepartRow(selectedId = "", jumlah = "", preset = {}) {
  const list = document.getElementById("vehicleSparepartList");
  if (!list) return;
  const row = document.createElement("div");
  row.className = "part-row-box";
  row.innerHTML = `
    <div class="part-row-head">
      <select class="form-control" data-part-select aria-label="Sparepart terdaftar">
        ${vehicleSparepartOptions(selectedId)}
      </select>
      <button type="button" class="action-btn danger" data-part-remove aria-label="Hapus baris sparepart">Hapus</button>
    </div>
    <div class="part-row-grid">
      <div class="form-group">
        <label>Nama Sparepart</label>
        <input type="text" class="form-control" data-part-nama placeholder="Contoh: Oli Mesin" value="${escapeHTML(preset.nama || "")}" />
      </div>
      <div class="form-group">
        <label>Stok Awal (khusus baru)</label>
        <input type="number" class="form-control" data-part-stok min="0" placeholder="0" value="${preset.stok ?? ""}" />
      </div>
      <div class="form-group">
        <label>Harga Satuan</label>
        <input type="number" class="form-control" data-part-harga min="0" placeholder="0" value="${preset.harga ?? ""}" />
      </div>
      <div class="form-group">
        <label>Jumlah Dipakai</label>
        <input type="number" class="form-control" data-part-jumlah min="1" placeholder="0" value="${jumlah}" />
      </div>
    </div>`;
  const select = row.querySelector("[data-part-select]");
  select.addEventListener("change", () => {
    const part = getSparepart().find(
      (item) => Number(item.id) === Number(select.value),
    );
    if (!part) return;
    row.querySelector("[data-part-nama]").value = part.nama || "";
    row.querySelector("[data-part-stok]").value = part.stok ?? "";
    row.querySelector("[data-part-harga]").value = part.harga ?? "";
  });
  row.querySelector("[data-part-remove]").addEventListener("click", () => {
    row.remove();
  });
  list.appendChild(row);
}

/* EDIT KENDARAAN */

function editKendaraan(id, button = null) {
  const kendaraan = getKendaraan();

  const item = kendaraan.find(
    (kendaraan) => Number(kendaraan.id) === Number(id),
  );

  if (!item) {
    return;
  }

  if (!confirmUnlock(item, "mengubah", button)) return;
  clearFormError("vehicleForm");

  populateVehicleFormRelations();

  const vehicleId = document.getElementById("vehicleId");

  const polisi = document.getElementById("vehiclePolisi");

  const pelanggan = document.getElementById("vehiclePelanggan");

  const jenis = document.getElementById("vehicleJenis");

  const merk = document.getElementById("vehicleMerk");

  const keluhan = document.getElementById("vehicleKeluhan");

  const status = document.getElementById("vehicleStatus");

  const tanggal = document.getElementById("vehicleTanggal");

  if (vehicleId) {
    vehicleId.value = item.id;
  }

  if (polisi) {
    polisi.value = item.polisi;
  }

  if (pelanggan) {
    pelanggan.value = item.pelanggan;
  }

  const customer = getCustomers().find(
    (entry) => Number(entry.id) === Number(item.pelangganId),
  );
  document.getElementById("vehicleCustomerId").value = item.pelangganId || "";
  document.getElementById("vehicleCustomerTelepon").value =
    customer?.telepon || "";
  document.getElementById("vehicleCustomerEmail").value = customer?.email || "";
  document.getElementById("vehicleCustomerAlamat").value =
    customer?.alamat || "";
  document.getElementById("vehicleMekanikId").value = item.mekanikId || "";
  document.getElementById("vehicleMekanikNama").value = item.mekanik || "";
  document.getElementById("vehicleMekanikSpesialisasi").value =
    getMekanik().find((entry) => Number(entry.id) === Number(item.mekanikId))
      ?.spesialisasi || "";
  document.getElementById("vehicleBiayaJasa").value = item.biayaJasa || "";
  if (tanggal) {
    tanggal.value = item.tanggalService || "";
  }
  const list = document.getElementById("vehicleSparepartList");
  if (list) {
    list.innerHTML = "";
    const rows = item.spareparts || [];
    if (!rows.length) {
      addVehicleSparepartRow();
    } else {
      const stokNow = getSparepart();
      rows.forEach((used) => {
        const part = stokNow.find(
          (entry) => Number(entry.id) === Number(used.sparepartId),
        );
        addVehicleSparepartRow(used.sparepartId || "", used.jumlah || "", {
          nama: used.nama || part?.nama || "",
          stok: part ? part.stok : "",
          harga: used.harga ?? part?.harga ?? "",
        });
      });
    }
  }

  if (jenis) {
    jenis.value = item.jenis;
  }

  if (merk) {
    merk.value = item.merk;
  }

  if (keluhan) {
    keluhan.value = item.keluhan;
  }

  if (status) {
    status.value = item.status;
  }

  const title = document.getElementById("vehicleModalTitle");

  if (title) {
    title.textContent = "Edit Kendaraan";
  }

  openModal("vehicleModal");
}

/* TAMBAH / SIMPAN / EDIT KENDARAAN */

function saveKendaraanForm(event) {
  event.preventDefault();
  clearFormError("vehicleForm");
  clearPageNotice();
  const value = (id) => document.getElementById(id).value.trim();
  const id = value("vehicleId");
  const customerId = value("vehicleCustomerId");
  const mekanikId = value("vehicleMekanikId");
  const pelangganNama = value("vehiclePelanggan");
  const polisi = value("vehiclePolisi");
  const merk = value("vehicleMerk");

  if (!polisi || !pelangganNama || !merk) {
    showFormError(
      "vehicleForm",
      "Nomor polisi, nama pelanggan, dan merk wajib diisi.",
    );
    return;
  }

  const customers = getCustomers();
  let customer = customers.find(
    (item) => Number(item.id) === Number(customerId),
  );
  if (!customer) {
    const telepon = value("vehicleCustomerTelepon");
    if (!telepon) {
      showFormError(
        "vehicleForm",
        "Nomor HP wajib diisi saat menambah pelanggan baru.",
      );
      return;
    }
    customer = {
      id: nextNumericId(customers),
      nama: pelangganNama,
      telepon,
      email: value("vehicleCustomerEmail"),
      alamat: value("vehicleCustomerAlamat"),
      catatan: "",
      registeredAt: new Date().toISOString(),
    };
    customers.push(customer);
  }

  const mekanikData = getMekanik();
  let mekanik = mekanikData.find(
    (item) => Number(item.id) === Number(mekanikId),
  );
  if (!mekanik) {
    const namaMekanik = value("vehicleMekanikNama");
    const spesialisasi = value("vehicleMekanikSpesialisasi");
    if (!namaMekanik || !spesialisasi) {
      showFormError(
        "vehicleForm",
        "Pilih mekanik terdaftar atau isi nama dan spesialisasi mekanik baru.",
      );
      return;
    }
    mekanik = {
      id: nextNumericId(mekanikData),
      nama: namaMekanik,
      spesialisasi,
      status: "Aktif",
    };
    mekanikData.push(mekanik);
  }

  const sparepartData = getSparepart();
  const existingVehicle = getKendaraan().find(
    (item) => Number(item.id) === Number(id),
  );
  (existingVehicle?.spareparts || []).forEach((used) => {
    const part = sparepartData.find(
      (item) => Number(item.id) === Number(used.sparepartId),
    );
    if (part) part.stok = Number(part.stok) + (Number(used.jumlah) || 0);
  });
  let spareparts = [];
  const partRows = [
    ...document.querySelectorAll("#vehicleSparepartList .part-row-box"),
  ];
  const pemakaian = [];
  for (const row of partRows) {
    const partId = row.querySelector("[data-part-select]").value.trim();
    const nama = row.querySelector("[data-part-nama]").value.trim();
    const stokInput = row.querySelector("[data-part-stok]").value.trim();
    const hargaInput = row.querySelector("[data-part-harga]").value.trim();
    const jumlahInput = row.querySelector("[data-part-jumlah]").value.trim();
    if (!partId && !nama && !stokInput && !hargaInput && !jumlahInput) {
      continue;
    }
    pemakaian.push({
      partId,
      nama,
      stok: stokInput === "" ? NaN : Number(stokInput),
      harga: hargaInput === "" ? NaN : Number(hargaInput),
      jumlah: jumlahInput === "" ? NaN : Number(jumlahInput),
    });
  }
  if (pemakaian.length) {
    const resolved = [];
    for (const pakai of pemakaian) {
      let sparepart = pakai.partId
        ? sparepartData.find(
            (item) => Number(item.id) === Number(pakai.partId),
          )
        : null;
      if (!sparepart) {
        if (
          !pakai.nama ||
          !Number.isInteger(pakai.stok) ||
          pakai.stok < 0 ||
          !Number.isFinite(pakai.harga) ||
          pakai.harga < 0
        ) {
          showFormError(
            "vehicleForm",
            "Isi nama, stok awal, dan harga untuk sparepart baru.",
          );
          return;
        }
        sparepart = {
          id: nextNumericId(sparepartData),
          nama: pakai.nama,
          stok: pakai.stok,
          harga: pakai.harga,
        };
        sparepartData.push(sparepart);
      }
      resolved.push({ sparepart, jumlah: pakai.jumlah });
    }
    const totalPerPart = {};
    for (const { sparepart, jumlah } of resolved) {
      totalPerPart[sparepart.id] =
        (totalPerPart[sparepart.id] || 0) + (Number(jumlah) || 0);
    }
    for (const { sparepart } of resolved) {
      const total = totalPerPart[sparepart.id];
      if (
        !Number.isInteger(total) ||
        total < 1 ||
        total > Number(sparepart.stok)
      ) {
        showFormError(
          "vehicleForm",
          `Jumlah sparepart ${sparepart.nama} harus tersedia dalam stok.`,
        );
        return;
      }
    }
    for (const partId of Object.keys(totalPerPart)) {
      const part = sparepartData.find(
        (item) => Number(item.id) === Number(partId),
      );
      if (part) part.stok = Number(part.stok) - totalPerPart[partId];
    }
    spareparts = resolved.map(({ sparepart, jumlah }) => ({
      sparepartId: sparepart.id,
      nama: sparepart.nama,
      harga: Number(sparepart.harga),
      jumlah: Number(jumlah),
    }));
  }

  const kendaraan = getKendaraan();
  const tanggalInput = value("vehicleTanggal");
  const data = {
    polisi,
    pelanggan: customer.nama,
    pelangganId: customer.id,
    jenis: document.getElementById("vehicleJenis").value,
    merk,
    keluhan: value("vehicleKeluhan"),
    status: document.getElementById("vehicleStatus").value,
    mekanikId: mekanik.id,
    mekanik: mekanik.nama,
    biayaJasa: Number(value("vehicleBiayaJasa")) || 0,
    spareparts,
    tanggalService:
      tanggalInput ||
      existingVehicle?.tanggalService ||
      new Date().toISOString().slice(0, 10),
  };

  if (id) {
    const index = kendaraan.findIndex((item) => Number(item.id) === Number(id));
    if (index !== -1) kendaraan[index] = { ...kendaraan[index], ...data };
  } else {
    kendaraan.push({ id: nextNumericId(kendaraan), ...data });
  }

  saveKendaraan(kendaraan);
  saveCustomers(customers);
  saveMekanik(mekanikData);
  saveSparepart(sparepartData);

  closeModal("vehicleModal");

  resetKendaraanForm();

  if (typeof updateDashboard === "function") updateDashboard();
  if (typeof updateKendaraanStats === "function") updateKendaraanStats();
  renderKendaraan(document.getElementById("searchKendaraan")?.value || "", 1);

  if (typeof renderCustomers === "function") renderCustomers();
  if (typeof updateCustomerStats === "function") updateCustomerStats();
  showPageNotice("Data kendaraan tersimpan di tabel.", "success");
}

/* HAPUS KENDARAAN */

function deleteKendaraan(id, button = null) {
  const kendaraan = getKendaraan();

  const item = kendaraan.find(
    (kendaraan) => Number(kendaraan.id) === Number(id),
  );

  if (!item) {
    return;
  }

  if (!confirmUnlock(item, "menghapus", button)) return;

  if (
    !armConfirmButton(
      button,
      `Klik lagi untuk hapus ${item.polisi}`,
    )
  ) {
    showPageNotice(
      `Klik Hapus sekali lagi untuk menghapus kendaraan ${item.polisi}.`,
      "error",
    );
    return;
  }

  if ((item.spareparts || []).length) {
    const sparepart = getSparepart();
    (item.spareparts || []).forEach((used) => {
      const part = sparepart.find(
        (entry) => Number(entry.id) === Number(used.sparepartId),
      );
      if (part) part.stok = Number(part.stok) + (Number(used.jumlah) || 0);
    });
    saveSparepart(sparepart);
  }

  const dataBaru = kendaraan.filter(
    (kendaraan) => Number(kendaraan.id) !== Number(id),
  );

  saveKendaraan(dataBaru);

  if (typeof updateDashboard === "function") updateDashboard();
  if (typeof updateKendaraanStats === "function") updateKendaraanStats();
  renderKendaraan(document.getElementById("searchKendaraan")?.value || "", 1);

  if (typeof renderCustomers === "function") renderCustomers();
  if (typeof updateCustomerStats === "function") updateCustomerStats();
  showPageNotice(`Kendaraan ${item.polisi} dihapus dari tabel.`, "success");
}

/* DETAIL KENDARAAN */

function showKendaraanDetail(id) {
  const kendaraan = getKendaraan();

  const item = kendaraan.find(
    (kendaraan) => Number(kendaraan.id) === Number(id),
  );

  if (!item) {
    return;
  }

  const content = document.getElementById("vehicleDetailContent");

  if (!content) {
    return;
  }

  const statusClass = getStatusClass(item.status);

  const mekanikNama =
    getMekanik().find((entry) => Number(entry.id) === Number(item.mekanikId))
      ?.nama ||
    item.mekanik ||
    "-";

  const spareparts = item.spareparts || [];

  const sparepartHTML = spareparts.length
    ? spareparts
        .map(
          (part) =>
            `${escapeHTML(part.nama)} x${part.jumlah} (${formatRupiah(part.harga)})`,
        )
        .join("<br />")
    : "-";

  content.innerHTML = `
    <div class="detail-item">

      <span class="detail-label">
        ID (Primary Key)
      </span>

      <span class="detail-value">
        #${escapeHTML(item.id)}
      </span>

    </div>

    <div class="detail-item">

      <span class="detail-label">
        No. Polisi
      </span>

      <span class="detail-value">
        ${escapeHTML(item.polisi)}
      </span>

    </div>

    <div class="detail-item">

      <span class="detail-label">
        Pelanggan (ID: ${escapeHTML(item.pelangganId || "-")})
      </span>

      <span class="detail-value">
        ${escapeHTML(item.pelanggan)}
      </span>

    </div>

    <div class="detail-item">

      <span class="detail-label">
        Mekanik (ID: ${escapeHTML(item.mekanikId || "-")})
      </span>

      <span class="detail-value">
        ${escapeHTML(mekanikNama)}
      </span>

    </div>

    <div class="detail-item">

      <span class="detail-label">
        Jenis
      </span>

      <span class="detail-value">
        ${escapeHTML(item.jenis)}
      </span>

    </div>

    <div class="detail-item">

      <span class="detail-label">
        Merk
      </span>

      <span class="detail-value">
        ${escapeHTML(item.merk)}
      </span>

    </div>

    <div class="detail-item full">

      <span class="detail-label">
        Keluhan
      </span>

      <span class="detail-value">
        ${escapeHTML(item.keluhan)}
      </span>

    </div>

    <div class="detail-item full">

      <span class="detail-label">
        Sparepart Dipakai
      </span>

      <span class="detail-value">
        ${sparepartHTML}
      </span>

    </div>

    <div class="detail-item">

      <span class="detail-label">
        Status
      </span>

      <span
        class="badge ${statusClass}"
      >
        ${escapeHTML(item.status)}
      </span>

    </div>

    <div class="detail-item">

      <span class="detail-label">
        Tanggal Service
      </span>

      <span class="detail-value">
        ${escapeHTML(item.tanggalService || "-")}
      </span>

    </div>

    <div class="detail-item">

      <span class="detail-label">
        Biaya Jasa
      </span>

      <span class="detail-value">
        ${formatRupiah(item.biayaJasa || 0)}
      </span>

    </div>

    <div class="detail-item">

      <span class="detail-label">
        Total (Jasa + Sparepart)
      </span>

      <span class="detail-value">
        ${formatRupiah(getServiceTotal(item))}
      </span>

    </div>
  `;

  openModal("vehicleDetailModal");
}

/* INIT KENDARAAN */

function updateKendaraanStats() {
  const data = getKendaraan();
  setText("totalKendaraan", data.length);
  setText(
    "totalMenunggu",
    data.filter((item) => item.status === "Menunggu").length,
  );
  setText(
    "totalDikerjakan",
    data.filter((item) => item.status === "Dikerjakan").length,
  );
  setText(
    "totalQC",
    data.filter((item) => item.status === "Quality Check").length,
  );
  setText(
    "totalSelesai",
    data.filter((item) => item.status === "Selesai").length,
  );
  setText(
    "totalPendapatan",
    formatRupiah(
      data
        .filter((item) => item.status === "Selesai")
        .reduce((total, item) => total + getServiceTotal(item), 0),
    ),
  );
}

function initKendaraanPage() {
  const table = document.getElementById("kendaraanTable");

  if (!table) {
    return;
  }

  updateKendaraanStats();

  const search = document.getElementById("searchKendaraan");

  const tambah = document.getElementById("btnTambahKendaraan");

  const form = document.getElementById("vehicleForm");

  renderKendaraan();

  if (tambah) {
    tambah.addEventListener("click", function () {
      resetKendaraanForm();

      openModal("vehicleModal");
    });
  }

  if (form) {
    form.addEventListener("submit", saveKendaraanForm);
  }

  document
    .getElementById("btnTambahVehicleSparepart")
    ?.addEventListener("click", () => addVehicleSparepartRow());

  if (search) {
    search.addEventListener("input", function () {
      renderKendaraan(this.value, 1);
    });
  }

  document
    .getElementById("filterStatus")
    ?.addEventListener("change", function () {
      renderKendaraan(search.value, 1);
    });

  document.querySelectorAll("[data-close-modal]").forEach(function (button) {
    button.addEventListener("click", function () {
      closeModal(this.dataset.closeModal);
    });
  });

  document.querySelectorAll(".modal-overlay").forEach(function (modal) {
    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        modal.classList.remove("show");
      }
    });
  });
}