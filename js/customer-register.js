/* =========================================
   PENDAFTARAN CUSTOMER
   Halaman login sudah menyatu di index.html (pilih role).
   ========================================= */

const registerForm = document.getElementById("registerForm");

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
    }, 500);
  });
}

/* HELPER (isValidEmail, showNotice, showError, showSuccess,
   hideMessages) sudah disentralisasi di global.js — halaman ini
   selalu memuat global.js sebelum skrip ini. */

