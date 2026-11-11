/* Halaman Diskon/Promo (Admin) */

function formatNilaiDiskon(item) {
  var nilai = Number(item.nilai) || 0;
  if (item.tipe === "nominal") return "Rp " + nilai.toLocaleString("id-ID");
  return nilai + "%";
}

function formatPeriodeDiskon(item) {
  var mulai = item.mulai || "-";
  var sampai = item.sampai || "-";
  if (!item.mulai && !item.sampai) return "Tanpa batas";
  return mulai + " s/d " + sampai;
}

function statusDiskon(item) {
  if (item.aktif === false) return { label: "Nonaktif", cls: "cancelled" };
  if (typeof isPromoActive === "function" && isPromoActive(item)) {
    return { label: "Berlaku", cls: "done" };
  }
  var now = new Date();
  if (item.mulai) {
    var start = new Date(String(item.mulai));
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(item.mulai))) start.setHours(0, 0, 0, 0);
    if (!isNaN(start) && now < start) return { label: "Belum mulai", cls: "waiting" };
  }
  if (item.sampai) {
    var end = new Date(String(item.sampai));
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(item.sampai))) end.setHours(23, 59, 59, 999);
    if (!isNaN(end) && now > end) return { label: "Berakhir", cls: "cancelled" };
  }
  return { label: "Aktif", cls: "working" };
}

/* Service yang memakai promo ini. Ajuan yang ditolak tidak dihitung
   sebagai klaim yang sah. */
function getDiskonClaimServices(promo) {
  if (!promo) return [];
  var kode = String(promo.kode || "").toUpperCase();
  return (typeof getKendaraan === "function" ? getKendaraan() : []).filter(function (service) {
    if (typeof isAjuanDitolak === "function" && isAjuanDitolak(service)) return false;
    if (service.promoId && Number(service.promoId) === Number(promo.id)) return true;
    return kode && String(service.promoKode || "").toUpperCase() === kode;
  });
}

function getDiskonClaimCustomers(rows) {
  var seen = new Set();
  (rows || []).forEach(function (service) {
    var key = service.pelangganId
      ? "id:" + Number(service.pelangganId)
      : "nama:" + String(service.pelanggan || "").toLowerCase();
    seen.add(key);
  });
  return seen.size;
}

function updateDiskonStats() {
  var promos = typeof getPromos === "function" ? getPromos() : [];
  var aktif = promos.filter(function (p) {
    return typeof isPromoActive === "function" ? isPromoActive(p) : p.aktif !== false;
  }).length;
  var semuaKlaim = [];
  promos.forEach(function (promo) {
    semuaKlaim = semuaKlaim.concat(getDiskonClaimServices(promo));
  });
  setText("totalDiskon", promos.length);
  setText("diskonAktif", aktif);
  setText("diskonNonaktif", promos.length - aktif);
  setText("totalKlaimDiskon", getDiskonClaimCustomers(semuaKlaim));
}

function renderDiskonPage(search) {
  search = search == null ? (document.getElementById("searchDiskon")?.value || "") : search;
  var table = document.getElementById("diskonPageTable");
  if (!table) return;
  var keyword = String(search).toLowerCase().trim();
  var statusFilter = document.getElementById("filterDiskonStatus")?.value || "";
  var sort = typeof getSortValue === "function" ? getSortValue("sortDiskon") : { key: "id", direction: "desc" };
  var rows = (typeof getPromos === "function" ? getPromos() : [])
    .filter(function (item) {
      var st = statusDiskon(item).label;
      if (statusFilter === "berlaku" && st !== "Berlaku") return false;
      if (statusFilter === "nonaktif" && item.aktif !== false && st !== "Berakhir") return false;
      if (statusFilter === "terjadwal" && st !== "Belum mulai") return false;
      return [item.kode, item.nama, item.deskripsi].some(function (v) {
        return String(v || "").toLowerCase().indexOf(keyword) !== -1;
      });
    });
  if (typeof sortRows === "function") rows = sortRows(rows, sort.key || "id", sort.direction || "desc");
  else rows = rows.slice().sort(function (a, b) { return Number(b.id) - Number(a.id); });

  table.innerHTML = rows.length
    ? rows.map(function (item, index) {
        var st = statusDiskon(item);
        var klaim = getDiskonClaimServices(item);
        var jumlahOrang = getDiskonClaimCustomers(klaim);
        return (
          '<tr>' +
          '<td>' + (index + 1) + '</td>' +
          '<td><span class="cell-id">' + escapeHTML(typeof getKode === "function" ? getKode("promos", item) : (item.kode || item.id)) + '</span></td>' +
          '<td><strong>' + escapeHTML(item.nama || "-") + '</strong><div class="table-subtext">' + escapeHTML(item.deskripsi || "") + '</div></td>' +
          '<td>' + escapeHTML(item.kode || "-") + '</td>' +
          '<td>' + escapeHTML(formatNilaiDiskon(item)) + '</td>' +
          '<td>' + escapeHTML(formatPeriodeDiskon(item)) + '</td>' +
          '<td><span class="badge ' + st.cls + '">' + escapeHTML(st.label) + '</span></td>' +
          '<td>' + (klaim.length
            ? '<button class="action-btn diskon-claim-btn" type="button" data-claim-diskon="' + item.id + '">' + jumlahOrang + ' orang <span class="diskon-claim-service">· ' + klaim.length + ' service</span></button>'
            : '<span class="table-subtext">Belum ada</span>') + '</td>' +
          '<td><div class="action-buttons">' +
            '<button class="action-btn" type="button" data-edit-diskon="' + item.id + '">Edit</button>' +
            '<button class="action-btn danger" type="button" data-delete-diskon="' + item.id + '">Hapus</button>' +
          '</div></td>' +
          '</tr>'
        );
      }).join("")
    : '<tr><td colspan="9" style="text-align:center; padding:30px;">Belum ada diskon/promo.</td></tr>';
  setText("diskonInfo", rows.length ? "Menampilkan " + rows.length + " diskon" : "Tidak ada data");

  table.querySelectorAll("[data-edit-diskon]").forEach(function (button) {
    button.addEventListener("click", function () { editDiskon(button.dataset.editDiskon); });
  });
  table.querySelectorAll("[data-delete-diskon]").forEach(function (button) {
    button.addEventListener("click", function () { deleteDiskon(button.dataset.deleteDiskon, button); });
  });
  table.querySelectorAll("[data-claim-diskon]").forEach(function (button) {
    button.addEventListener("click", function () { openDiskonClaim(button.dataset.claimDiskon); });
  });
}

function openDiskonClaim(id) {
  var promo = (getPromos() || []).find(function (item) { return Number(item.id) === Number(id); });
  if (!promo) return;

  var rows = getDiskonClaimServices(promo).slice().sort(function (a, b) {
    return Number(b.id) - Number(a.id);
  });
  var orang = getDiskonClaimCustomers(rows);
  var content = document.getElementById("diskonClaimContent");

  setText("diskonClaimTitle", "Klaim " + (promo.nama || promo.kode || "Diskon"));
  setText("diskonClaimInfo", rows.length
    ? orang + " pelanggan · " + rows.length + " service"
    : "Belum ada pelanggan yang mengklaim promo ini.");

  if (content) {
    content.innerHTML = rows.length
      ? rows.map(function (service) {
          var diskon = typeof getServiceDiscount === "function" ? getServiceDiscount(service) : 0;
          return '<div class="detail-item full">' +
            '<span class="detail-label">' + escapeHTML(service.tanggalService || "-") + ' · ' + escapeHTML(service.polisi || "-") + ' · ' + escapeHTML(service.pelanggan || "-") + '</span>' +
            '<span class="detail-value">' + escapeHTML(service.status || "-") + ' · ' + formatRupiah(typeof getServiceTotal === "function" ? getServiceTotal(service) : 0) + (diskon ? ' · diskon -' + formatRupiah(diskon) : '') + '</span>' +
            '</div>';
        }).join("")
      : '<div class="detail-item full"><span class="detail-label">Belum ada klaim</span><span class="detail-value">Promo ini belum dipakai pada service mana pun.</span></div>';
  }

  openModal("diskonClaimModal");
}

function resetDiskonForm() {
  var form = document.getElementById("diskonForm");
  if (form) form.reset();
  if (typeof clearFormError === "function") clearFormError("diskonForm");
  var idEl = document.getElementById("diskonId");
  if (idEl) idEl.value = "";
  var aktif = document.getElementById("diskonAktifInput");
  if (aktif) aktif.checked = true;
  setText("diskonModalTitle", "Tambah Diskon");
}

function editDiskon(id) {
  var item = (getPromos() || []).find(function (p) { return Number(p.id) === Number(id); });
  if (!item) return;
  if (typeof clearFormError === "function") clearFormError("diskonForm");
  document.getElementById("diskonId").value = item.id;
  document.getElementById("diskonNama").value = item.nama || "";
  document.getElementById("diskonKode").value = item.kode || "";
  document.getElementById("diskonDeskripsi").value = item.deskripsi || "";
  document.getElementById("diskonTipe").value = item.tipe || "persen";
  document.getElementById("diskonNilai").value = item.nilai != null ? item.nilai : "";
  document.getElementById("diskonMulai").value = item.mulai ? String(item.mulai).slice(0, 10) : "";
  document.getElementById("diskonSampai").value = item.sampai ? String(item.sampai).slice(0, 10) : "";
  document.getElementById("diskonAktifInput").checked = item.aktif !== false;
  setText("diskonModalTitle", "Edit Diskon");
  openModal("diskonModal");
}

function saveDiskonForm(event) {
  event.preventDefault();

  if (saveDiskonForm._busy) return;
  saveDiskonForm._busy = true;
  setTimeout(() => { saveDiskonForm._busy = false; }, 0);
  if (typeof clearFormError === "function") clearFormError("diskonForm");
  if (typeof clearPageNotice === "function") clearPageNotice();
  var id = document.getElementById("diskonId").value;
  var nama = document.getElementById("diskonNama").value.trim();
  var kode = document.getElementById("diskonKode").value.trim().toUpperCase();
  var deskripsi = document.getElementById("diskonDeskripsi").value.trim();
  var tipe = document.getElementById("diskonTipe").value === "nominal" ? "nominal" : "persen";
  var nilai = Number(document.getElementById("diskonNilai").value);
  var mulai = document.getElementById("diskonMulai").value || "";
  var sampai = document.getElementById("diskonSampai").value || "";
  var aktif = document.getElementById("diskonAktifInput").checked;

  if (!nama) {
    if (typeof showFormError === "function") showFormError("diskonForm", "Nama diskon wajib diisi.");
    return;
  }
  if (!Number.isFinite(nilai) || nilai < 0) {
    if (typeof showFormError === "function") showFormError("diskonForm", "Nilai diskon harus valid.");
    return;
  }
  if (tipe === "persen" && nilai > 100) {
    if (typeof showFormError === "function") showFormError("diskonForm", "Diskon persen maksimal 100%.");
    return;
  }
  if (mulai && sampai && mulai > sampai) {
    if (typeof showFormError === "function") showFormError("diskonForm", "Tanggal mulai tidak boleh melebihi tanggal sampai.");
    return;
  }

  var promos = (getPromos() || []).slice();
  var dup = promos.find(function (p) {
    return p.kode && kode && p.kode.toUpperCase() === kode && String(p.id) !== String(id);
  });
  if (dup) {
    if (typeof showFormError === "function") showFormError("diskonForm", "Kode promo sudah digunakan.");
    return;
  }

  if (id) {
    var index = promos.findIndex(function (item) { return Number(item.id) === Number(id); });
    if (index !== -1) {
      promos[index] = Object.assign({}, promos[index], { nama: nama, kode: kode || promos[index].kode, deskripsi: deskripsi, tipe: tipe, nilai: nilai, mulai: mulai, sampai: sampai, aktif: aktif });
    }
  } else {
    var nextId = promos.length ? Math.max.apply(null, promos.map(function (item) { return Number(item.id) || 0; })) + 1 : 1;
    if (!kode && typeof nextKode === "function") kode = nextKode("promos", promos).toUpperCase();
    promos.push({ id: nextId, kode: kode || ("PRM-" + String(nextId).padStart(3, "0")), nama: nama, deskripsi: deskripsi, tipe: tipe, nilai: nilai, mulai: mulai, sampai: sampai, aktif: aktif });
  }

  savePromos(promos);
  if (typeof addLog === "function") {
    var saved = id ? promos.find(function (p) { return Number(p.id) === Number(id); }) : promos[promos.length - 1];
    addLog(id ? "Update" : "Tambah", "Diskon", nama + " (" + (saved ? saved.kode : kode) + ")", saved ? (typeof getKode === "function" ? getKode("promos", saved) : saved.kode) : kode);
  }
  closeModal("diskonModal");
  resetDiskonForm();
  renderDiskonPage(document.getElementById("searchDiskon")?.value);
  updateDiskonStats();
  if (typeof showPageNotice === "function") showPageNotice("Data diskon tersimpan.", "success");
}

function deleteDiskon(id, button) {
  var item = (getPromos() || []).find(function (p) { return Number(p.id) === Number(id); });
  if (!item) return;
  if (typeof armConfirmButton === "function" && !armConfirmButton(button, "Klik lagi untuk hapus " + item.nama)) {
    if (typeof showPageNotice === "function") showPageNotice("Klik Hapus sekali lagi untuk menghapus diskon " + item.nama + ".", "error");
    return;
  }
  savePromos((getPromos() || []).filter(function (p) { return Number(p.id) !== Number(id); }));
  if (typeof addLog === "function") addLog("Hapus", "Diskon", item.nama + " (" + item.kode + ")", typeof getKode === "function" ? getKode("promos", item) : item.kode);
  renderDiskonPage(document.getElementById("searchDiskon")?.value);
  updateDiskonStats();
  if (typeof showPageNotice === "function") showPageNotice("Diskon " + item.nama + " dihapus.", "success");
}

function initDiskonPage() {
  if (!document.getElementById("diskonPageTable")) return;
  renderDiskonPage();
  updateDiskonStats();
  document.getElementById("btnTambahDiskon")?.addEventListener("click", function () {
    resetDiskonForm();
    openModal("diskonModal");
  });
  document.getElementById("diskonForm")?.addEventListener("submit", saveDiskonForm);
  document.getElementById("searchDiskon")?.addEventListener("input", function (e) { renderDiskonPage(e.target.value); });
  document.getElementById("filterDiskonStatus")?.addEventListener("change", function () { renderDiskonPage(document.getElementById("searchDiskon")?.value); });
  document.getElementById("sortDiskon")?.addEventListener("change", function () { renderDiskonPage(document.getElementById("searchDiskon")?.value); });
}
