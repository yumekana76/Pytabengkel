/* DASHBOARD */

function updateDashboard() {
  const kendaraan = getKendaraan();

  const menunggu = kendaraan.filter(
    (item) => item.status === "Menunggu",
  ).length;

  const dikerjakan = kendaraan.filter(
    (item) => item.status === "Dikerjakan",
  ).length;

  const qc = kendaraan.filter((item) => item.status === "Quality Check").length;

  const selesai = kendaraan.filter((item) => item.status === "Selesai").length;

  /* Pendapatan hanya dihitung dari service selesai yang SUDAH LUNAS —
     tagihan belum lunas tidak masuk angka pendapatan. */
  const pendapatan = kendaraan
    .filter(
      (item) =>
        item.status === "Selesai" &&
        (item.pembayaran || "Belum Lunas") === "Lunas",
    )
    .reduce((total, item) => total + getServiceTotal(item), 0);

  setText("totalKendaraan", kendaraan.length);

  setText("totalMenunggu", menunggu);

  setText("totalDikerjakan", dikerjakan);

  setText("totalQC", qc);

  setText("totalSelesai", selesai);

  setText("totalPendapatan", formatRupiah(pendapatan));

  setText("totalServiceCircle", kendaraan.length);

  setText("circleMenunggu", menunggu);

  setText("circleDikerjakan", dikerjakan);

  setText("circleQC", qc);

  setText("circleSelesai", selesai);

  const circle = document.querySelector(".progress-circle");
  if (circle) {
    const total = kendaraan.length;
    if (!total) {
      circle.style.background = "conic-gradient(#e2e8f0 0 100%)";
    } else {
      const waitingEnd = (menunggu / total) * 100;
      const workingEnd = waitingEnd + (dikerjakan / total) * 100;
      const qcEnd = workingEnd + (qc / total) * 100;
      circle.style.background = `conic-gradient(
        var(--waiting) 0% ${waitingEnd}%,
        var(--working) ${waitingEnd}% ${workingEnd}%,
        var(--qc) ${workingEnd}% ${qcEnd}%,
        var(--done) ${qcEnd}% 100%
      )`;
    }
  }

  renderKendaraan(document.getElementById("searchKendaraan")?.value || "", 1);
}

/* TABEL MEKANIK */

/* Tanggal rekap mekanik (input date), default hari ini. */
function getMekanikTanggal() {
  const input = document.getElementById("filterMekanikTanggal");
  const value = input?.value || "";
  return value || new Date().toISOString().slice(0, 10);
}

/* "2026-10-14..." -> "14 Okt 2026" */
function formatTanggalRekap(value) {
  const date = new Date(String(value || "").slice(0, 10));
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function renderMekanik() {
  const table = document.getElementById("mekanikTable");

  if (!table) {
    return;
  }

  const MEKANIK_STATUS = ["Aktif", "Izin"];
  const SERVICE_STATUS = ["Menunggu", "Dikerjakan", "Quality Check", "Selesai"];
  const statusFilter =
    document.getElementById("filterMekanikDashboard")?.value || "";
  const tanggal = getMekanikTanggal();

  const semua = getMekanik().filter(
    (item) => !statusFilter || item.status === statusFilter,
  );

  let kendaraan = [];
  try {
    kendaraan = getKendaraan();
  } catch (error) {
    kendaraan = [];
  }

  table.innerHTML = "";

  if (semua.length === 0) {
    table.innerHTML = `
      <tr>
        <td
          colspan="5"
          style="
            text-align:center;
            padding:30px;
          "
        >
          Tidak ada data mekanik
        </td>
      </tr>
    `;

    setText("mekanikDashboardInfo", "Tidak ada data");
    return;
  }

  semua.forEach((item, index) => {
    const options = MEKANIK_STATUS.map(
      (status) =>
        `<option value="${status}"${item.status === status ? " selected" : ""}>${status}</option>`,
    ).join("");

    /* Rekap service mekanik pada tanggal terpilih + rincian statusnya. */
    const harian = kendaraan.filter(
      (vehicle) =>
        Number(vehicle.mekanikId) === Number(item.id) &&
        String(vehicle.tanggalService || "").slice(0, 10) === tanggal,
    );
    const rincian = SERVICE_STATUS.map((status) => ({
      status,
      jumlah: harian.filter((vehicle) => vehicle.status === status).length,
    })).filter((entry) => entry.jumlah > 0);
    const rincianHtml = rincian.length
      ? `<div class="rekap-badges">${rincian
          .map(
            (entry) =>
              `<span class="badge ${getStatusClass(entry.status)}">${entry.jumlah} ${escapeHTML(entry.status)}</span>`,
          )
          .join("")}</div>`
      : '<span class="rating-empty">Tidak ada service</span>';

    table.innerHTML += `
        <tr>

          <td>
            ${index + 1}
          </td>

          <td>
            <strong>
              ${escapeHTML(item.nama)}
            </strong>
          </td>

          <td>
            ${escapeHTML(item.spesialisasi)}
          </td>

          <td>
            <select
              class="form-control row-select"
              data-mekanik-status="${item.id}"
              aria-label="Ubah status ${escapeHTML(item.nama)}"
              onchange="updateMekanikStatus(${item.id}, this.value)"
            >
              ${options}
            </select>
          </td>

          <td>
            <div class="rekap-harian">
              <strong>${harian.length} service</strong>
              ${rincianHtml}
            </div>
          </td>

        </tr>
      `;
  });

  setText(
    "mekanikDashboardInfo",
    `Menampilkan ${semua.length} mekanik • rekap ${formatTanggalRekap(tanggal)}`,
  );
}

function updateMekanikStatus(id, status) {
  const allowed = ["Aktif", "Izin"];
  if (!allowed.includes(status)) return;
  const mekanik = getMekanik();
  const index = mekanik.findIndex((item) => Number(item.id) === Number(id));
  if (index === -1) return;
  if (mekanik[index].status === status) return;
  mekanik[index] = { ...mekanik[index], status };
  saveMekanik(mekanik);
  if (typeof renderMekanik === "function") renderMekanik();
  if (typeof updateDashboard === "function") updateDashboard();
  if (typeof renderMekanikPage === "function") {
    try {
      renderMekanikPage(document.getElementById("searchMekanik")?.value || "");
    } catch (error) {}
  }
  if (typeof updateMekanikStats === "function") {
    try {
      updateMekanikStats();
    } catch (error) {}
  }
  showPageNotice(
    `Status ${mekanik[index].nama} diubah ke ${status}.`,
    "success",
  );
}

/* Input Data DASHBOARD */

/* Kunci isian manual customer (nama/telepon/email/alamat).
   Saat customer terdaftar dipilih, isian tidak bisa diedit —
   mencegah user mengetik ulang nama yang sudah ada (data duplikat). */
function setCustomerManualLock(locked) {
  [
    "unifiedCustomerNama",
    "unifiedCustomerTelepon",
    "unifiedCustomerEmail",
    "unifiedCustomerAlamat",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = locked;
    if (locked) el.title = "Sudah terisi dari customer terdaftar";
    else el.removeAttribute("title");
  });
}

function refreshUnifiedVehicles(customerId) {
  const vehicleSelect = document.getElementById("unifiedVehicleId");
  if (!vehicleSelect) return;
  const milik = customerId
    ? getKendaraan().filter(
        (item) => Number(item.pelangganId) === Number(customerId),
      )
    : [];
  vehicleSelect.innerHTML =
    '<option value="">-- Kendaraan baru (isi manual) --</option>' +
    milik
      .map(
        (item) =>
          `<option value="${item.id}">${escapeHTML(item.polisi)} — ${escapeHTML(item.merk)} (${escapeHTML(item.jenis || "-")})</option>`,
      )
      .join("");
}

function populateUnifiedRelations() {
  const customerSelect = document.getElementById("unifiedCustomerId");
  const mekanikSelect = document.getElementById("unifiedMekanikId");
  const vehicleSelect = document.getElementById("unifiedVehicleId");
  if (!customerSelect || !mekanikSelect) return;

  customerSelect.innerHTML =
    '<option value="">-- Buat customer baru --</option>' +
    getCustomers()
      .map(
        (item) =>
          `<option value="${item.id}">${escapeHTML(
            getKode("customers", item),
          )} — ${escapeHTML(item.nama)}</option>`,
      )
      .join("");
  /* Simpan salinan opsi awal supaya pencarian bisa menyaring lalu
     mengembalikan daftar lengkapnya. */
  customerSelect.__allOptions = [...customerSelect.options].map((opt) =>
    opt.cloneNode(true),
  );
  mekanikSelect.innerHTML =
    '<option value="">-- Buat mekanik baru --</option>' +
    getMekanikAktif()
      .map(
        (item) =>
          `<option value="${item.id}">${escapeHTML(
            getKode("mekanik", item),
          )} — ${escapeHTML(item.nama)}</option>`,
      )
      .join("");
  refreshUnifiedVehicles(customerSelect.value || "");

  customerSelect.onchange = () => {
    const customer = getCustomers().find(
      (item) => Number(item.id) === Number(customerSelect.value),
    );
    refreshUnifiedVehicles(customer ? customer.id : "");
    if (!customer) {
      /* Kembali ke mode "customer baru": isian manual dibuka lagi. */
      setCustomerManualLock(false);
      return;
    }
    document.getElementById("unifiedCustomerNama").value = customer.nama || "";
    document.getElementById("unifiedCustomerTelepon").value =
      customer.telepon || "";
    document.getElementById("unifiedCustomerEmail").value =
      customer.email || "";
    document.getElementById("unifiedCustomerAlamat").value =
      customer.alamat || "";
    /* Customer terdaftar dipilih: kunci isian manual. */
    setCustomerManualLock(true);
  };
  mekanikSelect.onchange = () => {
    const mekanik = getMekanik().find(
      (item) => Number(item.id) === Number(mekanikSelect.value),
    );
    if (!mekanik) return;
    document.getElementById("unifiedMekanikNama").value = mekanik.nama || "";
    document.getElementById("unifiedMekanikSpesialisasi").value =
      mekanik.spesialisasi || "";
  };
  if (vehicleSelect) {
    vehicleSelect.onchange = () => {
      const vehicle = getKendaraan().find(
        (item) => Number(item.id) === Number(vehicleSelect.value),
      );
      if (!vehicle) return;
      document.getElementById("unifiedPolisi").value = vehicle.polisi || "";
      document.getElementById("unifiedJenis").value = vehicle.jenis || "Mobil";
      document.getElementById("unifiedMerk").value = vehicle.merk || "";
    };
  }
}

/* Saring opsi <select> sesuai kata kunci pencarian. Opsi pertama
   (default, value kosong) selalu ditampilkan. Mengembalikan true
   bila pilihan yang sedang aktif tersaring keluar dari daftar. */
function filterDropdown(selectEl, keyword) {
  if (!selectEl || !Array.isArray(selectEl.__allOptions)) return false;
  const key = String(keyword || "").toLowerCase().trim();
  const current = selectEl.value;
  selectEl.innerHTML = "";
  selectEl.__allOptions.forEach((opt) => {
    if (
      opt.value === "" ||
      !key ||
      opt.textContent.toLowerCase().includes(key)
    ) {
      selectEl.appendChild(opt.cloneNode(true));
    }
  });
  const masihDipilih = [...selectEl.options].some(
    (opt) => opt.value === current,
  );
  if (masihDipilih) selectEl.value = current;
  return !masihDipilih && current !== "";
}

function unifiedSparepartOptions(selectedId = "") {
  /* Sparepart baru ditampilkan paling atas, yang lama turun ke bawah
     (urutan kebalikan dari penyimpanan yang menambah id di akhir). */
  const urutBaruDulu = [...getSparepart()].sort(
    (a, b) => Number(b.id) - Number(a.id),
  );
  return (
    '<option value="">-- Buat sparepart baru --</option>' +
    urutBaruDulu
      .map(
        (item) =>
          `<option value="${item.id}"${Number(item.id) === Number(selectedId) ? " selected" : ""}>${escapeHTML(
          getKode("sparepart", item),
        )} — ${escapeHTML(item.nama)} (stok: ${item.stok})</option>`,
      )
      .join("")
  );
}

function addUnifiedSparepartRow(selectedId = "", jumlah = "", preset = {}) {
  const list = document.getElementById("unifiedSparepartList");
  if (!list) return;
  const row = document.createElement("div");
  row.className = "part-row-box";
  row.innerHTML = `
    <div class="part-row-head">
      <input type="search" class="form-control" data-part-search placeholder="Cari sparepart..." aria-label="Cari sparepart" autocomplete="off" />
      <select class="form-control" data-part-select aria-label="Sparepart terdaftar">
        ${unifiedSparepartOptions(selectedId)}
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
  /* Cache opsi awal supaya kotak cari bisa menyaring daftar sparepart. */
  select.__allOptions = [...select.options].map((opt) => opt.cloneNode(true));
  row.querySelector("[data-part-search]").addEventListener("input", (event) => {
    const kata = event.target.value.trim();
    const hilang = filterDropdown(select, kata);
    if (hilang) {
      /* Pilihan tersaring keluar: kosongkan isian yang terisi otomatis
         supaya tidak ikut terkirim sebagai sparepart baru. */
      select.value = "";
      row.querySelector("[data-part-nama]").value = "";
      row.querySelector("[data-part-stok]").value = "";
      row.querySelector("[data-part-harga]").value = "";
      updateUnifiedTotalPreview();
    }
    /* Auto-pilih hasil pertama supaya pengguna langsung melihat
       nama & harga sparepart terisi (bukan diam saja). */
    if (kata && !hilang && select.value === "" && select.options.length > 1) {
      select.value = select.options[1].value;
      select.dispatchEvent(new Event("change"));
    }
  });
  /* Enter pada kotak cari tidak boleh menyubmit form. */
  row.querySelector("[data-part-search]").addEventListener("keydown", (event) => {
    if (event.key === "Enter") event.preventDefault();
  });
  select.addEventListener("change", () => {
    const part = getSparepart().find(
      (item) => Number(item.id) === Number(select.value),
    );
    if (!part) return;
    row.querySelector("[data-part-nama]").value = part.nama || "";
    row.querySelector("[data-part-stok]").value = part.stok ?? "";
    row.querySelector("[data-part-harga]").value = part.harga ?? "";
    updateUnifiedTotalPreview();
  });
  row
    .querySelectorAll(
      "[data-part-nama], [data-part-stok], [data-part-harga], [data-part-jumlah]",
    )
    .forEach((input) =>
      input.addEventListener("input", updateUnifiedTotalPreview),
    );
  row.querySelector("[data-part-remove]").addEventListener("click", () => {
    row.remove();
    updateUnifiedTotalPreview();
  });
  list.appendChild(row);
  updateUnifiedTotalPreview();
}

function updateUnifiedTotalPreview() {
  const biayaJasa =
    Number(document.getElementById("unifiedBiayaJasa")?.value) || 0;
  let totalSparepart = 0;
  document
    .querySelectorAll("#unifiedSparepartList .part-row-box")
    .forEach((row) => {
      const harga = Number(row.querySelector("[data-part-harga]")?.value) || 0;
      const jumlah =
        Number(row.querySelector("[data-part-jumlah]")?.value) || 0;
      totalSparepart += harga * jumlah;
    });
  setText("unifiedTotalPreview", formatRupiah(biayaJasa + totalSparepart));
}

function resetUnifiedForm() {
  document.getElementById("unifiedForm")?.reset();
  clearFormError("unifiedForm");
  /* Kotak cari customer dikosongkan; populasinya diisi ulang oleh
     populateUnifiedRelations() di bawah. Isian manual dibuka lagi. */
  const cariCustomer = document.getElementById("unifiedCustomerSearch");
  if (cariCustomer) cariCustomer.value = "";
  setCustomerManualLock(false);
  populateUnifiedRelations();
  const list = document.getElementById("unifiedSparepartList");
  if (list) {
    list.innerHTML = "";
    addUnifiedSparepartRow();
  }
  const tanggal = document.getElementById("unifiedTanggal");
  if (tanggal && !tanggal.value)
    tanggal.value = new Date().toISOString().slice(0, 10);
  updateUnifiedTotalPreview();
}

function saveUnifiedForm(event) {
  event.preventDefault();
  clearFormError("unifiedForm");
  clearPageNotice();
  const value = (id) => document.getElementById(id).value.trim();

  const polisi = value("unifiedPolisi");
  const merk = value("unifiedMerk");
  const keluhan = value("unifiedKeluhan");
  const namaCustomer = value("unifiedCustomerNama");
  if (!polisi || !merk || !keluhan || !namaCustomer) {
    showFormError(
      "unifiedForm",
      "No. polisi, merk, keluhan, dan nama customer wajib diisi.",
    );
    return;
  }

  const customers = getCustomers();
  let customer = customers.find(
    (item) => Number(item.id) === Number(value("unifiedCustomerId")),
  );
  if (!customer) {
    const telepon = value("unifiedCustomerTelepon");
    if (!telepon) {
      showFormError("unifiedForm", "No. HP wajib diisi untuk customer baru.");
      return;
    }
    customer = {
      id: nextNumericId(customers),
      kode: nextKode("customers", customers),
      nama: namaCustomer,
      telepon,
      email: value("unifiedCustomerEmail"),
      alamat: value("unifiedCustomerAlamat"),
      catatan: "",
      registeredAt: new Date().toISOString(),
    };
    customers.push(customer);
  }

  const mekanikData = getMekanik();
  let mekanik = mekanikData.find(
    (item) => Number(item.id) === Number(value("unifiedMekanikId")),
  );
  if (!mekanik) {
    const namaMekanik = value("unifiedMekanikNama");
    const spesialisasi = value("unifiedMekanikSpesialisasi");
    if (!namaMekanik || !spesialisasi) {
      showFormError(
        "unifiedForm",
        "Pilih mekanik terdaftar atau isi nama + spesialisasi mekanik baru.",
      );
      return;
    }
    mekanik = {
      id: nextNumericId(mekanikData),
      kode: nextKode("mekanik", mekanikData),
      nama: namaMekanik,
      spesialisasi,
      status: "Aktif",
    };
    mekanikData.push(mekanik);
  }

  const sparepartData = getSparepart();
  let spareparts = [];
  const partRows = [
    ...document.querySelectorAll("#unifiedSparepartList .part-row-box"),
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
        ? sparepartData.find((item) => Number(item.id) === Number(pakai.partId))
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
            "unifiedForm",
            "Isi nama, stok awal, dan harga untuk sparepart baru.",
          );
          return;
        }
        sparepart = {
          id: nextNumericId(sparepartData),
          kode: nextKode("sparepart", sparepartData),
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
          "unifiedForm",
          `Jumlah sparepart ${sparepart.nama} harus tersedia dalam stok.`,
        );
        return;
      }
    }
    for (const id of Object.keys(totalPerPart)) {
      const part = sparepartData.find((item) => Number(item.id) === Number(id));
      if (part) part.stok = Number(part.stok) - totalPerPart[id];
    }
    spareparts = resolved.map(({ sparepart, jumlah }) => ({
      sparepartId: sparepart.id,
      nama: sparepart.nama,
      harga: Number(sparepart.harga),
      jumlah: Number(jumlah),
    }));
  }

  const kendaraan = getKendaraan();
  kendaraan.push({
    id: nextNumericId(kendaraan),
    kode: nextKode("kendaraan", kendaraan),
    polisi,
    pelanggan: customer.nama,
    pelangganId: customer.id,
    jenis: document.getElementById("unifiedJenis").value,
    merk,
    keluhan,
    status: document.getElementById("unifiedStatus").value,
    mekanikId: mekanik.id,
    mekanik: mekanik.nama,
    biayaJasa: Number(value("unifiedBiayaJasa")) || 0,
    spareparts,
    tanggalService:
      value("unifiedTanggal") || new Date().toISOString().slice(0, 10),
  });

  saveCustomers(customers);
  saveMekanik(mekanikData);
  saveSparepart(sparepartData);
  saveKendaraan(kendaraan);

  closeModal("unifiedModal");
  resetUnifiedForm();
  if (typeof updateDashboard === "function") updateDashboard();
  if (typeof renderMekanik === "function") renderMekanik();
  showPageNotice("Data tersimpan ke tabel.", "success");
}

function openDashboardEdit(id, button = null) {
  const item = getKendaraan().find(
    (vehicle) => Number(vehicle.id) === Number(id),
  );
  if (!item) return;

  if (!confirmUnlock(item, "mengubah", button)) return;
  clearFormError("dashboardEditForm");

  document.getElementById("dashEditId").value = item.id;
  document.getElementById("dashEditStatus").value = item.status;

  const mekanikSelect = document.getElementById("dashEditMekanik");
  /* Mekanik berstatus Izin tidak bisa dipilih, kecuali mekanik
     yang sedang dipakai service ini (supaya tidak hilang). */
  const pilihanMekanik = getMekanikAktif();
  const mekanikSekarang = getMekanik().find(
    (mekanik) => Number(mekanik.id) === Number(item.mekanikId),
  );

  if (mekanikSekarang && !pilihanMekanik.includes(mekanikSekarang)) {
    pilihanMekanik.unshift(mekanikSekarang);
  }

  mekanikSelect.innerHTML = pilihanMekanik
    .map(
      (mekanik) =>
        `<option value="${mekanik.id}" ${Number(mekanik.id) === Number(item.mekanikId) ? "selected" : ""}>${escapeHTML(mekanik.nama)} — ${escapeHTML(mekanik.status)}</option>`,
    )
    .join("");

  setText("dashboardEditTitle", `Ubah ${item.polisi}`);
  document.getElementById("dashEditLockNote").hidden = !isLocked(item);
  openModal("dashboardEditModal");
}

function saveDashboardEdit(event) {
  event.preventDefault();
  clearFormError("dashboardEditForm");
  const id = document.getElementById("dashEditId").value;
  const kendaraan = getKendaraan();
  const index = kendaraan.findIndex(
    (vehicle) => Number(vehicle.id) === Number(id),
  );
  if (index === -1) return;

  const mekanik = getMekanik().find(
    (entry) =>
      Number(entry.id) ===
      Number(document.getElementById("dashEditMekanik").value),
  );
  if (!mekanik) {
    showFormError("dashboardEditForm", "Pilih mekanik (dropdown).");
    return;
  }

  kendaraan[index] = {
    ...kendaraan[index],
    status: document.getElementById("dashEditStatus").value,
    mekanikId: mekanik.id,
    mekanik: mekanik.nama,
  };
  saveKendaraan(kendaraan);
  closeModal("dashboardEditModal");
  if (typeof updateDashboard === "function") updateDashboard();
  if (typeof renderMekanik === "function") renderMekanik();
  showPageNotice("Perubahan tersimpan di tabel.", "success");
}

function initDashboardEdit() {
  const form = document.getElementById("dashboardEditForm");
  if (!form) return;
  form.addEventListener("submit", saveDashboardEdit);
  document
    .getElementById("filterStatusDashboard")
    ?.addEventListener("change", () => {
      if (typeof updateDashboard === "function") updateDashboard();
    });
}

function initDashboardInput() {
  const button = document.getElementById("btnInputTerpadu");
  const form = document.getElementById("unifiedForm");
  if (!button || !form) return;
  initDashboardEdit();

  /* Pencarian pada tabel kendaraan dashboard. Di halaman lain listener
     ini dipasang oleh kendaraan.js, tapi kendaraan.js tidak dimuat di
     sini — jadi tanpa baris ini kotak pencarian tidak berfungsi. */
  document
    .getElementById("searchKendaraan")
    ?.addEventListener("input", (event) => {
      if (typeof renderKendaraan === "function") {
        renderKendaraan(event.target.value, 1);
      }
    });

  document
    .getElementById("filterMekanikDashboard")
    ?.addEventListener("change", () => {
      if (typeof renderMekanik === "function") renderMekanik();
    });
  const tanggalMekanik = document.getElementById("filterMekanikTanggal");
  if (tanggalMekanik && !tanggalMekanik.value) {
    tanggalMekanik.value = new Date().toISOString().slice(0, 10);
  }
  tanggalMekanik?.addEventListener("change", () => {
    if (typeof renderMekanik === "function") renderMekanik();
  });

  /* Pencarian customer pada modal Input Data: menyaring dropdown
     "Customer Terdaftar" sambil mengetik, lalu LANGSUNG memilih
     hasil pertamanya — jadi pengguna langsung melihat isian customer
     terisi otomatis, bukan hanya dropdown yang berubah diam-diam. */
  const cariCustomer = document.getElementById("unifiedCustomerSearch");
  const hintCariCustomer = document.getElementById(
    "unifiedCustomerSearchHint",
  );
  const setHintCariCustomer = (teks) => {
    if (hintCariCustomer) hintCariCustomer.textContent = teks;
  };
  cariCustomer?.addEventListener("input", (event) => {
    const customerSelect = document.getElementById("unifiedCustomerId");
    const kata = event.target.value.trim();
    const hilang = filterDropdown(customerSelect, kata);
    if (hilang) {
      /* Pilihan tersaring keluar: kembali ke mode "customer baru"
         supaya isian manual tidak menampilkan data customer lama. */
      customerSelect.value = "";
      setCustomerManualLock(false);
      [
        "unifiedCustomerNama",
        "unifiedCustomerTelepon",
        "unifiedCustomerEmail",
        "unifiedCustomerAlamat",
      ].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
      refreshUnifiedVehicles("");
    }
    if (!kata) {
      setHintCariCustomer(
        "Hasil pencarian otomatis terpilih di dropdown bawah & mengisi isian customer.",
      );
      return;
    }
    const jumlah =
      [...customerSelect.options].filter((opt) => opt.value !== "").length;
    if (jumlah > 0 && customerSelect.value === "") {
      /* Auto-pilih hasil pertama + isi isian customer otomatis. */
      customerSelect.value = customerSelect.options[1].value;
      customerSelect.onchange?.();
    }
    setHintCariCustomer(
      jumlah === 0
        ? `Tidak ada customer cocok dengan "${kata}" — data baru akan dibuat.`
        : `${jumlah} customer cocok dengan "${kata}" — otomatis dipilih yang pertama.`,
    );
  });
  /* Enter pada kotak cari tidak boleh menyubmit form Input Data. */
  cariCustomer?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") event.preventDefault();
  });
  resetUnifiedForm();
  button.addEventListener("click", () => {
    resetUnifiedForm();
    openModal("unifiedModal");
  });
  form.addEventListener("submit", saveUnifiedForm);
  document
    .getElementById("unifiedBiayaJasa")
    ?.addEventListener("input", updateUnifiedTotalPreview);
  document
    .getElementById("btnTambahUnifiedSparepart")
    ?.addEventListener("click", () => addUnifiedSparepartRow());
  document
    .querySelectorAll('[data-close-modal="unifiedModal"]')
    .forEach((button) => {
      button.addEventListener("click", () => closeModal("unifiedModal"));
    });
}

/* Inisialisasi halaman dashboard DIJALANKAN OLEH js/global.js
   (langkah boot setelah dbInit() + requireAdminAuth()). Mendaftarkan
   listener DOMContentLoaded kedua di sini hanya membuat render jalan
   dua kali — dan yang pertama kali berjalan sebelum data & sesi siap. */
