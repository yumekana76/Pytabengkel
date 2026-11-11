/* STATISTIK CUSTOMER */

function updateCustomerStats() {
  const customers = getCustomers();
  const kendaraan = getKendaraan();

  const totalCustomers = customers.length;

  const customersWithVehicle = customers.filter(
    (customer) => getCustomerVehicleCount(customer.id) > 0,
  ).length;

  const customersWithoutVehicle = totalCustomers - customersWithVehicle;

  const totalCustomerVehicles = kendaraan.length;

  setText("totalCustomers", totalCustomers);

  setText("customersWithVehicle", customersWithVehicle);

  setText("customersWithoutVehicle", customersWithoutVehicle);

  setText("totalCustomerVehicles", totalCustomerVehicles);
}

/* RENDER CUSTOMER */

function renderCustomers(search = "", page = 1) {
  const table = document.getElementById("customerTable");

  if (!table) {
    return;
  }

  const customers = getCustomers();

  const searchText = String(search).toLowerCase().trim();

  const sort = getSortValue("sortCustomer");

  const filteredCustomers = customers.filter((customer) => {
    return (
      String(customer.nama || "")
        .toLowerCase()
        .includes(searchText) ||
      String(customer.telepon || "")
        .toLowerCase()
        .includes(searchText) ||
      String(customer.email || "")
        .toLowerCase()
        .includes(searchText) ||
      String(customer.alamat || "")
        .toLowerCase()
        .includes(searchText) ||
      String(customer.id || "")
        .toLowerCase()
        .includes(searchText) ||
      String(customer.kode || "")
        .toLowerCase()
        .includes(searchText)
    );
  });

  const sortedCustomers = sortRows(filteredCustomers, sort.key, sort.direction);

  const perPage = 10;

  const totalPages = Math.ceil(filteredCustomers.length / perPage);

  if (page > totalPages && totalPages > 0) {
    page = totalPages;
  }

  const start = (page - 1) * perPage;

  const currentCustomers = sortedCustomers.slice(start, start + perPage);

  table.innerHTML = "";

  if (currentCustomers.length === 0) {
    table.innerHTML = `
      <tr>
        <td
          colspan="9"
          style="text-align: center;"
        >
          Tidak ada data customer.
        </td>
      </tr>
    `;

    setText("customerInfo", "Tidak ada data");

    renderCustomerPagination(filteredCustomers.length, page, perPage);

    return;
  }

  currentCustomers.forEach((customer, index) => {
    const nomor = start + index + 1;

    const jumlahKendaraan = getCustomerVehicleCount(customer.id);

    const account = getCustomerAccounts().find(
      (item) => Number(item.customerId) === Number(customer.id),
    );

    table.innerHTML += `
        <tr>
          <td>${nomor}</td>

          <td>
            <span class="cell-id">${escapeHTML(getKode("customers", customer))}</span>
          </td>

          <td>
            <strong>
              ${escapeHTML(customer.nama)}
            </strong>
          </td>

          <td>
            ${escapeHTML(customer.telepon)}
          </td>

          <td>
            ${escapeHTML(customer.email || "-")}
          </td>

          <td>
            ${escapeHTML(customer.alamat || "-")}
          </td>

          <td>
            ${jumlahKendaraan} kendaraan
          </td>

          <td>
            <span class="badge ${account ? "done" : "neutral"}">
              ${account ? "Punya Akun" : "Belum Punya Akun"}
            </span>
          </td>

          <td>
            <div class="action-buttons">

              <button
                type="button"
                class="action-btn"
                data-customer-detail="${customer.id}"
              >
                Detail
              </button>

              <button
                type="button"
                class="action-btn"
                data-customer-edit="${customer.id}"
              >
                Edit
              </button>

              <button
                type="button"
                class="action-btn"
                data-customer-account="${customer.id}"
              >
                Akun
              </button>

              <button
                type="button"
                class="action-btn danger"
                data-customer-delete="${customer.id}"
              >
                Hapus
              </button>

            </div>
          </td>
        </tr>
      `;
  });

  /* Listener tombol aksi (tanpa inline onclick -> CSP friendly) */
  table.querySelectorAll("[data-customer-detail]").forEach((button) => {
    button.addEventListener("click", () =>
      showCustomerDetail(button.dataset.customerDetail),
    );
  });

  table.querySelectorAll("[data-customer-edit]").forEach((button) => {
    button.addEventListener("click", () =>
      editCustomer(button.dataset.customerEdit),
    );
  });

  table.querySelectorAll("[data-customer-account]").forEach((button) => {
    button.addEventListener("click", () =>
      manageCustomerAccount(button.dataset.customerAccount),
    );
  });

  table.querySelectorAll("[data-customer-delete]").forEach((button) => {
    button.addEventListener("click", () =>
      deleteCustomer(button.dataset.customerDelete, button),
    );
  });

  const showingStart = start + 1;

  const showingEnd = Math.min(start + perPage, sortedCustomers.length);

  setText(
    "customerInfo",
    `Menampilkan ${showingStart}-${showingEnd} dari ${sortedCustomers.length} customer`,
  );

  renderCustomerPagination(sortedCustomers.length, page, perPage);
}

/* PAGINATION CUSTOMER */

function renderCustomerPagination(totalItems, currentPage, perPage) {
  const pagination = document.getElementById("customerPagination");

  if (!pagination) {
    return;
  }

  const totalPages = Math.ceil(totalItems / perPage);

  pagination.innerHTML = "";

  if (totalPages <= 1) {
    return;
  }

  const previousButton = document.createElement("button");

  previousButton.className = "page-btn";

  previousButton.textContent = "‹";

  previousButton.disabled = currentPage === 1;

  previousButton.addEventListener("click", () => {
    if (typeof renderCustomers === "function")
      renderCustomers(
        document.getElementById("searchCustomer").value,
        currentPage - 1,
      );
  });

  pagination.appendChild(previousButton);

  for (let i = 1; i <= totalPages; i++) {
    const pageButton = document.createElement("button");

    pageButton.className = "page-btn";

    if (i === currentPage) {
      pageButton.classList.add("active");
    }

    pageButton.textContent = i;

    pageButton.addEventListener("click", () => {
      if (typeof renderCustomers === "function")
        renderCustomers(document.getElementById("searchCustomer").value, i);
    });

    pagination.appendChild(pageButton);
  }

  const nextButton = document.createElement("button");

  nextButton.className = "page-btn";

  nextButton.textContent = "›";

  nextButton.disabled = currentPage === totalPages;

  nextButton.addEventListener("click", () => {
    if (typeof renderCustomers === "function")
      renderCustomers(
        document.getElementById("searchCustomer").value,
        currentPage + 1,
      );
  });

  pagination.appendChild(nextButton);
}

/* RESET FORM CUSTOMER */

function resetCustomerForm() {
  const form = document.getElementById("customerForm");

  if (!form) {
    return;
  }

  form.reset();

  clearFormError("customerForm");

  const id = document.getElementById("customerId");

  if (id) {
    id.value = "";
  }

  toggleCustomerAccountFields();

  const searchGroup = document.getElementById("customerSearchLookupGroup");
  if (searchGroup) searchGroup.hidden = false;
  const searchInput = document.getElementById("customerSearchLookup");
  if (searchInput) searchInput.value = "";
  hideCustomerLookupResults();
  const lookupHint = document.getElementById("customerSearchLookupHint");
  if (lookupHint) {
    lookupHint.textContent =
      "Ketik nama customer untuk memeriksa atau menyalin data customer yang sudah ada.";
  }

  setText("customerModalTitle", "Tambah Customer");
}

/* =========================================
   PENCARIAN CUSTOMER TERDAFTAR (TAMBAH CUSTOMER)
   ========================================= */

function hideCustomerLookupResults() {
  const box = document.getElementById("customerLookupResults");
  if (box) {
    box.hidden = true;
    box.innerHTML = "";
  }
}

function getCustomerLookupMatches(keyword) {
  const term = String(keyword || "").toLowerCase().trim();

  if (term.length < 2) {
    return [];
  }

  return getCustomers()
    .filter((customer) => {
      return [
        customer.nama,
        customer.telepon,
        customer.email,
        customer.kode,
        customer.id,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(term),
      );
    })
    .slice(0, 6);
}

function renderCustomerLookupResults(keyword) {
  const group = document.getElementById("customerSearchLookupGroup");
  const input = document.getElementById("customerSearchLookup");

  if (!group || !input) return;

  const term = String(keyword || "").trim();

  if (term.length < 2) {
    hideCustomerLookupResults();
    return;
  }

  let box = document.getElementById("customerLookupResults");

  if (!box) {
    box = document.createElement("div");
    box.id = "customerLookupResults";
    box.className = "customer-lookup";
    box.setAttribute("role", "listbox");
    box.setAttribute("aria-label", "Customer terdaftar");
    input.insertAdjacentElement("afterend", box);
  }

  const matches = getCustomerLookupMatches(term);

  if (!matches.length) {
    box.hidden = false;
    box.innerHTML =
      '<p class="customer-lookup-empty">Tidak ada customer yang cocok. Lanjutkan mengisi data baru.</p>';
    return;
  }

  box.hidden = false;
  box.innerHTML = matches
    .map((customer) => {
      const kendaraan = getCustomerVehicleCount(customer.id);
      return `
        <button
          type="button"
          class="customer-lookup-item"
          role="option"
          data-customer-lookup="${customer.id}"
        >
          <span class="customer-lookup-name">${escapeHTML(customer.nama)}</span>
          <span class="customer-lookup-meta">
            ${escapeHTML(customer.telepon || "-")} • ${kendaraan} kendaraan
          </span>
        </button>
      `;
    })
    .join("");

  box.querySelectorAll("[data-customer-lookup]").forEach((button) => {
    button.addEventListener("click", () => {
      selectCustomerLookup(button.dataset.customerLookup);
    });
  });
}

function selectCustomerLookup(id) {
  const customer = getCustomers().find(
    (item) => Number(item.id) === Number(id),
  );

  if (!customer) return;

  const fields = {
    customerNama: customer.nama || "",
    customerTelepon: customer.telepon || "",
    customerEmail: customer.email || "",
    customerAlamat: customer.alamat || "",
    customerCatatan: customer.catatan || "",
  };

  Object.keys(fields).forEach((fieldId) => {
    const field = document.getElementById(fieldId);
    if (field) field.value = fields[fieldId];
  });

  const input = document.getElementById("customerSearchLookup");
  if (input) input.value = customer.nama || "";

  hideCustomerLookupResults();

  const kendaraan = getCustomerVehicleCount(customer.id);
  const hint = document.getElementById("customerSearchLookupHint");

  if (hint) {
    hint.textContent = `Data ${customer.nama} sudah terdaftar (${kendaraan} kendaraan) dan telah disalin ke form. Simpan akan membuat entri baru — untuk mengubah data lama, tutup modal lalu pilih tombol Edit pada tabel.`;
  }

  document.getElementById("customerNama")?.focus();
}

/* Tampilkan / sembunyikan kolom akun login sesuai checkbox. */
function toggleCustomerAccountFields() {
  const aktif = document.getElementById("customerBuatAkun")?.checked;
  /* Mode lokal sudah dihapus — akun selalu via Supabase Auth. */
  const supabaseMode = true;

  const emailGroup = document.getElementById("customerAkunEmailGroup");
  const passwordGroup = document.getElementById("customerAkunPasswordGroup");
  const hint = document.getElementById("customerBuatAkunHint");

  if (emailGroup) emailGroup.hidden = !aktif;
  if (passwordGroup) passwordGroup.hidden = !aktif || supabaseMode;

  if (hint) {
    hint.textContent = supabaseMode
      ? "Di mode online, tautan login akan dikirim ke email customer."
      : "Centang bila ingin membantu customer masuk ke portal customer. Password bisa dibuatkan di sini atau dikirim lewat email.";
  }
}

/* EDIT CUSTOMER */

function editCustomer(id) {
  const customers = getCustomers();

  const customer = customers.find((item) => Number(item.id) === Number(id));

  if (!customer) {
    return;
  }

  clearFormError("customerForm");

  document.getElementById("customerId").value = customer.id;

  document.getElementById("customerNama").value = customer.nama;

  document.getElementById("customerTelepon").value = customer.telepon;

  document.getElementById("customerEmail").value = customer.email || "";

  document.getElementById("customerAlamat").value = customer.alamat || "";

  document.getElementById("customerCatatan").value = customer.catatan || "";

  const buatAkun = document.getElementById("customerBuatAkun");
  const akunEmail = document.getElementById("customerAkunEmail");

  if (buatAkun) buatAkun.checked = false;

  if (akunEmail) akunEmail.value = customer.email || "";

  const akunPassword = document.getElementById("customerAkunPassword");

  if (akunPassword) akunPassword.value = "";

  toggleCustomerAccountFields();

  /* Saat mengedit, pencarian customer terdaftar tidak relevan. */
  const searchGroup = document.getElementById("customerSearchLookupGroup");
  if (searchGroup) searchGroup.hidden = true;
  hideCustomerLookupResults();

  setText("customerModalTitle", "Edit Customer");

  openModal("customerModal");
}

/* TAMBAH / EDIT CUSTOMER */

async function saveCustomerForm(event) {
  event.preventDefault();
  clearFormError("customerForm");
  clearPageNotice();

  const id = document.getElementById("customerId").value;

  const nama = document.getElementById("customerNama").value.trim();

  const telepon = document.getElementById("customerTelepon").value.trim();

  const email = document.getElementById("customerEmail").value.trim();

  const alamat = document.getElementById("customerAlamat").value.trim();

  const catatan = document.getElementById("customerCatatan").value.trim();

  if (!nama || !telepon) {
    showFormError("customerForm", "Nama dan nomor HP wajib diisi.");

    return;
  }

  const customers = getCustomers();

  /* EDIT */

  if (id) {
    const customerId = Number(id);

    const index = customers.findIndex(
      (customer) => Number(customer.id) === customerId,
    );

    if (index !== -1) {
      const namaLama = customers[index].nama;

      customers[index] = {
        ...customers[index],
        nama,
        telepon,
        email,
        alamat,
        catatan,
      };

      const kendaraan = getKendaraan();

      let kendaraanChanged = false;

      kendaraan.forEach((vehicle) => {
        if (Number(vehicle.pelangganId) === customerId) {
          vehicle.pelanggan = nama;

          kendaraanChanged = true;
        }
      });

      kendaraan.forEach((vehicle) => {
        if (
          !vehicle.pelangganId &&
          String(vehicle.pelanggan || "").toLowerCase() ===
            String(namaLama || "").toLowerCase()
        ) {
          vehicle.pelangganId = customerId;

          vehicle.pelanggan = nama;

          kendaraanChanged = true;
        }
      });

      if (kendaraanChanged) {
        saveKendaraan(kendaraan);
      }

      /* Sinkronkan email akun login customer bila email berubah. */

      const accounts = getCustomerAccounts();
      const accountIndex = accounts.findIndex(
        (account) => Number(account.customerId) === customerId,
      );

      if (accountIndex !== -1) {
        accounts[accountIndex] = {
          ...accounts[accountIndex],
          nama,
          email,
        };

        saveCustomerAccounts(accounts);
      }
    }
  } else {
    /* TAMBAH */
    const newCustomer = {
      id: customers.length
        ? Math.max(...customers.map((item) => Number(item.id) || 0)) + 1
        : 1,
      kode: nextKode("customers", customers),
      nama,
      telepon,
      email,
      alamat,
      catatan,
      registeredAt: new Date().toISOString(),
    };

    customers.push(newCustomer);
  }

  saveCustomers(customers);

  addLog(
    id ? "Update" : "Tambah",
    "Customer",
    `${nama} (${telepon})`,
    getKode(
      "customers",
      id
        ? customers.find((item) => Number(item.id) === Number(id))
        : customers[customers.length - 1],
    ),
  );

  /* Bantu customer membuat akun login (opsional). */
  const buatAkun = document.getElementById("customerBuatAkun")?.checked;
  const target = id ? customers.find((item) => Number(item.id) === Number(id)) : customers[customers.length - 1];

  let hasilAkun = null;
  if (buatAkun && target) {
    hasilAkun = await buatAkunCustomer(target);
  }

  closeModal("customerModal");

  resetCustomerForm();

  if (typeof renderCustomers === "function") renderCustomers();
  if (typeof updateCustomerStats === "function") updateCustomerStats();
  if (typeof updateDashboard === "function") updateDashboard();
  /* Satu notice gabungan: data tersimpan + hasil pembuatan akun
     (sebelumnya pesan akun menimpa pesan "data tersimpan"). */
  const dataTersimpan = "Data customer tersimpan di tabel.";
  showPageNotice(
    hasilAkun ? `${dataTersimpan} ${hasilAkun.text}` : dataTersimpan,
    hasilAkun && !hasilAkun.ok ? "error" : "success",
  );
}

/* Buat akun login customer: kirim tautan login ke email
   (Supabase Auth — tidak ada lagi penyimpanan password lokal).
   Mengembalikan { ok, text } — PEMANGGIL yang menampilkan pesan
   (bukan fungsi ini), supaya tidak ada notice yang saling menimpa. */
async function buatAkunCustomer(customer) {
  const emailAkun =
    document.getElementById("customerAkunEmail")?.value.trim() ||
    customer.email ||
    "";

  const password =
    document.getElementById("customerAkunPassword")?.value.trim() || "";

  if (!emailAkun) {
    return {
      ok: false,
      text: "Akun login tidak dibuat: email customer masih kosong.",
    };
  }

  if (typeof isSupabaseMode === "function" && isSupabaseMode()) {
    const result = await Auth.sendLoginLink(
      emailAkun,
      `${window.location.origin}/html/customers-page/dashboard.html`,
    );

    if (!result.ok) {
      return {
        ok: false,
        text: result.error || "Gagal mengirim tautan login ke customer.",
      };
    }

    return {
      ok: true,
      text: `Tautan login berhasil dikirim ke ${emailAkun}.`,
    };
  }

  /* Mode lokal sudah dihapus — tanpa koneksi Supabase,
     pengiriman akun tidak bisa diproses. */
  return {
    ok: false,
    text: "Aplikasi belum terhubung ke Supabase. Muat ulang halaman setelah konfigurasi diisi.",
  };
}

/* HAPUS CUSTOMER */

function deleteCustomer(id, button = null) {
  const customers = getCustomers();

  const customer = customers.find((item) => Number(item.id) === Number(id));

  if (!customer) {
    return;
  }

  const jumlahKendaraan = getCustomerVehicleCount(customer.id);

  if (jumlahKendaraan > 0) {
    showPageNotice(
      `Customer ${customer.nama} masih memiliki ${jumlahKendaraan} kendaraan. Data tidak dihapus, lihat kolom Kendaraan pada tabel.`,
      "error",
    );

    return;
  }

  if (!armConfirmButton(button, `Klik lagi untuk hapus ${customer.nama}`)) {
    showPageNotice(
      `Klik Hapus sekali lagi untuk menghapus customer "${customer.nama}".`,
      "error",
    );
    return;
  }

  const filteredCustomers = customers.filter(
    (item) => Number(item.id) !== Number(id),
  );

  saveCustomers(filteredCustomers);

  addLog(
    "Hapus",
    "Customer",
    `${customer.nama} (${customer.telepon})`,
    getKode("customers", customer),
  );

  /* Hapus juga akun login customer. */

  const accounts = getCustomerAccounts().filter(
    (account) => Number(account.customerId) !== Number(id),
  );

  saveCustomerAccounts(accounts);

  if (typeof renderCustomers === "function") renderCustomers();
  if (typeof updateCustomerStats === "function") updateCustomerStats();
  if (typeof updateDashboard === "function") updateDashboard();
  showPageNotice(`Customer "${customer.nama}" dihapus dari tabel.`, "success");
}

/* DETAIL CUSTOMER */

function showCustomerDetail(id) {
  const customers = getCustomers();

  const customer = customers.find((item) => Number(item.id) === Number(id));

  if (!customer) {
    return;
  }

  const kendaraan = getKendaraan();

  const customerVehicles = kendaraan.filter(
    (vehicle) => Number(vehicle.pelangganId) === Number(customer.id),
  );

  const registeredDate = customer.registeredAt
    ? new Date(customer.registeredAt).toLocaleDateString("id-ID")
    : "-";

  let kendaraanHTML = "-";

  if (customerVehicles.length > 0) {
    kendaraanHTML = customerVehicles
      .map((vehicle) => {
        return `
              <div>
                ${escapeHTML(vehicle.polisi)}
                -
                ${escapeHTML(vehicle.merk)}
                -
                ${escapeHTML(vehicle.jenis)}
              </div>
            `;
      })
      .join("");
  }

  const account = getCustomerAccounts().find(
    (item) => Number(item.customerId) === Number(customer.id),
  );

  const content = document.getElementById("customerDetailContent");

  if (!content) {
    return;
  }

  content.innerHTML = `
    <div class="detail-item">
      <span class="detail-label">
        Nama
      </span>

      <span class="detail-value">
        ${escapeHTML(customer.nama)}
      </span>
    </div>

    <div class="detail-item">
      <span class="detail-label">
        No. HP
      </span>

      <span class="detail-value">
        ${escapeHTML(customer.telepon)}
      </span>
    </div>

    <div class="detail-item">
      <span class="detail-label">
        Email
      </span>

      <span class="detail-value">
        ${escapeHTML(customer.email || "-")}
      </span>
    </div>

    <div class="detail-item">
      <span class="detail-label">
        Alamat
      </span>

      <span class="detail-value">
        ${escapeHTML(customer.alamat || "-")}
      </span>
    </div>

    <div class="detail-item">
      <span class="detail-label">
        Terdaftar
      </span>

      <span class="detail-value">
        ${registeredDate}
      </span>
    </div>

    <div class="detail-item">
      <span class="detail-label">
        Catatan
      </span>

      <span class="detail-value">
        ${escapeHTML(customer.catatan || "-")}
      </span>
    </div>

    <div class="detail-item">
      <span class="detail-label">
        Kendaraan
      </span>

      <span class="detail-value">
        ${kendaraanHTML}
      </span>
    </div>

    <div class="detail-item full">
      <span class="detail-label">
        Akun Login Customer
      </span>

      <span class="detail-value">
        ${
          account
            ? `${escapeHTML(account.email)} — bisa masuk ke portal customer`
            : "Belum punya akun login"
        }
      </span>
    </div>
  `;

  openModal("customerDetailModal");
}

/* KELOLA AKUN LOGIN CUSTOMER */

function manageCustomerAccount(id) {
  const customers = getCustomers();

  const customer = customers.find((item) => Number(item.id) === Number(id));

  if (!customer) {
    return;
  }

  const account = getCustomerAccounts().find(
    (item) => Number(item.customerId) === Number(customer.id),
  );

  document.getElementById("customerAccountId").value = customer.id;
  document.getElementById("customerAccountNama").value = customer.nama || "";
  document.getElementById("customerAccountEmail").value =
    account?.email || customer.email || "";
  document.getElementById("customerAccountPassword").value = "";

  const error = document.getElementById("customerAccountError");

  if (error) {
    error.hidden = true;
  }

  const status = document.getElementById("customerAccountStatus");

  if (status) {
    status.textContent = account
      ? `Sudah punya akun login (${account.email}).`
      : "Belum punya akun login. Kirim link login ke email customer.";
  }

  /* Di mode Supabase password dikelola Supabase Auth,
     jadi admin cukup mengirim link login ke customer. */
  const supabaseMode = true; /* mode lokal sudah dihapus */

  const passwordGroup = document.getElementById("customerAccountPasswordGroup");
  const hint = document.getElementById("customerAccountHint");
  const submit = document.getElementById("btnSaveCustomerAccount");

  if (passwordGroup) {
    passwordGroup.hidden = supabaseMode;
  }

  if (hint) {
    hint.textContent = supabaseMode
      ? "Customer akan menerima tautan login ke emailnya."
      : "Kosongkan jika tidak ingin mengubah password.";
  }

  if (submit) {
    submit.innerHTML = supabaseMode
      ? '<i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Kirim Link Login'
      : '<i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Simpan Akun';
  }

  openModal("customerAccountModal");
}

async function saveCustomerAccountForm(event) {
  event.preventDefault();

  const error = document.getElementById("customerAccountError");

  const showError = (message) => {
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
  };

  const customerId = Number(document.getElementById("customerAccountId").value);
  const email = document.getElementById("customerAccountEmail").value.trim();
  const password = document
    .getElementById("customerAccountPassword")
    .value.trim();

  if (!email) {
    showError("Email login wajib diisi.");
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError("Masukkan alamat email yang valid.");
    return;
  }

  const bentrok = getCustomerAccounts().find(
    (item) =>
      String(item.email || "").toLowerCase() === email.toLowerCase() &&
      Number(item.customerId) !== customerId,
  );

  if (bentrok) {
    showError("Email tersebut sudah dipakai akun customer lain.");
    return;
  }

  /* MODE SUPABASE (satu-satunya mode): kirim magic link. */

  if (typeof isSupabaseMode !== "function" || !isSupabaseMode()) {
    showError("Aplikasi belum terhubung ke Supabase. Muat ulang halaman setelah konfigurasi diisi.");
    return;
  }

  {
    const result = await Auth.sendLoginLink(
      email,
      `${window.location.origin}/html/customers-page/dashboard.html`,
    );

    if (!result.ok) {
      showError(result.error || "Gagal mengirim link login.");
      return;
    }

    /* Samakan email customer & data customer di server. */

    const customers = getCustomers();
    const customerIndex = customers.findIndex(
      (item) => Number(item.id) === customerId,
    );

    if (customerIndex !== -1) {
      customers[customerIndex] = {
        ...customers[customerIndex],
        email,
      };

      saveCustomers(customers);
    }

    closeModal("customerAccountModal");
    showPageNotice(`Link login berhasil dikirim ke ${email}.`, "success");
  }
}

/* INIT CUSTOMER */

function initCustomerPage() {
  const customerTable = document.getElementById("customerTable");

  if (!customerTable) {
    return;
  }

  if (typeof renderCustomers === "function") renderCustomers();
  if (typeof updateCustomerStats === "function") updateCustomerStats();
  const btnTambah = document.getElementById("btnTambahCustomer");

  if (btnTambah) {
    btnTambah.addEventListener("click", () => {
      resetCustomerForm();

      openModal("customerModal");
    });
  }

  const form = document.getElementById("customerForm");

  if (form) {
    form.addEventListener("submit", saveCustomerForm);
  }

  document
    .getElementById("customerBuatAkun")
    ?.addEventListener("change", toggleCustomerAccountFields);

  const accountForm = document.getElementById("customerAccountForm");

  if (accountForm) {
    accountForm.addEventListener("submit", saveCustomerAccountForm);
  }

  const search = document.getElementById("searchCustomer");

  if (search) {
    search.addEventListener("input", () => {
      if (typeof renderCustomers === "function")
        renderCustomers(search.value, 1);
    });
  }

  /* Pencarian customer terdaftar di modal Tambah Customer. */
  const lookup = document.getElementById("customerSearchLookup");

  if (lookup) {
    lookup.addEventListener("input", () => {
      renderCustomerLookupResults(lookup.value);
    });

    lookup.addEventListener("focus", () => {
      if (lookup.value.trim().length >= 2) {
        renderCustomerLookupResults(lookup.value);
      }
    });

    lookup.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        hideCustomerLookupResults();
        return;
      }

      if (event.key === "ArrowDown") {
        const first = document.querySelector(
          "#customerLookupResults .customer-lookup-item",
        );
        if (first) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    /* Klik di luar area pencarian menutup daftar saran. */
    document.addEventListener("click", (event) => {
      if (!event.target.closest("#customerSearchLookupGroup")) {
        hideCustomerLookupResults();
      }
    });
  }

  document.getElementById("sortCustomer")?.addEventListener("change", () => {
    if (typeof renderCustomers === "function") renderCustomers(search.value, 1);
  });

  /* Penutupan modal sudah ditangani global.js */
}

/* Spam-click guard untuk handler form async. */
(function () {
  function wrap(name) {
    const orig = window[name];
    if (typeof orig !== "function") return;
    const wrapped = async function (event) {
      if (wrapped._busy) return;
      wrapped._busy = true;
      const submitter =
        (event && event.submitter) ||
        (event && event.target && typeof event.target.querySelector === "function"
          ? event.target.querySelector("button[type='submit'], button:not([type])")
          : null) ||
        document.querySelector("button[type='submit']");
      if (submitter) submitter.disabled = true;
      try {
        return await orig.apply(this, arguments);
      } finally {
        wrapped._busy = false;
        if (submitter) submitter.disabled = false;
      }
    };
    window[name] = wrapped;
  }
  wrap("saveCustomerForm");
  wrap("saveCustomerAccountForm");
})();
