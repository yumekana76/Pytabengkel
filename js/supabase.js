/* =====================================================================
   SUPABASE CLIENT + LAYER AUTH
   ---------------------------------------------------------------------
   Semua halaman memakai file ini. Ada 2 mode:

   1. MODE SUPABASE  -> url + anonKey sudah diisi di js/config.js
   2. MODE LOKAL     -> config masih kosong, aplikasi memakai
                       localStorage + login demo seperti semula.

   Halaman cukup memanggil Auth.signIn() / Auth.signOut() tanpa
   perlu tahu mode yang sedang dipakai.
   ===================================================================== */

var SUPABASE_SETTINGS = window.SUPABASE_CONFIG || {};

/* Mode lokal hanya boleh aktif di development.
   Di production, aplikasi WAJIB terhubung ke Supabase. */
var LOCAL_MODE_ALLOWED = SUPABASE_SETTINGS.localModeAllowed !== false;

var IS_SUPABASE_READY = Boolean(
  SUPABASE_SETTINGS.url && SUPABASE_SETTINGS.anonKey,
);

var supabaseClient = null;

if (IS_SUPABASE_READY && window.supabase?.createClient) {
  supabaseClient = window.supabase.createClient(
    SUPABASE_SETTINGS.url,
    SUPABASE_SETTINGS.anonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  );
}

/* Halaman production tanpa credential -> tampilkan pesan jelas,
   bukan diam-diam memakai localStorage. */
function showMissingConfigNotice() {
  if (document.getElementById("configError")) {
    return;
  }

  const notice = document.createElement("div");
  notice.id = "configError";
  notice.className = "config-error";
  notice.innerHTML = `
    <h1>Konfigurasi Supabase belum diisi</h1>
    <p>
      Aplikasi ini berjalan di mode production, jadi <strong>wajib</strong>
      terhubung ke database Supabase.
    </p>
    <p class="config-error-hint">
      Isi <code>js/config.prod.js</code> dengan <code>url</code> dan
      <code>anonKey</code> dari Project Settings &rarr; API, lalu muat ulang
      halaman ini.
    </p>
  `;

  document.body.appendChild(notice);
}

if (!IS_SUPABASE_READY && !LOCAL_MODE_ALLOWED) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showMissingConfigNotice);
  } else {
    showMissingConfigNotice();
  }
}

/* ---------------------------------------------------------------------
   STATE SESSION
   --------------------------------------------------------------------- */

var authState = {
  user: null,
  profile: null,
  mode: IS_SUPABASE_READY ? "supabase" : "local",
};

/* Profil yang sedang login (dipakai oleh initTopbar dll). */
function getCurrentProfile() {
  return authState.profile;
}

/* Perbarui cache profil setelah data profil berubah. */
function setCurrentProfile(patch = {}) {
  authState.profile = { ...(authState.profile || {}), ...patch };

  return authState.profile;
}

function isSupabaseMode() {
  return authState.mode === "supabase";
}

/* ---------------------------------------------------------------------
   HELPER LOCAL (fallback)
   ---------------------------------------------------------------------
   Akun lokal memakai tabel yang sama dengan sisi admin
   (workshop_customer_accounts) supaya perubahan dari admin langsung
   berlaku untuk login customer. */

var LOCAL_ACCOUNTS_KEY = "workshop_customer_accounts";

/* Kunci session (dibagikan oleh semua halaman) */
var LOCAL_SESSION_KEY = "workshopSession";
var CUSTOMER_SESSION_KEY = "workshopCustomerSession";
var ADMIN_SESSION_KEY = "workshopLoggedIn";

function getLocalAccounts() {
  if (typeof getCustomerAccounts === "function") {
    return getCustomerAccounts();
  }

  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    const accounts = raw ? JSON.parse(raw) : null;

    if (Array.isArray(accounts)) {
      return accounts;
    }
  } catch (error) {
    console.error("Akun lokal rusak:", error);
  }

  return [];
}

/* ---------------------------------------------------------------------
   AUTH SERVICE
   --------------------------------------------------------------------- */

var Auth = {
  /* Login pakai email + password. */
  async signIn(email, password) {
    if (!isSupabaseMode()) {
      return this.signInLocal(email, password);
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: String(email || "").trim(),
      password: String(password || ""),
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    const profile = await this.loadProfile(data.user);

    if (!profile) {
      await supabaseClient.auth.signOut();
      return {
        ok: false,
        error: "Profil pengguna tidak ditemukan.",
      };
    }

    authState.user = data.user;
    authState.profile = profile;

    return { ok: true, profile };
  },

  /* Daftar akun baru (customer). */
  async signUp(payload) {
    if (!isSupabaseMode()) {
      return this.signUpLocal(payload);
    }

    const email = String(payload.email || "").trim();

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password: String(payload.password || ""),
      options: {
        data: {
          nama: payload.nama || "",
          telepon: payload.telepon || "",
          alamat: payload.alamat || "",
        },
      },
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    /* Kalau email belum diverifikasi, session belum terbentuk. */
    if (!data.session) {
      return {
        ok: true,
        needsEmailConfirmation: true,
        profile: null,
      };
    }

    const profile = await this.loadProfile(data.user);

    authState.user = data.user;
    authState.profile = profile;

    return { ok: true, profile, needsEmailConfirmation: false };
  },

  /* Kirim link login (magic link) ke email customer. */
  async sendLoginLink(email, redirectTo) {
    if (!isSupabaseMode()) {
      return {
        ok: false,
        error: "Fitur ini hanya tersedia pada mode Supabase.",
      };
    }

    const { error } = await supabaseClient.auth.signInWithOtp({
      email: String(email || "").trim(),
      options: {
        emailRedirectTo: redirectTo || window.location.origin,
        shouldCreateUser: true,
      },
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  },

  /* Kirim email reset password. */
  async resetPassword(email, redirectTo) {
    if (!isSupabaseMode()) {
      return {
        ok: false,
        error: "Fitur ini hanya tersedia pada mode Supabase.",
      };
    }

    const { error } = await supabaseClient.auth.resetPasswordForEmail(
      String(email || "").trim(),
      { redirectTo: redirectTo || window.location.origin },
    );

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  },

  /* Ganti password user yang sedang login. */
  async updatePassword(password) {
    if (!isSupabaseMode()) {
      return {
        ok: false,
        error: "Fitur ini hanya tersedia pada mode Supabase.",
      };
    }

    const { error } = await supabaseClient.auth.updateUser({ password });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  },

  /* Email LOGIN pengguna yang sedang aktif (sumbernya Supabase Auth,
     bukan tabel profiles — bisa berbeda sementara kalau perubahan email
     sedang menunggu konfirmasi). */
  currentUserEmail() {
    if (isSupabaseMode()) {
      return authState.user?.email || authState.profile?.email || "";
    }

    return authState.profile?.email || "";
  },

  /* Verifikasi password lama TANPA mengubah apa pun.
     Dipakai halaman Profil sebelum password / email boleh diganti. */
  async verifyPassword(password) {
    const email = this.currentUserEmail();

    if (!email) {
      return { ok: false, error: "Sesi login berakhir. Silakan masuk kembali." };
    }

    if (!isSupabaseMode()) {
      await dbInit();

      const target = email.trim().toLowerCase();
      const account = getLocalAccounts().find(
        (item) => String(item.email || "").toLowerCase() === target,
      );

      return account && account.password === password
        ? { ok: true }
        : { ok: false, error: "Password saat ini salah." };
    }

    try {
      /* Client CADANGAN dengan persistSession:false: percobaan ini
         tidak boleh menimpa, memperbarui, atau mematikan sesi yang
         sedang dipakai halaman. */
      const probe = window.supabase.createClient(
        SUPABASE_SETTINGS.url,
        SUPABASE_SETTINGS.anonKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        },
      );

      /* Email cadangan dipakai kalau perubahan email belum/telah
         disinkronkan antara Supabase Auth dan tabel profiles. */
      const candidates = [
        ...new Set(
          [email, authState.profile?.email].filter(
            (item) => item && String(item).trim(),
          ),
        ),
      ];

      for (const target of candidates) {
        const { error } = await probe.auth.signInWithPassword({
          email: String(target).trim(),
          password: String(password || ""),
        });

        if (!error) {
          return { ok: true };
        }
      }

      return { ok: false, error: "Password saat ini salah." };
    } catch (error) {
      return {
        ok: false,
        error: error?.message || "Gagal memverifikasi password.",
      };
    }
  },

  /* Ganti email LOGIN (Supabase Auth).
     `applied = true`  -> email langsung berlaku (konfirmasi dinonaktifkan)
     `applied = false` -> Supabase mengirim tautan konfirmasi; email login
                          baru berlaku setelah tautan itu dibuka. */
  async updateEmail(email) {
    if (!isSupabaseMode()) {
      return { ok: true, applied: true };
    }

    const next = String(email || "").trim();
    const current = this.currentUserEmail();

    if (!next || next.toLowerCase() === current.toLowerCase()) {
      return { ok: true, applied: true };
    }

    const { data, error } = await supabaseClient.auth.updateUser({
      email: next,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    const returned = String(data?.user?.email || "").toLowerCase();

    /* Kalau perubahan langsung berlaku, sinkronkan juga email pada
       objek sesi supaya langkah berikutnya (verifikasi password) tidak
       memakai email lama yang sudah kedaluwarsa. */
    if (returned === next.toLowerCase()) {
      if (authState.user) authState.user.email = next;
      if (authState.profile) authState.profile.email = next;
      return { ok: true, applied: true };
    }

    return { ok: true, applied: false };
  },

  /* Atur password baru untuk akun lokal (mode demo). */
  async setLocalPassword(email, password) {
    await dbInit();

    const target = String(email || "")
      .trim()
      .toLowerCase();
    const accounts = getLocalAccounts();
    const index = accounts.findIndex(
      (item) => String(item.email || "").toLowerCase() === target,
    );

    if (index === -1) {
      return { ok: false, error: "Email tidak terdaftar pada akun customer." };
    }

    accounts[index] = { ...accounts[index], password };

    saveCustomerAccounts(accounts);

    return { ok: true };
  },

  /* Ambil session + profil (dipakai guard setiap halaman). */
  async restoreSession() {
    if (!isSupabaseMode()) {
      return this.restoreLocalSession();
    }

    const { data, error } = await supabaseClient.auth.getSession();

    if (error || !data.session?.user) {
      authState.user = null;
      authState.profile = null;
      return null;
    }

    const profile = await this.loadProfile(data.session.user);

    authState.user = data.session.user;
    authState.profile = profile;

    return profile;
  },

  async signOut() {
    if (isSupabaseMode()) {
      await supabaseClient.auth.signOut();
    }

    sessionStorage.removeItem("workshopLoggedIn");
    sessionStorage.removeItem("workshopUserName");
    sessionStorage.removeItem("workshopCustomerSession");
    sessionStorage.removeItem("workshopCustomerName");
    /* Sesi lokal tunggal juga harus dihapus, kalau tidak
       restoreLocalSession() akan menganggap pengguna masih masuk. */
    sessionStorage.removeItem(LOCAL_SESSION_KEY);

    authState.user = null;
    authState.profile = null;
  },

  /* Ambil baris profile user dari tabel profiles. */
  async loadProfile(user) {
    if (!user) {
      return null;
    }

    const { data, error } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Gagal memuat profile:", error);
      return null;
    }

    if (data) {
      return data;
    }

    /* Profile belum ada (mis. user dibuat manual) -> buat otomatis. */
    const meta = user.user_metadata || {};

    const insert = {
      id: user.id,
      nama: meta.nama || user.email?.split("@")[0] || "Customer",
      telepon: meta.telepon || "",
      email: user.email || "",
      alamat: meta.alamat || "",
      role: "customer",
    };

    const { data: created, error: insertError } = await supabaseClient
      .from("profiles")
      .insert(insert)
      .select("*")
      .single();

    if (insertError) {
      /* Profil tidak bisa dibuat (mis. RLS / trigger belum jalan).
         Tetap lanjut dengan profil minimal supaya tidak terjadi
         pengalihan berulang ke halaman login. */
      console.warn("Gagal membuat profile:", insertError.message);

      return {
        id: user.id,
        nama: insert.nama,
        telepon: insert.telepon,
        email: insert.email,
        alamat: insert.alamat,
        role: insert.role,
        customer_id: null,
      };
    }

    return created;
  },

  /* ---------------- MODE LOKAL (fallback) ---------------- */

  async signInLocal(email, password) {
    if (!LOCAL_MODE_ALLOWED) {
      return {
        ok: false,
        error: "Mode lokal dinonaktifkan di production. Gunakan akun Supabase.",
      };
    }

    await dbInit();

    const target = String(email || "")
      .trim()
      .toLowerCase();
    const account = getLocalAccounts().find(
      (item) => String(item.email).toLowerCase() === target,
    );

    if (!account || account.password !== password) {
      return { ok: false, error: "Email atau password salah." };
    }

    const customer = account.customerId
      ? getCustomerById(account.customerId)
      : null;

    const role = account.role === "admin" ? "admin" : "customer";

    authState.user = { email: account.email };
    authState.profile = {
      id: `local-${role}`,
      email: account.email,
      nama: customer?.nama || account.nama || "Customer",
      role,
      customer_id: customer ? Number(customer.id) : null,
    };

    /* Simpan SESI TUNGGAL. Jangan pernah ada sesi admin dan customer
       bersamaan, kalau tidak guard akan saling menolak (login loop). */
    const session = {
      role,
      customerId: authState.profile.customer_id,
      email: account.email,
      nama: authState.profile.nama,
      loginAt: new Date().toISOString(),
    };

    sessionStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));

    if (role === "admin") {
      sessionStorage.setItem("workshopLoggedIn", "true");
      sessionStorage.setItem("workshopUserName", session.nama);
      sessionStorage.removeItem(CUSTOMER_SESSION_KEY);
      sessionStorage.removeItem("workshopCustomerName");
    } else {
      sessionStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));
      sessionStorage.setItem("workshopCustomerName", session.nama);
      sessionStorage.removeItem("workshopLoggedIn");
      sessionStorage.removeItem("workshopUserName");
    }

    return { ok: true, profile: authState.profile };
  },

  async signUpLocal(payload) {
    await dbInit();

    const email = String(payload.email || "").trim();
    const accounts = getLocalAccounts();

    if (
      accounts.some(
        (item) => String(item.email).toLowerCase() === email.toLowerCase(),
      )
    ) {
      return { ok: false, error: "Email sudah terdaftar. Silakan masuk." };
    }

    const customers = getCustomers();
    const existing = customers.find(
      (customer) =>
        String(customer.email || "").toLowerCase() === email.toLowerCase(),
    );

    let customer = existing;

    if (customer) {
      customer.nama = payload.nama || customer.nama;
      customer.telepon = payload.telepon || customer.telepon;
      customer.alamat = payload.alamat || customer.alamat;
    } else {
      customer = {
        id: nextNumericId(customers),
        nama: payload.nama,
        telepon: payload.telepon,
        email,
        alamat: payload.alamat || "",
        catatan: "",
        registeredAt: new Date().toISOString(),
        registeredVia: "customer",
      };
      customers.push(customer);
    }

    saveCustomers(customers);

    accounts.push({
      id: nextNumericId(accounts),
      customerId: customer.id,
      nama: customer.nama,
      email,
      password: payload.password,
      role: "customer",
      createdAt: new Date().toISOString(),
    });

    saveCustomerAccounts(accounts);

    return this.signInLocal(email, payload.password);
  },

  async restoreLocalSession() {
    const raw = sessionStorage.getItem(LOCAL_SESSION_KEY);

    if (raw) {
      try {
        const session = JSON.parse(raw);
        const role = session.role === "admin" ? "admin" : "customer";

        authState.user = null;
        authState.profile = {
          id: `local-${role}`,
          email: session.email,
          nama: session.nama,
          role,
          customer_id: session.customerId ?? null,
        };

        return authState.profile;
      } catch (error) {
        console.error("Sesi lokal rusak:", error);
      }
    }

    /* Fallback untuk sesi lama (sebelum ada LOCAL_SESSION_KEY). */
    const isAdmin = sessionStorage.getItem(ADMIN_SESSION_KEY) === "true";
    const customerRaw = sessionStorage.getItem(CUSTOMER_SESSION_KEY);

    if (!isAdmin && !customerRaw) {
      return null;
    }

    let legacy = {};

    if (customerRaw) {
      try {
        legacy = JSON.parse(customerRaw) || {};
      } catch (error) {
        legacy = {};
      }
    }

    authState.user = null;
    authState.profile = isAdmin
      ? {
          id: "local-admin",
          email: "admin@workshop.com",
          nama: sessionStorage.getItem("workshopUserName") || "Administrator",
          role: "admin",
          customer_id: null,
        }
      : {
          id: "local-customer",
          email: legacy.email || "customer@workshop.com",
          nama:
            legacy.nama ||
            sessionStorage.getItem("workshopCustomerName") ||
            "Customer",
          role: "customer",
          customer_id: legacy.customerId ? Number(legacy.customerId) : null,
        };

    return authState.profile;
  },
};
