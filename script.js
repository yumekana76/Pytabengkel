/* =========================================
   DATA DEFAULT
========================================= */

const defaultKendaraan = [];
const defaultMekanik = [];

/* =========================================
   LOCAL STORAGE KENDARAAN
========================================= */

function getKendaraan() {
  const data = localStorage.getItem("workshop_kendaraan");

  let kendaraan;

  if (!data) {
    kendaraan = [...defaultKendaraan];
  } else {
    try {
      kendaraan = JSON.parse(data);

      if (!Array.isArray(kendaraan)) {
        kendaraan = [...defaultKendaraan];
      }
    } catch (error) {
      console.error("Data kendaraan rusak:", error);
      kendaraan = [...defaultKendaraan];
    }
  }

  /*
    HUBUNGKAN DATA KENDARAAN DENGAN CUSTOMER
  */

  const customersData = localStorage.getItem("workshop_customers");

  if (customersData) {
    try {
      const customers = JSON.parse(customersData);

      if (Array.isArray(customers)) {
        let changed = false;

        kendaraan = kendaraan.map((vehicle) => {
          /*
            Jika sudah memiliki pelangganId,
            gunakan ID tersebut sebagai hubungan utama.
          */
          if (vehicle.pelangganId) {
            const customer = customers.find(
              (customer) => Number(customer.id) === Number(vehicle.pelangganId),
            );

            if (customer) {
              if (vehicle.pelanggan !== customer.nama) {
                vehicle.pelanggan = customer.nama;
                changed = true;
              }
            }

            return vehicle;
          }

          /*
            MIGRASI DATA LAMA
            Cari customer berdasarkan nama.
          */
          const customer = customers.find(
            (customer) =>
              String(customer.nama || "").toLowerCase() ===
              String(vehicle.pelanggan || "").toLowerCase(),
          );

          if (customer) {
            vehicle.pelangganId = customer.id;
            vehicle.pelanggan = customer.nama;
            changed = true;
          }

          return vehicle;
        });

        if (changed) {
          localStorage.setItem("workshop_kendaraan", JSON.stringify(kendaraan));
        }
      }
    } catch (error) {
      console.error("Gagal menghubungkan kendaraan dengan customer:", error);
    }
  }

  if (!data) {
    localStorage.setItem("workshop_kendaraan", JSON.stringify(kendaraan));
  }

  return kendaraan;
}

function saveKendaraan(data) {
  localStorage.setItem("workshop_kendaraan", JSON.stringify(data));
}

/* =========================================
   LOCAL STORAGE MEKANIK
========================================= */

function getMekanik() {
  const data = localStorage.getItem("workshop_mekanik");

  if (!data) {
    localStorage.setItem("workshop_mekanik", JSON.stringify(defaultMekanik));

    return [...defaultMekanik];
  }

  try {
    const mekanik = JSON.parse(data);

    if (Array.isArray(mekanik)) {
      return mekanik;
    }
  } catch (error) {
    console.error("Data mekanik rusak:", error);
  }

  localStorage.setItem("workshop_mekanik", JSON.stringify(defaultMekanik));

  return [...defaultMekanik];
}

function saveMekanik(data) {
  localStorage.setItem("workshop_mekanik", JSON.stringify(data));
}

/* =========================================
   SPAREPART DAN BIAYA SERVICE
========================================= */

const defaultSparepart = [];

function getSparepart() {
  const data = localStorage.getItem("workshop_sparepart");

  if (!data) {
    localStorage.setItem(
      "workshop_sparepart",
      JSON.stringify(defaultSparepart),
    );
    return [];
  }

  try {
    const sparepart = JSON.parse(data);
    return Array.isArray(sparepart) ? sparepart : [];
  } catch (error) {
    console.error("Data sparepart rusak:", error);
    return [];
  }
}

function saveSparepart(sparepart) {
  localStorage.setItem("workshop_sparepart", JSON.stringify(sparepart));
}

function getServiceTotal(service) {
  const biayaJasa = Number(service.biayaJasa) || 0;
  const totalSparepart = (service.spareparts || []).reduce(
    (total, item) =>
      total + (Number(item.harga) || 0) * (Number(item.jumlah) || 0),
    0,
  );
  return biayaJasa + totalSparepart;
}

/* =========================================
   CUSTOMER
========================================= */

const defaultCustomers = [];

/* =========================================
   GET CUSTOMER
========================================= */

function getCustomers() {
  const data = localStorage.getItem("workshop_customers");

  if (!data) {
    localStorage.setItem(
      "workshop_customers",
      JSON.stringify(defaultCustomers),
    );

    return [...defaultCustomers];
  }

  try {
    const customers = JSON.parse(data);

    if (Array.isArray(customers)) {
      return customers;
    }
  } catch (error) {
    console.error("Data customer rusak:", error);
  }

  localStorage.setItem("workshop_customers", JSON.stringify(defaultCustomers));

  return [...defaultCustomers];
}

/* =========================================
   SAVE CUSTOMER
========================================= */

function saveCustomers(customers) {
  localStorage.setItem("workshop_customers", JSON.stringify(customers));
}

/* =========================================
   JUMLAH KENDARAAN CUSTOMER
========================================= */

function getCustomerVehicleCount(customerId) {
  const kendaraan = getKendaraan();

  return kendaraan.filter(
    (vehicle) => Number(vehicle.pelangganId) === Number(customerId),
  ).length;
}

/* =========================================
   STATISTIK CUSTOMER
========================================= */

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

/* =========================================
   RENDER CUSTOMER
========================================= */

function renderCustomers(search = "", page = 1) {
  const table = document.getElementById("customerTable");

  if (!table) {
    return;
  }

  const customers = getCustomers();

  const searchText = String(search).toLowerCase().trim();

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
        .includes(searchText)
    );
  });

  const perPage = 10;

  const totalPages = Math.ceil(filteredCustomers.length / perPage);

  if (page > totalPages && totalPages > 0) {
    page = totalPages;
  }

  const start = (page - 1) * perPage;

  const currentCustomers = filteredCustomers.slice(start, start + perPage);

  table.innerHTML = "";

  if (currentCustomers.length === 0) {
    table.innerHTML = `
      <tr>
        <td
          colspan="7"
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

    table.innerHTML += `
        <tr>
          <td>${nomor}</td>

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
            <div class="action-buttons">

              <button
                type="button"
                class="action-btn"
                onclick="showCustomerDetail(${customer.id})"
              >
                Detail
              </button>

              <button
                type="button"
                class="action-btn"
                onclick="editCustomer(${customer.id})"
              >
                Edit
              </button>

              <button
                type="button"
                class="action-btn danger"
                onclick="deleteCustomer(${customer.id})"
              >
                Hapus
              </button>

            </div>
          </td>
        </tr>
      `;
  });

  const showingStart = start + 1;

  const showingEnd = Math.min(start + perPage, filteredCustomers.length);

  setText(
    "customerInfo",
    `Menampilkan ${showingStart}-${showingEnd} dari ${filteredCustomers.length} customer`,
  );

  renderCustomerPagination(filteredCustomers.length, page, perPage);
}

/* =========================================
   PAGINATION CUSTOMER
========================================= */

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
      renderCustomers(document.getElementById("searchCustomer").value, i);
    });

    pagination.appendChild(pageButton);
  }

  const nextButton = document.createElement("button");

  nextButton.className = "page-btn";

  nextButton.textContent = "›";

  nextButton.disabled = currentPage === totalPages;

  nextButton.addEventListener("click", () => {
    renderCustomers(
      document.getElementById("searchCustomer").value,
      currentPage + 1,
    );
  });

  pagination.appendChild(nextButton);
}

/* =========================================
   RESET FORM CUSTOMER
========================================= */

function resetCustomerForm() {
  const form = document.getElementById("customerForm");

  if (!form) {
    return;
  }

  form.reset();

  const id = document.getElementById("customerId");

  if (id) {
    id.value = "";
  }

  setText("customerModalTitle", "Tambah Customer");
}

/* =========================================
   EDIT CUSTOMER
========================================= */

function editCustomer(id) {
  const customers = getCustomers();

  const customer = customers.find((item) => Number(item.id) === Number(id));

  if (!customer) {
    return;
  }

  document.getElementById("customerId").value = customer.id;

  document.getElementById("customerNama").value = customer.nama;

  document.getElementById("customerTelepon").value = customer.telepon;

  document.getElementById("customerEmail").value = customer.email || "";

  document.getElementById("customerAlamat").value = customer.alamat || "";

  document.getElementById("customerCatatan").value = customer.catatan || "";

  setText("customerModalTitle", "Edit Customer");

  openModal("customerModal");
}

/* =========================================
   TAMBAH / EDIT CUSTOMER
========================================= */

function saveCustomerForm(event) {
  event.preventDefault();

  const id = document.getElementById("customerId").value;

  const nama = document.getElementById("customerNama").value.trim();

  const telepon = document.getElementById("customerTelepon").value.trim();

  const email = document.getElementById("customerEmail").value.trim();

  const alamat = document.getElementById("customerAlamat").value.trim();

  const catatan = document.getElementById("customerCatatan").value.trim();

  if (!nama || !telepon) {
    alert("Nama dan nomor HP wajib diisi.");

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

      /*
        SINKRONKAN KENDARAAN
      */

      const kendaraan = getKendaraan();

      let kendaraanChanged = false;

      kendaraan.forEach((vehicle) => {
        if (Number(vehicle.pelangganId) === customerId) {
          vehicle.pelanggan = nama;

          kendaraanChanged = true;
        }
      });

      /*
        MIGRASI DATA LAMA
      */

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
    }
  } else {
    /* TAMBAH */
    const newCustomer = {
      id: customers.length
        ? Math.max(...customers.map((item) => Number(item.id) || 0)) + 1
        : 1,
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

  closeModal("customerModal");

  resetCustomerForm();

  renderCustomers();

  updateCustomerStats();

  updateDashboard();
}

/* =========================================
   HAPUS CUSTOMER
========================================= */

function deleteCustomer(id) {
  const customers = getCustomers();

  const customer = customers.find((item) => Number(item.id) === Number(id));

  if (!customer) {
    return;
  }

  const jumlahKendaraan = getCustomerVehicleCount(customer.id);

  if (jumlahKendaraan > 0) {
    alert(
      `Customer ${customer.nama} masih memiliki ${jumlahKendaraan} kendaraan.`,
    );

    return;
  }

  const yakin = confirm(`Hapus customer "${customer.nama}"?`);

  if (!yakin) {
    return;
  }

  const filteredCustomers = customers.filter(
    (item) => Number(item.id) !== Number(id),
  );

  saveCustomers(filteredCustomers);

  renderCustomers();

  updateCustomerStats();

  updateDashboard();
}

/* =========================================
   DETAIL CUSTOMER
========================================= */

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
  `;

  openModal("customerDetailModal");
}

/* =========================================
   INIT CUSTOMER
========================================= */

function initCustomerPage() {
  const customerTable = document.getElementById("customerTable");

  if (!customerTable) {
    return;
  }

  renderCustomers();

  updateCustomerStats();

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

  const search = document.getElementById("searchCustomer");

  if (search) {
    search.addEventListener("input", () => {
      renderCustomers(search.value, 1);
    });
  }

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      const modalId = button.dataset.closeModal;

      closeModal(modalId);
    });
  });

  document.querySelectorAll(".modal-overlay").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal(modal.id);
      }
    });
  });
}

/* =========================================
  FORMAT
========================================= */

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

/* =========================================
  STATUS
========================================= */

function getStatusClass(status) {
  switch (status) {
    case "Menunggu":
      return "waiting";

    case "Dikerjakan":
      return "working";

    case "Quality Check":
      return "qc";

    case "Selesai":
      return "done";

    default:
      return "";
  }
}

/* =========================================
  HELPER
========================================= */

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================
  MODAL
========================================= */

function openModal(id) {
  const modal = document.getElementById(id);

  if (modal) {
    modal.classList.add("show");
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);

  if (modal) {
    modal.classList.remove("show");
  }
}

/* =========================================
  DASHBOARD
========================================= */

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

  const pendapatan = kendaraan
    .filter((item) => item.status === "Selesai")
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

/* =========================================
  TABEL KENDARAAN
========================================= */

function renderKendaraan(search = "", page = 1) {
  const table = document.getElementById("kendaraanTable");

  if (!table) {
    return;
  }

  const kendaraan = getKendaraan();

  const keyword = String(search).toLowerCase().trim();

  const hasil = kendaraan.filter((item) => {
    return [
      item.polisi,
      item.jenis,
      item.merk,
      item.pelanggan,
      item.keluhan,
      item.status,
    ].some((value) => {
      return String(value || "")
        .toLowerCase()
        .includes(keyword);
    });
  });

  const isDashboard = !document.getElementById("btnTambahKendaraan");

  const perPage = isDashboard ? 5 : 10;

  const totalPages = Math.max(1, Math.ceil(hasil.length / perPage));

  if (page < 1) {
    page = 1;
  }

  if (page > totalPages) {
    page = totalPages;
  }

  const startIndex = (page - 1) * perPage;

  const endIndex = startIndex + perPage;

  const dataHalaman = hasil.slice(startIndex, endIndex);

  table.innerHTML = "";

  if (hasil.length === 0) {
    const colspan = isDashboard ? 7 : 8;

    table.innerHTML = `
      <tr>
        <td
          colspan="${colspan}"
          style="
            text-align:center;
            padding:30px;
          "
        >
          Tidak ada data kendaraan
        </td>
      </tr>
    `;

    setText("kendaraanInfo", "Menampilkan 0 kendaraan");

    renderKendaraanPagination(1, 1, search);

    return;
  }

  dataHalaman.forEach((item, index) => {
    const statusClass = getStatusClass(item.status);

    const nomor = startIndex + index + 1;

    if (isDashboard) {
      table.innerHTML += `
          <tr>

            <td>
              ${nomor}
            </td>

            <td>
              <strong>
                ${escapeHTML(item.polisi)}
              </strong>
            </td>

            <td>
              ${escapeHTML(item.jenis)}
            </td>

            <td>
              ${escapeHTML(item.merk)}
            </td>

            <td>
              ${escapeHTML(item.pelanggan)}
            </td>

            <td>
              ${escapeHTML(item.keluhan)}
            </td>

            <td>
              <span
                class="badge ${statusClass}"
              >
                ${escapeHTML(item.status)}
              </span>
            </td>

          </tr>
        `;
    } else {
      table.innerHTML += `
          <tr>

            <td>
              ${nomor}
            </td>

            <td>
              <strong>
                ${escapeHTML(item.polisi)}
              </strong>
            </td>

            <td>
              ${escapeHTML(item.jenis)}
            </td>

            <td>
              ${escapeHTML(item.merk)}
            </td>

            <td>
              ${escapeHTML(item.pelanggan)}
            </td>

            <td>
              ${escapeHTML(item.keluhan)}
            </td>

            <td>
              <span
                class="badge ${statusClass}"
              >
                ${escapeHTML(item.status)}
              </span>
            </td>

            <td>

              <div
                class="action-buttons"
              >

                <button
                  type="button"
                  class="action-btn"
                  onclick="
                    showKendaraanDetail(
                      ${item.id}
                    )
                  "
                >
                  Detail
                </button>

                <button
                  type="button"
                  class="action-btn"
                  onclick="
                    editKendaraan(
                      ${item.id}
                    )
                  "
                >
                  Edit
                </button>

                <button
                  type="button"
                  class="action-btn danger"
                  onclick="
                    deleteKendaraan(
                      ${item.id}
                    )
                  "
                >
                  Hapus
                </button>

              </div>

            </td>

          </tr>
        `;
    }
  });

  setText(
    "kendaraanInfo",
    `Menampilkan ${startIndex + 1}-${Math.min(
      endIndex,
      hasil.length,
    )} dari ${hasil.length} kendaraan`,
  );

  renderKendaraanPagination(page, totalPages, search);
}

/* =========================================
  PAGINATION KENDARAAN
========================================= */

function renderKendaraanPagination(currentPage, totalPages, search = "") {
  const pagination = document.getElementById("kendaraanPagination");

  if (!pagination) {
    return;
  }

  pagination.innerHTML = "";

  if (totalPages <= 1) {
    return;
  }

  const prevButton = document.createElement("button");

  prevButton.type = "button";

  prevButton.className = "page-btn";

  prevButton.textContent = "‹";

  prevButton.disabled = currentPage === 1;

  prevButton.addEventListener("click", function () {
    renderKendaraan(search, currentPage - 1);
  });

  pagination.appendChild(prevButton);

  for (let page = 1; page <= totalPages; page++) {
    const pageButton = document.createElement("button");

    pageButton.type = "button";

    pageButton.className = "page-btn";

    pageButton.textContent = page;

    if (page === currentPage) {
      pageButton.classList.add("active");
    }

    pageButton.addEventListener("click", function () {
      renderKendaraan(search, page);
    });

    pagination.appendChild(pageButton);
  }

  const nextButton = document.createElement("button");

  nextButton.type = "button";

  nextButton.className = "page-btn";

  nextButton.textContent = "›";

  nextButton.disabled = currentPage === totalPages;

  nextButton.addEventListener("click", function () {
    renderKendaraan(search, currentPage + 1);
  });

  pagination.appendChild(nextButton);
}

/* =========================================
  TABEL MEKANIK
========================================= */

function renderMekanik() {
  const table = document.getElementById("mekanikTable");

  if (!table) {
    return;
  }

  const mekanik = getMekanik();

  table.innerHTML = "";

  if (mekanik.length === 0) {
    table.innerHTML = `
      <tr>
        <td
          colspan="4"
          style="
            text-align:center;
            padding:30px;
          "
        >
          Tidak ada data mekanik
        </td>
      </tr>
    `;

    return;
  }

  mekanik.slice(0, 5).forEach((item, index) => {
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
            ${escapeHTML(item.status)}
          </td>

        </tr>
      `;
  });
}

/* =========================================
  HALAMAN MEKANIK
========================================= */

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
  const mekanik = getMekanik().filter((item) =>
    [item.nama, item.spesialisasi, item.status].some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(keyword),
    ),
  );

  table.innerHTML = "";
  if (!mekanik.length) {
    table.innerHTML =
      '<tr><td colspan="5" style="text-align: center; padding: 30px;">Tidak ada data mekanik.</td></tr>';
    setText("mekanikInfo", "Tidak ada data");
    return;
  }

  mekanik.forEach((item, index) => {
    table.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${escapeHTML(item.nama)}</strong></td>
        <td>${escapeHTML(item.spesialisasi)}</td>
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
      deleteMekanik(button.dataset.deleteMekanik),
    );
  });
  setText("mekanikInfo", `Menampilkan ${mekanik.length} mekanik`);
}

function resetMekanikForm() {
  const form = document.getElementById("mekanikForm");
  if (!form) return;
  form.reset();
  document.getElementById("mekanikId").value = "";
  setText("mekanikModalTitle", "Tambah Mekanik");
}

function editMekanik(id) {
  const mekanik = getMekanik().find((item) => Number(item.id) === Number(id));
  if (!mekanik) return;
  document.getElementById("mekanikId").value = mekanik.id;
  document.getElementById("mekanikNama").value = mekanik.nama;
  document.getElementById("mekanikSpesialisasi").value = mekanik.spesialisasi;
  document.getElementById("mekanikStatus").value = mekanik.status;
  setText("mekanikModalTitle", "Edit Mekanik");
  openModal("mekanikModal");
}

function saveMekanikForm(event) {
  event.preventDefault();
  const id = document.getElementById("mekanikId").value;
  const nama = document.getElementById("mekanikNama").value.trim();
  const spesialisasi = document
    .getElementById("mekanikSpesialisasi")
    .value.trim();
  const status = document.getElementById("mekanikStatus").value;
  const mekanik = getMekanik();
  if (id) {
    const index = mekanik.findIndex((item) => Number(item.id) === Number(id));
    if (index !== -1)
      mekanik[index] = { ...mekanik[index], nama, spesialisasi, status };
  } else {
    const nextId = mekanik.length
      ? Math.max(...mekanik.map((item) => Number(item.id) || 0)) + 1
      : 1;
    mekanik.push({ id: nextId, nama, spesialisasi, status });
  }

  saveMekanik(mekanik);
  closeModal("mekanikModal");
  resetMekanikForm();
  renderMekanikPage(document.getElementById("searchMekanik").value);
  updateMekanikStats();
  renderMekanik();
}

function deleteMekanik(id) {
  const mekanik = getMekanik();
  const item = mekanik.find((entry) => Number(entry.id) === Number(id));
  const serviceCount = getKendaraan().filter(
    (vehicle) => Number(vehicle.mekanikId) === Number(id),
  ).length;

  if (!item) return;
  if (serviceCount) {
    alert(
      `Mekanik ${item.nama} masih ditugaskan pada ${serviceCount} service.`,
    );
    return;
  }
  if (!confirm(`Hapus mekanik ${item.nama}?`)) return;

  saveMekanik(mekanik.filter((entry) => Number(entry.id) !== Number(id)));
  renderMekanikPage(document.getElementById("searchMekanik").value);
  updateMekanikStats();
  renderMekanik();
}

function initMekanikPage() {
  const table = document.getElementById("mekanikPageTable");
  if (!table) return;

  renderMekanikPage();
  updateMekanikStats();
  document.getElementById("btnTambahMekanik").addEventListener("click", () => {
    resetMekanikForm();
    openModal("mekanikModal");
  });
  document
    .getElementById("mekanikForm")
    .addEventListener("submit", saveMekanikForm);
  document
    .getElementById("searchMekanik")
    .addEventListener("input", (event) =>
      renderMekanikPage(event.target.value),
    );
  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () =>
      closeModal(button.dataset.closeModal),
    );
  });
  document.querySelectorAll(".modal-overlay").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal(modal.id);
    });
  });
}

/* =========================================
   HALAMAN SERVICE
   Data service menggunakan record kendaraan yang sudah ada.
========================================= */

function getMekanikNama(mekanikId) {
  const mekanik = getMekanik().find(
    (item) => Number(item.id) === Number(mekanikId),
  );
  return mekanik ? mekanik.nama : "Belum ditugaskan";
}

function renderServicePage(search = "") {
  const table = document.getElementById("serviceTable");
  if (!table) return;

  const keyword = String(search).toLowerCase().trim();
  const services = getKendaraan().filter((item) =>
    [
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
  );

  table.innerHTML = "";
  if (!services.length) {
    table.innerHTML =
      '<tr><td colspan="9" style="text-align: center; padding: 30px;">Tidak ada data service.</td></tr>';
    setText("serviceInfo", "Tidak ada data");
    return;
  }

  services.forEach((item, index) => {
    const statusClass = getStatusClass(item.status);
    table.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${escapeHTML(item.polisi)}</strong></td>
        <td>${escapeHTML(item.pelanggan)}</td>
        <td>${escapeHTML(item.keluhan)}</td>
        <td>${escapeHTML(getMekanikNama(item.mekanikId))}</td>
        <td><span class="badge ${statusClass}">${escapeHTML(item.status)}</span></td>
        <td>${formatRupiah(getServiceTotal(item))}</td>
        <td>${escapeHTML(item.tanggalService || "-")}</td>
        <td><button type="button" class="action-btn" data-edit-service="${item.id}">Proses</button></td>
      </tr>`;
  });

  table.querySelectorAll("[data-edit-service]").forEach((button) => {
    button.addEventListener("click", () =>
      editService(button.dataset.editService),
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
  populateServiceForm();
  document.getElementById("serviceBiayaJasa").value = "";
  document.getElementById("serviceSparepartList").innerHTML = "";
  updateServiceTotalPreview();
  document.getElementById("serviceVehicle").disabled = false;
  document.getElementById("serviceModalTitle").textContent = "Proses Service";
}

function editService(id) {
  const service = getKendaraan().find((item) => Number(item.id) === Number(id));
  if (!service) return;
  resetServiceForm();
  document.getElementById("serviceVehicle").value = service.id;
  document.getElementById("serviceVehicle").disabled = true;
  document.getElementById("serviceMekanik").value = service.mekanikId || "";
  document.getElementById("serviceStatus").value = service.status;
  document.getElementById("serviceTanggal").value =
    service.tanggalService || "";
  document.getElementById("serviceBiayaJasa").value =
    Number(service.biayaJasa) || "";
  (service.spareparts || []).forEach((item) =>
    addServiceSparepartRow(item.sparepartId, item.jumlah),
  );
  document.getElementById("serviceModalTitle").textContent =
    `Proses ${service.polisi}`;
  openModal("serviceModal");
}

function saveServiceForm(event) {
  event.preventDefault();
  const vehicleId = document.getElementById("serviceVehicle").value;
  const mekanikId = document.getElementById("serviceMekanik").value;
  const status = document.getElementById("serviceStatus").value;
  const tanggalService = document.getElementById("serviceTanggal").value;
  const mekanik = getMekanik().find(
    (item) => Number(item.id) === Number(mekanikId),
  );
  const kendaraan = getKendaraan();
  const index = kendaraan.findIndex(
    (item) => Number(item.id) === Number(vehicleId),
  );

  if (index === -1 || !mekanik) {
    alert("Pilih kendaraan dan mekanik aktif.");
    return;
  }

  let spareparts;
  try {
    spareparts = getServiceSparepartsFromForm();
  } catch (error) {
    alert(error.message);
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
      alert(`Stok ${item.nama} tidak mencukupi.`);
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
    tanggalService,
    biayaJasa: Number(document.getElementById("serviceBiayaJasa").value) || 0,
    spareparts,
  };
  saveKendaraan(kendaraan);
  saveSparepart(stokTersedia);
  closeModal("serviceModal");
  renderServicePage(document.getElementById("searchService").value);
  updateServiceStats();
  updateDashboard();
}

function initServicePage() {
  const table = document.getElementById("serviceTable");
  if (!table) return;

  renderServicePage();
  updateServiceStats();
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
    .getElementById("serviceBiayaJasa")
    .addEventListener("input", updateServiceTotalPreview);
  document
    .getElementById("searchService")
    .addEventListener("input", (event) =>
      renderServicePage(event.target.value),
    );
  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () =>
      closeModal(button.dataset.closeModal),
    );
  });
  document.querySelectorAll(".modal-overlay").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal(modal.id);
    });
  });
}

/* =========================================
   RIWAYAT
   Riwayat diturunkan dari service kendaraan berstatus selesai.
========================================= */

function renderRiwayatPage(search = "") {
  const table = document.getElementById("riwayatTable");
  if (!table) return;

  const keyword = String(search).toLowerCase().trim();
  const riwayat = getKendaraan().filter((item) => {
    return (
      item.status === "Selesai" &&
      [
        item.polisi,
        item.pelanggan,
        item.keluhan,
        getMekanikNama(item.mekanikId),
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(keyword),
      )
    );
  });

  table.innerHTML = "";
  if (!riwayat.length) {
    table.innerHTML =
      '<tr><td colspan="7" style="text-align: center; padding: 30px;">Belum ada service yang selesai.</td></tr>';
    setText("riwayatInfo", "Tidak ada riwayat");
    return;
  }

  riwayat.forEach((item, index) => {
    table.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHTML(item.tanggalService || "-")}</td>
        <td><strong>${escapeHTML(item.polisi)}</strong></td>
        <td>${escapeHTML(item.pelanggan)}</td>
        <td>${escapeHTML(item.keluhan)}</td>
        <td>${escapeHTML(getMekanikNama(item.mekanikId))}</td>
        <td>${formatRupiah(getServiceTotal(item))}</td>
      </tr>`;
  });
  setText("riwayatInfo", `Menampilkan ${riwayat.length} riwayat service`);
}

function updateRiwayatStats() {
  const riwayat = getKendaraan().filter((item) => item.status === "Selesai");
  const pendapatan = riwayat.reduce(
    (total, item) => total + getServiceTotal(item),
    0,
  );
  const pelanggan = new Set(
    riwayat.map((item) => item.pelangganId).filter(Boolean),
  );
  setText("totalRiwayat", riwayat.length);
  setText("pendapatanSelesai", formatRupiah(pendapatan));
  setText("pelangganSelesai", pelanggan.size);
}

function initRiwayatPage() {
  const table = document.getElementById("riwayatTable");
  if (!table) return;
  renderRiwayatPage();
  updateRiwayatStats();
  document
    .getElementById("searchRiwayat")
    .addEventListener("input", (event) =>
      renderRiwayatPage(event.target.value),
    );
}

/* =========================================
   RESET FORM KENDARAAN
========================================= */

function resetKendaraanForm() {
  const form = document.getElementById("vehicleForm");

  if (!form) {
    return;
  }

  form.reset();

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

function nextNumericId(items) {
  return items.length
    ? Math.max(...items.map((item) => Number(item.id) || 0)) + 1
    : 1;
}

function populateVehicleFormRelations() {
  const customerSelect = document.getElementById("vehicleCustomerId");
  const mekanikSelect = document.getElementById("vehicleMekanikId");
  const sparepartSelect = document.getElementById("vehicleSparepartId");
  if (!customerSelect || !mekanikSelect || !sparepartSelect) return;

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
  sparepartSelect.innerHTML =
    '<option value="">Tambah sparepart baru</option>' +
    getSparepart()
      .map(
        (item) =>
          `<option value="${item.id}">#${item.id} — ${escapeHTML(item.nama)} (${item.stok})</option>`,
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
  sparepartSelect.onchange = () => {
    const sparepart = getSparepart().find(
      (item) => Number(item.id) === Number(sparepartSelect.value),
    );
    if (!sparepart) return;
    document.getElementById("vehicleSparepartNama").value = sparepart.nama;
    document.getElementById("vehicleSparepartHarga").value = sparepart.harga;
  };
}

/* =========================================
   EDIT KENDARAAN
========================================= */

function editKendaraan(id) {
  const kendaraan = getKendaraan();

  const item = kendaraan.find(
    (kendaraan) => Number(kendaraan.id) === Number(id),
  );

  if (!item) {
    return;
  }

  populateVehicleFormRelations();

  const vehicleId = document.getElementById("vehicleId");

  const polisi = document.getElementById("vehiclePolisi");

  const pelanggan = document.getElementById("vehiclePelanggan");

  const jenis = document.getElementById("vehicleJenis");

  const merk = document.getElementById("vehicleMerk");

  const keluhan = document.getElementById("vehicleKeluhan");

  const status = document.getElementById("vehicleStatus");

  const estimasi = document.getElementById("vehicleEstimasi");

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
  const usedPart = (item.spareparts || [])[0];
  document.getElementById("vehicleSparepartId").value =
    usedPart?.sparepartId || "";
  document.getElementById("vehicleSparepartNama").value = usedPart?.nama || "";
  document.getElementById("vehicleSparepartHarga").value =
    usedPart?.harga || "";
  document.getElementById("vehicleSparepartJumlah").value =
    usedPart?.jumlah || "";

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

  if (estimasi) {
    estimasi.value = item.estimasi;
  }

  const title = document.getElementById("vehicleModalTitle");

  if (title) {
    title.textContent = "Edit Kendaraan";
  }

  openModal("vehicleModal");
}

/* =========================================
   TAMBAH / SIMPAN / EDIT KENDARAAN
========================================= */

function saveKendaraanForm(event) {
  event.preventDefault();
  const value = (id) => document.getElementById(id).value.trim();
  const id = value("vehicleId");
  const customerId = value("vehicleCustomerId");
  const mekanikId = value("vehicleMekanikId");
  const sparepartId = value("vehicleSparepartId");
  const pelangganNama = value("vehiclePelanggan");
  const polisi = value("vehiclePolisi");
  const merk = value("vehicleMerk");

  if (!polisi || !pelangganNama || !merk) {
    alert("Nomor polisi, nama pelanggan, dan merk wajib diisi.");
    return;
  }

  const customers = getCustomers();
  let customer = customers.find(
    (item) => Number(item.id) === Number(customerId),
  );
  if (!customer) {
    const telepon = value("vehicleCustomerTelepon");
    if (!telepon) {
      alert("Nomor HP wajib diisi saat menambah pelanggan baru.");
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
      alert(
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
  // Saat transaksi diedit, stok lama dikembalikan dulu lalu diganti oleh pilihan terbaru.
  (existingVehicle?.spareparts || []).forEach((used) => {
    const part = sparepartData.find(
      (item) => Number(item.id) === Number(used.sparepartId),
    );
    if (part) part.stok = Number(part.stok) + (Number(used.jumlah) || 0);
  });
  let spareparts = [];
  const jumlah = Number(value("vehicleSparepartJumlah"));
  if (sparepartId || value("vehicleSparepartNama") || jumlah) {
    let sparepart = sparepartData.find(
      (item) => Number(item.id) === Number(sparepartId),
    );
    if (!sparepart) {
      const nama = value("vehicleSparepartNama");
      const stok = Number(value("vehicleSparepartStok"));
      const harga = Number(value("vehicleSparepartHarga"));
      if (
        !nama ||
        !Number.isInteger(stok) ||
        stok < 0 ||
        !Number.isFinite(harga) ||
        harga < 0
      ) {
        alert("Isi nama, stok awal, dan harga untuk sparepart baru.");
        return;
      }
      sparepart = { id: nextNumericId(sparepartData), nama, stok, harga };
      sparepartData.push(sparepart);
    }
    if (
      !Number.isInteger(jumlah) ||
      jumlah < 1 ||
      jumlah > Number(sparepart.stok)
    ) {
      alert("Jumlah sparepart harus tersedia dalam stok.");
      return;
    }
    sparepart.stok = Number(sparepart.stok) - jumlah;
    spareparts = [
      {
        sparepartId: sparepart.id,
        nama: sparepart.nama,
        harga: Number(sparepart.harga),
        jumlah,
      },
    ];
  }

  const kendaraan = getKendaraan();
  const data = {
    polisi,
    pelanggan: customer.nama,
    pelangganId: customer.id,
    jenis: document.getElementById("vehicleJenis").value,
    merk,
    keluhan: value("vehicleKeluhan"),
    status: document.getElementById("vehicleStatus").value,
    estimasi: Number(value("vehicleEstimasi")) || 0,
    mekanikId: mekanik.id,
    mekanik: mekanik.nama,
    biayaJasa: Number(value("vehicleBiayaJasa")) || 0,
    spareparts,
    tanggalService: new Date().toISOString().slice(0, 10),
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

  updateDashboard();

  renderKendaraan(document.getElementById("searchKendaraan")?.value || "", 1);

  renderCustomers();

  updateCustomerStats();
}

/* =========================================
   HAPUS KENDARAAN
========================================= */

function deleteKendaraan(id) {
  const kendaraan = getKendaraan();

  const item = kendaraan.find(
    (kendaraan) => Number(kendaraan.id) === Number(id),
  );

  if (!item) {
    return;
  }

  const yakin = confirm(`Hapus kendaraan ${item.polisi}?`);

  if (!yakin) {
    return;
  }

  // Mengembalikan stok yang sebelumnya dipakai service agar stok selalu konsisten.
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

  updateDashboard();

  renderKendaraan(document.getElementById("searchKendaraan")?.value || "", 1);

  renderCustomers();

  updateCustomerStats();
}

/* =========================================
   DETAIL KENDARAAN
========================================= */

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
        Estimasi Biaya
      </span>

      <span class="detail-value">
        ${formatRupiah(item.estimasi)}
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

/* =========================================
   INIT KENDARAAN
========================================= */

function initKendaraanPage() {
  const table = document.getElementById("kendaraanTable");

  if (!table) {
    return;
  }

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

  if (search) {
    search.addEventListener("input", function () {
      renderKendaraan(this.value, 1);
    });
  }

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

/* =========================================
   START
========================================= */

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
  const sparepart = getSparepart().filter((item) =>
    String(item.nama || "")
      .toLowerCase()
      .includes(keyword),
  );
  table.innerHTML = sparepart.length
    ? sparepart
        .map(
          (item, index) => `
    <tr><td>${index + 1}</td><td><strong>${escapeHTML(item.nama)}</strong></td><td>${item.stok}</td><td>${formatRupiah(item.harga)}</td>
    <td><div class="action-buttons"><button class="action-btn" type="button" data-edit-sparepart="${item.id}">Edit</button><button class="action-btn danger" type="button" data-delete-sparepart="${item.id}">Hapus</button></div></td></tr>`,
        )
        .join("")
    : '<tr><td colspan="5" style="text-align:center; padding:30px;">Tidak ada data sparepart.</td></tr>';
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
        deleteSparepart(button.dataset.deleteSparepart),
      ),
    );
}

function resetSparepartForm() {
  document.getElementById("sparepartForm")?.reset();
  document.getElementById("sparepartId").value = "";
  setText("sparepartModalTitle", "Tambah Sparepart");
}

function editSparepart(id) {
  const item = getSparepart().find((part) => Number(part.id) === Number(id));
  if (!item) return;
  document.getElementById("sparepartId").value = item.id;
  document.getElementById("sparepartNama").value = item.nama;
  document.getElementById("sparepartStok").value = item.stok;
  document.getElementById("sparepartHarga").value = item.harga;
  setText("sparepartModalTitle", "Edit Sparepart");
  openModal("sparepartModal");
}

function saveSparepartForm(event) {
  event.preventDefault();
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
    alert("Nama, stok, dan harga sparepart harus valid.");
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
    sparepart.push({ id: nextId, nama, stok, harga });
  }
  saveSparepart(sparepart);
  closeModal("sparepartModal");
  resetSparepartForm();
  renderSparepartPage(document.getElementById("searchSparepart").value);
  updateSparepartStats();
}

function deleteSparepart(id) {
  const item = getSparepart().find((part) => Number(part.id) === Number(id));
  if (!item) return;
  const dipakai = getKendaraan().some((vehicle) =>
    (vehicle.spareparts || []).some(
      (part) => Number(part.sparepartId) === Number(id),
    ),
  );
  if (dipakai) {
    alert("Sparepart tidak dapat dihapus karena sudah dipakai pada service.");
    return;
  }
  if (!confirm(`Hapus sparepart ${item.nama}?`)) return;
  saveSparepart(
    getSparepart().filter((part) => Number(part.id) !== Number(id)),
  );
  renderSparepartPage(document.getElementById("searchSparepart").value);
  updateSparepartStats();
}

function initSparepartPage() {
  if (!document.getElementById("sparepartPageTable")) return;
  renderSparepartPage();
  updateSparepartStats();
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
    .addEventListener("input", (event) =>
      renderSparepartPage(event.target.value),
    );
}

function initPengaturanPage() {
  const resetButton = document.getElementById("btnResetData");
  if (!resetButton) return;

  // Info bengkel tersimpan terpisah, tidak mengganggu data transaksi.
  const infoButton = document.getElementById("btnInfoBengkel");
  if (infoButton) {
    infoButton.addEventListener("click", () => {
      const current = JSON.parse(localStorage.getItem("workshop_info") || "{}");
      const nama = prompt("Nama bengkel:", current.nama || "Workshop Pro");
      if (nama === null) return;
      const alamat = prompt("Alamat bengkel:", current.alamat || "");
      if (alamat === null) return;
      const kontak = prompt("Kontak bengkel:", current.kontak || "");
      if (kontak === null) return;
      localStorage.setItem(
        "workshop_info",
        JSON.stringify({ nama, alamat, kontak }),
      );
      alert("Informasi bengkel disimpan.");
    });
  }

  const backupButton = document.getElementById("btnBackupData");
  if (backupButton) {
    backupButton.addEventListener("click", () => {
      const backup = {
        exportedAt: new Date().toISOString(),
        info: JSON.parse(localStorage.getItem("workshop_info") || "{}"),
        customers: getCustomers(),
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
          if (Array.isArray(data.kendaraan)) saveKendaraan(data.kendaraan);
          if (Array.isArray(data.mekanik)) saveMekanik(data.mekanik);
          if (Array.isArray(data.sparepart)) saveSparepart(data.sparepart);
          if (data.info)
            localStorage.setItem("workshop_info", JSON.stringify(data.info));
          alert("Restore data berhasil.");
          window.location.href = "dashboard.html";
        } catch (error) {
          alert("File backup tidak valid.");
        }
      };
      reader.readAsText(file);
      restoreFile.value = "";
    });
  }

  resetButton.addEventListener("click", () => {
    if (
      !confirm(
        "Reset seluruh data harian? Data customer, kendaraan, service, mekanik, dan sparepart akan dikosongkan.",
      )
    )
      return;
    [
      "workshop_customers",
      "workshop_kendaraan",
      "workshop_mekanik",
      "workshop_sparepart",
    ].forEach((key) => localStorage.setItem(key, "[]"));
    alert("Data harian berhasil dikosongkan.");
    window.location.href = "dashboard.html";
  });
}

/* =========================================
  Input Data DASHBOARD
========================================= */

function populateUnifiedRelations() {
  const customerSelect = document.getElementById("unifiedCustomerId");
  const mekanikSelect = document.getElementById("unifiedMekanikId");
  const sparepartSelect = document.getElementById("unifiedSparepartId");
  if (!customerSelect || !mekanikSelect || !sparepartSelect) return;

  customerSelect.innerHTML =
    '<option value="">-- Buat customer baru --</option>' +
    getCustomers()
      .map(
        (item) =>
          `<option value="${item.id}">#${item.id} — ${escapeHTML(item.nama)}</option>`,
      )
      .join("");
  mekanikSelect.innerHTML =
    '<option value="">-- Buat mekanik baru --</option>' +
    getMekanik()
      .map(
        (item) =>
          `<option value="${item.id}">#${item.id} — ${escapeHTML(item.nama)}</option>`,
      )
      .join("");
  sparepartSelect.innerHTML =
    '<option value="">-- Buat sparepart baru --</option>' +
    getSparepart()
      .map(
        (item) =>
          `<option value="${item.id}">#${item.id} — ${escapeHTML(item.nama)} (stok: ${item.stok})</option>`,
      )
      .join("");

  customerSelect.onchange = () => {
    const customer = getCustomers().find(
      (item) => Number(item.id) === Number(customerSelect.value),
    );
    if (!customer) return;
    document.getElementById("unifiedCustomerNama").value = customer.nama || "";
    document.getElementById("unifiedCustomerTelepon").value =
      customer.telepon || "";
    document.getElementById("unifiedCustomerEmail").value =
      customer.email || "";
    document.getElementById("unifiedCustomerAlamat").value =
      customer.alamat || "";
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
  sparepartSelect.onchange = () => {
    const sparepart = getSparepart().find(
      (item) => Number(item.id) === Number(sparepartSelect.value),
    );
    if (!sparepart) return;
    document.getElementById("unifiedSparepartNama").value =
      sparepart.nama || "";
    document.getElementById("unifiedSparepartHarga").value =
      sparepart.harga ?? "";
    updateUnifiedTotalPreview();
  };
}

function updateUnifiedTotalPreview() {
  const biayaJasa =
    Number(document.getElementById("unifiedBiayaJasa")?.value) || 0;
  const jumlah =
    Number(document.getElementById("unifiedSparepartJumlah")?.value) || 0;
  const sparepartId = document.getElementById("unifiedSparepartId")?.value;
  let harga =
    Number(document.getElementById("unifiedSparepartHarga")?.value) || 0;
  if (sparepartId) {
    const part = getSparepart().find(
      (item) => Number(item.id) === Number(sparepartId),
    );
    if (part && !document.getElementById("unifiedSparepartNama").value.trim()) {
      harga = Number(part.harga) || 0;
    }
  }
  setText("unifiedTotalPreview", formatRupiah(biayaJasa + harga * jumlah));
}

function resetUnifiedForm() {
  document.getElementById("unifiedForm")?.reset();
  populateUnifiedRelations();
  const tanggal = document.getElementById("unifiedTanggal");
  if (tanggal && !tanggal.value)
    tanggal.value = new Date().toISOString().slice(0, 10);
  updateUnifiedTotalPreview();
}

function saveUnifiedForm(event) {
  event.preventDefault();
  const value = (id) => document.getElementById(id).value.trim();

  const polisi = value("unifiedPolisi");
  const merk = value("unifiedMerk");
  const keluhan = value("unifiedKeluhan");
  const namaCustomer = value("unifiedCustomerNama");
  if (!polisi || !merk || !keluhan || !namaCustomer) {
    alert("No. polisi, merk, keluhan, dan nama customer wajib diisi.");
    return;
  }

  // 1. Customer: pakai ID bila dipilih, kalau tidak buat baru (nama boleh kembar).
  const customers = getCustomers();
  let customer = customers.find(
    (item) => Number(item.id) === Number(value("unifiedCustomerId")),
  );
  if (!customer) {
    const telepon = value("unifiedCustomerTelepon");
    if (!telepon) {
      alert("No. HP wajib diisi untuk customer baru.");
      return;
    }
    customer = {
      id: nextNumericId(customers),
      nama: namaCustomer,
      telepon,
      email: value("unifiedCustomerEmail"),
      alamat: value("unifiedCustomerAlamat"),
      catatan: "",
      registeredAt: new Date().toISOString(),
    };
    customers.push(customer);
  }

  // 2. Mekanik: pakai ID bila dipilih, kalau tidak buat baru.
  const mekanikData = getMekanik();
  let mekanik = mekanikData.find(
    (item) => Number(item.id) === Number(value("unifiedMekanikId")),
  );
  if (!mekanik) {
    const namaMekanik = value("unifiedMekanikNama");
    const spesialisasi = value("unifiedMekanikSpesialisasi");
    if (!namaMekanik || !spesialisasi) {
      alert(
        "Pilih mekanik terdaftar atau isi nama + spesialisasi mekanik baru.",
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

  // 3. Sparepart (opsional) + potong stok.
  const sparepartData = getSparepart();
  let spareparts = [];
  const sparepartId = value("unifiedSparepartId");
  const jumlah = Number(value("unifiedSparepartJumlah"));
  if (
    sparepartId ||
    value("unifiedSparepartNama") ||
    value("unifiedSparepartJumlah")
  ) {
    let sparepart = sparepartData.find(
      (item) => Number(item.id) === Number(sparepartId),
    );
    if (!sparepart) {
      const nama = value("unifiedSparepartNama");
      const stok = Number(value("unifiedSparepartStok"));
      const harga = Number(value("unifiedSparepartHarga"));
      if (
        !nama ||
        !Number.isInteger(stok) ||
        stok < 0 ||
        !Number.isFinite(harga) ||
        harga < 0
      ) {
        alert("Isi nama, stok awal, dan harga untuk sparepart baru.");
        return;
      }
      sparepart = { id: nextNumericId(sparepartData), nama, stok, harga };
      sparepartData.push(sparepart);
    }
    if (
      !Number.isInteger(jumlah) ||
      jumlah < 1 ||
      jumlah > Number(sparepart.stok)
    ) {
      alert("Jumlah sparepart harus tersedia dalam stok.");
      return;
    }
    sparepart.stok = Number(sparepart.stok) - jumlah;
    spareparts = [
      {
        sparepartId: sparepart.id,
        nama: sparepart.nama,
        harga: Number(sparepart.harga),
        jumlah,
      },
    ];
  }

  // 4. Kendaraan (= record service juga). Total pendapatan riwayat
  //    otomatis = biayaJasa + sparepart via getServiceTotal().
  const kendaraan = getKendaraan();
  kendaraan.push({
    id: nextNumericId(kendaraan),
    polisi,
    pelanggan: customer.nama,
    pelangganId: customer.id,
    jenis: document.getElementById("unifiedJenis").value,
    merk,
    keluhan,
    status: document.getElementById("unifiedStatus").value,
    estimasi: Number(value("unifiedEstimasi")) || 0,
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
  updateDashboard();
  renderMekanik();
}

function initDashboardInput() {
  const button = document.getElementById("btnInputTerpadu");
  const form = document.getElementById("unifiedForm");
  if (!button || !form) return;
  resetUnifiedForm();
  button.addEventListener("click", () => {
    resetUnifiedForm();
    openModal("unifiedModal");
  });
  form.addEventListener("submit", saveUnifiedForm);
  [
    "unifiedBiayaJasa",
    "unifiedSparepartHarga",
    "unifiedSparepartJumlah",
  ].forEach((id) => {
    document
      .getElementById(id)
      ?.addEventListener("input", updateUnifiedTotalPreview);
  });
  document
    .getElementById("unifiedSparepartId")
    ?.addEventListener("change", updateUnifiedTotalPreview);
  document
    .querySelectorAll('[data-close-modal="unifiedModal"]')
    .forEach((button) => {
      button.addEventListener("click", () => closeModal("unifiedModal"));
    });
}

document.addEventListener("DOMContentLoaded", function () {
  updateDashboard();
  renderMekanik();
  initDashboardInput();
  initKendaraanPage();
  initCustomerPage();
  initMekanikPage();
  initServicePage();
  initRiwayatPage();
  initSparepartPage();
  initPengaturanPage();
});
