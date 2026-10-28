/* RESET FORM KENDARAAN */

function resetKendaraanForm() {
  const form = document.getElementById("vehicleForm");

  if (!form) {
    return;
  }

  form.reset();

  clearFormError("vehicleForm");

  populateVehicleFormRelations();

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
          `<option value="${item.id}">${escapeHTML(
            getKode("customers", item),
          )} — ${escapeHTML(item.nama)}</option>`,
      )
      .join("");
  mekanikSelect.innerHTML =
    '<option value="">Tambah mekanik baru</option>' +
    getMekanikAktif()
      .map(
        (item) =>
          `<option value="${item.id}">${escapeHTML(
            getKode("mekanik", item),
          )} — ${escapeHTML(item.nama)}</option>`,
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
      kode: nextKode("customers", customers),
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
      kode: nextKode("mekanik", mekanikData),
      nama: namaMekanik,
      spesialisasi,
      telepon: value("vehicleMekanikTelepon"),
      status: "Aktif",
    };
    mekanikData.push(mekanik);
  }

  const kendaraan = getKendaraan();
  /* Baris lama dipakai saat mode Edit supaya sparepart & tanggal
     service yang tidak diedit tidak ikut hilang/tertimpa. */
  const existingVehicle = id
    ? kendaraan.find((item) => Number(item.id) === Number(id)) || null
    : null;
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
    /* Sparepart dikelola di halaman Service, jadi di sini
       data sparepart lama tetap dipertahankan. */
    spareparts: existingVehicle?.spareparts || [],
    tanggalService:
      tanggalInput ||
      existingVehicle?.tanggalService ||
      new Date().toISOString().slice(0, 10),
  };

  if (id) {
    const index = kendaraan.findIndex((item) => Number(item.id) === Number(id));
    if (index !== -1) kendaraan[index] = { ...kendaraan[index], ...data };
  } else {
    kendaraan.push({
      id: nextNumericId(kendaraan),
      kode: nextKode("kendaraan", kendaraan),
      ...data,
    });
  }

  saveKendaraan(kendaraan);
  saveCustomers(customers);
  saveMekanik(mekanikData);

  addLog(
    id ? "Update" : "Tambah",
    "Kendaraan",
    `${polisi} — ${merk} (${customer.nama})`,
    getKode(
      "kendaraan",
      id
        ? kendaraan.find((item) => Number(item.id) === Number(id))
        : kendaraan[kendaraan.length - 1],
    ),
  );

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

  if (!armConfirmButton(button, `Klik lagi untuk hapus ${item.polisi}`)) {
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

  addLog(
    "Hapus",
    "Kendaraan",
    `${item.polisi} — ${item.merk}`,
    getKode("kendaraan", item),
  );

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
  /* Pendapatan hanya dihitung dari service selesai yang SUDAH LUNAS. */
  setText(
    "totalPendapatan",
    formatRupiah(
      data
        .filter(
          (item) =>
            item.status === "Selesai" &&
            (item.pembayaran || "Belum Lunas") === "Lunas",
        )
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

  const sort = document.getElementById("sortKendaraan");

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

  sort?.addEventListener("change", function () {
    renderKendaraan(search.value, 1);
  });

  /* Penutupan modal sudah ditangani global.js */
}
