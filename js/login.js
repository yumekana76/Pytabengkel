const loginForm = document.getElementById("loginForm");
      const emailInput = document.getElementById("email");
      const passwordInput = document.getElementById("password");
      const rememberMe = document.getElementById("rememberMe");
      const passwordToggle = document.getElementById("passwordToggle");
      const loginButton = document.getElementById("loginButton");
      const errorMessage = document.getElementById("errorMessage");
      const successMessage = document.getElementById("successMessage");
      const forgotPassword = document.getElementById("forgotPassword");
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
      const savedEmail = localStorage.getItem("workshopRememberEmail");
      if (savedEmail) {
        emailInput.value = savedEmail;
        rememberMe.checked = true;
      }

      /* Login */

      loginForm.addEventListener("submit", (event) => {
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
        loginButton.disabled = true;
        loginButton.querySelector("span").textContent = "Memproses...";
        setTimeout(() => {
          
          /* LOGIN DEMO */

          const validEmail = "admin@workshop.com";
          const validPassword = "admin123";
          if (email === validEmail && password === validPassword) {
            if (rememberMe.checked) {
              localStorage.setItem("workshopRememberEmail", email);
            } else {
              localStorage.removeItem("workshopRememberEmail");
            }
            sessionStorage.setItem("workshopLoggedIn", "true");
            showSuccess("Login berhasil. Mengarahkan ke dashboard...");
            setTimeout(() => {

              window.location.href = "dashboard.html";
            }, 1000);
          } else {
            showError("Email atau password salah.");
            loginButton.disabled = false;
            loginButton.querySelector("span").textContent = "Masuk";
          }
        }, 700);
      });

      /* Lupa password */
      
      forgotPassword.addEventListener("click", (event) => {
        event.preventDefault();
        showError("Fitur reset password belum terhubung ke backend.");
      });
      function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      }
      function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.add("show");
      }
      function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.classList.add("show");
      }
      function hideMessages() {
        errorMessage.classList.remove("show");
        successMessage.classList.remove("show");
      }
