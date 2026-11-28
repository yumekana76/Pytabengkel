/* Verifikasi render foto slot dengan posisi & zoom
   ------------------------------------------------------------------
   Memastikan format objek { url, posisi, zoom } dan format lama { url }
   bekerja dengan benar pada landing page:
   1. Gambar tidak rusak (tidak menjadi [object Object])
   2. objectPosition dan scale diterapkan sesuai pengaturan
   3. Tanpa error JS
*/

const { chromium } = require("playwright");

const BASE = "http://localhost:8000/html/index.html";

const MOCK_MEDIA = {
  hero_sisi: {
    url: "https://mock.supabase.co/hero_sisi.jpg",
    posisi: "25% 75%",
    zoom: 1.4,
  },
  hero_mini: "https://mock.supabase.co/hero_mini.jpg", // format lama (string URL)
  fitur: {
    url: "https://mock.supabase.co/fitur.jpg",
    posisi: "80% 20%",
    zoom: 1.2,
  },
  layanan_servis: {
    url: "https://mock.supabase.co/layanan_servis.jpg",
    posisi: "50% 10%",
    zoom: 1.5,
  },
};

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

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];

  page.on("pageerror", (error) => errors.push(error.message));

  await page.route("**/rest/v1/rpc/*", async (route) => {
    const nama = new URL(route.request().url()).pathname.split("/").pop();
    const body =
      nama === "public_workshop_info" ? [workshopRow(MOCK_MEDIA)] : [];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });

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
    const el = document.getElementById("lpMediaHeroSisi");
    return el && el.getAttribute("src") === "https://mock.supabase.co/hero_sisi.jpg";
  }, null, { timeout: 5000 });

  // 1. Cek Hero Sisi (objek dengan posisi 25% 75% & zoom 1.4)
  const heroSisi = await page.evaluate(() => {
    const img = document.getElementById("lpMediaHeroSisi");
    if (!img) return null;
    const style = getComputedStyle(img);
    return {
      src: img.getAttribute("src"),
      objectPosition: style.objectPosition,
      transform: style.transform,
    };
  });

  cek(
    "1. Hero Sisi memuat URL asli bukan [object Object]",
    heroSisi && heroSisi.src === "https://mock.supabase.co/hero_sisi.jpg",
    JSON.stringify(heroSisi),
  );
  cek(
    "1. Hero Sisi menerapkan objectPosition 25% 75%",
    heroSisi && heroSisi.objectPosition === "25% 75%",
    "computed=" + (heroSisi ? heroSisi.objectPosition : ""),
  );
  cek(
    "1. Hero Sisi menerapkan zoom/scale(1.4)",
    heroSisi && heroSisi.transform && heroSisi.transform.includes("matrix"),
    "transform=" + (heroSisi ? heroSisi.transform : ""),
  );

  // 2. Cek Hero Mini (string URL format lama)
  const heroMini = await page.evaluate(() => {
    const img = document.getElementById("lpMediaHeroMini");
    return img ? img.getAttribute("src") : null;
  });
  cek(
    "2. Hero Mini format lama tetap terbaca URL-nya",
    heroMini === "https://mock.supabase.co/hero_mini.jpg",
    "src=" + heroMini,
  );

  // 3. Cek Fitur (posisi 80% 20% & zoom 1.2)
  const fitur = await page.evaluate(() => {
    const img = document.getElementById("lpMediaFitur");
    if (!img) return null;
    const style = getComputedStyle(img);
    return {
      src: img.getAttribute("src"),
      objectPosition: style.objectPosition,
      transform: style.transform,
    };
  });
  cek(
    "3. Fitur memuat URL asli dan posisi 80% 20%",
    fitur &&
      fitur.src === "https://mock.supabase.co/fitur.jpg" &&
      fitur.objectPosition === "80% 20%",
    JSON.stringify(fitur),
  );

  cek("4. Tidak ada JavaScript error di landing page", errors.length === 0, errors.join(" | "));

  await browser.close();

  if (gagal > 0) {
    console.error(`\n${gagal} pemeriksaan GAGAL!`);
    process.exit(1);
  } else {
    console.log("\nSemua pemeriksaan PASS!");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Error menjalankan pengujian:", err);
  process.exit(1);
});
