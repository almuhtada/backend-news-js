const { detectGambling } = require("../services/spamDetector.service");
const {
  sendTelegramMessage,
  escapeHtml,
} = require("../services/telegram.service");

// Ambil lokasi dari ip-api.com (HTTP untuk free tier, HTTPS berbayar).
// Satu sumber saja untuk akurasi konsisten.
async function lookupGeo(ip) {
  const res = await fetch(
    `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,regionName,city,lat,lon,isp,org,as`,
  );
  const g = await res.json();
  if (g && g.status === "success") {
    return {
      lokasi: [g.city, g.regionName, g.country].filter(Boolean).join(", "),
      isp: `${g.isp || "-"} (${g.org || g.as || "-"})`,
      country: g.country,
      countryCode: g.countryCode,
      lat: g.lat,
      lon: g.lon,
    };
  }
  throw new Error(g.message || "ip-api failed");
}

/**
 * Deteksi apakah request ini untuk mengelola berita (postingan).
 * Berita tetap boleh diproses/dipublish — hanya dilaporkan, TIDAK diblokir.
 * Komentar (/api/posts/:id/comments) tetap diperlakukan seperti konten lain (diblokir).
 * @param {object} req
 * @returns {boolean}
 */
function isNewsPostRoute(req) {
  const path = (req.originalUrl || req.url || "").split("?")[0];
  // Berita: /api/posts dan /api/posts/:uuid (POST create, PUT/PATCH update)
  // Bukan berita: /api/posts/:id/comments (komentar)
  if (/^\/api\/posts\/[^/]+\/comments/i.test(path)) return false;
  return /^\/api\/posts(\/[^/]+)?$/i.test(path);
}

/**
 * Middleware untuk menyaring konten bermuatan judi/spam
 * - Scan body, query, params secara rekursif (string, number, boolean, array, nested object)
 * - Lookup IP + Geolocation + link Google Maps
 * - Kirim notifikasi ke Telegram topic SPAM
 * - Berita (/api/posts) hanya dilaporkan & tetap diproses;
 *   konten lain (komentar, tag, kategori, dll) ditolak.
 */
const spamShield = async (req, res, next) => {
  // Hanya scan pada request yang membuat/mengubah data (POST, PUT, PATCH)
  if (!["POST", "PUT", "PATCH"].includes(req.method)) {
    return next();
  }

  try {
    // 1. Kumpulkan SEMUA nilai dari body, query, dan params untuk discan
    //    Termasuk string, number, boolean — semua dikonversi ke string
    const valuesToScan = [];

    const SKIP_KEYS = new Set([
      "password",
      "token",
      "accessToken",
      "refreshToken",
      "jwt",
      "secret",
    ]);

    const extractValues = (obj) => {
      if (obj === null || obj === undefined) return;

      if (typeof obj === "string") {
        valuesToScan.push(obj);
      } else if (typeof obj === "number" || typeof obj === "boolean") {
        valuesToScan.push(String(obj));
      } else if (Array.isArray(obj)) {
        // Array — iterasi langsung tanpa cek key
        for (const item of obj) {
          extractValues(item);
        }
      } else if (typeof obj === "object") {
        for (const key of Object.keys(obj)) {
          if (SKIP_KEYS.has(key)) continue;
          extractValues(obj[key]);
        }
      }
    };

    extractValues(req.body);
    extractValues(req.query);
    extractValues(req.params);

    const textToScan = valuesToScan.join(" ");

    if (!textToScan.trim()) {
      return next();
    }

    // 2. Deteksi judi
    const { isSpam, matchedKeywords } = detectGambling(textToScan);

    if (!isSpam) {
      return next();
    }

    // ========== TERDETEKSI SPAM ==========

    // 3. Ambil IP Address (internet/publik + device/lokal)
    //    IP publik: dari koneksi/forwarding. IP device: dikirim frontend via header
    //    (mis. X-Device-IP) karena IP LAN tidak terlihat langsung oleh server.
    let publicIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      req.ip ||
      "unknown";
    if (publicIp.includes("::ffff:")) {
      publicIp = publicIp.replace("::ffff:", "");
    }

    const isLocalhost =
      publicIp === "::1" || publicIp === "127.0.0.1" || publicIp === "localhost";
    if (isLocalhost) publicIp = "127.0.0.1";

    // IP device (lokal/LAN) yang didapatkan dari frontend.
    const deviceIp =
      req.headers["x-device-ip"] ||
      req.headers["x-client-ip"] ||
      req.body?.device_ip ||
      req.body?.local_ip ||
      null;

    const ipForGeo = isLocalhost ? publicIp : publicIp;
    const displayDeviceIp = deviceIp ? String(deviceIp).trim() : null;

    // Negara/Provider info (default untuk localhost)
    let negaraInfo = "🏠 Localhost / Jaringan Internal";

    // 4. Geolocation lookup + Google Maps link
    let geoInfo = "Localhost / Jaringan Internal";
    let ispInfo = "N/A";
    let mapsLink = "-";

    if (!isLocalhost) {
      try {
        const geo = await lookupGeo(ipForGeo);
        geoInfo = geo.lokasi || "Gagal melacak lokasi IP";
        ispInfo = geo.isp || "N/A";

        if (geo.lat && geo.lon) {
          mapsLink = `https://www.google.com/maps?q=${geo.lat},${geo.lon}`;
        }

        // Negara & penanda provider
        const countryCode = geo.countryCode || "";
        const countryName = geo.country || "";
        const isIndonesia = countryCode === "ID";

        let negaraLabel = isIndonesia
          ? "🇮🇩 INDONESIA"
          : `🌍 LUAR NEGERI (${countryName} / ${countryCode})`;

        // Penanda provider khas
        const ispLower = (geo.isp || "").toLowerCase();
        let providerLabel = "";
        // Provider Indonesia — utama
        if (ispLower.includes("telkomsel")) providerLabel = "📱 Telkomsel";
        else if (ispLower.includes("indosat") || ispLower.includes("ooredoo") || ispLower.includes("im3")) providerLabel = "📱 Indosat/Ooredoo";
        else if (ispLower.includes("xl") || ispLower.includes("axis") || ispLower.includes("axiata")) providerLabel = "📱 XL/Axiata";
        else if (ispLower.includes("smartfren")) providerLabel = "📱 Smartfren";
        else if (ispLower.includes("tri") || ispLower.includes("3 indonesia") || ispLower.includes("hutchison")) providerLabel = "📱 Tri/3";
        else if (ispLower.includes("telkom") || ispLower.includes("indihome")) providerLabel = "📡 Telkom/IndiHome";
        else if (ispLower.includes("first media") || ispLower.includes("linknet")) providerLabel = "📡 First Media/LinkNet";
        else if (ispLower.includes("biznet")) providerLabel = "📡 Biznet";
        else if (ispLower.includes("myrepublic")) providerLabel = "📡 MyRepublic";
        else if (ispLower.includes("mnc") || ispLower.includes("k-vision") || ispLower.includes("kvision")) providerLabel = "📡 MNC/K-Vision";
        else if (ispLower.includes("cbn") || ispLower.includes("cyberindo")) providerLabel = "📡 CBN/Cyberindo";
        else if (ispLower.includes("oxygen")) providerLabel = "📡 Oxygen";
        else if (ispLower.includes("iconet")) providerLabel = "📡 Iconet";
        else if (ispLower.includes("indonet")) providerLabel = "📡 Indonet";
        else if (ispLower.includes("neucentrix")) providerLabel = "📡 NeuCentrix";
        else if (ispLower.includes("jasa raharja") || ispLower.includes("jasaraharja")) providerLabel = "📡 Jasa Raharja";
        else if (ispLower.includes("sampoerna telekom") || ispLower.includes("sti ")) providerLabel = "📡 STI/Sampoerna";
        else if (ispLower.includes("net1") || ispLower.includes("net satu")) providerLabel = "📡 Net1";
        else if (ispLower.includes("fiberstar")) providerLabel = "📡 FiberStar";
        else if (ispLower.includes("sarana sindo")) providerLabel = "📡 Sarana Sindo";
        else if (ispLower.includes("global net") || ispLower.includes("globalnet")) providerLabel = "📡 Global Net";
        else if (ispLower.includes("jala media") || ispLower.includes("jalamedia")) providerLabel = "📡 JalaMedia";
        else if (ispLower.includes("sumber infonusa")) providerLabel = "📡 Sumber Infonusa";
        else if (ispLower.includes("bakrie") || ispLower.includes("esia")) providerLabel = "📡 Bakrie/Esia";
        // Provider asing khas
        else if (ispLower.includes("singapore") || ispLower.includes("singtel") || ispLower.includes("starhub") || ispLower.includes("m1 limited")) providerLabel = "🇸🇬 Singapura (SingTel/StarHub/M1)";
        else if (ispLower.includes("digitalocean") || ispLower.includes("aws") || ispLower.includes("amazon") || ispLower.includes("google cloud") || ispLower.includes("vultr") || ispLower.includes("linode") || ispLower.includes("hetzner") || ispLower.includes("contabo") || ispLower.includes("ovh")) providerLabel = "☁️ Cloud/VPS";
        else if (ispLower.includes("cloudflare")) providerLabel = "☁️ Cloudflare";
        else if (ispLower.includes("vpn") || ispLower.includes("proxy") || ispLower.includes("tunnel") || ispLower.includes("tor ")) providerLabel = "🔒 VPN/Proxy/Tor";

        const negaraInfo = `${negaraLabel}${providerLabel ? ` — ${providerLabel}` : ""}`;

      } catch (geoError) {
        console.error("[SpamShield] GeoIP lookup error:", geoError.message);
        geoInfo = "Gagal melacak lokasi IP";
        negaraInfo = "Negara tidak diketahui";
      }
    }

    // 5. Informasi User (jika login via JWT)
    const userStr = req.user
      ? `ID: ${req.user.id || req.user.uuid || "-"} | Username: ${req.user.username || "-"} | Email: ${req.user.email || "-"} (${req.user.role || "user"})`
      : "Tamu / Pengunjung (Tidak Login)";

    // Potong cuplikan konten agar tidak terlalu panjang di Telegram
    // Hapus tag HTML & escape entity agar tampil bersih di Telegram
    const stripHtml = (str) =>
      str
        .replace(/<[^>]+>/g, " ") // hapus tag
        .replace(/&nbsp;/g, " ")
        .replace(/&/g, "&")
        .replace(/</g, "<")
        .replace(/>/g, ">")
        .replace(/"/g, '"')
        .replace(/'/g, "'")
        .replace(/\s+/g, " ")
        .trim();

    const preview = stripHtml(textToScan).substring(0, 400);

    // 6. Susun pesan notifikasi Telegram
    const mapsLine =
      mapsLink !== "-"
        ? `<a href="${mapsLink}">Buka Google Maps</a>`
        : "Tidak tersedia (localhost)";

    const negaraLine = negaraInfo
      ? `\n  • <b>Negara/Provider:</b> <code>${escapeHtml(negaraInfo)}</code>`
      : "";

    // Semua konten (berita, tag, kategori, komentar) hanya dilaporkan,
    // tidak diblokir. Beri label sesuai jenis titik aksesnya.
    const isNews = isNewsPostRoute(req);
    const actionLabel = isNews
      ? "🟢 Berita Tetap Diproses"
      : "🟡 Konten Tetap Diproses";

    const telegramMessage =
      `🚨 <b>DETEKSI KONTEN JUDI/SPAM</b> 🚨\n\n` +
      `${actionLabel}\n` +
      `🌐 <b>Endpoint:</b> <code>${escapeHtml(req.method)} ${escapeHtml(req.originalUrl)}</code>\n` +
      `👤 <b>Pelaku:</b> ${escapeHtml(userStr)}\n` +
      `🔑 <b>Kata Kunci Cocok:</b> <code>${escapeHtml(matchedKeywords.join(", "))}</code>\n\n` +
      `📍 <b>Pelacakan Detail:</b>\n` +
      `  • <b>IP Internet:</b> <code>${escapeHtml(publicIp)}</code>\n` +
      `  • <b>IP Device:</b> <code>${escapeHtml(displayDeviceIp || "-")}</code>\n` +
      `  • <b>Lokasi:</b> <code>${escapeHtml(geoInfo)}</code>${negaraLine}\n` +
      `  • <b>Provider/ISP:</b> <code>${escapeHtml(ispInfo)}</code>\n` +
      `  • <b>Google Maps:</b> ${mapsLine}\n` +
      `  • <b>User Agent:</b> <i>${escapeHtml(req.headers["user-agent"] || "Tidak Diketahui")}</i>\n\n` +
      `📝 <b>Cuplikan Konten:</b>\n` +
      `<code>${escapeHtml(preview)}</code>\n\n` +
      `⏰ <b>Waktu:</b> ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`;

    // Kirim non-blocking ke Telegram topic SPAM
    sendTelegramMessage({
      topic: "SPAM",
      useHtml: true,
      text: telegramMessage,
    }).catch((err) =>
      console.error("[SpamShield] Telegram notification failed:", err),
    );

    // 7. Semua konten dibiarkan diproses (tidak diblokir)
    return next();
  } catch (error) {
    console.error("[SpamShield] Internal error:", error);
    // Jika shield error, tetap izinkan request agar tidak mengganggu operasional
    return next();
  }
};

module.exports = spamShield;
module.exports.lookupGeo = lookupGeo;
module.exports.escapeHtml = escapeHtml;
