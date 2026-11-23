/* Halaman Blok Konten (Admin) — CRUD blok landing page */

var BLOK_TIPE_LABEL = {
  teks: "Teks",
  gambar: "Gambar",
  cta: "Tombol",
};

function formatTipeBlok(item) {
  return BLOK_TIPE_LABEL[item.tipe] || "Teks";
}

function statusBlok(item) {
  if (item.aktif === false) return { label: "Nonaktif", cls: "cancelled" };
  return { label: "Tampil", cls: "done" };
}

/* Isi ringkas kolom tabel: gambar bila ada, lalu deskripsi dipotong. */
function blokRingkasan(item) {
  var bagian = [];
  if (item.gambarUrl) {
    bagian.push("🖼 " + truncateText(item.gambarUrl, 40));
  }
  if (item.tautanLabel) {
    bagian.push(
      'Tombol "' + item.tautanLabel + '" → ' + truncateText(item.tautan, 30),
    );
  }
  bagian.push(truncateText(item.deskripsi, 70) || "(kosong)");
  return bagian.join(" · ");
}

function updateBlokStats() {
  var blocks = typeof getPageBlocks === "function" ? getPageBlocks() : [];
  var aktif = blocks.filter(function (item) { return item.aktif !== false; }).length;
  setText("totalBlok", blocks.length);
  setText("blokAktif", aktif);
  setText("blokNonaktif", blocks.length - aktif);
}

function renderBlokPage(search) {
  search =
    search == null ? (document.getElementById("searchBlok")?.value || "") : search;
  var table = document.getElementById("blokPageTable");
  if (!table) return;

  var keyword = String(search).toLowerCase().trim();
  var statusFilter = document.getElementById("filterBlokStatus")?.value || "";
  var sort =
    typeof getSortValue === "function"
      ? getSortValue("sortBlok")
      : { key: "urutan", direction: "asc" };

  var rows = (typeof getPageBlocks === "function" ? getPageBlocks() : []).filter(
    function (item) {
      if (statusFilter === "aktif" && item.aktif === false) return false;
      if (statusFilter === "nonaktif" && item.aktif !== false) return false;
      return [item.kode, item.judul, item.deskripsi].some(function (v) {
        return String(v || "").toLowerCase().indexOf(keyword) !== -1;
      });
    },
  );

  if (typeof sortRows === "function") {
    rows = sortRows(rows, sort.key || "urutan", sort.direction || "asc");
  } else {
    rows = rows.slice().sort(function (a, b) {
      return Number(a.urutan || 0) - Number(b.urutan || 0);
    });
  }

  table.innerHTML = rows.length
    ? rows
        .map(function (item, index) {
          var st = statusBlok(item);
          return (
            "<tr>" +
            "<td>" + (index + 1) + "</td>" +
            '<td><span class="cell-id">' +
            escapeHTML(
              typeof getKode === "function"
                ? getKode("page_blocks", item)
                : item.kode || item.id,
            ) +
            "</span></td>" +
            "<td><strong>" + escapeHTML(item.judul || "-") + "</strong></td>" +
            "<td>" + escapeHTML(formatTipeBlok(item)) + "</td>" +
            '<td><span class="table-subtext">' +
            escapeHTML(blokRingkasan(item)) +
            "</span></td>" +
            "<td>" + Number(item.urutan || 0) + "</td>" +
            '<td><span class="badge ' + st.cls + '">' + escapeHTML(st.label) + "</span></td>" +
            '<td><div class="action-buttons">' +
            '<button class="action-btn" type="button" data-edit-blok="' + item.id + '">Edit</button>' +
            '<button class="action-btn danger" type="button" data-delete-blok="' + item.id + '">Hapus</button>' +
            "</div></td>" +
            "</tr>"
          );
        })
        .join("")
    : '<tr><td colspan="8" style="text-align:center; padding:30px;">Belum ada blok konten.</td></tr>';

  setText(
    "blokInfo",
    rows.length ? "Menampilkan " + rows.length + " blok" : "Tidak ada data",
  );

  table.querySelectorAll("[data-edit-blok]").forEach(function (button) {
    button.addEventListener("click", function () {
      editBlok(button.dataset.editBlok);
    });
  });
  table.querySelectorAll("[data-delete-blok]").forEach(function (button) {
    button.addEventListener("click", function () {
      deleteBlok(button.dataset.deleteBlok, button);
    });
  });
}

function resetBlokForm() {
  var form = document.getElementById("blokForm");
  if (form) form.reset();
  if (typeof clearFormError === "function") clearFormError("blokForm");
  var idEl = document.getElementById("blokId");
  if (idEl) idEl.value = "";
  var urutan = document.getElementById("blokUrutan");
  if (urutan) urutan.value = "0";
  var aktif = document.getElementById("blokAktifInput");
  if (aktif) aktif.checked = true;
  setText("blokModalTitle", "Tambah Blok");
}

function editBlok(id) {
  var item = (getPageBlocks() || []).find(function (p) {
    return Number(p.id) === Number(id);
  });
  if (!item) return;

  if (typeof clearFormError === "function") clearFormError("blokForm");
  document.getElementById("blokId").value = item.id;
  document.getElementById("blokJudul").value = item.judul || "";
  document.getElementById("blokTipe").value =
    item.tipe === "gambar" || item.tipe === "cta" ? item.tipe : "teks";
  document.getElementById("blokDeskripsi").value = item.deskripsi || "";
  document.getElementById("blokGambar").value = item.gambarUrl || "";
  document.getElementById("blokTautanLabel").value = item.tautanLabel || "";
  document.getElementById("blokTautan").value = item.tautan || "";
  document.getElementById("blokUrutan").value = Number(item.urutan) || 0;
  document.getElementById("blokAktifInput").checked = item.aktif !== false;
  setText("blokModalTitle", "Edit Blok");
  openModal("blokModal");
}

function saveBlokForm(event) {
  event.preventDefault();

  if (saveBlokForm._busy) return;
  saveBlokForm._busy = true;
  setTimeout(function () { saveBlokForm._busy = false; }, 0);

  if (typeof clearFormError === "function") clearFormError("blokForm");
  if (typeof clearPageNotice === "function") clearPageNotice();

  var id = document.getElementById("blokId").value;
  var judul = document.getElementById("blokJudul").value.trim();
  var tipe =
    document.getElementById("blokTipe").value === "gambar" ||
    document.getElementById("blokTipe").value === "cta"
      ? document.getElementById("blokTipe").value
      : "teks";
  var deskripsi = document.getElementById("blokDeskripsi").value.trim();
  var gambarUrl = document.getElementById("blokGambar").value.trim();
  var tautanLabel = document.getElementById("blokTautanLabel").value.trim();
  var tautan = document.getElementById("blokTautan").value.trim();
  var urutan = Number(document.getElementById("blokUrutan").value);
  var aktif = document.getElementById("blokAktifInput").checked;

  if (!judul) {
    if (typeof showFormError === "function") {
      showFormError("blokForm", "Judul blok wajib diisi.");
    }
    return;
  }
  if (!Number.isFinite(urutan) || urutan < 0) {
    if (typeof showFormError === "function") {
      showFormError("blokForm", "Urutan harus berupa angka 0 atau lebih.");
    }
    return;
  }
  if (tautanLabel && !tautan) {
    if (typeof showFormError === "function") {
      showFormError("blokForm", "Tautan wajib diisi bila label tombol dipakai.");
    }
    return;
  }
  if (tautan && !tautanLabel) {
    if (typeof showFormError === "function") {
      showFormError("blokForm", "Label tombol wajib diisi bila tautan diisi.");
    }
    return;
  }

  var blocks = (getPageBlocks() || []).slice();

  if (id) {
    var index = blocks.findIndex(function (item) {
      return Number(item.id) === Number(id);
    });
    if (index !== -1) {
      blocks[index] = Object.assign({}, blocks[index], {
        judul: judul,
        tipe: tipe,
        deskripsi: deskripsi,
        gambarUrl: gambarUrl,
        tautan: tautan,
        tautanLabel: tautanLabel,
        urutan: urutan,
        aktif: aktif,
      });
    }
  } else {
    var nextId = blocks.length
      ? Math.max.apply(
          null,
          blocks.map(function (item) { return Number(item.id) || 0; }),
        ) + 1
      : 1;
    var kode =
      typeof nextKode === "function"
        ? nextKode("page_blocks", blocks)
        : "BLK-" + String(nextId).padStart(3, "0");
    blocks.push({
      id: nextId,
      kode: kode,
      judul: judul,
      tipe: tipe,
      deskripsi: deskripsi,
      gambarUrl: gambarUrl,
      tautan: tautan,
      tautanLabel: tautanLabel,
      urutan: urutan,
      aktif: aktif,
    });
  }

  savePageBlocks(blocks);

  if (typeof addLog === "function") {
    addLog(
      id ? "Update" : "Tambah",
      "Blok",
      judul + " (" + (typeof formatTipeBlok === "function" ? formatTipeBlok({ tipe: tipe }) : tipe) + ")",
      id
        ? typeof getKode === "function"
          ? getKode("page_blocks", blocks.find(function (p) { return Number(p.id) === Number(id); }))
          : ""
        : kode,
    );
  }

  closeModal("blokModal");
  resetBlokForm();
  renderBlokPage(document.getElementById("searchBlok")?.value);
  updateBlokStats();
  if (typeof showPageNotice === "function") {
    showPageNotice("Data blok tersimpan.", "success");
  }
}

function deleteBlok(id, button) {
  var item = (getPageBlocks() || []).find(function (p) {
    return Number(p.id) === Number(id);
  });
  if (!item) return;

  if (
    typeof armConfirmButton === "function" &&
    !armConfirmButton(button, "Klik lagi untuk hapus " + item.judul)
  ) {
    if (typeof showPageNotice === "function") {
      showPageNotice(
        "Klik Hapus sekali lagi untuk menghapus blok " + item.judul + ".",
        "error",
      );
    }
    return;
  }

  savePageBlocks(
    (getPageBlocks() || []).filter(function (p) {
      return Number(p.id) !== Number(id);
    }),
  );
  if (typeof addLog === "function") {
    addLog(
      "Hapus",
      "Blok",
      item.judul + " (" + item.kode + ")",
      typeof getKode === "function" ? getKode("page_blocks", item) : item.kode,
    );
  }
  renderBlokPage(document.getElementById("searchBlok")?.value);
  updateBlokStats();
  if (typeof showPageNotice === "function") {
    showPageNotice("Blok " + item.judul + " dihapus.", "success");
  }
}

function initBlokPage() {
  if (!document.getElementById("blokPageTable")) return;

  renderBlokPage();
  updateBlokStats();

  document
    .getElementById("btnTambahBlok")
    ?.addEventListener("click", function () {
      resetBlokForm();
      openModal("blokModal");
    });
  document
    .getElementById("blokForm")
    ?.addEventListener("submit", saveBlokForm);
  document
    .getElementById("searchBlok")
    ?.addEventListener("input", function (e) {
      renderBlokPage(e.target.value);
    });
  document
    .getElementById("filterBlokStatus")
    ?.addEventListener("change", function () {
      renderBlokPage(document.getElementById("searchBlok")?.value);
    });
  document
    .getElementById("sortBlok")
    ?.addEventListener("change", function () {
      renderBlokPage(document.getElementById("searchBlok")?.value);
    });
}
