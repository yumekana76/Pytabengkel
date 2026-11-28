/* Verifikasi galeri: kartu hanya foto + judul, detail muncul di lightbox
   saat foto diklik.
   ------------------------------------------------------------------
   A. Galeri admin (galeri_foto terisi):
      - deskripsi di kartu tersembunyi (display:none), judul tetap tampil
      - klik foto → lightbox terbuka dengan judul + deskripsi yang benar
      - Esc → lightbox tertutup
   B. Galeri bawaan (galeri_foto kosong, kartu tanpa <img>):
      - klik kartu → lightbox terbuka memakai blok gradasi placeholder

   Pakai:
     python3 -m http.server 8000            # dari root proyek
     NODE_PATH=/tmp/opencode/pw/node_modules node scripts/verify-galeri-lightbox.cjs

   Exit code 0 bila semua pemeriksaan PASS. */

const { chromium } = require("playwright");

const BASE = "http://localhost:8000/html/index.html";

const GALERI = [
  {
    url: "https://mock.supabase.co/satu.jpg",
    judul: "Area Servis Motor",
    deskripsi: "Pengerjaan cepat untuk kendaraan harian.",
  },
  {
    url: "https://mock.supabase.co/dua.jpg",
    judul: "Detailing",
    deskripsi: "Kendaraan kembali kinclong.",
  },
];

function workshopRow(galeri) {
  return {
    nama: "Pytabengkel",
    alamat: "",
    kontak: "",
    email: "",
    jam_buka: "",
    hari_buka: "",
    hero_foto: "",
    hero_label: "",
    hero_judul: "",
    hero_deskripsi: "",
    galeri_foto: galeri,
    hero_slides: [],
    hero_autoplay: false,
    media_foto: {},
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

async function buka(browser, galeri) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.route("**/rest/v1/rpc/*", async (route) => {
    const nama = new URL(route.request().url()).pathname.split("/").pop();
    const body = nama === "public_workshop_info" ? [workshopRow(galeri)] : [];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });

  /* PNG 1x1 agar foto galeri mock bisa dimuat (CSP hanya mengizinkan
     https://*.supabase.co, jadi domain mock harus subdomain Supabase). */
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
  await page.waitForSelector(".lp-gallery-item figcaption strong", {
    timeout: 10000,
  });
  return { page, errors };
}

async function skenarioA(browser) {
  const { page, errors } = await buka(browser, GALERI);

  await page.waitForFunction(() => {
    const item = document.querySelector(".lp-gallery-item");
    return item && item.querySelector("img");
  }, null, { timeout: 5000 }).catch(() => {});

  const kartu = await page.evaluate(() => {
    const item = document.querySelector(".lp-gallery-item");
    const judul = item.querySelector("figcaption strong");
    const desk = item.querySelector("figcaption span");
    return {
      adaDeskripsi: !!desk,
      teksJudul: judul ? judul.textContent.trim() : "",
      displayDesk: desk ? getComputedStyle(desk).display : "hilang",
      displayJudul: judul ? getComputedStyle(judul).display : "hilang",
      tabindex: item.getAttribute("tabindex"),
      role: item.getAttribute("role"),
    };
  });

  cek(
    "A. deskripsi kartu tersembunyi",
    kartu.adaDeskripsi && kartu.displayDesk === "none",
    "display=" + kartu.displayDesk,
  );
  cek(
    "A. judul kartu tampil",
    kartu.teksJudul === "Area Servis Motor" && kartu.displayJudul !== "none",
    "judul=" + kartu.teksJudul + " display=" + kartu.displayJudul,
  );
  cek(
    "A. kartu bisa difokus keyboard",
    kartu.tabindex === "0" && kartu.role === "button",
    "tabindex=" + kartu.tabindex + " role=" + kartu.role,
  );

  await page.click(".lp-gallery-item img");
  const terbuka = await page.evaluate(() => {
    const box = document.getElementById("lpLightbox");
    return {
      buka: box && !box.hidden,
      judul: document.getElementById("lpLightboxJudul").textContent.trim(),
      deskripsi: document
        .getElementById("lpLightboxDeskripsi")
        .textContent.trim(),
      deskripsiTersembunyi: document.getElementById("lpLightboxDeskripsi").hidden,
      foto: document.getElementById("lpLightboxImg").getAttribute("src"),
    };
  });

  cek(
    "A. klik foto membuka lightbox berisi detail",
    terbuka.buka &&
      terbuka.judul === "Area Servis Motor" &&
      terbuka.deskripsi === "Pengerjaan cepat untuk kendaraan harian." &&
      ! terbuka.deskripsiTersembunyi &&
      terbuka.foto === "https://mock.supabase.co/satu.jpg",
    JSON.stringify(terbuka),
  );

  await page.keyboard.press("Escape");
  const tertutup = await page.evaluate(
    () => document.getElementById("lpLightbox").hidden,
  );
  cek("A. Esc menutup lightbox", tertutup === true);
  cek("A. tanpa error JS", errors.length === 0, errors.join(" | "));
  await page.close();
}

async function skenarioB(browser) {
  const { page, errors } = await buka(browser, []);

  const kartuBawaan = await page.evaluate(() => {
    const item = document.querySelector(".lp-gallery-item");
    return { adaImg: !!item.querySelector("img"), judul: item.textContent };
  });
  cek("B. galeri bawaan dipakai (tanpa foto admin)", !kartuBawaan.adaImg);

  await page.click(".lp-gallery-item");
  const hasil = await page.evaluate(() => {
    const box = document.getElementById("lpLightbox");
    return {
      buka: box && !box.hidden,
      placeholder: !document.getElementById("lpLightboxPlaceholder").hidden,
      judul: document.getElementById("lpLightboxJudul").textContent.trim(),
      deskripsi: document
        .getElementById("lpLightboxDeskripsi")
        .textContent.trim(),
    };
  });

  cek(
    "B. klik kartu bawaan tetap membuka detail (placeholder)",
    hasil.buka && hasil.placeholder && hasil.judul.length > 0,
    JSON.stringify(hasil),
  );
  cek(
    "B. deskripsi kartu bawaan juga tersembunyi di grid",
    await page.evaluate(() => {
      const desk = document.querySelector(".lp-gallery-item figcaption span");
      return desk ? getComputedStyle(desk).display === "none" : false;
    }),
  );
  cek("B. tanpa error JS", errors.length === 0, errors.join(" | "));
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
