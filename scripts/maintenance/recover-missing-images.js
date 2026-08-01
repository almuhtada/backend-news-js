/**
 * Download ulang gambar featured yang belum ada di uploads/images.
 *
 * Script ini mencari featured_image di tabel posts yang filenya belum ada
 * di folder uploads/images, mencocokkan dengan wp_url asli di tabel media,
 * lalu mendownloadnya dari https://almuhtada.org.
 *
 * Cara pakai:
 *   node scripts/maintenance/recover-missing-images.js
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { URL } = require("url");
const mysql = require("mysql2/promise");

const DB = { host: "127.0.0.1", port: 3306, user: "root", password: "", database: "almuhtada_db" };
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads", "images");

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const request = mod.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ImageMigrator/1.0)" },
      timeout: 30000,
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
          return;
        }
      }
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(destPath);
      response.pipe(file);
      file.on("finish", () => { file.close(); resolve(true); });
      file.on("error", (err) => { fs.unlink(destPath, () => {}); reject(err); });
    });
    request.on("error", reject);
    request.on("timeout", () => { request.destroy(); reject(new Error("timeout")); });
  });
}

async function main() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const files = new Set(fs.readdirSync(UPLOADS_DIR));

  const conn = await mysql.createConnection({
    host: DB.host, port: DB.port, user: DB.user, password: DB.password, database: DB.database,
  });

  const [rows] = await conn.query(
    "SELECT DISTINCT featured_image FROM posts WHERE featured_image LIKE 'https://api.almuhtada.org/uploads/images/%'",
  );
  const missing = [];
  for (const r of rows) {
    const name = decodeURIComponent(path.basename(r.featured_image));
    if (!files.has(name)) missing.push(name);
  }
  console.log(`Featured image yang belum ada di disk: ${missing.length}\n`);

  const [media] = await conn.query("SELECT wp_url FROM media WHERE wp_url LIKE '%wp-content/uploads%'");
  const wpByFlat = new Map();
  for (const mm of media) {
    const m = mm.wp_url.match(/\/wp-content\/uploads\/(.+)$/);
    if (!m) continue;
    wpByFlat.set(m[1].replace(/\//g, "-"), mm.wp_url);
  }

  let ok = 0, fail = 0;
  for (const name of missing) {
    const orig = wpByFlat.get(name);
    const dest = path.join(UPLOADS_DIR, name);
    if (!orig) { console.log(`  [NO-URL] ${name}`); fail++; continue; }
    try {
      await downloadFile(orig, dest);
      console.log(`  [OK] ${name}`);
      ok++;
    } catch (e) {
      console.log(`  [FAIL] ${name}: ${e.message}`);
      fail++;
    }
  }

  console.log(`\nSelesai. Berhasil: ${ok}, Gagal: ${fail}`);
  conn.end();
}

main();
