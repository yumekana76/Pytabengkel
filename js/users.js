/* =========================================
   KELOLA PENGGUNA (KHUSUS SUPER ADMIN)
   ---------------------------------------------------------------
   Hanya super admin yang bisa membuka halaman ini — admin biasa
   TIDAK punya akses Kelola Pengguna (dijaga guard + nav tersembunyi):
      * Ubah role   -> super admin (RPC admin_set_user_role)
      * Blokir akun -> super admin (RPC admin_set_user_ban)
      * Hapus akun  -> super admin (RPC admin_delete_user)
     super_admin -> akses penuh + kelola role
     admin       -> operasional bengkel
     customer    -> portal customer

   Semua operasi memakai RPC security definer sehingga aturan tetap
   dijaga di database, bukan hanya di UI.
   Tidak ada lagi penyimpanan lokal — semua lewat Supabase.
   ========================================= */

var USER_ROLE_ORDER = ["super_admin", "admin", "customer"];

var USER_ROLE_ICONS = {
  super_admin: "fa-crown",
  admin: "fa-user-shield",
  customer: "fa-user",
};

function getUserRole(account) {
  return normalizeRole(account?.role);
}

function getInitials(nama, email) {
  const source = String(nama || email || "Pengguna").trim();
  const parts = source.split(/\s+/).filter(Boolean);

  if (!parts.length) return "?";

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function findUserAccount(id) {
  return (
    getCustomerAccounts().find(
      (account) => String(account.id) === String(id),
    ) || null
  );
}

function isOwnAccount(account) {
  const profile = getCurrentProfile();

  if (!profile || !account) return false;

  /* Mode Supabase: id profil = id akun, jadi langsung cocok.
     Kalau cocok lewat email (profil lama), tetap diizinkan. */
  if (String(profile.id) === String(account.id)) return true;

  return (
    String(profile.email || "")
      .trim()
      .toLowerCase() ===
    String(account.email || "")
      .trim()
      .toLowerCase()
  );
}

function renderUserStats(accounts) {
  const counts = { super_admin: 0, admin: 0, customer: 0 };

  accounts.forEach((account) => {
    counts[getUserRole(account)] += 1;
  });

  setText("totalUsers", accounts.length);
  setText("totalSuperAdmins", counts.super_admin);
  setText("totalAdmins", counts.admin);
  setText("totalCustomerAccounts", counts.customer);
}

function renderUserRows() {
  const tbody = document.getElementById("userTable");
  const info = document.getElementById("userInfo");

  if (!tbody) return;

  const accounts = getCustomerAccounts();
  const search = String(
    document.getElementById("userSearch")?.value || "",
  )
    .trim()
    .toLowerCase();
  const roleFilter = document.getElementById("userRoleFilter")?.value || "";

  renderUserStats(accounts);

  const filtered = accounts
    .filter((account) => {
      const role = getUserRole(account);

      if (roleFilter && role !== roleFilter) return false;

      if (!search) return true;

      return [account.nama, account.email, account.id]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(search));
    })
    .sort((a, b) => {
      const rank =
        USER_ROLE_ORDER.indexOf(getUserRole(a)) -
        USER_ROLE_ORDER.indexOf(getUserRole(b));

      if (rank !== 0) return rank;

      return String(a.nama || "").localeCompare(String(b.nama || ""), "id");
    });

  if (info) {
    info.textContent = search || roleFilter
      ? `${filtered.length} dari ${accounts.length} akun`
      : `${accounts.length} akun terdaftar`;
  }

  if (!filtered.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="users-empty">
          <i class="fa-solid fa-user-slash" aria-hidden="true"></i>
          Tidak ada akun yang cocok dengan pencarian.
        </td>
      </tr>
    `;
    return;
  }

  const viewerIsSuper = isSuperAdminRole(getCurrentProfile()?.role);

  tbody.innerHTML = filtered
    .map((account) => {
      const role = getUserRole(account);
      const own = isOwnAccount(account);
      const banned = Boolean(account.bannedAt);
      const name = account.nama || account.email || "Tanpa nama";
      const email = account.email || "-";
      const customerText = account.customerId
        ? `<span class="users-customer-link"><i class="fa-solid fa-link" aria-hidden="true"></i> #${escapeHTML(String(account.customerId))}</span>`
        : '<span class="users-customer-link">—</span>';

      const bannedBadge = banned
        ? ' <span class="users-banned-badge"><i class="fa-solid fa-ban" aria-hidden="true"></i> Diblokir</span>'
        : "";

      /* Ubah role: hanya super admin (dan bukan akun sendiri).
         Admin biasa melihat keterangan terkunci. */
      const roleSelect = own
        ? '<span class="users-own-role"><i class="fa-solid fa-lock" aria-hidden="true"></i> Akun Anda</span>'
        : viewerIsSuper
          ? `
          <select
            class="role-select"
            data-user-id="${escapeHTML(String(account.id))}"
            aria-label="Ubah role ${escapeHTML(name)}"
          >
            ${USER_ROLE_ORDER.map(
              (option) =>
                `<option value="${option}"${option === role ? " selected" : ""}>${getRoleLabel(option)}</option>`,
            ).join("")}
          </select>
        `
          : '<span class="users-own-role" title="Hanya super admin yang dapat mengubah role"><i class="fa-solid fa-lock" aria-hidden="true"></i> Khusus Super Admin</span>';

      /* Aksi: blokir/buka blokir + hapus — tersedia untuk admin DAN
         super admin, kecuali akun sendiri atau akun super admin
         (keduanya dilindungi juga di database lewat RPC). */
      const canManage = !own && role !== "super_admin";
      const aksiCell = canManage
        ? `
          <div class="users-actions">
            <button
              type="button"
              class="action-btn"
              data-ban-user="${escapeHTML(String(account.id))}"
              aria-label="${banned ? "Buka blokir" : "Blokir"} ${escapeHTML(name)}"
            >${banned ? "Buka Blokir" : "Blokir"}</button>
            <button
              type="button"
              class="action-btn danger"
              data-delete-user="${escapeHTML(String(account.id))}"
              aria-label="Hapus ${escapeHTML(name)}"
            >Hapus</button>
          </div>
        `
        : '<span class="users-protected" title="Akun sendiri dan akun super admin tidak dapat diblokir atau dihapus">—</span>';

      return `
        <tr>
          <td>
            <div class="user-cell">
              <span class="user-avatar" aria-hidden="true">${escapeHTML(getInitials(account.nama, account.email))}</span>
              <div>
                <strong>${escapeHTML(name)}${bannedBadge}</strong>
                <small>${own ? "Anda" : "Akun pengguna"}</small>
              </div>
            </div>
          </td>
          <td>${escapeHTML(email)}</td>
          <td>
            <span class="role-badge ${role}">
              <i class="fa-solid ${USER_ROLE_ICONS[role]}" aria-hidden="true"></i>
              ${getRoleLabel(role)}
            </span>
          </td>
          <td>${customerText}</td>
          <td>${roleSelect}</td>
          <td>${aksiCell}</td>
        </tr>
      `;
    })
    .join("");
}

async function setUserRole(account, nextRole) {
  if (!isSuperAdminRole(getCurrentProfile()?.role)) {
    return {
      ok: false,
      error: "Hanya super admin yang boleh mengubah role pengguna.",
    };
  }

  if (!USER_ROLE_ORDER.includes(nextRole)) {
    return { ok: false, error: "Role tidak dikenal." };
  }

  if (isOwnAccount(account)) {
    return {
      ok: false,
      error: "Anda tidak dapat mengubah role akun sendiri.",
    };
  }

  /* Mode lokal sudah dihapus: semua aturan dijaga RPC security definer. */
  if (!isSupabaseMode() || !supabaseClient) {
    return {
      ok: false,
      error: "Aplikasi belum terhubung ke Supabase. Muat ulang halaman lalu coba lagi.",
    };
  }

  const { error } = await supabaseClient.rpc("admin_set_user_role", {
    p_user: account.id,
    p_role: nextRole,
  });

  if (error) {
    const pesan = String(error.message || "");
    const belumAktif =
      pesan.toLowerCase().includes("could not find the function") ||
      pesan.toLowerCase().includes("does not exist");

    return {
      ok: false,
      error: belumAktif
        ? "Fitur ubah role belum aktif di server. Jalankan ulang supabase/schema.sql."
        : pesan || "Gagal mengubah role pengguna.",
    };
  }

  return { ok: true };
}

/* Blokir / buka blokir akun lewat RPC admin_set_user_ban().
   Khusus super admin; database juga menolak pemanggil non-super,
   akun sendiri, dan akun super admin. */
async function setUserBan(account, banned) {
  if (!isSuperAdminRole(getCurrentProfile()?.role)) {
    return {
      ok: false,
      error: "Hanya super admin yang boleh memblokir pengguna.",
    };
  }

  if (isOwnAccount(account)) {
    return {
      ok: false,
      error: "Anda tidak dapat memblokir akun sendiri.",
    };
  }

  if (getUserRole(account) === "super_admin") {
    return { ok: false, error: "Akun super admin tidak dapat diblokir." };
  }

  if (!isSupabaseMode() || !supabaseClient) {
    return {
      ok: false,
      error: "Aplikasi belum terhubung ke Supabase. Muat ulang halaman lalu coba lagi.",
    };
  }

  const { error } = await supabaseClient.rpc("admin_set_user_ban", {
    p_user: account.id,
    p_banned: Boolean(banned),
  });

  if (error) {
    const pesan = String(error.message || "");
    const belumAktif =
      pesan.toLowerCase().includes("could not find the function") ||
      pesan.toLowerCase().includes("does not exist");

    return {
      ok: false,
      error: belumAktif
        ? "Fitur blokir akun belum aktif di server. Jalankan ulang supabase/schema.sql."
        : pesan || "Gagal mengubah status blokir akun.",
    };
  }

  return { ok: true };
}

/* Hapus akun lewat RPC admin_delete_user() (menghapus baris
   auth.users; profiles ikut cascade, data customer/service tetap).
   Khusus super admin. */
async function deleteUserAccount(account) {
  if (!isSuperAdminRole(getCurrentProfile()?.role)) {
    return {
      ok: false,
      error: "Hanya super admin yang boleh menghapus akun pengguna.",
    };
  }

  if (isOwnAccount(account)) {
    return {
      ok: false,
      error: "Anda tidak dapat menghapus akun sendiri.",
    };
  }

  if (getUserRole(account) === "super_admin") {
    return { ok: false, error: "Akun super admin tidak dapat dihapus." };
  }

  if (!isSupabaseMode() || !supabaseClient) {
    return {
      ok: false,
      error: "Aplikasi belum terhubung ke Supabase. Muat ulang halaman lalu coba lagi.",
    };
  }

  const { error } = await supabaseClient.rpc("admin_delete_user", {
    p_user: account.id,
  });

  if (error) {
    const pesan = String(error.message || "");
    const belumAktif =
      pesan.toLowerCase().includes("could not find the function") ||
      pesan.toLowerCase().includes("does not exist");

    return {
      ok: false,
      error: belumAktif
        ? "Fitur hapus akun belum aktif di server. Jalankan ulang supabase/schema.sql."
        : pesan || "Gagal menghapus akun.",
    };
  }

  return { ok: true };
}

async function handleUserRoleChange(select) {
  const account = findUserAccount(select.dataset.userId);
  if (!account) return;

  const previous = getUserRole(account);
  const next = normalizeRole(select.value);

  if (next === previous) return;

  const name = account.nama || account.email || "Pengguna";

  /* Role super admin terakhir tidak boleh diturunkan — cegah dari UI
     supaya pesannya jelas, walau database juga menolaknya. */
  const superAdmins = getCustomerAccounts().filter(
    (item) => getUserRole(item) === "super_admin",
  );

  if (
    previous === "super_admin" &&
    next !== "super_admin" &&
    superAdmins.length <= 1
  ) {
    select.value = previous;
    showPageNotice(
      "Minimal harus ada satu super admin. Tambahkan super admin lain lebih dulu.",
      "error",
    );
    return;
  }

  select.disabled = true;

  const result = await setUserRole(account, next);

  if (!result.ok) {
    select.value = previous;
    select.disabled = false;
    showPageNotice(result.error || "Gagal mengubah role pengguna.", "error");
    return;
  }

  /* Sinkronkan cache profil di memori. */
  account.role = next;
  saveCustomerAccounts(getCustomerAccounts());

  if (typeof addLog === "function") {
    addLog(
      "ubah_role",
      "Pengguna",
      `Role ${account.email || name} diubah menjadi ${getRoleLabel(next)}.`,
      account.email || name,
    );
  }

  showPageNotice(
    `Role ${name} berhasil diubah menjadi ${getRoleLabel(next)}.`,
    "success",
  );

  renderUserRows();
}

/* Blokir / buka blokir dari tombol di tabel (konfirmasi 2 klik). */
async function handleUserBan(button) {
  const account = findUserAccount(button.dataset.banUser);
  if (!account) return;

  const banned = Boolean(account.bannedAt);
  const name = account.nama || account.email || "Pengguna";
  const aksi = banned ? "membuka blokir" : "memblokir";

  if (
    typeof armConfirmButton === "function" &&
    !armConfirmButton(
      button,
      (banned ? "Klik lagi untuk buka blokir " : "Klik lagi untuk blokir ") +
        name,
    )
  ) {
    if (typeof showPageNotice === "function") {
      showPageNotice(
        "Klik sekali lagi untuk " + aksi + " akun " + name + ".",
        "error",
      );
    }
    return;
  }

  button.disabled = true;
  const result = await setUserBan(account, !banned);
  button.disabled = false;

  if (!result.ok) {
    showPageNotice(
      result.error || "Gagal mengubah status blokir akun.",
      "error",
    );
    return;
  }

  /* Sinkronkan cache akun di memori. */
  account.bannedAt = banned ? null : new Date().toISOString();
  saveCustomerAccounts(getCustomerAccounts());

  if (typeof addLog === "function") {
    addLog(
      banned ? "buka_blokir" : "blokir_pengguna",
      "Pengguna",
      `Akun ${account.email || name} ${banned ? "dibuka blokir" : "diblokir"}.`,
      account.email || name,
    );
  }

  showPageNotice(
    banned
      ? `Akun ${name} berhasil dibuka blokir.`
      : `Akun ${name} berhasil diblokir dan tidak bisa login.`,
    "success",
  );

  renderUserRows();
}

/* Hapus akun dari tombol di tabel (konfirmasi 2 klik). */
async function handleUserDelete(button) {
  const account = findUserAccount(button.dataset.deleteUser);
  if (!account) return;

  const name = account.nama || account.email || "Pengguna";

  if (
    typeof armConfirmButton === "function" &&
    !armConfirmButton(button, "Klik lagi untuk hapus " + name)
  ) {
    if (typeof showPageNotice === "function") {
      showPageNotice(
        "Klik Hapus sekali lagi untuk menghapus akun " + name + ".",
        "error",
      );
    }
    return;
  }

  button.disabled = true;
  const result = await deleteUserAccount(account);
  button.disabled = false;

  if (!result.ok) {
    showPageNotice(result.error || "Gagal menghapus akun.", "error");
    return;
  }

  saveCustomerAccounts(
    getCustomerAccounts().filter(
      (item) => String(item.id) !== String(account.id),
    ),
  );

  if (typeof addLog === "function") {
    addLog(
      "hapus_pengguna",
      "Pengguna",
      `Akun ${account.email || name} (${getRoleLabel(getUserRole(account))}) dihapus.`,
      account.email || name,
    );
  }

  showPageNotice(`Akun ${name} berhasil dihapus.`, "success");

  renderUserRows();
}

function initUsersPage() {
  /* Hanya super admin — admin biasa dikembalikan ke dashboard
     (tidak memaksa keluar dari akun). */
  if (!isSuperAdminRole(getCurrentProfile()?.role)) {
    window.location.replace("dashboard.html");
    return;
  }

  const tbody = document.getElementById("userTable");
  const search = document.getElementById("userSearch");
  const roleFilter = document.getElementById("userRoleFilter");

  if (tbody && tbody.dataset.bound !== "true") {
    tbody.dataset.bound = "true";
    tbody.addEventListener("change", (event) => {
      const select = event.target.closest(".role-select");
      if (select) handleUserRoleChange(select);
    });
    tbody.addEventListener("click", (event) => {
      const banButton = event.target.closest("[data-ban-user]");
      if (banButton) {
        handleUserBan(banButton);
        return;
      }
      const deleteButton = event.target.closest("[data-delete-user]");
      if (deleteButton) handleUserDelete(deleteButton);
    });
  }

  if (search && search.dataset.bound !== "true") {
    search.dataset.bound = "true";
    search.addEventListener("input", renderUserRows);
  }

  if (roleFilter && roleFilter.dataset.bound !== "true") {
    roleFilter.dataset.bound = "true";
    roleFilter.addEventListener("change", renderUserRows);
  }

  renderUserRows();
}
