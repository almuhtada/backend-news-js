/**
 * Update semua URL gambar di database agar memakai domain API VPS.
 *
 * Mengubah:
 *   https://almuhtada.org/wp-content/uploads/2026/03/nama-gambar.jpg
 *   /uploads/images/2026-03-nama-gambar.jpg
 * menjadi:
 *   https://api.almuhtada.org/uploads/images/2026-03-nama-gambar.jpg
 *
 * Kolom yang diupdate:
 *   - posts.featured_image
 *   - posts.content
 *   - pages.content
 *   - media.caption, media.description
 *   - media.file_path (diisi path flattened dari wp_url)
 *
 * Berjalan di database LOCAL (127.0.0.1) dan REMOTE (103.247.9.199)
 * supaya keduanya tetap sinkron.
 *
 * Cara pakai:
 *   node scripts/maintenance/update-image-urls-vps.js --dry-run   # cek dulu
 *   node scripts/maintenance/update-image-urls-vps.js             # jalankan
 */

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const BASE_URL = "https://api.almuhtada.org";
const BACKUP_DIR = path.join(__dirname, "..", "..", "backups");
const DRY_RUN = process.argv.includes("--dry-run");

const DBS = [
  { name: "LOCAL", host: "127.0.0.1", port: 3306, user: "root", password: "", database: "almuhtada_db" },
  { name: "REMOTE", host: "103.247.9.199", port: 3306, user: "root", password: "Almuhtada@2026", database: "almuhtada_db" },
];

// Tabel & kolom yang akan diupdate (ganti teks URL)
const TEXT_COLUMNS = [
  { table: "posts", column: "featured_image" },
  { table: "posts", column: "content" },
  { table: "pages", column: "content" },
  { table: "media", column: "caption" },
  { table: "media", column: "description" },
];

// URL lama WordPress -> URL baru API VPS (path di-flatten: / diganti -)
function replaceWpUrl(text) {
  if (!text) return text;
  return text.replace(
    /https?:\/\/(?:www\.)?almuhtada\.org\/wp-content\/uploads\/([^\s"'<>]+)/gi,
    (match, rest) => `${BASE_URL}/uploads/images/${rest.replace(/\//g, "-")}`,
  );
}

// Path relatif /uploads/images/... -> URL absolut.
// Pakai negative lookbehind supaya idempotent: URL yang sudah
// diawali https://api.almuhtada.org tidak diubah lagi.
function replaceRelativeUrl(text) {
  if (!text) return text;
  return text.replace(
    /(?<!https:\/\/api\.almuhtada\.org)\/uploads\/images\/([^\s"'<>]+)/g,
    `${BASE_URL}/uploads/images/$1`,
  );
}

function transformText(text) {
  if (!text) return text;
  return replaceRelativeUrl(replaceWpUrl(text));
}

function transformFeaturedImage(value) {
  if (!value) return value;
  if (value.startsWith("/uploads/images/")) {
    return BASE_URL + value;
  }
  return transformText(value);
}

function deriveFilePath(wpUrl) {
  if (!wpUrl) return null;
  const m = wpUrl.match(/\/wp-content\/uploads\/([^\s"'<>]+)/);
  if (!m) return null;
  return m[1].replace(/\//g, "-");
}

function timestamp() {
  const n = new Date();
  const p = (x) => String(x).padStart(2, "0");
  return `${n.getFullYear()}${p(n.getMonth() + 1)}${p(n.getDate())}_${p(n.getHours())}${p(n.getMinutes())}${p(n.getSeconds())}`;
}

async function createBackup(conn, backup) {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  for (const c of TEXT_COLUMNS) {
    const [rows] = await conn.query(
      `SELECT * FROM \`${c.table}\` WHERE \`${c.column}\` IS NOT NULL AND (\`${c.column}\` LIKE '%wp-content/uploads%' OR \`${c.column}\` LIKE '%/uploads/images/%')`,
    );
    backup[c.table] = backup[c.table] || [];
    backup[c.table].push(...rows.map((r) => ({ id: r.id, column: c.column, value: r[c.column] })));
  }
  const [mediaRows] = await conn.query(
    "SELECT id, wp_url FROM media WHERE wp_url IS NOT NULL AND wp_url <> '' AND (file_path IS NULL OR file_path = '')",
  );
  backup.media = backup.media || [];
  backup.media.push(...mediaRows.map((r) => ({ id: r.id, wp_url: r.wp_url })));
}

async function runOn(db) {
  const conn = await mysql.createConnection({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    database: db.database,
    charset: "utf8mb4",
  });

  console.log(`\n=== ${db.name} (${db.host}) ===`);

  let totalChanged = 0;
  for (const c of TEXT_COLUMNS) {
    const [rows] = await conn.query(
      `SELECT id, \`${c.column}\` AS val FROM \`${c.table}\` WHERE \`${c.column}\` IS NOT NULL AND (\`${c.column}\` LIKE '%wp-content/uploads%' OR \`${c.column}\` LIKE '%/uploads/images/%')`,
    );
    let changed = 0;
    for (const row of rows) {
      const newVal = c.column === "featured_image"
        ? transformFeaturedImage(row.val)
        : transformText(row.val);
      if (newVal !== row.val) {
        changed++;
        if (!DRY_RUN) {
          await conn.query(
            `UPDATE \`${c.table}\` SET \`${c.column}\` = ? WHERE id = ?`,
            [newVal, row.id],
          );
        }
      }
    }
    totalChanged += changed;
    console.log(`  ${c.table}.${c.column}: ${changed} diubah`);
  }

  // media.file_path: isi dari wp_url (flattened) jika masih kosong
  const [mediaRows] = await conn.query(
    "SELECT id, wp_url FROM media WHERE wp_url IS NOT NULL AND wp_url <> '' AND (file_path IS NULL OR file_path = '')",
  );
  let mediaChanged = 0;
  for (const row of mediaRows) {
    const fp = deriveFilePath(row.wp_url);
    if (fp) {
      mediaChanged++;
      if (!DRY_RUN) {
        await conn.query("UPDATE media SET file_path = ? WHERE id = ?", [fp, row.id]);
      }
    }
  }
  totalChanged += mediaChanged;
  console.log(`  media.file_path: ${mediaChanged} diisi`);

  conn.end();
  console.log(`  Total: ${totalChanged} perubahan`);
  return totalChanged;
}

async function main() {
  console.log("UPDATE IMAGE URLs → " + BASE_URL);
  if (DRY_RUN) console.log("*** DRY-RUN: tidak ada perubahan ditulis ***");

  const backup = {};
  for (const db of DBS) {
    const conn = await mysql.createConnection({
      host: db.host,
      port: db.port,
      user: db.user,
      password: db.password,
      database: db.database,
    });
    await createBackup(conn, backup);
    conn.end();
  }

  const backupFile = path.join(BACKUP_DIR, `image-urls-backup-${timestamp()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  console.log(`\n[BACKUP] ${backupFile}`);

  for (const db of DBS) {
    await runOn(db);
  }

  if (DRY_RUN) {
    console.log("\n*** Ini DRY-RUN. Jalankan tanpa --dry-run untuk menulis ke database. ***");
  } else {
    console.log("\nSelesai. URL gambar sudah memakai " + BASE_URL);
  }
}

main();
