/* =========================================
   AUTH ADMIN
   Halaman admin hanya bisa dibuka setelah login
   berhasil (Supabase Auth, atau mode lokal).
   ========================================= */

var ADMIN_LOGIN_KEY = "workshopLoggedIn";

function isAdminLoggedIn() {
  try {
    return sessionStorage.getItem(ADMIN_LOGIN_KEY) === "true";
  } catch (error) {
    return false;
  }
}

function setAdminSession(nama = "Administrator Bengkel") {
  sessionStorage.setItem(ADMIN_LOGIN_KEY, "true");
  sessionStorage.setItem("workshopUserName", nama);
}

function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_LOGIN_KEY);
  sessionStorage.removeItem("workshopUserName");
}

/**
 * Guard untuk halaman admin.
 * @returns {Promise<boolean>} true kalau akses diizinkan.
 */
async function requireAdminAuth() {
  const profile = await Auth.restoreSession();

  if (!profile) {
    clearAdminSession();
    window.location.replace("../index.html?role=admin");
    return false;
  }

  if (profile.role !== "admin") {
    await Auth.signOut();
    clearAdminSession();
    window.location.replace("../index.html?role=admin");
    return false;
  }

  setAdminSession(profile.nama || "Administrator Bengkel");

  return true;
}
