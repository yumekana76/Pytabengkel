/* DASHBOARD */

function getStatusTanggal() {
  const input = document.getElementById("filterStatusTanggal");
  const value = input?.value || "";
  if (value) return value;
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function updateDashboard() {
  const semuaKendaraan = getKendaraan();

  /* Ringkasan status service di dashboard ditampilkan berdasarkan
     data per hari sesuai tanggal yang dipilih (default: hari ini). */
  const tanggalDipilih = getStatusTanggal();
  const inputTanggal = document.getElementById("filterStatusTanggal");
  if (inputTanggal && !inputTanggal.value) {
    inputTanggal.value = tanggalDipilih;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const actualToday = `${year}-${month}-${day}`;

  const isToday = tanggalDipilih === actualToday;
  setText(
    "statusServiceSub",
    isToday
      ? "Ringkasan kendaraan hari ini"
      : `Ringkasan tanggal ${formatTanggalRekap(tanggalDipilih)}`,
  );

  const kendaraan = semuaKendaraan.filter(
    (item) => String(item.tanggalService || "").slice(0, 10) === tanggalDipilih,
  );

  /* Panel "Status Service" juga ikut menampilkan service yang BELUM
     SELESAI dari tanggal sebelumnya (carry-over) — sama seperti logika
     tabel di bawah (renderKendaraan) — supaya pekerjaan yang masih
     berjalan tidak hilang dari ringkasan saat berganti hari.
     Kartu statistik di atas tetap murni data tanggal terpilih. */
  const kendaraanStatus = semuaKendaraan.filter((item) => {
    const tanggal = String(item.tanggalService || "").slice(0, 10);
    if (tanggal === tanggalDipilih) return true;
    const belumSelesai = item.status !== "Selesai";
    return belumSelesai && (!tanggal || tanggal < tanggalDipilih);
  });

  const hitungStatus = (list) => ({
    /* Ajuan yang ditolak tidak dihitung sebagai service menunggu. */
    menunggu: list.filter(
      (item) => item.status === "Menunggu" && !isAjuanDitolak(item),
    ).length,
    dikerjakan: list.filter((item) => item.status === "Dikerjakan").length,
    qc: list.filter((item) => item.status === "Quality Check").length,
    selesai: list.filter((item) => item.status === "Selesai").length,
  });

  const statistik = hitungStatus(kendaraan);
  const ringkasan = hitungStatus(kendaraanStatus);

  /* Pendapatan hanya dihitung dari service selesai yang SUDAH LUNAS —
     tagihan belum lunas tidak masuk angka pendapatan. */
  const pendapatan = semuaKendaraan
    .filter(
      (item) =>
        item.status === "Selesai" &&
        (item.pembayaran || "Belum Lunas") === "Lunas",
    )
    .reduce((total, item) => total + getServiceTotal(item), 0);

  setText("totalKendaraan", kendaraan.length);

  setText("totalMenunggu", statistik.menunggu);

  setText("totalDikerjakan", statistik.dikerjakan);

  setText("totalQC", statistik.qc);

  setText("totalSelesai", statistik.selesai);

  setText("totalPendapatan", formatRupiah(pendapatan));

  setText("totalServiceCircle", kendaraanStatus.length);

  setText("circleMenunggu", ringkasan.menunggu);

  setText("circleDikerjakan", ringkasan.dikerjakan);

  setText("circleQC", ringkasan.qc);

  setText("circleSelesai", ringkasan.selesai);

  const circle = document.querySelector(".progress-circle");
  if (circle) {
    const total = kendaraanStatus.length;
    if (!total) {
      circle.style.background = "conic-gradient(#e2e8f0 0 100%)";
    } else {
      const waitingEnd = (ringkasan.menunggu / total) * 100;
      const workingEnd = waitingEnd + (ringkasan.dikerjakan / total) * 100;
      const qcEnd = workingEnd + (ringkasan.qc / total) * 100;
      circle.style.background = `conic-gradient(
        var(--waiting) 0% ${waitingEnd}%,
        var(--working) ${waitingEnd}% ${workingEnd}%,
        var(--qc) ${workingEnd}% ${qcEnd}%,
        var(--done) ${qcEnd}% 100%
      )`;
    }
  }

  renderAjuan();
  renderAntrian();
  renderKendaraan(document.getElementById("searchKendaraan")?.value || "", 1);
}

/* TABEL MEKANIK */

/* Tanggal rekap mekanik (input date), default hari ini. */
function getMekanikTanggal() {
  const input = document.getElementById("filterMekanikTanggal");
  const value = input?.value || "";
  return value || getTodayLocalDate();
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

  const kendaraan = getKendaraan();

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
  const sebelumnya = mekanik[index].status;
  mekanik[index] = { ...mekanik[index], status };
  saveMekanik(mekanik);
  if (typeof renderMekanik === "function") renderMekanik();
  if (typeof updateDashboard === "function") updateDashboard();
  addLog(
    "Update",
    "Mekanik",
    `Status ${mekanik[index].nama}: ${sebelumnya} → ${status}`,
    getKode("mekanik", mekanik[index]),
  );
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

/* Ambil satu kendaraan unik per nomor polisi milik customer.
   Data service bisa punya banyak baris untuk plat yang sama, tetapi
   dropdown "Kendaraan Milik Customer" cukup menampilkan satu entri. */
function getUniqueCustomerVehicles(customerId) {
  const map = new Map();

  getKendaraan()
    .filter((item) => Number(item.pelangganId) === Number(customerId))
    .forEach((item) => {
      const key = String(item.polisi || "").trim().toUpperCase();
      if (!key) return;

      const existing = map.get(key);
      if (!existing) {
        map.set(key, item);
        return;
      }

      const lebihBaru =
        String(item.tanggalService || "").localeCompare(
          String(existing.tanggalService || ""),
        ) > 0 ||
        (String(item.tanggalService || "") ===
          String(existing.tanggalService || "") &&
          Number(item.id) > Number(existing.id));

      if (lebihBaru) map.set(key, item);
    });

  return [...map.values()].sort((a, b) =>
    String(a.polisi || "").localeCompare(String(b.polisi || ""), "id", {
      sensitivity: "base",
    }),
  );
}

/* Saat kendaraan dipilih, hanya identitas kendaraan yang diambil.
   Status, tanggal, keluhan, biaya, dan sparepart adalah data per
   service sehingga harus mulai bersih untuk service baru. */
function resetUnifiedServiceFields() {
  const status = document.getElementById("unifiedStatus");
  if (status) status.value = "Menunggu";

  const tanggal = document.getElementById("unifiedTanggal");
  if (tanggal) tanggal.value = getTodayLocalDate();

  const keluhan = document.getElementById("unifiedKeluhan");
  if (keluhan) keluhan.value = "";

  const biayaJasa = document.getElementById("unifiedBiayaJasa");
  if (biayaJasa) biayaJasa.value = "";

  const list = document.getElementById("unifiedSparepartList");
  if (list) {
    list.innerHTML = "";
    addUnifiedSparepartRow();
  }

  updateUnifiedTotalPreview();
}

function refreshUnifiedVehicles(customerId) {
  const vehicleSelect = document.getElementById("unifiedVehicleId");
  if (!vehicleSelect) return;
  const milik = customerId ? getUniqueCustomerVehicles(customerId) : [];
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
    resetUnifiedServiceFields();
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

      if (!vehicle) {
        /* Mode kendaraan baru: identitas lama jangan tertinggal. */
        document.getElementById("unifiedPolisi").value = "";
        document.getElementById("unifiedJenis").value = "Mobil";
        document.getElementById("unifiedMerk").value = "";
        resetUnifiedServiceFields();
        return;
      }

      /* Hanya no. polisi, jenis, dan merk yang diambil dari kendaraan.
         Field service selalu baru: status Menunggu, tanggal hari ini,
         keluhan/biaya/sparepart kosong. */
      document.getElementById("unifiedPolisi").value = vehicle.polisi || "";
      document.getElementById("unifiedJenis").value = vehicle.jenis || "Mobil";
      document.getElementById("unifiedMerk").value = vehicle.merk || "";
      resetUnifiedServiceFields();
    };
  }
}

/* filterDropdown() dipindah ke js/global.js supaya halaman kendaraan
   (yang tidak memuat dashboard.js) bisa memakainya juga. */

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

function addUnifiedSparepartRow() {
  const list = document.getElementById("unifiedSparepartList");
  if (!list) return;
  const row = document.createElement("div");
  row.className = "part-row-box";
  row.innerHTML = `
    <div class="part-row-head">
      <input type="search" class="form-control" data-part-search placeholder="Cari sparepart..." aria-label="Cari sparepart" autocomplete="off" />
      <select class="form-control" data-part-select aria-label="Sparepart terdaftar">
        ${unifiedSparepartOptions("")}
      </select>
      <button type="button" class="action-btn danger" data-part-remove aria-label="Hapus baris sparepart">Hapus</button>
    </div>
    <div class="part-row-grid">
      <div class="form-group">
        <label>Nama Sparepart</label>
        <input type="text" class="form-control" data-part-nama placeholder="Contoh: Oli Mesin" value="" />
      </div>
      <div class="form-group">
        <label>Stok Awal (khusus baru)</label>
        <input type="number" class="form-control" data-part-stok min="0" placeholder="0" value="" />
      </div>
      <div class="form-group">
        <label>Harga Satuan</label>
        <input type="number" class="form-control" data-part-harga min="0" placeholder="0" value="" />
      </div>
      <div class="form-group">
        <label>Jumlah Dipakai</label>
        <input type="number" class="form-control" data-part-jumlah min="1" placeholder="0" value="" />
      </div>
    </div>`;
  const select = row.querySelector("[data-part-select]");
  /* Baris kosong di atas, baris yang sudah dipilih pindah ke bawah. */
  const moveRow = (hasSelection) => {
    const parent = row.parentElement;
    if (!parent) return;
    if (hasSelection) {
      parent.appendChild(row);
    } else {
      parent.prepend(row);
    }
  };
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
      moveRow(false);
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
    moveRow(Boolean(select.value));
    const part = getSparepart().find(
      (item) => Number(item.id) === Number(select.value),
    );
    if (!part) {
      updateUnifiedTotalPreview();
      return;
    }
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
  /* Baris baru selalu di atas (belum ada pilihan). */
  list.prepend(row);
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
    tanggal.value = getTodayLocalDate();
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
  const status = document.getElementById("unifiedStatus").value;
  const biayaJasa = Number(value("unifiedBiayaJasa")) || 0;
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
  /* Customer/mekanik/sparepart baru hanya DIANTRIKAN dulu — baru
     benar-benar masuk array setelah seluruh validasi lolos, supaya
     form yang gagal tidak menyisakan data hantu di cache. */
  let customerBaru = null;
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
    customerBaru = customer;
  }

  /* Kendaraan baru manual tidak boleh membuat plat yang sudah terdaftar
     untuk customer yang sama. Untuk service berikutnya, pilih kendaraan
     dari dropdown supaya identitas kendaraan tidak terduplikasi. */
  if (!value("unifiedVehicleId")) {
    const duplikat = getKendaraan().find(
      (item) =>
        Number(item.pelangganId) === Number(customer.id) &&
        String(item.polisi || "")
          .trim()
          .toUpperCase() ===
          String(polisi || "")
            .trim()
            .toUpperCase(),
    );

    if (duplikat) {
      showFormError(
        "unifiedForm",
        `No. polisi ${polisi} sudah terdaftar untuk customer ini. Pilih kendaraan tersebut di dropdown "Kendaraan Milik Customer" agar service baru tidak membuat data kendaraan ganda.`,
      );
      return;
    }
  }

  const mekanikData = getMekanik();
  let mekanik = mekanikData.find(
    (item) => Number(item.id) === Number(value("unifiedMekanikId")),
  );
  let mekanikBaru = null;
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
    mekanikBaru = mekanik;
  }

  const sparepartData = getSparepart();
  /* Sparepart baru yang masih dalam antrian (belum masuk array). */
  const sparepartBaru = [];
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
      /* Sparepart baru yang sedang diantri ikut dijadikan kandidat
         pencarian supaya dua sparepart baru dalam satu form tidak
         mendapat id/kode kembar. */
      const kandidat = [...sparepartData, ...sparepartBaru];
      let sparepart = pakai.partId
        ? kandidat.find((item) => Number(item.id) === Number(pakai.partId))
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
          id: nextNumericId(kandidat),
          kode: nextKode("sparepart", kandidat),
          nama: pakai.nama,
          stok: pakai.stok,
          harga: pakai.harga,
        };
        sparepartBaru.push(sparepart);
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
    const draftSpareparts = resolved.map(({ sparepart, jumlah }) => ({
      sparepartId: sparepart.id,
      nama: sparepart.nama,
      harga: Number(sparepart.harga),
      jumlah: Number(jumlah),
    }));
    const statusError = validateServiceStatus(status, {
      mekanikId: mekanik.id,
      mekanik: mekanik.nama,
      biayaJasa,
      spareparts: draftSpareparts,
    });
    if (statusError) {
      showFormError("unifiedForm", statusError);
      return;
    }
    for (const id of Object.keys(totalPerPart)) {
      const part = [...sparepartData, ...sparepartBaru].find(
        (item) => Number(item.id) === Number(id),
      );
      if (part) part.stok = Number(part.stok) - totalPerPart[id];
    }
    spareparts = draftSpareparts;
  } else {
    const statusError = validateServiceStatus(status, {
      mekanikId: mekanik.id,
      mekanik: mekanik.nama,
      biayaJasa,
      spareparts,
    });
    if (statusError) {
      showFormError("unifiedForm", statusError);
      return;
    }
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
    status,
    mekanikId: mekanik.id,
    mekanik: mekanik.nama,
    biayaJasa,
    spareparts,
    tanggalService:
      value("unifiedTanggal") || getTodayLocalDate(),
  });

  /* Seluruh validasi lolos — baru tulis entitas baru ke cache. */
  if (customerBaru) customers.push(customerBaru);
  if (mekanikBaru) mekanikData.push(mekanikBaru);
  sparepartBaru.forEach((part) => sparepartData.push(part));

  saveCustomers(customers);
  saveMekanik(mekanikData);
  saveSparepart(sparepartData);
  saveKendaraan(kendaraan);

  /* Jejak aktivitas: entitas utama Kendaraan selalu dicatat, entitas
     lain hanya kalau ikut dibuat/diperbariki pada simpan ini. */
  addLog(
    "Tambah",
    "Kendaraan",
    `${polisi} — ${merk} (${customer.nama})`,
    getKode("kendaraan", kendaraan[kendaraan.length - 1]),
  );
  if (customerBaru) {
    addLog(
      "Tambah",
      "Customer",
      `${customer.nama} (${customer.telepon || "-"})`,
      getKode("customers", customerBaru),
    );
  }
  if (mekanikBaru) {
    addLog(
      "Tambah",
      "Mekanik",
      `${mekanik.nama} — ${mekanik.spesialisasi}`,
      getKode("mekanik", mekanikBaru),
    );
  }
  sparepartBaru.forEach((part) => {
    addLog(
      "Tambah",
      "Sparepart",
      `${part.nama} (stok ${part.stok})`,
      getKode("sparepart", part),
    );
  });

  closeModal("unifiedModal");
  resetUnifiedForm();
  if (typeof updateDashboard === "function") updateDashboard();
  if (typeof renderMekanik === "function") renderMekanik();
  showPageNotice("Data tersimpan ke tabel.", "success");
}

function dashboardSparepartOptions(selectedId = "") {
  return getSparepart()
    .filter(
      (item) =>
        Number(item.stok) > 0 ||
        Number(item.id) === Number(selectedId),
    )
    .map(
      (item) =>
        `<option value="${item.id}"${Number(item.id) === Number(selectedId) ? " selected" : ""}>${escapeHTML(item.nama)} — ${formatRupiah(item.harga)} (stok: ${item.stok})</option>`,
    )
    .join("");
}

function addDashboardSparepartRow(selectedId = "", jumlah = 1) {
  const list = document.getElementById("dashboardEditSparepartList");
  if (!list) return;

  const row = document.createElement("div");
  row.className = "service-part-row";
  row.innerHTML = `
    <select class="form-control" data-dash-part required>
      <option value="">Pilih sparepart</option>
      ${dashboardSparepartOptions(selectedId)}
    </select>
    <input class="form-control" data-dash-part-quantity type="number" min="1" value="${Math.max(1, Number(jumlah) || 1)}" required aria-label="Jumlah sparepart" />
    <button type="button" class="action-btn danger" data-remove-dash-part aria-label="Hapus sparepart">Hapus</button>`;
  row
    .querySelectorAll("select, input")
    .forEach((input) =>
      input.addEventListener("input", updateDashboardEditTotalPreview),
    );
  row
    .querySelector("[data-remove-dash-part]")
    .addEventListener("click", () => {
      row.remove();
      updateDashboardEditTotalPreview();
    });
  /* Baris kosong di atas, baris yang sudah dipilih pindah ke bawah. */
  row.querySelector("[data-dash-part]").addEventListener("change", (event) => {
    if (!list) return;
    if (event.target.value) {
      list.appendChild(row);
    } else {
      list.prepend(row);
    }
  });
  if (selectedId) {
    list.appendChild(row);
  } else {
    list.prepend(row);
  }
  updateDashboardEditTotalPreview();
}

function updateDashboardEditTotalPreview() {
  const biayaJasa =
    Number(document.getElementById("dashEditBiayaJasa")?.value) || 0;
  const sparepart = getSparepart();
  const totalSparepart = [
    ...document.querySelectorAll(
      "#dashboardEditSparepartList .service-part-row",
    ),
  ].reduce((total, row) => {
    const part = sparepart.find(
      (item) =>
        Number(item.id) ===
        Number(row.querySelector("[data-dash-part]")?.value),
    );
    const jumlah =
      Number(row.querySelector("[data-dash-part-quantity]")?.value) || 0;
    return total + (Number(part?.harga) || 0) * jumlah;
  }, 0);
  setText(
    "dashEditTotalPreview",
    formatRupiah(biayaJasa + totalSparepart),
  );
}

function getDashboardSparepartsFromForm() {
  const sparepart = getSparepart();
  const selected = [];

  for (const row of document.querySelectorAll(
    "#dashboardEditSparepartList .service-part-row",
  )) {
    const partId = row.querySelector("[data-dash-part]").value;
    const jumlah = Number(
      row.querySelector("[data-dash-part-quantity]").value,
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

function openDashboardEdit(id, button = null) {
  const item = getKendaraan().find(
    (vehicle) => Number(vehicle.id) === Number(id),
  );
  if (!item) return;

  if (!confirmUnlock(item, "mengubah", button)) return;
  clearFormError("dashboardEditForm");

  document.getElementById("dashEditId").value = item.id;
  document.getElementById("dashEditStatus").value = item.status;
  document.getElementById("dashEditTanggal").value = String(
    item.tanggalService || "",
  ).slice(0, 10);
  document.getElementById("dashEditPembayaran").value =
    item.pembayaran || "Belum Lunas";
  document.getElementById("dashEditBiayaJasa").value =
    Number(item.biayaJasa) || "";

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

  const sparepartList = document.getElementById(
    "dashboardEditSparepartList",
  );
  if (sparepartList) {
    sparepartList.innerHTML = "";
    (item.spareparts || []).forEach((part) =>
      addDashboardSparepartRow(part.sparepartId, part.jumlah),
    );
  }
  updateDashboardEditTotalPreview();

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

  const status = document.getElementById("dashEditStatus").value;
  const pembayaran =
    document.getElementById("dashEditPembayaran").value || "Belum Lunas";
  const tanggalService =
    document.getElementById("dashEditTanggal").value ||
    String(kendaraan[index].tanggalService || "").slice(0, 10) ||
    getTodayLocalDate();
  const biayaJasa =
    Number(document.getElementById("dashEditBiayaJasa").value) || 0;

  if (pembayaran === "Lunas" && status !== "Selesai") {
    showFormError(
      "dashboardEditForm",
      "Status pembayaran Lunas hanya bisa dipilih setelah status service Selesai.",
    );
    return;
  }

  let spareparts;
  try {
    spareparts = getDashboardSparepartsFromForm();
  } catch (error) {
    showFormError("dashboardEditForm", error.message);
    return;
  }

  const draft = {
    ...kendaraan[index],
    status,
    mekanikId: mekanik.id,
    mekanik: mekanik.nama,
    biayaJasa,
    spareparts,
  };

  const statusError = validateServiceStatus(status, draft);
  if (statusError) {
    showFormError("dashboardEditForm", statusError);
    return;
  }

  const previousParts = kendaraan[index].spareparts || [];
  const stokTersedia = getSparepart();
  const previousQuantities = previousParts.reduce((map, item) => {
    map[item.sparepartId] =
      (map[item.sparepartId] || 0) + (Number(item.jumlah) || 0);
    return map;
  }, {});

  for (const part of spareparts) {
    const available = stokTersedia.find(
      (entry) => Number(entry.id) === Number(part.sparepartId),
    );
    if (
      !available ||
      Number(part.jumlah) >
        Number(available.stok) +
          (previousQuantities[part.sparepartId] || 0)
    ) {
      showFormError(
        "dashboardEditForm",
        `Stok ${part.nama} tidak mencukupi.`,
      );
      return;
    }
  }

  const nextQuantities = spareparts.reduce((map, item) => {
    map[item.sparepartId] =
      (map[item.sparepartId] || 0) + Number(item.jumlah);
    return map;
  }, {});
  stokTersedia.forEach((part) => {
    const restored = previousQuantities[part.id] || 0;
    const used = nextQuantities[part.id] || 0;
    part.stok = Number(part.stok) + restored - used;
  });

  kendaraan[index] = {
    ...kendaraan[index],
    status,
    mekanikId: mekanik.id,
    mekanik: mekanik.nama,
    pembayaran,
    tanggalService,
    biayaJasa,
    spareparts,
  };
  saveKendaraan(kendaraan);
  saveSparepart(stokTersedia);

  addLog(
    "Update",
    "Service",
    `${kendaraan[index].polisi} — status ${status}, pembayaran ${pembayaran}`,
    getKode("kendaraan", kendaraan[index]),
  );

  closeModal("dashboardEditModal");
  if (typeof updateDashboard === "function") updateDashboard();
  if (typeof renderMekanik === "function") renderMekanik();
  showPageNotice("Perubahan service tersimpan di tabel.", "success");
}

/* =========================================
   DETAIL SERVICE DARI DASHBOARD
   ========================================= */

var activeDashboardDetailId = null;

function showDashboardDetail(id) {
  const item = getKendaraan().find(
    (vehicle) => Number(vehicle.id) === Number(id),
  );
  if (!item) return;

  activeDashboardDetailId = item.id;

  const content = document.getElementById("dashboardDetailContent");
  const steps = document.getElementById("dashboardDetailSteps");
  const invoice = document.getElementById("dashboardDetailInvoice");

  if (content) {
    const ringkasan = getServiceRingkasan(item);
    content.innerHTML = buildServiceDetailGrid(item, {
      extraItems: [
        ...(item.requestedBy === "customer"
          ? [{ label: "Ajuan", value: escapeHTML(describeAjuan(item)) }]
          : []),
        { label: "Biaya Jasa", value: formatRupiah(ringkasan.biayaJasa) },
        {
          label: "Subtotal Sparepart",
          value: formatRupiah(ringkasan.subtotalSparepart),
        },
        {
          label: "Jumlah Sparepart",
          value: `${ringkasan.jumlahSparepart} item`,
        },
        { label: "Total Tagihan", value: formatRupiah(ringkasan.total) },
        {
          label: "Sisa Tagihan",
          value: ringkasan.lunas
            ? '<span class="badge done">Lunas</span>'
            : formatRupiah(ringkasan.sisa),
        },
      ],
    });
  }

  if (steps) {
    steps.innerHTML = `<div class="status-steps">${buildServiceSteps(
      item.status,
    )}</div>`;
  }

  if (invoice) {
    invoice.innerHTML = buildServiceInvoice(item);
  }

  const lunasButton = document.getElementById("btnDashboardDetailLunas");
  if (lunasButton) {
    lunasButton.hidden =
      item.status !== "Selesai" ||
      (item.pembayaran || "Belum Lunas") === "Lunas";
    lunasButton.title =
      item.status === "Selesai"
        ? "Tandai transaksi ini lunas"
        : "Service harus berstatus Selesai sebelum bisa dilunasi";
  }

  openModal("dashboardDetailModal");
}

function tandaiDashboardDetailLunas() {
  const item = getKendaraan().find(
    (row) => Number(row.id) === Number(activeDashboardDetailId),
  );
  if (!item) return;

  if (item.status !== "Selesai") {
    showPageNotice(
      "Tagihan hanya bisa dilunasi setelah status service Selesai.",
      "error",
    );
    return;
  }

  if (!setServicePaid(item.id)) {
    showPageNotice("Tagihan ini sudah berstatus lunas.", "error");
    return;
  }

  addLog(
    "Bayar",
    "Service",
    `Transaksi ${item.polisi} ditandai lunas`,
    getKode("kendaraan", item),
  );

  showDashboardDetail(item.id);
  if (typeof updateDashboard === "function") updateDashboard();
  showPageNotice("Transaksi ditandai lunas.", "success");
}

function cetakDashboardDetail() {
  const item = getKendaraan().find(
    (row) => Number(row.id) === Number(activeDashboardDetailId),
  );
  if (!item) return;
  printServiceInvoice(item);
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

  document
    .getElementById("btnTambahDashboardSparepart")
    ?.addEventListener("click", () => addDashboardSparepartRow());
  document
    .getElementById("dashEditBiayaJasa")
    ?.addEventListener("input", updateDashboardEditTotalPreview);
  document
    .getElementById("btnDashboardDetailLunas")
    ?.addEventListener("click", tandaiDashboardDetailLunas);
  document
    .getElementById("btnDashboardDetailCetak")
    ?.addEventListener("click", cetakDashboardDetail);
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

  const tanggalStatus = document.getElementById("filterStatusTanggal");
  if (tanggalStatus && !tanggalStatus.value) {
    tanggalStatus.value = getStatusTanggal();
  }
  tanggalStatus?.addEventListener("change", () => {
    if (typeof updateDashboard === "function") updateDashboard();
  });

  document
    .getElementById("filterMekanikDashboard")
    ?.addEventListener("change", () => {
      if (typeof renderMekanik === "function") renderMekanik();
    });
  const tanggalMekanik = document.getElementById("filterMekanikTanggal");
  if (tanggalMekanik && !tanggalMekanik.value) {
    tanggalMekanik.value = getTodayLocalDate();
  }
  tanggalMekanik?.addEventListener("change", () => {
    if (typeof renderMekanik === "function") renderMekanik();
  });

  document
    .getElementById("btnPanggilBerikutnya")
    ?.addEventListener("click", (event) => {
      if (typeof panggilBerikutnya === "function") {
        panggilBerikutnya(event.currentTarget);
      }
    });

  /* Aksi Terima / Tolak pada panel ajuan (delegasi: daftar di-render
     ulang setiap kali, jadi listener dipasang satu kali di wadahnya). */
  document
    .getElementById("ajuanList")
    ?.addEventListener("click", (event) => {
      const terima = event.target.closest?.("[data-terima-ajuan]");
      if (terima) {
        if (typeof terimaAjuan === "function") {
          terimaAjuan(terima.dataset.terimaAjuan, terima);
        }
        return;
      }

      const tolak = event.target.closest?.("[data-tolak-ajuan]");
      if (tolak && typeof bukaTolakAjuan === "function") {
        bukaTolakAjuan(tolak.dataset.tolakAjuan);
      }
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
