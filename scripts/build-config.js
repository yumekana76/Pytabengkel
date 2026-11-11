#!/usr/bin/env node
/* =====================================================================
   BUILD STEP: environment variable -> js/config.prod.js
   ---------------------------------------------------------------------
   Dipanggil otomatis oleh Vercel (lihat "buildCommand" di vercel.json)
   atau manual:  node scripts/build-config.js

   Sumber nilai (urut prioritas):
     1. Environment variable proses (Vercel Environment Variables)
     2. File .env di root project (untuk build lokal)

   Hasil: js/config.prod.js berisi window.SUPABASE_CONFIG_OVERRIDE —
   file itu dimuat OTOMATIS oleh js/config.js (auto-load), jadi tidak
   perlu menambahkan <script> di halaman mana pun.

   Keamanan & ketahanan:
     - Hanya SUPABASE_URL + SUPABASE_ANON_KEY (key publik, bukan
       service_role) yang boleh masuk.
     - Script ini SELALU exit 0: kalau env belum diisi, file tidak
       diubah dan aplikasi memakai default di js/config.js — deploy
       tidak pernah gagal karena itu.
     - js/config.prod.js masuk .gitignore (tidak pernah ke-commit).
   ===================================================================== */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ENV_FILE = path.join(ROOT, ".env");
const TARGET = path.join(ROOT, "js", "config.prod.js");

/* Parser .env sederhana: KEY=VALUE, dukung tanda kutip, baris komentar,
   baris kosong. Tidak ada interpolasi ${...} — sengaja, supaya isi .env
   bisa dibaca literal oleh tool lain. */
function loadDotEnv(file) {
  if (!fs.existsSync(file)) return false;

  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    /* Environment variable proses selalu menang atas file .env. */
    if (process.env[key] !== undefined) continue;

    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
  return true;
}

function log(message) {
  console.log(`[build-config] ${message}`);
}

/* ------------------------------------------------------------------ */

loadDotEnv(ENV_FILE);

const url = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const anonKey = (process.env.SUPABASE_ANON_KEY || "").trim();

if (!url || !anonKey) {
  log(
    "SUPABASE_URL / SUPABASE_ANON_KEY belum diisi — js/config.prod.js tidak diubah.",
  );
  log("Aplikasi akan memakai nilai default di js/config.js.");
  process.exit(0);
}

if (!/^https?:\/\//i.test(url)) {
  log(`PERINGATAN: SUPABASE_URL seharusnya diawali https:// — tetap dipakai: ${url}`);
}

if (/service_role/i.test(anonKey)) {
  log("PERINGATAN: value SUPABASE_ANON_KEY terlihat seperti service_role key.");
  log("             JANGAN dipakai di frontend — key itu melewati seluruh RLS.");
}

const banner = `/* =====================================================================
   KONFIGURASI PRODUCTION — HASIL GENERATE OTOMATIS
   ---------------------------------------------------------------------
   File ini DIBUAT oleh scripts/build-config.js dari environment variable
   SUPABASE_URL + SUPABASE_ANON_KEY (Vercel Environment Variables / .env).

   - JANGAN edit manual (perubahan tertimpa saat build berikutnya).
   - JANGAN commit (sudah masuk .gitignore).
   - Dimuat otomatis oleh js/config.js, tidak perlu tag <script> manual.
   ===================================================================== */
`;

const body = `window.SUPABASE_CONFIG_OVERRIDE = {
  url: ${JSON.stringify(url)},
  anonKey: ${JSON.stringify(anonKey)},
};
`;

fs.writeFileSync(TARGET, banner + "\n" + body, "utf8");
log(`js/config.prod.js ditulis -> ${url}`);
