/* =========================================
   KELOLA PENGGUNA (KHUSUS SUPER ADMIN)
   ---------------------------------------------------------------
   Super admin dapat mengubah role akun lain:
     super_admin -> akses penuh + kelola role
     admin       -> operasional bengkel
     customer    -> portal customer

   Perubahan role di Supabase memakai RPC admin_set_user_role()
   (security definer) sehingga aturan tetap dijaga di database.
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
        <td colspan="5" class="users-empty">
          <i class="fa-solid fa-user-slash" aria-hidden="true"></i>
          Tidak ada akun yang cocok dengan pencarian.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered
    .map((account) => {
      const role = getUserRole(account);
      const own = isOwnAccount(account);
      const name = account.nama || account.email || "Tanpa nama";
      const email = account.email || "-";
      const customerText = account.customerId
        ? `<span class="users-customer-link"><i class="fa-solid fa-link" aria-hidden="true"></i> #${escapeHTML(String(account.customerId))}</span>`
        : '<span class="users-customer-link">—</span>';

      const roleSelect = own
        ? '<span class="users-own-role"><i class="fa-solid fa-lock" aria-hidden="true"></i> Akun Anda</span>'
        : `
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
        `;

      return `
        <tr>
          <td>
            <div class="user-cell">
              <span class="user-avatar" aria-hidden="true">${escapeHTML(getInitials(account.nama, account.email))}</span>
              <div>
                <strong>${escapeHTML(name)}</strong>
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

function initUsersPage() {
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
