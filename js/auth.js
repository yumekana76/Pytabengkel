/* =========================================
   AUTH ADMIN
   Halaman admin hanya bisa dibuka setelah login
   berhasil via Supabase Auth.
   ========================================= */

var ADMIN_LOGIN_KEY = "workshopLoggedIn";

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
    window.location.replace("/html/index.html?role=admin");
    return false;
  }

  if (!isAdminRole(profile.role)) {
    await Auth.signOut();
    clearAdminSession();
    window.location.replace("/html/index.html?role=admin");
    return false;
  }

  setAdminSession(profile.nama || "Administrator Bengkel");

  return true;
}

/**
 * Guard khusus halaman yang hanya boleh dibuka super admin
 * (mis. Kelola Pengguna).
 * @returns {Promise<boolean>} true kalau akses diizinkan.
 */
async function requireSuperAdminAuth() {
  const profile = await Auth.restoreSession();

  if (!profile) {
    clearAdminSession();
    window.location.replace("/html/index.html?role=super_admin");
    return false;
  }

  if (!isSuperAdminRole(profile.role)) {
    /* Admin biasa tetap login — cukup kembalikan ke dashboard, bukan
       memaksa keluar dari akun. */
    window.location.replace("/html/admin-page/dashboard.html");
    return false;
  }

  setAdminSession(profile.nama || "Super Admin Bengkel");

  return true;
}
