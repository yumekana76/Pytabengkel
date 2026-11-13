/* =========================================
   AUTH CUSTOMER
   Akun customer memakai profil dari Supabase Auth yang tertaut
   ke baris data customer, sehingga data di kedua sisi selalu
   terhubung (1 akun = 1 data customer).
   ========================================= */

/* Kunci session didefinisikan di js/supabase.js (dibagikan semua halaman). */

/**
 * Sesi customer yang sedang login (dari profil Supabase).
 * @returns {object|null}
 */
function getCustomerSession() {
  const profile = getCurrentProfile();

  if (profile && profile.role === "customer" && profile.customer_id) {
    return {
      customerId: Number(profile.customer_id),
      email: profile.email,
      nama: profile.nama,
      loginAt: profile.login_at || new Date().toISOString(),
    };
  }

  /* Mode lokal sudah dihapus — tanpa profil tertaut ke data customer,
     tidak ada sesi customer yang sah. */
  return null;
}

function isCustomerLoggedIn() {
  return getCustomerSession() !== null;
}

function clearCustomerSession() {
  sessionStorage.removeItem(CUSTOMER_SESSION_KEY);
  sessionStorage.removeItem("workshopCustomerName");
}

/* Perbarui data sesi tanpa damaging session di halaman lain. */

function updateCustomerSession(changes = {}) {
  const session = getCustomerSession();

  if (!session) {
    return null;
  }

  const updated = { ...session, ...changes };

  sessionStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(updated));

  if (updated.nama) {
    sessionStorage.setItem("workshopCustomerName", updated.nama);
  }

  return updated;
}

/**
 * Guard untuk halaman customer.
 * @returns {Promise<boolean>} true kalau akses diizinkan.
 */
async function requireCustomerAuth() {
  const profile = await Auth.restoreSession();

  if (!profile) {
    clearCustomerSession();
    window.location.replace("/html/index.html?role=customer");
    return false;
  }

  if (profile.role !== "customer" || !profile.customer_id) {
    await Auth.signOut();
    clearCustomerSession();
    window.location.replace("/html/index.html?role=customer");
    return false;
  }

  sessionStorage.setItem("workshopCustomerName", profile.nama || "Customer");

  return true;
}

/* Data customer yang sedang login (diambil dari tabel customer). */

function getCurrentCustomer() {
  const session = getCustomerSession();

  if (!session) {
    return null;
  }

  return getCustomerById(session.customerId);
}

/* Kendaraan milik customer yang sedang login. */

function getCustomerVehicles(customerId = null) {
  const session = getCustomerSession();
  const targetId =
    customerId !== null ? customerId : session ? session.customerId : null;

  if (!targetId) {
    return [];
  }

  return getKendaraan()
    .filter((item) => Number(item.pelangganId) === Number(targetId))
    .sort((a, b) => Number(b.id) - Number(a.id));
}

/* Service selesai yang belum lunas (untuk kartu tagihan). */

function getCustomerBelumLunas() {
  return getCustomerVehicles().filter(
    (item) => item.status === "Selesai" && item.pembayaran !== "Lunas",
  );
}
