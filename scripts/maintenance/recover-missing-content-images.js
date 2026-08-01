/**
 * Download ulang gambar yang direferensikan di content posts/pages
 * (di luar featured_image) dan belum ada di uploads/images.
 *
 * Nama file local berbentuk: <tahun>-<bulan>-<rest> (hasil flatten dari
 * URL WordPress /wp-content/uploads/<tahun>/<bulan>/<rest>). Variant
 * WordPress seperti nama-300x300.jpg dicoba ulang ke versi base-nya
 * (nama.jpg) bila URL variant tidak ada.
 *
 * Cara pakai:
 *   node scripts/maintenance/recover-missing-content-images.js
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const mysql = require("mysql2/promise");

const DB = { host: "127.0.0.1", port: 3306, user: "root", password: "", database: "almuhtada_db" };
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads", "images");
const BASE = "https://almuhtada.org/wp-content/uploads/";

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

function candidateUrls(flatName) {
  const m = flatName.match(/^(\d{4})-(\d{2})-(.+)$/);
  if (!m) return [];
  const [year, month, rest] = [m[1], m[2], m[3]];
  const urls = [BASE + `${year}/${month}/${rest}`];
  const stripped = rest.replace(/-\d{2,4}x\d{2,4}(\.\w+)$/, "$1");
  if (stripped !== rest) urls.push(BASE + `${year}/${month}/${stripped}`);
  return urls;
}

async function main() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const files = new Set(fs.readdirSync(UPLOADS_DIR));

  const conn = await mysql.createConnection({
    host: DB.host, port: DB.port, user: DB.user, password: DB.password, database: DB.database,
  });

  const [posts] = await conn.query("SELECT content FROM posts WHERE content LIKE '%/uploads/images/%'");
  const [pages] = await conn.query("SELECT content FROM pages WHERE content LIKE '%/uploads/images/%'");

  const missing = new Map();
  for (const r of posts.concat(pages)) {
    const imgs = [...r.content.matchAll(/(?:https:\/\/api\.almuhtada\.org)?\/uploads\/images\/([^"'\s<>]+)/g)].map((x) => x[1]);
    for (const f of imgs) {
      const n = decodeURIComponent(f);
      if (!files.has(n) && !missing.has(n)) missing.set(n, candidateUrls(n));
    }
  }
  console.log(`Gambar content yang belum ada: ${missing.size}`);

  let ok = 0, fail = 0, fromBase = 0;
  let idx = 0;
  const names = [...missing.keys()];
  const LIMIT = 6;

  async function worker() {
    while (idx < names.length) {
      const name = names[idx++];
      const dest = path.join(UPLOADS_DIR, name);
      const urls = missing.get(name);
      let saved = false;
      for (let u = 0; u < urls.length; u++) {
        try {
          await downloadFile(urls[u], dest);
          if (u > 0) fromBase++;
          console.log(`  [OK] ${name}`);
          ok++;
          saved = true;
          break;
        } catch (e) {
          // coba kandidat berikutnya
        }
      }
      if (!saved) {
        console.log(`  [FAIL] ${name}`);
        fail++;
      }
    }
  }
  await Promise.all(Array.from({ length: LIMIT }, worker));

  console.log(`\nSelesai. Berhasil: ${ok} (${fromBase} dari base), Gagal: ${fail}`);
  conn.end();
}

main();
