/* =========================================
   AUTH CUSTOMER
   Akun customer memakai profil dari Supabase Auth yang tertaut
   ke baris data customer, sehingga data di kedua sisi selalu
   terhubung (1 akun = 1 data customer).
   ========================================= */

/* Kunci session didefinisikan di js/supabase.js (dibagikan semua halaman). */

/**
 * Sesi customer yang sedang login (dari profil Supabase / mode lokal).
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

  /* Mode lokal: sesi disimpan di sessionStorage.
     WAJIB cek role-nya, supaya sesi admin tidak dianggap sesi customer. */
  try {
    const raw = sessionStorage.getItem(CUSTOMER_SESSION_KEY);

    if (!raw) {
      return null;
    }

    const session = JSON.parse(raw);

    if (!session || !session.customerId) {
      return null;
    }

    if (session.role && session.role !== "customer") {
      return null;
    }

    return session;
  } catch (error) {
    console.error("Sesi customer rusak:", error);
    return null;
  }
}

function isCustomerLoggedIn() {
  return getCustomerSession() !== null;
}

function setCustomerSession(account, customer) {
  const session = {
    customerId: customer.id,
    accountId: account.id,
    email: account.email,
    nama: customer.nama,
    loginAt: new Date().toISOString(),
  };

  sessionStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));
  sessionStorage.setItem("workshopCustomerName", customer.nama);

  return session;
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
    window.location.replace("../index.html?role=customer");
    return false;
  }

  if (profile.role !== "customer" || !profile.customer_id) {
    await Auth.signOut();
    clearCustomerSession();
    window.location.replace("../index.html?role=customer");
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

function getCustomerServices(status = null) {
  const vehicles = getCustomerVehicles();

  if (!status) {
    return vehicles;
  }

  return vehicles.filter((item) => item.status === status);
}

/* Total tagihan customer. */

function getCustomerTotalTagihan() {
  return getCustomerVehicles().reduce(
    (total, item) => total + getServiceTotal(item),
    0,
  );
}

function getCustomerBelumLunas() {
  return getCustomerVehicles().filter(
    (item) => item.status === "Selesai" && item.pembayaran !== "Lunas",
  );
}
