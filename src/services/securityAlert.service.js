/**
 * Keamanan: Kirim alert ke Telegram (topic SPAM / topic khusus) saat ada
 * aktivitas penting seperti server start, login admin yang mencurigakan,
 * percobaan akses tidak wajar, atau brute force.
 *
 * Tujuan: jika server dibajak/di-gantib, kamu langsung dapat notifikasi.
 */
const { sendTelegramMessage, escapeHtml } = require("./telegram.service");
const os = require("os");

const APP = process.env.APP_NAME || "Backend";

// In-memory store untuk tracking login gagal per IP
const failedLoginStore = new Map();
// Cleanup tiap 10 menit
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of failedLoginStore.entries()) {
    if (now - data.firstAttempt > 10 * 60 * 1000) {
      failedLoginStore.delete(ip);
    }
  }
}, 10 * 60 * 1000);

/**
 * Helper aman: ambil alamat IP publik dari request.
 * @param {object} req
 * @returns {string}
 */
function getClientIp(req) {
  if (!req) return "unknown";
  const xff = req.headers?.["x-forwarded-for"];
  if (xff && String(xff).split(",")[0].trim()) {
    return String(xff).split(",")[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || "unknown";
}

/**
 * Kirim alert ke Telegram (non-blocking, tidak menggagalkan request).
 * Format bersih, minimal emoji, mudah dibaca.
 * @param {string} title - Judul alert
 * @param {string} body - Isi (sudah di-escape jika perlu)
 * @param {string} topic - Topic Telegram: "SPAM" | "LOGIN_HISTORY"
 */
function sendAlert(title, body, topic = "SPAM") {
  const waktu = new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const text =
    `⚡ <b>${APP}</b>\n` +
    `──────────────\n` +
    `<b>${escapeHtml(title)}</b>\n\n` +
    `${body}\n\n` +
    `<i>${waktu} WIB</i>`;

  // Kirim ke telegram (non-block). Tidak menggagalkan operasi apapun.
  return sendTelegramMessage({
    topic,
    useHtml: true,
    text,
  }).catch((err) =>
    console.error("[SecurityAlert] Telegram alert failed:", err.message),
  );
}

/**
 * Alert saat server dimulai/di-restart.
 * @param {object} info
 */
function notifyServerStart(info = {}) {
  const hostname = os.hostname();
  const memory = Math.round(process.memoryUsage().rss / 1024 / 1024);
  const port = info.port || process.env.PORT || "?";

  return sendAlert(
    `Server Aktif / Restart`,
    `<code>Host</code>       ${escapeHtml(hostname)}\n` +
      `<code>Port</code>       ${escapeHtml(String(port))}\n` +
      `<code>Env</code>        ${escapeHtml(process.env.NODE_ENV || "development")}\n` +
      `<code>Node</code>       ${escapeHtml(process.version)}\n` +
      `<code>Memori</code>     ${memory} MB\n\n` +
      `Jika Anda tidak menjalankan ini, segera periksa server Anda.`,
  );
}

/**
 * Alert saat ada login ke akun admin/panel.
 * Dikirim pada login berhasil, terutama untuk role administrator.
 * @param {object} req
 * @param {object} user
 */
function notifyAdminLogin(req, user) {
  const ip = getClientIp(req);
  const ua = req?.headers?.["user-agent"] || "unknown";

  return sendAlert(
    `Login Panel Admin`,
    `<code>User</code>       ${escapeHtml(user?.username || "-")}\n` +
      `<code>Role</code>       ${escapeHtml(user?.role || "user")}\n` +
      `<code>IP</code>         ${escapeHtml(String(ip))}\n` +
      `<code>Device</code>     ${escapeHtml(ua.length > 40 ? ua.slice(0, 40) + "…" : ua)}`,
    "LOGIN_HISTORY",
  );
}

/**
 * Catat percobaan login gagal. Jika melebihi threshold → alert.
 * @param {object} req
 * @param {string} identifier - username/email yang dicoba
 * @param {number} threshold - batas gagal sebelum alert (default 5)
 */
function recordFailedLogin(req, identifier, threshold = 5) {
  const ip = getClientIp(req);
  const now = Date.now();
  const key = ip;

  let entry = failedLoginStore.get(key);
  if (!entry || now - entry.firstAttempt > 10 * 60 * 1000) {
    entry = { count: 0, firstAttempt: now, identifiers: new Set() };
    failedLoginStore.set(key, entry);
  }

  entry.count++;
  entry.identifiers.add(identifier);

  if (entry.count >= threshold) {
    // Kirim alert sekali per window
    if (!entry.alertSent) {
      entry.alertSent = true;
      const idList = Array.from(entry.identifiers).join(", ");
      sendAlert(
        `🚨 Brute Force Login`,
        `<code>IP</code>           ${escapeHtml(ip)}\n` +
          `<code>Percobaan</code>    ${entry.count}\n` +
          `<code>Identitas</code>    ${escapeHtml(idList)}\n` +
          `<code>Jendela</code>      10 menit\n\n` +
          `IP ini melebihi batas ${threshold} gagal. Pertimbangkan blokir.`,
      );
    }
  }
}

/**
 * Reset counter login gagal untuk IP (dipanggil saat login berhasil).
 * @param {string} ip
 */
function resetFailedLogin(ip) {
  failedLoginStore.delete(ip);
}

module.exports = {
  sendAlert,
  notifyAdminLogin,
  notifyServerStart,
  getClientIp,
  recordFailedLogin,
  resetFailedLogin,
};