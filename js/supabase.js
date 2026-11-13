/* =====================================================================
   SUPABASE CLIENT + LAYER AUTH
   ---------------------------------------------------------------------
   Semua halaman memakai file ini. Hanya ADA SATU mode: Supabase.
   Mode lokal (localStorage + akun demo) sudah dihapus — semua data
   dan login diurus Supabase. Kalau credential belum terisi, halaman
   menampilkan pesan konfigurasi (lihat showMissingConfigNotice).

   Halaman cukup memanggil Auth.signIn() / Auth.signOut() tanpa
   perlu tahu mode yang sedang dipakai.
   ===================================================================== */

var SUPABASE_SETTINGS = window.SUPABASE_CONFIG || {};

/* Pesan untuk semua jalur saat credential belum terisi. */
var SUPABASE_UNAVAILABLE =
  "Aplikasi belum terhubung ke Supabase. Isi konfigurasi lalu muat ulang halaman.";

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

  /* Pantau peristiwa auth (khususnya PASSWORD_RECOVERY dari tautan
     reset password) sejak client dibuat, supaya halaman login bisa
     menampilkan form atur password baru. */
  try {
    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        window.__passwordRecovery = true;
        if (typeof window.onPasswordRecovery === "function") {
          window.onPasswordRecovery(session);
        }
      }
    });
  } catch (error) {
    /* Tidak fatal — halaman login tetap bisa jalan. */
  }
}

/* Halaman tanpa credential -> tampilkan pesan jelas,
   bukan diam-diam memakai data lokal. */
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
      Aplikasi ini <strong>wajib</strong> terhubung ke database Supabase —
      tidak ada mode lokal lagi.
    </p>
    <p class="config-error-hint">
      Isi environment variable <code>SUPABASE_URL</code> +
      <code>SUPABASE_ANON_KEY</code> (Vercel Environment Variables, atau
      <code>.env</code> + <code>node scripts/build-config.js</code> untuk
      lokal) lalu muat ulang halaman ini.
    </p>
  `;

  document.body.appendChild(notice);
}

if (!IS_SUPABASE_READY) {
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
   ROLE
   Hierarki: super_admin > admin > customer.
   Hanya super_admin yang boleh mengubah role pengguna lain (dijaga
   juga di database lewat is_super_admin() + admin_set_user_role()).
   --------------------------------------------------------------------- */

function normalizeRole(value) {
  if (value === "super_admin" || value === "admin") {
    return value;
  }

  return "customer";
}

function isAdminRole(role) {
  return role === "admin" || role === "super_admin";
}

function isSuperAdminRole(role) {
  return role === "super_admin";
}

function getRoleLabel(role) {
  if (role === "super_admin") return "Super Admin";
  if (role === "admin") return "Administrator";
  return "Customer";
}

/* ---------------------------------------------------------------------
   HELPER SESSION
   ---------------------------------------------------------------------
   Kunci session (dibagikan oleh semua halaman). */

var LOCAL_SESSION_KEY = "workshopSession";
var CUSTOMER_SESSION_KEY = "workshopCustomerSession";
var ADMIN_SESSION_KEY = "workshopLoggedIn";

/* ---------------------------------------------------------------------
   AUTH SERVICE
   --------------------------------------------------------------------- */

var Auth = {
  /* Login pakai email + password. */
  async signIn(email, password) {
    if (!supabaseClient) {
      return { ok: false, error: SUPABASE_UNAVAILABLE };
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
    if (!supabaseClient) {
      return { ok: false, error: SUPABASE_UNAVAILABLE };
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
    if (!supabaseClient) {
      return { ok: false, error: SUPABASE_UNAVAILABLE };
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
    if (!supabaseClient) {
      return { ok: false, error: SUPABASE_UNAVAILABLE };
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
    if (!supabaseClient) {
      return { ok: false, error: SUPABASE_UNAVAILABLE };
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
    return authState.user?.email || authState.profile?.email || "";
  },

  /* Verifikasi password lama TANPA mengubah apa pun.
     Dipakai halaman Profil sebelum password / email boleh diganti. */
  async verifyPassword(password) {
    const email = this.currentUserEmail();

    if (!email) {
      return { ok: false, error: "Sesi login berakhir. Silakan masuk kembali." };
    }

    if (!supabaseClient) {
      return { ok: false, error: SUPABASE_UNAVAILABLE };
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
    if (!supabaseClient) {
      return { ok: false, error: SUPABASE_UNAVAILABLE };
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
    /* Mode lokal sudah dihapus — reset password hanya lewat tautan email
       (Auth.resetPassword). */
    return { ok: false, error: SUPABASE_UNAVAILABLE };
  },

  /* Ambil session + profil (dipakai guard setiap halaman). */
  async restoreSession() {
    if (!supabaseClient) {
      /* Tanpa koneksi tidak ada sesi — guard halaman akan mengembalikan
         pengguna ke login (pesan konfigurasi sudah tampil di overlay). */
      authState.user = null;
      authState.profile = null;
      return null;
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
    /* Sesi lokal lama juga harus dihapus (warisan mode lokal). */
    sessionStorage.removeItem(LOCAL_SESSION_KEY);

    authState.user = null;
    authState.profile = null;
  },

  /* Hapus akun yang sedang login.
     Panggil RPC delete_my_account() (security definer), lalu bersihkan
     sesi. Data customer/service TIDAK dihapus — hanya akun login-nya. */
  async deleteAccount() {
    const profile = getCurrentProfile();

    if (isAdminRole(profile?.role)) {
      return {
        ok: false,
        error: "Akun staf tidak dapat dihapus dari halaman customer.",
      };
    }

    if (!supabaseClient) {
      return { ok: false, error: SUPABASE_UNAVAILABLE };
    }

    const { error } = await supabaseClient.rpc("delete_my_account");

    if (error) {
      const pesan = String(error.message || "");
      const belumAktif =
        pesan.toLowerCase().includes("could not find the function") ||
        pesan.toLowerCase().includes("does not exist");

      return {
        ok: false,
        error: belumAktif
          ? "Fitur hapus akun belum aktif di server. Jalankan ulang supabase/schema.sql."
          : pesan || "Gagal menghapus akun.",
      };
    }

    try {
      await this.signOut();
    } catch (signOutError) {
      /* Akun sudah terhapus; sesi lokal tetap harus dibersihkan. */
      sessionStorage.removeItem("workshopLoggedIn");
      sessionStorage.removeItem("workshopUserName");
      sessionStorage.removeItem("workshopCustomerSession");
      sessionStorage.removeItem("workshopCustomerName");
      sessionStorage.removeItem(LOCAL_SESSION_KEY);
      authState.user = null;
      authState.profile = null;
    }

    return { ok: true };
  },

  /* Ambil baris profile user dari tabel profiles. */
  async loadProfile(user) {
    if (!user) {
      return null;
    }

    /* Jalur utama: RPC security definer yang membuat profil +
       menghubungkan ke customer secara idempoten (aman dari policy
       INSERT self yang hanya untuk admin). */
    try {
      const { data: rpcData, error: rpcError } = await supabaseClient.rpc(
        "ensure_my_profile",
      );

      if (!rpcError && Array.isArray(rpcData) && rpcData.length) {
        return rpcData[0];
      }

      if (rpcError) {
        console.warn("ensure_my_profile gagal, fallback SELECT:", rpcError.message);
      }
    } catch (error) {
      console.warn("ensure_my_profile error, fallback SELECT:", error?.message || error);
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

};
