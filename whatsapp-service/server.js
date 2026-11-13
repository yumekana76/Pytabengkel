
import http from "node:http";
import dotenv from "dotenv";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import {
  detectChanges,
  dedupKey,
  formatServiceMessage
} from "./messages.js";

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.API_KEY;
const AUTH_DIR = process.env.AUTH_DIR || "./auth_info";

/* Opsional: secret tambahan khusus Supabase Database Webhook.
   Kalau kosong, webhook boleh memakai x-api-key seperti endpoint lain. */
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

/* Opsional: lookup nomor telepon customer dari webhook Supabase.
   Pakai SERVICE_ROLE key (melewati RLS) — jangan dipakai di frontend. */
const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim()
  .replace(/\/+$/, "");
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  "";

const WORKSHOP_NAME = process.env.WORKSHOP_NAME || "Pytabengkel";

/* Window anti-duplikat (ms): event sama ke nomor sama dalam rentang ini
   tidak dikirim dua kali. */
const DEDUP_WINDOW_MS = Number(process.env.DEDUP_WINDOW_MS || 180000);

let sock;
let status = "disconnected";
let connecting = false;
let lastError = null;

if (!API_KEY) {
  throw new Error("API_KEY belum diatur");
}

/* ---------------------------------------------------------------------
   DEDUP PENGIRIMAN
   --------------------------------------------------------------------- */
const recentlySent = new Map(); // key -> timestamp (ms)

function isDuplicate(key) {
  const now = Date.now();

  for (const [k, ts] of recentlySent) {
    if (now - ts > DEDUP_WINDOW_MS) recentlySent.delete(k);
  }

  if (recentlySent.has(key)) return true;

  recentlySent.set(key, now);
  return false;
}

/* Pengiriman disusun satu per satu supaya tidak tabrakan. */
let sendChain = Promise.resolve();

function enqueueSend(task) {
  const run = sendChain.then(task, task);
  sendChain = run.catch(() => {});
  return run;
}

/* ---------------------------------------------------------------------
   KONEKSI WHATSAPP (Baileys)
   --------------------------------------------------------------------- */

async function connectWhatsApp() {
  if (connecting) return;
  connecting = true;

  try {
    const { state, saveCreds } =
      await useMultiFileAuthState(AUTH_DIR);

    sock = makeWASocket({
      auth: state
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
      const { connection, qr, lastDisconnect } = update;

      if (qr) {
        status = "waiting_qr";
        console.log("Scan QR berikut dengan WhatsApp (Perangkat Tertaut):");
        qrcode.generate(qr, { small: true });
      }

      if (connection === "open") {
        status = "connected";
        lastError = null;
        console.log("WhatsApp connected");
      }

      if (connection === "close") {
        status = "disconnected";
        sock = null;

        const code =
          lastDisconnect?.error?.output?.statusCode;
        lastError = lastDisconnect?.error?.message || null;

        if (code !== DisconnectReason.loggedOut) {
          setTimeout(connectWhatsApp, 5000);
        } else {
          status = "logged_out";
          console.log("WhatsApp perlu dihubungkan ulang (hapus auth_info lalu jalankan ulang)");
        }
      }
    });

  } catch (error) {
    console.error("Connection error:", error);
    lastError = error?.message || String(error);
    setTimeout(connectWhatsApp, 10000);
  } finally {
    connecting = false;
  }
}

/* ---------------------------------------------------------------------
   HTTP HELPERS
   --------------------------------------------------------------------- */

function sendJSON(res, code, data) {
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key, x-webhook-secret"
  });

  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", chunk => {
      body += chunk;

      if (body.length > 50000) {
        reject(new Error("Payload terlalu besar"));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("JSON tidak valid"));
      }
    });

    req.on("error", reject);
  });
}

/* Otorisasi: x-api-key (API_KEY) ATAU x-webhook-secret (?secret=)
   yang cocok dengan WEBHOOK_SECRET / API_KEY. */
function isAuthorized(req, url) {
  const apiKey = req.headers["x-api-key"];
  if (apiKey && apiKey === API_KEY) return true;

  const webhookSecret =
    req.headers["x-webhook-secret"] || url.searchParams.get("secret");
  if (webhookSecret) {
    if (WEBHOOK_SECRET && webhookSecret === WEBHOOK_SECRET) return true;
    if (webhookSecret === API_KEY) return true;
  }

  return false;
}

/* ---------------------------------------------------------------------
   LOOKUP NOMOR TELEPON CUSTOMER (untuk webhook Supabase)
   --------------------------------------------------------------------- */

async function fetchCustomerPhone(customerId) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !customerId) {
    return null;
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/customers?id=eq.${encodeURIComponent(customerId)}&select=telepon&limit=1`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      }
    );

    if (!res.ok) return null;

    const rows = await res.json();
    const telepon = rows?.[0]?.telepon;
    return telepon ? String(telepon) : null;
  } catch (error) {
    console.error("Lookup telepon gagal:", error?.message || error);
    return null;
  }
}

function normalizePhone(value) {
  let phone = String(value || "").replace(/\D/g, "");

  /* Format lokal 08xx / 8xx -> internasional 628xx. */
  if (phone.startsWith("0")) phone = `62${phone.slice(1)}`;
  else if (phone.startsWith("8")) phone = `62${phone}`;

  return phone;
}

/* ---------------------------------------------------------------------
   KIRIM NOTIFIKASI INFO KENDARAAN
   --------------------------------------------------------------------- */

/**
 * Kirim pesan WhatsApp berdasarkan data service.
 * @param {object} input
 * @param {object} input.service  baris service (camelCase / snake_case)
 * @param {string[]} [input.events] event hasil deteksi; kalau kosong
 *                                  dianggap "update"
 * @param {string} [input.telepon] nomor tujuan (62... / 08...);
 *                                  kalau kosong dicari via Supabase
 * @returns {Promise<{ok:boolean, duplicate?:boolean, error?:string}>}
 */
async function notifyService({ service, events = [], telepon }) {
  const phone = normalizePhone(telepon);

  let target = phone;
  if (!/^62\d{8,13}$/.test(target)) {
    target = normalizePhone(await fetchCustomerPhone(service?.pelangganId ?? service?.customer_id));
  }

  if (!/^62\d{8,13}$/.test(target)) {
    return { ok: false, error: "nomor tujuan tidak ditemukan / tidak valid" };
  }

  if (!sock || status !== "connected") {
    return { ok: false, error: "WhatsApp belum terhubung" };
  }

  const daftar = events.length ? events : ["update"];
  const key = dedupKey(target, service, daftar);

  if (isDuplicate(key)) {
    return { ok: true, duplicate: true };
  }

  const message = formatServiceMessage(service, daftar, {
    workshopName: WORKSHOP_NAME
  });

  await sock.sendMessage(`${target}@s.whatsapp.net`, { text: message });
  console.log(`[wa] terkirim -> ${target} (${daftar.join(", ")})`);

  return { ok: true };
}

/* ---------------------------------------------------------------------
   ROUTER
   --------------------------------------------------------------------- */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  /* Preflight CORS (browser frontend memanggil endpoint ini). */
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key, x-webhook-secret"
    });
    return res.end();
  }

  if (req.method === "GET" && url.pathname === "/health") {
    return sendJSON(res, 200, {
      server: "online"
    });
  }

  if (!isAuthorized(req, url)) {
    return sendJSON(res, 401, {
      error: "Unauthorized"
    });
  }

  if (req.method === "GET" && url.pathname === "/api/status") {
    return sendJSON(res, 200, { status, lastError });
  }

  /* Kirim pesan bebas (manual / testing). */
  if (req.method === "POST" && url.pathname === "/api/send") {
    try {
      const { number, message } = await readBody(req);

      const phone = normalizePhone(number);

      if (!/^62\d{8,13}$/.test(phone)) {
        return sendJSON(res, 400, {
          error: "Nomor harus menggunakan format 62..."
        });
      }

      if (
        typeof message !== "string" ||
        !message.trim() ||
        message.length > 3000
      ) {
        return sendJSON(res, 400, {
          error: "Pesan tidak valid"
        });
      }

      if (!sock || status !== "connected") {
        return sendJSON(res, 503, {
          error: "WhatsApp belum terhubung"
        });
      }

      await enqueueSend(() =>
        sock.sendMessage(`${phone}@s.whatsapp.net`, { text: message })
      );

      return sendJSON(res, 200, {
        success: true
      });

    } catch (error) {
      console.error(error);

      return sendJSON(res, 500, {
        error: "Pengiriman gagal"
      });
    }
  }

  /* Notifikasi info kendaraan terformat — dipanggil frontend (js/db.js)
     sebagai fallback ketika Supabase Database Webhook belum aktif.
     Body: { service, events?: string[], telepon?: string } */
  if (req.method === "POST" && url.pathname === "/api/notify") {
    try {
      const body = await readBody(req);
      const service = body?.service;

      if (!service || typeof service !== "object") {
        return sendJSON(res, 400, { error: "service wajib diisi" });
      }

      if (
        body.events !== undefined &&
        (!Array.isArray(body.events) ||
          body.events.some((e) => typeof e !== "string"))
      ) {
        return sendJSON(res, 400, { error: "events harus berupa array string" });
      }

      console.log(
        `[wa] notify diterima: ${(body.events || []).join(",") || "-"} ` +
        `service=${service.kode || service.id || "?"} ` +
        `tujuan=${body.telepon || "(lookup)"}`
      );

      const result = await enqueueSend(() =>
        notifyService({
          service,
          events: body.events || [],
          telepon: body.telepon
        })
      );

      if (!result.ok) {
        console.error(`[wa] notify GAGAL: ${result.error}`);
        const code =
          result.error === "WhatsApp belum terhubung" ? 503 : 422;
        return sendJSON(res, code, { error: result.error });
      }

      if (result.duplicate) {
        console.log("[wa] notify duplikat ditahan oleh anti-duplikat");
      }

      return sendJSON(res, 200, result);
    } catch (error) {
      console.error("[wa] notify error:", error);
      return sendJSON(res, 400, {
        error: error?.message || "Permintaan tidak valid"
      });
    }
  }

  /* Supabase Database Webhook (tabel services, INSERT + UPDATE).
     Payload: { type, table, record, old_record } — bentuk lama
     ({ record/new, old }) juga diterima. */
  if (req.method === "POST" && url.pathname === "/api/webhook/service") {
    try {
      const body = await readBody(req);

      const record = body?.record ?? body?.new ?? null;
      const oldRecord = body?.old_record ?? body?.old ?? null;
      const table = body?.table || "services";
      const type = body?.type || "";

      if (String(table) !== "services") {
        return sendJSON(res, 202, { ignored: true, reason: "bukan tabel services" });
      }

      if (type === "DELETE" || !record) {
        return sendJSON(res, 202, { ignored: true, reason: "hapus / tanpa record" });
      }

      const events = detectChanges(oldRecord, record);

      if (!events.length) {
        return sendJSON(res, 202, { ignored: true, reason: "tidak ada perubahan yang perlu diinformasikan" });
      }

      const result = await enqueueSend(() =>
        notifyService({ service: record, events })
      );

      if (!result.ok) {
        console.error("[webhook] gagal:", result.error);
        return sendJSON(res, 422, { error: result.error });
      }

      return sendJSON(res, 200, result);
    } catch (error) {
      console.error(error);
      return sendJSON(res, 400, {
        error: error?.message || "Payload webhook tidak valid"
      });
    }
  }

  return sendJSON(res, 404, {
    error: "Endpoint tidak ditemukan"
  });
});

server.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.error(`\nPort ${PORT} sudah dipakai proses lain (kemungkinan server WA lama).`);
    console.error(`  Cari pid : lsof -i :${PORT}   (lalu kill <pid>)`);
    console.error(`  Atau pakai port lain: PORT=3001 npm start`);
    console.error(`  (kalau ganti port, update WA_SERVER_URL di .env root + jalankan node scripts/build-config.js)\n`);
    process.exit(1);
  }
  throw error;
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server aktif di port ${PORT}`);
  if (!SUPABASE_SERVICE_KEY) {
    console.log(
      "Catatan: SUPABASE_SERVICE_ROLE_KEY belum diisi — lookup nomor dari " +
      "webhook Supabase tidak bisa jalan (fallback frontend tetap bisa)."
    );
  }
  connectWhatsApp();
});
