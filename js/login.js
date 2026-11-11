/* =========================================
   LOGIN TERPADU (SUPER ADMIN, ADMIN & CUSTOMER)
   Satu halaman untuk tiga role. Tab di atas menentukan
   portal yang ingin dimasuki.
   ========================================= */

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const rememberMe = document.getElementById("rememberMe");
const passwordToggle = document.getElementById("passwordToggle");
const loginButton = document.getElementById("loginButton");
const forgotPassword = document.getElementById("forgotPassword");
const resetBox = document.getElementById("resetBox");

const REDIRECTS = {
  super_admin: "admin-page/dashboard.html",
  admin: "admin-page/dashboard.html",
  customer: "customers-page/dashboard.html",
};

/* Role yang boleh masuk lewat masing-masing tab. Tab Administrator
   menerima super admin juga karena keduanya memakai portal admin;
   tab Super Admin tetap khusus super admin. */
const ROLE_ACCESS = {
  super_admin: ["super_admin"],
  admin: ["admin", "super_admin"],
  customer: ["customer"],
};


/* Jeda (ms) sebelum pindah halaman setelah login berhasil.
   Cukup supaya pesan sukses sempat terbaca, tanpa terasa
   menunggu — tujuan sudah menampilkan skeleton sendiri. */
const REDIRECT_DELAY = 500;

let currentRole = "customer";

/* Tujuan setelah login. ?next= dipakai landing agar customer yang
   mengklaim promo tetap mendarat di form ajukan service dengan promo
   terpilih. Hanya izinkan path internal halaman customer. */
function getPostLoginTarget(role = currentRole) {
  const next = new URLSearchParams(window.location.search).get("next") || "";

  if (
    role === "customer" &&
    /^customers-page\/[a-z0-9-]+\.html(?:\?[^#]*)?$/i.test(next)
  ) {
    return next;
  }

  return REDIRECTS[role];
}

/* TEMA — dipanggil boot global.js (DOMContentLoaded), bukan di sini,
   supaya tidak dobel dengan halaman lain yang memuat global.js. */

/* Reset box (form atur password baru) disembunyikan sampai tautan
   reset password dari email dibuka — lihat mode recovery di bawah. */

/* =========================================
   GANTI ROLE
   ========================================= */

/* Kunci localStorage untuk "Ingat saya" dibedakan per role,
   jadi harus selalu dihitung dari currentRole SAAT INI (bukan
   saat halaman dimuat), karena user bisa ganti tab role. */
function getRememberKey() {
  if (currentRole === "customer") return "workshopCustomerRememberEmail";
  if (currentRole === "super_admin") return "workshopSuperAdminRememberEmail";
  return "workshopRememberEmail";
}

/* Isi ulang email + status checkbox "Ingat saya" dari penyimpanan
   role yang sedang dipilih. */
function loadRememberedEmail() {
  const remembered = localStorage.getItem(getRememberKey());

  if (remembered) {
    emailInput.value = remembered;
    rememberMe.checked = true;
  } else {
    if (emailInput.value) emailInput.value = "";
    rememberMe.checked = false;
  }
}

function setRole(role) {
  currentRole = normalizeRole(role);

  document.querySelectorAll(".role-tab").forEach((tab) => {
    const active = tab.dataset.role === currentRole;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });

  document.querySelectorAll(".role-only").forEach((block) => {
    block.classList.toggle("visible", currentRole === "customer");
  });

  /* Judul & teks ikut berubah sesuai role */
  const isCustomer = currentRole === "customer";
  const isSuperAdmin = currentRole === "super_admin";

  /* Tanda mode login admin/super admin agar tidak tertukar dengan customer. */
  const adminNotice = document.getElementById("adminLoginNotice");
  const adminNoticeText = document.getElementById("adminLoginNoticeText");
  if (adminNotice) {
    adminNotice.hidden = isCustomer;
    adminNotice.classList.toggle("is-super", isSuperAdmin);
    if (adminNoticeText) {
      adminNoticeText.textContent = isSuperAdmin
        ? "Mode Login Super Admin"
        : "Mode Login Admin";
    }
  }

  setText(
    "loginTitle",
    isCustomer
      ? "Masuk Akun Anda"
      : isSuperAdmin
        ? "Masuk Super Admin"
        : "Selamat Datang",
  );
  setText(
    "loginSubtitle",
    isCustomer
      ? "Gunakan email yang terdaftar di Pytabengkel."
      : isSuperAdmin
        ? "Kelola administrator dan role pengguna Pytabengkel."
        : "Masuk ke akun Pytabengkel.",
  );


  /* Tombol "Kirim Link Login" (login tanpa password, tautan via email). */
  const linkButton = document.getElementById("btnLoginLink");

  if (linkButton) {
    linkButton.innerHTML =
      '<i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Belum punya password? Kirim link login';
  }

  if (!isCustomer) {
    if (resetBox) resetBox.hidden = true;
  }

  /* Muat email yang diingat untuk role ini */
  loadRememberedEmail();

  hideMessages();
}

document.querySelectorAll(".role-tab").forEach((tab) => {
  tab.addEventListener("click", () => setRole(tab.dataset.role));
});

/* Role dari URL (?role=customer|admin|super_admin).
   Default: customer. Admin & super admin tetap bisa diakses manual
   lewat ?role=admin atau ?role=super_admin, tapi pemilih role
   disembunyikan dari UI. */
const urlRole = new URLSearchParams(window.location.search).get("role");
const requestedRole =
  urlRole === "admin" || urlRole === "super_admin" ? urlRole : "customer";
setRole(requestedRole);

/* Pesan setelah customer menghapus akunnya sendiri. */
if (urlRole === "customer" && new URLSearchParams(window.location.search).get("accountDeleted") === "1") {
  showSuccess("Akun Anda berhasil dihapus.");
}

/* =========================================
   TAMPILKAN / SEMBUNYIKAN PASSWORD
   ========================================= */

passwordToggle.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";

  const eyeIcon = passwordToggle.querySelector(".password-eye");

  if (eyeIcon) {
    eyeIcon.classList.toggle("fa-eye", !isPassword);
    eyeIcon.classList.toggle("fa-eye-slash", isPassword);
  }

  passwordToggle.setAttribute(
    "aria-label",
    isPassword ? "Sembunyikan password" : "Tampilkan password",
  );
});

/* =========================================
   LOGIN
   ========================================= */

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessages();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError("Email dan password wajib diisi.");
    return;
  }

  if (!isValidEmail(email)) {
    showError("Masukkan alamat email yang valid.");
    return;
  }

  /* Nonaktifkan tombol sementara supaya tidak diklik dobel.
     Tidak ada teks "loading" — biarkan tombol tetap "Masuk". */
  loginButton.disabled = true;

  const result = await Auth.signIn(email, password);

  if (!result.ok) {
    showError(result.error || "Email atau password salah.");
    loginButton.disabled = false;
    return;
  }

  /* Pastikan role sesuai tab yang dipilih */
  const allowedRoles = ROLE_ACCESS[currentRole] || [];

  if (!allowedRoles.includes(result.profile?.role)) {
    await Auth.signOut();

    const pesan =
      currentRole === "super_admin"
        ? "Akun ini bukan Super Admin. Pilih tab Administrator atau Customer."
        : currentRole === "admin"
          ? "Akun ini bukan akun administrator. Pilih tab Customer."
          : "Akun ini bukan akun customer. Pilih tab Administrator.";

    showError(pesan);
    loginButton.disabled = false;
    return;
  }

  /* Simpan / hapus email sesuai role yang sedang dipilih. */
  if (rememberMe.checked) {
    localStorage.setItem(getRememberKey(), email);
  } else {
    localStorage.removeItem(getRememberKey());
  }

  showSuccess("Login berhasil. Mengarahkan...");

  setTimeout(() => {
    window.location.href = getPostLoginTarget(currentRole);
  }, REDIRECT_DELAY);
});

/* =========================================
   LUPA PASSWORD
   =========================================
   Kirim tautan reset ke email (satu klik, Supabase Auth).
   Password baru DIATUR dari tautan email tersebut, bukan di aplikasi. */

forgotPassword.addEventListener("click", async (event) => {
  event.preventDefault();
  hideMessages();

  const email = emailInput.value.trim();

  /* Mode lokal sudah dihapus: reset hanya lewat tautan email. */
  if (!isSupabaseMode()) {
    showError(
      "Aplikasi belum terhubung ke Supabase. Muat ulang halaman setelah konfigurasi diisi.",
    );
    return;
  }

  if (!email) {
    showError("Isi email terlebih dahulu, lalu klik Lupa password.");
    return;
  }

  if (!isValidEmail(email)) {
    showError("Masukkan alamat email yang valid.");
    return;
  }

  const result = await Auth.resetPassword(
    email,
    `${window.location.origin}${window.location.pathname}`,
  );

  if (result.ok) {
    showSuccess(
      "Tautan reset password sudah dikirim ke email Anda. Buka tautannya untuk membuat password baru.",
    );
  } else {
    const pesan = String(result.error || "");
    const smtpGagal =
      pesan.toLowerCase().includes("error sending recovery email") ||
      pesan.toLowerCase().includes("sending recovery email");

    showError(
      smtpGagal
        ? "Gagal mengirim email reset. Pastikan SMTP sudah dikonfigurasi di Supabase (Authentication → SMTP Settings), atau email penerima adalah anggota tim project."
        : pesan || "Gagal mengirim email reset password.",
    );
  }
});

/* =========================================
   KIRIM LINK LOGIN (MAGIC LINK)
   ========================================= */

document
  .getElementById("btnLoginLink")
  ?.addEventListener("click", async (event) => {
    event.preventDefault();
    hideMessages();

    const email = emailInput.value.trim();

    if (!email) {
      showError("Isi email terlebih dahulu, lalu klik Kirim link login.");
      return;
    }

    const result = await Auth.sendLoginLink(
      email,
      `${window.location.origin}/html/customers-page/dashboard.html`,
    );

    if (result.ok) {
      showSuccess("Link login sudah dikirim ke email Anda. Cek inbox Anda.");
    } else {
      showError(result.error || "Gagal mengirim link login.");
    }
  });

/* =========================================
   MODE RECOVERY (atur password baru dari tautan email)
   =========================================
   Saat pengguna membuka tautan reset password dari email,
   Supabase menandai sesi sebagai PASSWORD_RECOVERY. Halaman ini
   harus menampilkan form atur password baru, bukan form login. */

let recoveryMode = false;

function enterRecoveryMode(session) {
  if (recoveryMode) return;
  recoveryMode = true;
  hideMessages();

  if (loginForm) {
    loginForm.hidden = true;
  }

  const resetBox = document.getElementById("resetBox");
  if (resetBox) {
    resetBox.hidden = false;
  }

  const emailField = document.getElementById("resetEmail");
  const fillEmail = (email) => {
    if (emailField && email) {
      emailField.value = email;
      emailField.readOnly = true;
    }
  };

  if (session?.user?.email) {
    fillEmail(session.user.email);
  } else if (supabaseClient) {
    supabaseClient.auth
      .getSession()
      .then(({ data }) => fillEmail(data?.session?.user?.email))
      .catch(() => {});
  }
}

window.onPasswordRecovery = enterRecoveryMode;

if (window.__passwordRecovery) {
  (async () => {
    try {
      const { data } = await (supabaseClient?.auth?.getSession?.() ||
        Promise.resolve({ data: { session: null } }));
      enterRecoveryMode(data?.session);
    } catch (error) {
      enterRecoveryMode(null);
    }
  })();
}

/* Fallback deteksi dari URL (tautan reset Supabase memuat
   type=recovery di hash/query). */
if (supabaseClient && /type=recovery/i.test(window.location.href)) {
  (async () => {
    /* Beri kesempatan client memproses URL (detectSessionInUrl). */
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      const { data } = await supabaseClient.auth.getSession();
      if (data?.session) {
        enterRecoveryMode(data.session);
      }
    } catch (error) {
      /* Abaikan — onAuthStateChange akan memicu bila sesi siap. */
    }
  })();
}

/* =========================================
   SUDAH LOGIN? LANGSUNG KE PORTAL
   Kalau sesi masih berlaku, jangan suruh login
   lagi — langsung arahkan ke portal sesuai role
   (admin/super/customer -> dashboard).
   Mode recovery (atur ulang password) didahulukan.
   ========================================= */
(async function redirectIfAlreadyLoggedIn() {
  if (recoveryMode || window.__passwordRecovery) return;
  if (/type=recovery/i.test(window.location.href)) return;
  if (!supabaseClient || typeof Auth === "undefined") return;

  try {
    const profile = await Auth.restoreSession();
    if (!profile || !profile.role) return;

    const role = normalizeRole(profile.role);
    const target = REDIRECTS[role];
    if (target) {
      window.location.replace(getPostLoginTarget(role));
    }
  } catch (error) {
    /* Sesi tidak valid / gagal dimuat — biarkan form login tampil. */
  }
})();

document
  .getElementById("resetForm")
  ?.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideMessages();

    const newPassword = document
      .getElementById("resetPassword")
      ?.value || "";

    if (!newPassword || newPassword.length < 6) {
      showError("Password baru minimal 6 karakter.");
      return;
    }

    if (!isSupabaseMode()) {
      showError(
        "Aplikasi belum terhubung ke Supabase. Muat ulang halaman setelah konfigurasi diisi.",
      );
      return;
    }

    const result = await Auth.updatePassword(newPassword);

    if (!result.ok) {
      showError(result.error || "Gagal memperbarui password.");
      return;
    }

    showSuccess(
      "Password berhasil diperbarui. Mengarahkan ke halaman masuk...",
    );

    try {
      await Auth.signOut();
    } catch (error) {
      /* Sesi recovery tetap dibersihkan oleh redirect. */
    }

    setTimeout(() => {
      window.location.replace(window.location.pathname);
    }, 1200);
  });

document
  .getElementById("resetBack")
  ?.addEventListener("click", async (event) => {
    event.preventDefault();

    try {
      await Auth.signOut();
    } catch (error) {
      /* Abaikan. */
    }

    window.location.replace(window.location.pathname);
  });

/* HELPER (isValidEmail, setText, showNotice, showError, showSuccess,
   hideMessages) sudah disentralisasi di global.js — halaman ini
   selalu memuat global.js sebelum skrip ini. */

