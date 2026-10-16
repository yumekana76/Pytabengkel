/* DATA DEFAULT */

const defaultKendaraan = [];

const defaultMekanik = [];

/* LOCAL STORAGE KENDARAAN */

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

  const customersData = localStorage.getItem("workshop_customers");

  if (customersData) {
    try {
      const customers = JSON.parse(customersData);

      if (Array.isArray(customers)) {
        let changed = false;

        kendaraan = kendaraan.map((vehicle) => {
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

/* LOCAL STORAGE MEKANIK */

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

/* SPAREPART DAN BIAYA SERVICE */

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

/* CUSTOMER */

const defaultCustomers = [
    {
        "id": 6,
        "nama": "budi",
        "telepon": "08239389048",
        "email": "budisetiawan@gmail.com",
        "alamat": "karlos",
        "catatan": "apa",
        "registeredAt": "2026-10-11T11:47:31.650Z"
    }];

/* GET CUSTOMER */

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

/* SAVE CUSTOMER */

function saveCustomers(customers) {
  localStorage.setItem("workshop_customers", JSON.stringify(customers));
}

 /* JUMLAH KENDARAAN CUSTOMER */

function getCustomerVehicleCount(customerId) {
  const kendaraan = getKendaraan();

  return kendaraan.filter(
    (vehicle) => Number(vehicle.pelangganId) === Number(customerId),
  ).length;
}

/* STATISTIK CUSTOMER */

/* FORMAT */

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

/* STATUS */

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

/* HELPER */

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

/* MODAL */

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

/* DASHBOARD */

function nextNumericId(items) {
  return items.length
    ? Math.max(...items.map((item) => Number(item.id) || 0)) + 1
    : 1;
}

/* HALAMAN SERVICE */

function getMekanikNama(mekanikId) {
  const mekanik = getMekanik().find(
    (item) => Number(item.id) === Number(mekanikId),
  );
  return mekanik ? mekanik.nama : "Belum ditugaskan";
}

/* URUTAN STATUS & KUNCI DATA SELESAI */
const STATUS_ORDER = {
  Menunggu: 0,
  Dikerjakan: 1,
  "Quality Check": 2,
  Selesai: 3,
};

function compareStatusOrder(a, b) {
  const order =
    (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
  if (order !== 0) return order;
  return Number(b.id) - Number(a.id);
}

function isLocked(item) {
  return !!item && item.status === "Selesai";
}

function showFormError(formId, message) {
  const form = document.getElementById(formId);
  if (!form) return;
  let box = form.querySelector(".form-error");
  if (!box) {
    box = document.createElement("p");
    box.className = "form-error";
    box.setAttribute("role", "alert");
    const body = form.querySelector(".modal-body");
    if (body) body.prepend(box);
    else form.prepend(box);
  }
  if (!message) {
    box.hidden = true;
    box.textContent = "";
    return;
  }
  box.hidden = false;
  box.textContent = message;
}

function clearFormError(formId) {
  showFormError(formId, "");
}

function showPageNotice(message, type = "error") {
  let notice = document.getElementById("pageNotice");
  if (!notice) {
    notice = document.createElement("div");
    notice.id = "pageNotice";
    notice.setAttribute("role", "status");
    const main = document.querySelector(".main");
    const header = main ? main.querySelector(".page-header") : null;
    if (main && header && header.nextSibling) {
      main.insertBefore(notice, header.nextSibling);
    } else if (main) {
      main.prepend(notice);
    } else {
      document.body.prepend(notice);
    }
  }
  if (typeof showPageNotice._timer !== "undefined") {
    window.clearTimeout(showPageNotice._timer);
    showPageNotice._timer = undefined;
  }
  if (!message) {
    notice.hidden = true;
    notice.textContent = "";
    notice.className = "page-notice";
    return;
  }
  notice.hidden = false;
  notice.className =
    "page-notice " + (type === "success" ? "success" : "error");
  notice.textContent = message;
  const delay = type === "success" ? 2000 : 3500;
  showPageNotice._timer = window.setTimeout(() => {
    if (notice.textContent === message) {
      notice.hidden = true;
      notice.textContent = "";
      notice.className = "page-notice";
    }
    showPageNotice._timer = undefined;
  }, delay);
}

function clearPageNotice() {
  showPageNotice("", "error");
}

function armConfirmButton(button, label = "Klik lagi untuk yakin") {
  if (!(button instanceof HTMLElement)) return true;
  if (button.dataset.armed !== "true") {
    if (!button.dataset.originalLabel) {
      button.dataset.originalLabel = button.textContent;
    }
    button.dataset.armed = "true";
    button.textContent = label;
    button.classList.add("armed");
    window.clearTimeout(button._disarmTimer);
    button._disarmTimer = window.setTimeout(() => {
      button.dataset.armed = "false";
      button.textContent =
        button.dataset.originalLabel || button.textContent;
      button.classList.remove("armed");
    }, 3000);
    return false;
  }
  window.clearTimeout(button._disarmTimer);
  button.dataset.armed = "false";
  if (button.dataset.originalLabel) {
    button.textContent = button.dataset.originalLabel;
  }
  button.classList.remove("armed");
  return true;
}

function confirmUnlock(item, aksi = "mengubah", button = null) {
  if (!isLocked(item)) return true;
  const label = item.polisi || item.nama || "";
  const msg =
    `Data ${label} berstatus Selesai dan terkunci agar tidak berubah sembarangan. ` +
    `Perubahan tetap dicatat sebagai tulisan, bukan popup. ` +
    (button
      ? `Klik tombol yang sama sekali lagi untuk tetap lanjutkan ${aksi}.`
      : `Tetap melanjutkan ${aksi} data.`);
  if (button instanceof HTMLElement) {
    if (!armConfirmButton(button, "Klik lagi — tetap lanjutkan 🔒")) {
      showPageNotice(msg, "error");
      return false;
    }
    clearPageNotice();
    return true;
  }
  showPageNotice(msg, "error");
  return true;
}

/* TABEL KENDARAAN */

function renderKendaraan(search = "", page = 1) {
  const table = document.getElementById("kendaraanTable");

  if (!table) {
    return;
  }

  const kendaraan = getKendaraan();

  const keyword = String(search).toLowerCase().trim();

  const statusFilter =
    document.getElementById("filterStatus")?.value ||
    document.getElementById("filterStatusDashboard")?.value ||
    "";

  const hasil = kendaraan
    .filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false;
      return [
        item.polisi,
        item.jenis,
        item.merk,
        item.pelanggan,
        item.keluhan,
        item.status,
        item.tanggalService,
        getMekanikNama(item.mekanikId),
      ].some((value) => {
        return String(value || "")
          .toLowerCase()
          .includes(keyword);
      });
    })
    .sort(compareStatusOrder);

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
    const colspan = isDashboard ? 12 : 11;

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
              ${escapeHTML(getMekanikNama(item.mekanikId))}
            </td>

            <td>
              ${formatRupiah(item.biayaJasa || 0)}
            </td>

            <td>
              <strong>
                ${formatRupiah(getServiceTotal(item))}
              </strong>
            </td>

            <td>
              ${escapeHTML(item.tanggalService || "-")}
            </td>

            <td>
              <span
                class="badge ${statusClass}"
              >
                ${escapeHTML(item.status)}${item.status === "Selesai" ? " 🔒" : ""}
              </span>
            </td>

            <td>
              <button
                type="button"
                class="action-btn"
                onclick="openDashboardEdit(${item.id}, this)"
                title="Ubah status & mekanik"
              >
                Ubah
              </button>
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
              ${formatRupiah(item.biayaJasa || 0)}
            </td>

            <td>
              <strong>
                ${formatRupiah(getServiceTotal(item))}
              </strong>
            </td>

            <td>
              ${escapeHTML(item.tanggalService || "-")}
            </td>

            <td>
              <span
                class="badge ${statusClass}"
              >
                ${escapeHTML(item.status)}${item.status === "Selesai" ? " 🔒" : ""}
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
                      ${item.id}, this
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
                      ${item.id}, this
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

/* TABEL MEKANIK */

function initSidebar() {
  const burger = document.getElementById("burgerBtn");
  const sidebar = document.getElementById("sidebar");

  if (!burger || !sidebar) {
    return;
  }

  function closeSidebar() {
    document.body.classList.remove("sidebar-open");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Buka menu");
  }

  function openSidebar() {
    document.body.classList.add("sidebar-open");
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", "Tutup menu");
  }

  let overlay = document.getElementById("sidebarOverlay");

  if (!overlay) {
    overlay = document.createElement("button");
    overlay.type = "button";
    overlay.id = "sidebarOverlay";
    overlay.className = "sidebar-overlay";
    overlay.setAttribute("aria-label", "Tutup menu navigasi");
    overlay.addEventListener("click", closeSidebar);
    document.body.appendChild(overlay);
  }

  burger.addEventListener("click", () => {
    if (document.body.classList.contains("sidebar-open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  sidebar.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", closeSidebar);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSidebar();
    }
  });

  if (window.matchMedia) {
    window
      .matchMedia("(max-width: 700px)")
      .addEventListener("change", (event) => {
        if (!event.matches) {
          closeSidebar();
        }
      });
  }
}

document.addEventListener("DOMContentLoaded", function () {
  initSidebar();
  document.querySelectorAll("[data-close-modal]").forEach(function (button) {
    if (button.dataset.globalBound) return;
    button.dataset.globalBound = "true";
    button.addEventListener("click", function () {
      closeModal(button.dataset.closeModal);
    });
  });
  document.querySelectorAll(".modal-overlay").forEach(function (modal) {
    if (modal.dataset.globalBound) return;
    modal.dataset.globalBound = "true";
    modal.addEventListener("click", function (event) {
      if (event.target === modal) closeModal(modal.id);
    });
  });

  if (document.getElementById("btnInputTerpadu") && typeof initDashboardInput === "function") {
    updateDashboard();
    if (typeof renderMekanik === "function") renderMekanik();
    initDashboardInput();
  }
  if (typeof initKendaraanPage === "function") initKendaraanPage();
  if (typeof initCustomerPage === "function") initCustomerPage();
  if (typeof initMekanikPage === "function") initMekanikPage();
  if (typeof initServicePage === "function") initServicePage();
  if (typeof initRiwayatPage === "function") initRiwayatPage();
  if (typeof initSparepartPage === "function") initSparepartPage();
  if (typeof initPengaturanPage === "function") initPengaturanPage();
  if (typeof initKeuanganPage === "function") initKeuanganPage();
});
