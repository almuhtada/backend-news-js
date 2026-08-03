/**
 * File Integrity Monitor — deteksi perubahan file penting.
 * Jika hash berarti file diubah/ditambah/dihapus → alert Telegram.
 *
 * Cocok untuk mendeteksi penyusup yang mengganti website jadi judol.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { sendTelegramMessage, escapeHtml } = require("./telegram.service");

const APP = process.env.APP_NAME || "Backend";
const BASE = process.cwd();

// File/direktori yang dipantau
const WATCH_TARGETS = [
  "src/server.js",
  "src/config/database.js",
  ".env",
  "src/middleware/spamShield.js",
  "src/services/auth.service.js",
  "src/controller/auth.js",
  "src/controller/postController.js",
  "src/routes/auth.js",
  "src/routes/posts.js",
  "src/routes/upload.js",
  "src/utils/gamblingKeyword.js",
  "src/services/spamDetector.service.js",
];

// Simpan hash awal (dibaca saat server start)
const baselineHashes = new Map();

function hashFile(filePath) {
  try {
    const full = path.join(BASE, filePath);
    if (!fs.existsSync(full)) return null;
    const content = fs.readFileSync(full);
    return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
  } catch {
    return "ERROR";
  }
}

function scanAll() {
  const changes = [];
  for (const rel of WATCH_TARGETS) {
    const full = path.join(BASE, rel);
    const currentHash = hashFile(rel);

    if (!fs.existsSync(full)) {
      if (baselineHashes.has(rel)) {
        changes.push({ file: rel, status: "DELETED", old: baselineHashes.get(rel) });
      }
      continue;
    }

    if (!baselineHashes.has(rel)) {
      // File baru yang sebelumnya tidak ada
      changes.push({ file: rel, status: "NEW", hash: currentHash });
    } else if (baselineHashes.get(rel) !== currentHash) {
      changes.push({
        file: rel,
        status: "MODIFIED",
        old: baselineHashes.get(rel),
        new: currentHash,
      });
    }
  }
  return changes;
}

function initBaseline() {
  for (const rel of WATCH_TARGETS) {
    const h = hashFile(rel);
    if (h) baselineHashes.set(rel, h);
  }
  console.log(`[Integrity] Baseline loaded: ${baselineHashes.size} files`);
}

function formatChanges(changes) {
  if (changes.length === 0) return "Tidak ada perubahan.";
  return changes
    .map((c) => {
      const icon = c.status === "MODIFIED" ? "✏️" : c.status === "NEW" ? "➕" : "🗑️";
      return `${icon} <b>${c.status}</b>: <code>${escapeHtml(c.file)}</code>${
        c.old ? ` (${c.old}→${c.new})` : ""
      }`;
    })
    .join("\n");
}

function sendAlert(changes) {
  const text =
    `⚡ <b>${APP}</b>\n` +
    `──────────────\n` +
    `<b>⚠ Perubahan File Terdeteksi</b>\n\n` +
    `${formatChanges(changes)}\n\n` +
    `<i>${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</i>`;

  return sendTelegramMessage({
    topic: "SPAM",
    useHtml: true,
    text,
  }).catch((err) =>
    console.error("[Integrity] Telegram alert failed:", err.message),
  );
}

function runCheck() {
  const changes = scanAll();
  if (changes.length > 0) {
    console.warn(
      `[Integrity] ${changes.length} file changed:`,
      changes.map((c) => c.file).join(", "),
    );
    sendAlert(changes);
  }
}

// Inisialisasi baseline & mulai interval
initBaseline();
setInterval(runCheck, 5 * 60 * 1000); // 5 menit

// Export untuk test manual
module.exports = { runCheck, scanAll, initBaseline };