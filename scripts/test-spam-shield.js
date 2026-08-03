/**
 * ============================================================
 *  TEST: Spam Detector + Telegram Notification (Topic SPAM)
 * ============================================================
 *
 *  Jalankan: node scripts/test-spam-shield.js
 *
 *  Script ini akan:
 *  1. Test deteksi keyword gambling (berbagai variasi)
 *  2. Kirim pesan test ke Telegram topic SPAM (live test)
 * ============================================================
 */
require("dotenv").config();

const { detectGambling } = require("../src/services/spamDetector.service");
const { sendTelegramMessage } = require("../src/services/telegram.service");

// ─── Warna Terminal ─────────────────────────────────────────
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[90m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function pass(label) {
  console.log(`  ${GREEN}✔${RESET} ${label}`);
}
function fail(label, detail) {
  console.log(`  ${RED}✘${RESET} ${label}`);
  if (detail) console.log(`    ${DIM}→ ${detail}${RESET}`);
}

// ─── TEST CASES ─────────────────────────────────────────────
const TEST_CASES = [
  // [deskripsi, teks, expectedSpam]
  // ===== HARUS TERDETEKSI =====
  ["Keyword langsung: judi", "Ayo main judi online sekarang!", true],
  ["Keyword langsung: slot gacor", "Slot gacor hari ini maxwin!", true],
  ["Keyword langsung: sbobet", "Daftar sbobet sekarang juga", true],
  ["Keyword langsung: togel", "Prediksi togel hari ini 100% akurat", true],
  ["Keyword langsung: mahjong ways", "Main mahjong ways pasti menang", true],
  ["Keyword langsung: pragmatic play", "Game pragmatic play terbaru", true],
  ["Keyword langsung: pg soft", "PG Soft slot demo gratis", true],
  ["Keyword langsung: sweet bonanza", "Sweet bonanza scatter hitam", true],
  ["Keyword langsung: gates of olympus", "Gates of olympus kakek zeus", true],
  ["Keyword langsung: poker", "Bermain poker online terpercaya", true],
  ["Keyword langsung: casino", "Live casino 24 jam nonstop", true],

  // ===== LEETSPEAK / DISAMARKAN =====
  ["Leetspeak: jud1", "Coba jud1 online sekarang", true],
  ["Leetspeak: sl0t", "Main sl0t gratis hari ini", true],
  ["Leetspeak: g4c0r", "Situs g4c0r terpercaya", true],
  ["Leetspeak: t0g3l", "Prediksi t0g3l akurat", true],

  // ===== SPASI DIPISAH (TRIK SPAMMER) =====
  ["Spasi dipisah: s l o t", "Mainkan s l o t online sekarang", true],
  ["Spasi dipisah: j u d i", "Situs j u d i terpercaya", true],
  ["Spasi dipisah: g a c o r", "Link g a c o r hari ini", true],
  ["Spasi dipisah: t o g e l", "Prediksi t o g e l jitu", true],

  // ===== PEMISAH KARAKTER =====
  ["Pemisah titik: s.l.o.t", "Daftar s.l.o.t sekarang", true],
  ["Pemisah strip: j-u-d-i", "Main j-u-d-i online", true],
  ["Pemisah underscore: s_l_o_t", "Link s_l_o_t gacor", true],

  // ===== PLATFORM DENGAN ANGKA =====
  ["Platform angka: slot88", "Daftar slot88 sekarang", true],
  ["Platform angka: joker123", "Main joker123 gratis", true],

  // ===== LINK SHORTENER =====
  ["Link shortener: bit.ly", "Klik bit.ly/slotgacor88", true],
  ["Link shortener: heylink.me", "Gabung heylink.me/judionline", true],

  // ===== BAHASA INGGRIS =====
  ["English: gambling", "Online gambling is fun", true],
  ["English: betting", "Sports betting tips today", true],
  ["English: jackpot", "Win the jackpot now!", true],

  // ===== HARUS AMAN (FALSE POSITIVE CHECK) =====
  ["Aman: berita biasa", "Presiden meresmikan jembatan baru di Jakarta", false],
  ["Aman: artikel islami", "Keutamaan sholat tahajud di bulan Ramadhan", false],
  ["Aman: berita pendidikan", "Penerimaan mahasiswa baru tahun 2026 dibuka", false],
  ["Aman: berita teknologi", "Apple merilis iPhone terbaru dengan fitur AI", false],
];

async function runTests() {
  console.log(`\n${BOLD}${CYAN}════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${CYAN}  TEST: Spam Detector + Telegram (Topic SPAM)${RESET}`);
  console.log(`${BOLD}${CYAN}════════════════════════════════════════════${RESET}\n`);

  // ─── BAGIAN 1: Test Deteksi Keyword ─────────────────────
  console.log(`${BOLD}${YELLOW}📋 BAGIAN 1: Deteksi Keyword Gambling${RESET}\n`);

  let passed = 0;
  let failed = 0;

  for (const [label, text, expectedSpam] of TEST_CASES) {
    const { isSpam, matchedKeywords } = detectGambling(text);

    if (isSpam === expectedSpam) {
      passed++;
      const extra = isSpam ? ` ${DIM}[${matchedKeywords.join(", ")}]${RESET}` : "";
      pass(`${label}${extra}`);
    } else {
      failed++;
      const detail = isSpam
        ? `Seharusnya AMAN, tapi terdeteksi: [${matchedKeywords.join(", ")}]`
        : `Seharusnya TERDETEKSI, tapi lolos!`;
      fail(label, detail);
    }
  }

  console.log(
    `\n  ${DIM}─────────────────────────────────────────${RESET}`,
  );
  console.log(
    `  ${BOLD}Hasil: ${GREEN}${passed} passed${RESET} / ${failed > 0 ? RED : GREEN}${failed} failed${RESET} / ${passed + failed} total`,
  );

  // ─── BAGIAN 2: Test Kirim Telegram ──────────────────────
  console.log(`\n${BOLD}${YELLOW}📬 BAGIAN 2: Kirim Notifikasi ke Telegram (Topic SPAM)${RESET}\n`);

  // Cek ENV dulu
  const envCheck = {
    TELEGRAM_BOT_TOKEN: !!process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID: !!process.env.TELEGRAM_CHAT_ID,
    TELEGRAM_TOPIC_SPAM: !!process.env.TELEGRAM_TOPIC_SPAM,
  };

  console.log(`  ${DIM}ENV Check:${RESET}`);
  for (const [key, ok] of Object.entries(envCheck)) {
    if (ok) {
      pass(`${key} = tersedia`);
    } else {
      fail(`${key} = KOSONG / tidak ada di .env`);
    }
  }

  const allEnvOk = Object.values(envCheck).every(Boolean);

  if (!allEnvOk) {
    console.log(`\n  ${RED}⚠ ENV belum lengkap. Skip pengiriman Telegram.${RESET}\n`);
    return;
  }

  // ─── BAGIAN 2b: Test Geolocation Lokasi (live lookup) ───
  console.log(`\n${BOLD}${YELLOW}🌍 BAGIAN 2b: Test Geolocation (cari lokasi dari IP)${RESET}\n`);

  const { lookupGeo } = require("../src/middleware/spamShield");

  // Ambil IP publik REAL milik host yang menjalankan script, lalu cari lokasinya.
  // Memanggil ip-api tanpa IP query → server mengembalikan IP.
  let realIp = "unknown";
  let realGeo = null;
  try {
    const ipRes = await fetch("http://ip-api.com/json/?fields=status,query");
    const ipJson = await ipRes.json();
    realIp = ipJson.query || realIp;
    if (ipJson.status === "success") {
      realGeo = await lookupGeo(realIp);
      pass(
        `IP PUBLIK REAL: ${realIp} → ${realGeo.lokasi || "-"}${realGeo.lat ? ` (lat:${realGeo.lat}, lon:${realGeo.lon})` : ""}`,
      );
    } else {
      fail(`Tidak bisa ambil IP publik real`, JSON.stringify(ipJson));
    }
  } catch (err) {
    fail("Gagal ambil IP publik real", err.message);
  }

  // ─── BAGIAN 2c: Test pesan dengan konten HTML khusus ─────────
  // Konten user sering berisi tag HTML/code yang bikin pesan Telegram rusak.
  // Kita test escapeHtml sehingga pesan tetap aman dikirim.
  console.log(`\n${BOLD}${YELLOW}🧪 BAGIAN 2c: Test ketahanan pesan terhadap konten HTML${RESET}\n`);

  const escapeHtml = require("../src/services/telegram.service").escapeHtml;
  const nastyContent =
    `<script>alert("xss")</script> slot gacor <b>judi online & poker</b> "quote" 'single' <a href="http://evil.com">link</a>`;

  const escapedContent = escapeHtml(nastyContent);

  console.log(`  ${DIM}Konten asli yang berpotensi merusak pesan:${RESET}\n    ${nastyContent}\n`);
  console.log(`  ${DIM}Setelah di-escape (aman dikirim via HTML Telegram):${RESET}\n    ${escapedContent}\n`);

  if (escapedContent.includes("<script>") || escapedContent.includes("<img>")) {
    fail("Escaping GAGAL — tag HTML asli masih tersisa");
  } else {
    pass("Escaping berhasil — semua tag HTML dinetralkan");
  }

  // Pesan demo memakai IP & lokasi REAL yang barusan dideteksi (jika ada),
  // sehingga tidak menampilkan dummy. Geo lokasi = hasil lookup realIp.
  const realLokasi = realGeo?.lokasi || "Gagal melacak";
  const realLat = realGeo?.lat ?? "-";
  const realLon = realGeo?.lon ?? "-";
  const mapsLink =
    realGeo ? `<a href="https://www.google.com/maps?q=${realGeo.lat},${realGeo.lon}">Buka Google Maps</a>` : "-";

  const testMessage =
    `🚨 <b>DETEKSI KONTEN JUDI/SPAM</b> 🚨\n\n` +
    `🟡 <b>Tindakan Ditolak</b>\n` +
    `🌐 <b>Endpoint:</b> <code>[POST] /api/tags</code>\n` +
    `👤 <b>Pelaku:</b> ID: 99 | Username: test-spammer | Email: test@test.com (penulis)\n` +
    `🔑 <b>Kata Kunci Cocok:</b> <code>slot gacor, maxwin, pragmatic play</code>\n\n` +
    `📍 <b>Pelacakan Detail:</b>\n` +
    `  • <b>IPAddress:</b> <code>${escapeHtml(realIp)}</code>\n` +
    `  • <b>Lokasi:</b> <code>${escapeHtml(realLokasi)}</code>\n` +
    `  • <b>Provider/ISP:</b> <code>${escapeHtml(realGeo?.isp || "-")}</code>\n` +
    `  • <b>Google Maps:</b> ${mapsLink} (${realLat},${realLon})\n` +
    `  • <b>User Agent:</b> <i>Mozilla/5.0 (Test)</i>\n\n` +
    `📝 <b>Cuplikan Konten (dengan kode HTML raw):</b>\n` +
    `<code>slot 5 gacor &lt;script&gt;alert(1)&lt;/script&gt; judi</code>\n\n` +
    `⏰ <b>Waktu:</b> ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`;

  console.log(`\n  ${DIM}Mengirim pesan test ke Telegram topic SPAM...${RESET}`);

  try {
    const result = await sendTelegramMessage({
      topic: "SPAM",
      useHtml: true,
      text: testMessage,
    });

    if (result && result.ok) {
      pass(`Pesan berhasil dikirim! message_id: ${result.result?.message_id}`);
      console.log(`\n  ${GREEN}${BOLD}✅ Cek grup Telegram Anda → topic SPAM${RESET}`);
    } else {
      fail("Telegram mengembalikan response tidak ok", JSON.stringify(result));
    }
  } catch (err) {
    fail("Gagal mengirim ke Telegram", err.message);
  }

  // ─── SUMMARY ────────────────────────────────────────────
  console.log(`\n${BOLD}${CYAN}════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${CYAN}  TEST SELESAI${RESET}`);
  console.log(`${BOLD}${CYAN}════════════════════════════════════════════${RESET}\n`);
}

runTests().catch((err) => {
  console.error(`${RED}Fatal error:${RESET}`, err);
  process.exit(1);
});
