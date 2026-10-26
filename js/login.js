/* =========================================
   LOGIN TERPADU (ADMIN & CUSTOMER)
   Satu halaman untuk dua portal. Tab di atas
   menentukan mau masuk sebagai Admin atau Customer.
   ========================================= */

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const rememberMe = document.getElementById("rememberMe");
const passwordToggle = document.getElementById("passwordToggle");
const loginButton = document.getElementById("loginButton");
const forgotPassword = document.getElementById("forgotPassword");
const resetBox = document.getElementById("resetBox");

let noticeTimer = null;

const REDIRECTS = {
  admin: "admin-page/dashboard.html",
  customer: "customers-page/dashboard.html",
};

/* Jeda (ms) sebelum pindah halaman setelah login berhasil.
   Cukup supaya pesan sukses sempat terbaca, tanpa terasa
   menunggu — tujuan sudah menampilkan skeleton sendiri. */
const REDIRECT_DELAY = 500;

let currentRole = "admin";

/* TEMA */

if (typeof initTheme === "function") {
  initTheme();
}

/* Form atur password hanya untuk mode lokal. Di mode Supabase,
   reset password dilakukan lewat tautan email. */
if (isSupabaseMode()) {
  document.getElementById("resetBox")?.remove();
}

/* =========================================
   GANTI ROLE
   ========================================= */

/* Kunci localStorage untuk "Ingat saya" dibedakan per role,
   jadi harus selalu dihitung dari currentRole SAAT INI (bukan
   saat halaman dimuat), karena user bisa ganti tab role. */
function getRememberKey() {
  return currentRole === "customer"
    ? "workshopCustomerRememberEmail"
    : "workshopRememberEmail";
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
  currentRole = role === "customer" ? "customer" : "admin";

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

  setText("loginTitle", isCustomer ? "Masuk Akun Anda" : "Selamat Datang");
  setText(
    "loginSubtitle",
    isCustomer
      ? "Gunakan email yang terdaftar di Pytabengkel."
      : "Masuk ke akun Pytabengkel.",
  );

  setText(
    "heroTitle",
    isCustomer ? "Pantau Kendaraan Anda." : "Kelola Bengkel Lebih Mudah.",
  );

  setText(
    "heroText",
    isCustomer
      ? "Lihat status service, riwayat perbaikan, dan tagihan kendaraan Anda kapan saja."
      : "Kelola customer, kendaraan, service, mekanik, dan riwayat pekerjaan dalam satu sistem.",
  );

  /* Tombol "Kirim Link Login" hanya relevan di mode Supabase
     (login tanpa password). Di mode lokal, "Lupa password?" sudah
     menangani semuanya, jadi tombol ini disembunyikan agar tidak
     ada dua alur yang tumpang tindih. */
  const linkButton = document.getElementById("btnLoginLink");

  if (linkButton) {
    if (isSupabaseMode()) {
      linkButton.innerHTML =
        '<i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Belum punya password? Kirim link login';
    } else {
      linkButton.closest(".auth-links")?.remove();
    }
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

/* Role dari URL (?role=customer) */
const urlRole = new URLSearchParams(window.location.search).get("role");
setRole(urlRole === "customer" ? "customer" : "admin");

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
  if (result.profile?.role !== currentRole) {
    await Auth.signOut();
    showError(
      currentRole === "admin"
        ? "Akun ini bukan akun administrator. Pilih tab Customer."
        : "Akun ini bukan akun customer. Pilih tab Administrator.",
    );
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
    window.location.href = REDIRECTS[currentRole];
  }, REDIRECT_DELAY);
});

/* =========================================
   LUPA PASSWORD
   =========================================
   - MODE SUPABASE : kirim tautan reset ke email (satu klik).
     Password baru DIATUR dari tautan email tersebut, bukan di aplikasi.
   - MODE LOKAL    : tidak ada layanan email, jadi password bisa
     langsung diatur dari form di bawah (khusus mode lokal). */

forgotPassword.addEventListener("click", async (event) => {
  event.preventDefault();
  hideMessages();

  const email = emailInput.value.trim();

  /* Production: cukup kirim email, tanpa form tambahan. */
  if (isSupabaseMode()) {
    if (!email) {
      showError("Isi email terlebih dahulu, lalu klik Lupa password.");
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
      showError(result.error || "Gagal mengirim email reset password.");
    }

    return;
  }

  /* Mode lokal: buka form atur password langsung. */
  if (email) {
    document.getElementById("resetEmail").value = email;
  }

  if (!resetBox) return;

  resetBox.hidden = !resetBox.hidden;

  if (!resetBox.hidden) {
    document.getElementById("resetEmail")?.focus();
  }
});

document.getElementById("resetBack")?.addEventListener("click", (event) => {
  event.preventDefault();
  if (resetBox) resetBox.hidden = true;
  hideMessages();
});

document
  .getElementById("resetForm")
  ?.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideMessages();

    const email = document.getElementById("resetEmail").value.trim();
    const newPassword = document.getElementById("resetPassword").value;

    if (!email || !newPassword) {
      showError("Email dan password baru wajib diisi.");
      return;
    }

    if (newPassword.length < 6) {
      showError("Password baru minimal 6 karakter.");
      return;
    }

    const result = await Auth.setLocalPassword(email, newPassword);

    if (result.ok) {
      showSuccess(
        "Password berhasil diperbarui. Silakan masuk dengan password baru.",
      );
      event.target.reset();
      if (resetBox) resetBox.hidden = true;
      emailInput.value = email;
    } else {
      showError(result.error || "Gagal memperbarui password.");
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
   HELPER
   ========================================= */

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

/* Notifikasi mengambang (gaya sama dengan halaman dashboard),
   jadi tidak mendorong layout / menutupi form. */
function showNotice(message, type = "error") {
  let notice = document.getElementById("loginNotice");

  if (!notice) {
    notice = document.createElement("div");
    notice.id = "loginNotice";
    notice.setAttribute("role", "status");
    notice.className = "page-notice";
    document.body.appendChild(notice);
  }

  if (noticeTimer) {
    window.clearTimeout(noticeTimer);
    noticeTimer = null;
  }

  notice.hidden = false;
  notice.className =
    "page-notice " + (type === "success" ? "success" : "error");
  notice.textContent = message;

  noticeTimer = window.setTimeout(() => {
    notice.hidden = true;
    notice.textContent = "";
    notice.className = "page-notice";
    noticeTimer = null;
  }, type === "success" ? 3000 : 4000);
}

function showError(message) {
  showNotice(message, "error");
}

function showSuccess(message) {
  showNotice(message, "success");
}

function hideMessages() {
  const notice = document.getElementById("loginNotice");

  if (!notice) return;

  notice.hidden = true;
  notice.textContent = "";
  notice.className = "page-notice";

  if (noticeTimer) {
    window.clearTimeout(noticeTimer);
    noticeTimer = null;
  }
}
