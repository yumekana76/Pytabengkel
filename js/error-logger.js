/* =====================================================================
   ERROR LOGGER SISI CLIENT (js/error-logger.js)
   ---------------------------------------------------------------------
   Menangkap semua error JavaScript yang tidak tertangani:
     * window "error"               -> error script / runtime
     * window "unhandledrejection"   -> promise yang gagal

   Lalu:
     1. dicatat ke localStorage (workshop_client_errors) — admin tetap
        bisa melihat walau server tidak terjangkau;
     2. dikirim ke tabel Supabase `client_errors` (sekali per pesan
        unik per halaman) — dibaca admin di Pengaturan > Log Error
        Klien;
     3. jaring pengaman skeleton: kalau halaman gagal boot (skeleton
        masih terpasang lama sekali setelah error), skeleton dilepas
        supaya pengguna tidak terkunci di layar kosong.

   File ini sengaja VANILLA tanpa dependensi apa pun — dipasang
   paling awal di <head> dan tidak boleh ikut menghasilkan error.
   ===================================================================== */
(function () {
  "use strict";

  var STORE_KEY = "workshop_client_errors";
  var MAX_LOCAL_ROWS = 50;
  var MAX_SERVER_REPORTS = 10;
  var REPORT_WAIT_TRIES = 40; /* 40 x 250ms = 10 detik maks menunggu */
  var SKELETON_RESCUE_MS = 10000;

  var sentMessages = Object.create(null); /* pesan sudah dikirim ke server */
  var serverReportCount = 0;
  var localReportCount = 0;
  var skeletonRescueScheduled = false;

  function readRows() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORE_KEY));
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeRows(rows) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(rows.slice(0, MAX_LOCAL_ROWS)));
    } catch (error) {
      /* localStorage penuh/di-seksi private — abaikan, jangan pernah
         melempar error dari dalam error handler ini sendiri. */
    }
  }

  function pageName() {
    var path = String(window.location.pathname || "").split("/").pop() || "";
    return path + String(window.location.search || "");
  }

  /* Simpan ke localStorage (dengan dedup: pesan sama -> jumlah naik). */
  function recordLocal(message, stack) {
    try {
      var rows = readRows();
      var now = new Date().toISOString();
      var found = null;
      var i;

      for (i = 0; i < rows.length; i += 1) {
        if (rows[i].pesan === message) {
          found = rows[i];
          break;
        }
      }

      if (found) {
        found.jumlah = (found.jumlah || 1) + 1;
        found.waktu = now;
        /* Pindahkan ke depan supaya yang terbaru selalu tampil pertama. */
        rows.splice(rows.indexOf(found), 1);
        rows.unshift(found);
      } else {
        rows.unshift({
          pesan: message,
          stack: stack || "",
          halaman: pageName(),
          waktu: now,
          jumlah: 1,
        });
      }

      writeRows(rows);
    } catch (error) {
      /* diamkan */
    }
  }

  /* Kirim ke Supabase client_errors (sekali per pesan unik).
     Menunggu supabaseClient siap karena error bisa terjadi sebelum
     skrip config/supabase sempat dieksekusi. */
  function reportToServer(message, stack) {
    if (serverReportCount >= MAX_SERVER_REPORTS) return;

    var key = pageName() + "|" + message;
    if (sentMessages[key]) return;
    sentMessages[key] = true;

    var tries = 0;
    var timer = window.setInterval(function () {
      tries += 1;

      var client = typeof supabaseClient !== "undefined" ? supabaseClient : null;

      if (client) {
        window.clearInterval(timer);
        serverReportCount += 1;

        try {
          var payload = {
            pesan: String(message).slice(0, 500),
            stack: String(stack || "").slice(0, 2000),
            halaman: pageName().slice(0, 200),
            user_agent: String(window.navigator.userAgent || "").slice(0, 300),
          };

          var request = client.from("client_errors").insert(payload);

          /* Abaikan hasil: logging tidak boleh menggagalkan halaman.
             PostgREST builder mendukung .then(); mode lokal tidak
             akan pernah sampai ke sini (client null). */
          if (request && typeof request.then === "function") {
            request.then(
              function () {},
              function () {},
            );
          }
        } catch (error) {
          /* diamkan */
        }
      }

      if (tries >= REPORT_WAIT_TRIES) {
        window.clearInterval(timer);
      }
    }, 250);
  }

  /* Lepas skeleton kalau boot benar-benar macet (ada error DAN
     skeleton masih terpasang setelah 10 detik). */
  function scheduleSkeletonRescue() {
    if (skeletonRescueScheduled) return;
    skeletonRescueScheduled = true;

    window.setTimeout(function () {
      try {
        var skeleton = document.getElementById("appSkeleton");
        if (skeleton && !skeleton.classList.contains("hidden")) {
          skeleton.parentNode.removeChild(skeleton);
          console.warn(
            "[error-logger] Skeleton dilepas otomatis — halaman gagal boot.",
          );
        }
      } catch (error) {
        /* diamkan */
      }
    }, SKELETON_RESCUE_MS);
  }

  function handleError(message, stack) {
    var text = String(message || "Error tanpa pesan");

    console.error("[error-logger]", text, stack || "");

    localReportCount += 1;
    if (localReportCount <= MAX_LOCAL_ROWS) {
      recordLocal(text, stack);
      reportToServer(text, stack);
      scheduleSkeletonRescue();
    }
  }

  window.addEventListener("error", function (event) {
    /* Error pada elemen <img>/<script> (resource) juga tercatat —
       pesannya informatif untuk debugging CSP / path yang salah. */
    handleError(
      event && event.message ? event.message : "Unknown error",
      event && event.error && event.error.stack
        ? String(event.error.stack)
        : "",
    );
  });

  window.addEventListener("unhandledrejection", function (event) {
    var reason = event && event.reason;
    handleError(
      reason && reason.message
        ? reason.message
        : reason
          ? String(reason)
          : "Promise rejection tanpa alasan",
      reason && reason.stack ? String(reason.stack) : "",
    );
  });

  /* Penanda untuk modul lain (Pengaturan admin) — tanpa error. */
  try {
    window.__errorLogger = {
      getLocalRows: readRows,
      clearLocalRows: function () {
        try {
          localStorage.removeItem(STORE_KEY);
        } catch (error) {
          /* diamkan */
        }
      },
      pageName: pageName,
    };
  } catch (error) {
    /* diamkan */
  }
})();
