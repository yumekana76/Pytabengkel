/* =========================================
   PENDAFTARAN CUSTOMER
   Halaman login sudah menyatu di index.html (pilih role).
   ========================================= */

const registerForm = document.getElementById("registerForm");

let noticeTimer = null;

if (typeof initTheme === "function") {
  initTheme();
}

if (typeof showModeBadge === "function") {
  showModeBadge();
}

/* TAMPILKAN / SEMBUNYIKAN PASSWORD */

document.getElementById("passwordToggle")?.addEventListener("click", () => {
  const input = document.getElementById("password");
  const isPassword = input.type === "password";
  input.type = isPassword ? "text" : "password";

  const eyeIcon = document
    .getElementById("passwordToggle")
    .querySelector(".password-eye");

  if (eyeIcon) {
    eyeIcon.classList.toggle("fa-eye", !isPassword);
    eyeIcon.classList.toggle("fa-eye-slash", isPassword);
  }
});

/* =========================================
   DAFTAR
   ========================================= */

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideMessages();

    const nama = document.getElementById("nama").value.trim();
    const email = document.getElementById("email").value.trim();
    const telepon = document.getElementById("telepon").value.trim();
    const alamat = document.getElementById("alamat").value.trim();
    const password = document.getElementById("password").value;
    const passwordConfirm = document.getElementById("passwordConfirm").value;
    const button = document.getElementById("registerButton");

    if (!nama || !email || !telepon || !password) {
      showError("Nama, email, no. HP, dan password wajib diisi.");
      return;
    }

    if (!isValidEmail(email)) {
      showError("Masukkan alamat email yang valid.");
      return;
    }

    if (password.length < 6) {
      showError("Password minimal 6 karakter.");
      return;
    }

    if (password !== passwordConfirm) {
      showError("Konfirmasi password tidak sama.");
      return;
    }

    button.disabled = true;
    button.querySelector("span").textContent = "Mendaftarkan...";

    const result = await Auth.signUp({
      nama,
      email,
      telepon,
      alamat,
      password,
    });

    if (!result.ok) {
      showError(result.error || "Pendaftaran gagal.");
      button.disabled = false;
      button.querySelector("span").textContent = "Daftar";
      return;
    }

    if (result.needsEmailConfirmation) {
      showSuccess(
        "Pendaftaran berhasil. Cek email Anda untuk konfirmasi, lalu masuk.",
      );
      button.disabled = false;
      button.querySelector("span").textContent = "Daftar";
      return;
    }

    showSuccess("Pendaftaran berhasil. Mengarahkan ke dashboard...");

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 900);
  });
}

/* =========================================
   HELPER
   ========================================= */

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* Notifikasi mengambang (gaya sama dengan halaman dashboard). */
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
  }, type === "success" ? 2500 : 4000);
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
