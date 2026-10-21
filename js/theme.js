/* =========================================
   THEME (LIGHT / DARK)
   Dipakai bersama oleh halaman admin,
   halaman customer, dan halaman login.
   ========================================= */

var THEME_KEY = "workshop_theme";

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch (error) {
    return null;
  }
}

function getPreferredTheme() {
  const stored = getStoredTheme();

  if (stored === "light" || stored === "dark") {
    return stored;
  }

  if (window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  return "light";
}

function applyTheme(theme) {
  const value = theme === "dark" ? "dark" : "light";

  document.documentElement.setAttribute("data-theme", value);

  try {
    localStorage.setItem(THEME_KEY, value);
  } catch (error) {
    /* localStorage bisa tidak tersedia (mode privat) */
  }

  return value;
}

function getCurrentTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

function toggleTheme() {
  return applyTheme(getCurrentTheme() === "dark" ? "light" : "dark");
}

function updateThemeButtons() {
  const theme = getCurrentTheme();

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    button.setAttribute(
      "aria-label",
      theme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap",
    );
    button.title =
      theme === "dark"
        ? "Mode gelap aktif — klik untuk terang"
        : "Mode terang aktif — klik untuk gelap";
  });
}

function initTheme() {
  applyTheme(getPreferredTheme());
  updateThemeButtons();

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    if (button.dataset.themeBound === "true") return;
    button.dataset.themeBound = "true";
    button.addEventListener("click", () => {
      toggleTheme();
      updateThemeButtons();
    });
  });

  if (window.matchMedia) {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (event) => {
        if (!getStoredTheme()) {
          applyTheme(event.matches ? "dark" : "light");
          updateThemeButtons();
        }
      });
  }
}

/* Script kecil yang disisipkan di <head> agar tema
   tidak berkedip (flash) sebelum halaman selesai dimuat. */
function applyThemeBeforePaint() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    const theme =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (error) {
    document.documentElement.setAttribute("data-theme", "light");
  }
}
