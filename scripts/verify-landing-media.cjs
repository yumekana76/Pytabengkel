/* Verifikasi render 7 foto slot landing page.
   ------------------------------------------------------------------
   Menjalankan server statis di :8000 lalu memalsukan respons RPC
   Supabase (page.route) supaya tidak menyentuh data produksi:

   A. media_foto terisi  → ketujuh <img> berganti ke URL admin dan
      ikon fallback tersembunyi.
   B. media_foto kosong  → ketujuh <img> tetap memakai foto bawaan
      (mis. supabase/schema.sql belum dijalankan) tanpa error JS.
   C. URL admin rusak    → <img> dilepas dan ikon fallback tampil.

   Pakai:
     python3 -m http.server 8000            # dari root proyek
     NODE_PATH=/tmp/opencode/pw/node_modules node scripts/verify-landing-media.cjs

   Exit code 0 bila semua skenario PASS. */

const { chromium } = require("playwright");

const BASE = "http://localhost:8000/html/index.html";

/* id di html/index.html, kunci slot di media_foto, dan akhiran path
   foto bawaan masing-masing. */
const SLOTS = [
  { id: "lpMediaHeroSisi", key: "hero_sisi", suffix: "../asset/img/hero-workshop.jpg" },
  { id: "lpMediaHeroMini", key: "hero_mini", suffix: "../asset/img/galeri-detailing.jpg" },
  { id: "lpMediaFitur", key: "fitur", suffix: "../asset/img/keunggulan-technician.jpg" },
  { id: "lpMediaLayananServis", key: "layanan_servis", suffix: "../asset/img/layanan-servis-rutin.jpg" },
  { id: "lpMediaLayananDiagnosa", key: "layanan_diagnosa", suffix: "../asset/img/layanan-diagnosa.jpg" },
  { id: "lpMediaLayananSuku", key: "layanan_suku", suffix: "../asset/img/layanan-suku-cadang.jpg" },
  { id: "lpMediaLayananQc", key: "layanan_qc", suffix: "../asset/img/layanan-quality-control.jpg" },
];

const MOCK_MEDIA = {};
SLOTS.forEach((slot) => {
  /* Domain harus subdomain *.supabase.co supaya diizinkan CSP img-src
     halaman (self, data:, https://*.supabase.co). */
  MOCK_MEDIA[slot.key] = "https://mock.supabase.co/" + slot.key + ".jpg";
});

function workshopRow(mediaFoto) {
  return {
    nama: "Pytabengkel",
    alamat: "Jl. Merdeka No. 10, Bandung",
    kontak: "0812-3456-7890",
    email: "halo@pytabengkel.co.id",
    jam_buka: "08.00 - 17.00 WIB",
    hari_buka: "Senin - Sabtu",
    hero_foto: "",
    hero_label: "",
    hero_judul: "",
    hero_deskripsi: "",
    galeri_foto: [],
    hero_slides: [],
    hero_autoplay: false,
    media_foto: mediaFoto,
  };
}

let gagal = 0;

function cek(nama, kondisi, detail) {
  if (kondisi) {
    console.log("PASS  " + nama);
  } else {
    gagal += 1;
    console.log("GAGAL " + nama + (detail ? " — " + detail : ""));
  }
}

async function bukaDenganMedia(page, mediaFoto) {
  const errorJs = [];
  page.on("pageerror", (error) => errorJs.push(error.message));

  await page.route("**/rest/v1/rpc/*", async (route) => {
    const nama = new URL(route.request().url()).pathname.split("/").pop();
    let body = [];

    if (nama === "public_workshop_info") {
      body = [workshopRow(mediaFoto)];
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });

  /* PNG 1x1 supaya URL foto mock bisa dimuat (kalau tidak, landing.js
     melepas <img> karena gagal dan id-nya hilang sebelum dicek). */
  await page.route("https://mock.supabase.co/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64",
      ),
    }),
  );

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    return ["lpMediaHeroSisi", "lpMediaLayananQc"].every((id) =>
      document.getElementById(id),
    );
  });

  return errorJs;
}

async function fallbackDisplay(page, id) {
  return page.evaluate((slotId) => {
    const img = document.getElementById(slotId);
    const wadah = img
      ? img.parentElement
      : document.querySelector(".lp-hero-photo, .lp-hero-photo-mini, .lp-feature-photo, .lp-service-media");
    const fallback = wadah
      ? wadah.querySelector(".lp-media-fallback")
      : null;
    return fallback ? getComputedStyle(fallback).display : "hilang";
  }, id);
}

async function skenarioA(browser) {
  const page = await browser.newPage();
  const errors = await bukaDenganMedia(page, MOCK_MEDIA);

  const diatur = await page
    .waitForFunction((harap) => {
      return harap.every(([slotId, url]) => {
        const img = document.getElementById(slotId);
        return img && img.getAttribute("src") === url;
      });
    }, SLOTS.map((slot) => [slot.id, MOCK_MEDIA[slot.key]]), { timeout: 5000 })
    .then(() => true)
    .catch(() => false);

  cek("A. seluruh slot diganti sekaligus", diatur);

  for (const slot of SLOTS) {
    const src = await page.evaluate(
      (slotId) => {
        const img = document.getElementById(slotId);
        return img ? img.getAttribute("src") : null;
      },
      slot.id,
    );
    cek(
      "A." + slot.id + " memakai URL admin",
      src === MOCK_MEDIA[slot.key],
      "src=" + src,
    );
  }

  const display = await fallbackDisplay(page, "lpMediaHeroSisi");
  cek("A. fallback hero tersembunyi", display === "none", "display=" + display);
  cek("A. tanpa error JS", errors.length === 0, errors.join(" | "));
  await page.close();
}

async function skenarioB(browser) {
  const page = await browser.newPage();
  const errors = await bukaDenganMedia(page, {});

  /* Beri waktu renderInfo() berjalan; kalau media_foto memang tidak
     ada, src harus tetap foto bawaan dari HTML. */
  await page.waitForTimeout(800);

  for (const slot of SLOTS) {
    const src = await page.evaluate(
      (slotId) => {
        const img = document.getElementById(slotId);
        return img ? img.getAttribute("src") : null;
      },
      slot.id,
    );
    cek(
      "B." + slot.id + " tetap foto bawaan",
      typeof src === "string" && src.endsWith(slot.suffix),
      "src=" + src + " (diharapkan akhiran " + slot.suffix + ")",
    );
  }

  const display = await fallbackDisplay(page, "lpMediaFitur");
  cek("B. fallback tersembunyi", display === "none", "display=" + display);
  cek("B. tanpa error JS", errors.length === 0, errors.join(" | "));
  await page.close();
}

async function skenarioC(browser) {
  const page = await browser.newPage();
  const errors = [];

  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("https://mock.supabase.co/**", (route) =>
    route.fulfill({ status: 404, body: "" }),
  );
  await page.route("**/rest/v1/rpc/*", async (route) => {
    const nama = new URL(route.request().url()).pathname.split("/").pop();
    const body = nama === "public_workshop_info" ? [workshopRow(MOCK_MEDIA)] : [];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });

  await page.goto(BASE, { waitUntil: "domcontentloaded" });

  const hilang = await page
    .waitForFunction(
      () => !document.getElementById("lpMediaHeroSisi"),
      null,
      { timeout: 5000 },
    )
    .then(() => true)
    .catch(() => false);
  cek("C. <img> hero sisi dilepas saat URL rusak", hilang);

  const display = await page.evaluate(() => {
    const wadah = document.querySelector(".lp-hero-photo");
    const fallback = wadah ? wadah.querySelector(".lp-media-fallback") : null;
    return fallback ? getComputedStyle(fallback).display : "hilang";
  });
  cek("C. fallback hero tampil lagi", display !== "none" && display !== "hilang", "display=" + display);
  cek("C. tanpa error JS", errors.length === 0, errors.join(" | "));
  await page.close();
}

async function main() {
  const cekServer = await fetch(BASE).catch(() => null);

  if (!cekServer || !cekServer.ok) {
    console.error(
      "Server statis tidak bisa diakses di " +
        BASE +
        ". Jalankan dulu: python3 -m http.server 8000",
    );
    process.exit(1);
  }

  const browser = await chromium.launch();

  try {
    await skenarioA(browser);
    await skenarioB(browser);
    await skenarioC(browser);
  } finally {
    await browser.close();
  }

  console.log(gagal ? gagal + " pemeriksaan GAGAL" : "Semua pemeriksaan PASS");
  process.exitCode = gagal ? 1 : 0;
}

main().catch((error) => {
  console.error("Error verifikasi:", error);
  process.exitCode = 1;
});
