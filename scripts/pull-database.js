/**
 * Script untuk menarik database dari MySQL local ke server remote.
 *
 * Cara pakai:
 *   1. Isi konfigurasi LOCAL (MySQL mesin sendiri) dan REMOTE (server tujuan)
 *   2. Jalankan: node scripts/pull-database.js
 *
 * Yang dilakukan script:
 *   - Export semua tabel + data dari local MySQL (konfigurasi LOCAL di bawah)
 *   - Simpan ke file: backups/pull_<db>_<timestamp>.sql
 *   - Import langsung ke server remote (set IMPORT_REMOTE = true)
 *
 * Catatan: konfigurasi LOCAL TIDAK membaca .env, karena .env proyek ini
 * menunjuk ke server remote (production). MySQL local bisa berbeda kredensial.
 */

require("dotenv").config();
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

// ============================================================
// KONFIGURASI REMOTE SERVER — isi sesuai server tujuan
// ============================================================
const REMOTE = {
  host: "103.247.9.199", // IP atau domain server
  port: 3306, // Port MySQL server
  user: "root", // User MySQL server
  password: "Almuhtada@2026", // Password MySQL server
  database: "almuhtada_db", // Nama database di server
};

// Ubah ke true untuk langsung import ke server setelah export
const IMPORT_REMOTE = true;

// Jika true, database remote di-DROP total (DROP DATABASE + DROP TABLE),
// lalu dibuat ulang. Jika false (default): setiap tabel dikosongkan dulu
// (DELETE FROM) baru diisi data local, sehingga isi remote menyesuaikan
// isi local per tabel masing-masing tanpa menghapus database.
const DROP_FIRST = false;

// ============================================================
// KONFIGURASI LOCAL — MySQL di mesin sendiri
// ============================================================
const LOCAL = {
  host: "127.0.0.1", // MySQL local
  port: 3306,
  user: "root",
  password: "", // sesuaikan jika MySQL local memakai password
  database: "almuhtada_db",
};

const BACKUP_DIR = path.join(__dirname, "..", "backups");

// ============================================================

function timestamp() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return `${y}${m}${d}_${h}${min}${s}`;
}

function escapeValue(val) {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return String(val);
  if (typeof val === "boolean") return val ? "1" : "0";
  if (val instanceof Date)
    return `'${val.toISOString().slice(0, 19).replace("T", " ")}'`;
  // Kolom JSON dibaca mysql2 sebagai object/array. Stringify agar menjadi
  // teks JSON yang valid (jangan pakai String(obj) = "[object Object]").
  if (typeof val === "object") {
    const json = JSON.stringify(val);
    return "'" + json.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
  }
  const str = String(val);
  return (
    "'" +
    str
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t") +
    "'"
  );
}

async function getTables(conn) {
  const [rows] = await conn.query(
    "SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
    [conn.config.database],
  );
  return rows.map((r) => r.TABLE_NAME);
}

async function getCreateTable(conn, table) {
  const [rows] = await conn.query(`SHOW CREATE TABLE \`${table}\``);
  return rows[0]["Create Table"];
}

async function getTableData(conn, table) {
  const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
  if (rows.length === 0) return null;

  const columns = Object.keys(rows[0]);
  const colNames = columns.map((c) => `\`${c}\``).join(", ");

  const values = rows.map((row) => {
    const vals = columns.map((c) => escapeValue(row[c]));
    return `(${vals.join(", ")})`;
  });

  return { colNames, values, total: rows.length };
}

function sanitizeTableName(name) {
  return name.replace(/[^a-zA-Z0-9_]/g, "_");
}

async function exportLocal() {
  console.log("Menghubungkan ke MySQL local...");
  console.log(`  Host: ${LOCAL.host}:${LOCAL.port}`);
  console.log(`  Database: ${LOCAL.database}\n`);

  const conn = await mysql.createConnection({
    host: LOCAL.host,
    port: LOCAL.port,
    user: LOCAL.user,
    password: LOCAL.password,
    database: LOCAL.database,
    charset: "utf8mb4",
    multipleStatements: true,
  });

  const tables = await getTables(conn);
  console.log(`Ditemukan ${tables.length} tabel:\n`);
  tables.forEach((t) => console.log(`  - ${t}`));
  console.log("");

  // Buat directory backup
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const filename = `pull_${LOCAL.database}_${timestamp()}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);
  const writer = fs.createWriteStream(filepath);

  writer.write(
    `-- ============================================================\n`,
  );
  writer.write(`-- Database: ${LOCAL.database}\n`);
  writer.write(`-- Export date: ${new Date().toISOString()}\n`);
  writer.write(
    `-- ============================================================\n\n`,
  );
  if (DROP_FIRST) {
    writer.write(`DROP DATABASE IF EXISTS \`${LOCAL.database}\`;\n`);
    writer.write(
      `CREATE DATABASE \`${LOCAL.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n`,
    );
  }
  writer.write(`USE \`${LOCAL.database}\`;\n\n`);
  writer.write(`SET FOREIGN_KEY_CHECKS = 0;\n\n`);

  for (const table of tables) {
    process.stdout.write(`  Mengekspor ${table}... `);

    writer.write(`-- ----------------------------\n`);
    writer.write(`-- Table: ${table}\n`);
    writer.write(`-- ----------------------------\n`);

    // Structure — hanya ditulis jika tabel remote dibuat ulang (DROP_FIRST).
    // Jika tidak, struktur remote sudah sama dan tidak perlu CREATE TABLE.
    if (DROP_FIRST) {
      const createSQL = await getCreateTable(conn, table);
      writer.write(`DROP TABLE IF EXISTS \`${table}\`;\n`);
      writer.write(`${createSQL};\n\n`);
    }

    // Data
    const data = await getTableData(conn, table);
    if (!DROP_FIRST) {
      // Tanpa DROP: kosongkan isi tabel dulu, lalu isi ulang dengan data local.
      // Dengan begini isi remote ikut data local, per tabel masing-masing.
      writer.write(`DELETE FROM \`${table}\`;\n`);
    }
    if (data) {
      const batchSize = 500;
      for (let i = 0; i < data.values.length; i += batchSize) {
        const batch = data.values.slice(i, i + batchSize);
        writer.write(
          `INSERT INTO \`${table}\` (${data.colNames}) VALUES\n${batch.join(",\n")};\n`,
        );
      }
      console.log(`${data.total} baris`);
    } else {
      console.log("0 baris (kosong)");
    }

    writer.write(`\n`);
  }

  writer.write(`SET FOREIGN_KEY_CHECKS = 1;\n`);
  writer.write(`\n-- Export selesai.\n`);

  // Tunggu sampai file benar-benar selesai ditulis ke disk, supaya tidak ada
  // risiko file terbaca setengah ketika langsung diimport.
  await new Promise((resolve, reject) => {
    writer.end((err) => (err ? reject(err) : resolve()));
  });
  conn.end();

  console.log(`\nFile export: ${filepath}`);

  const stats = fs.statSync(filepath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`Ukuran: ${sizeMB} MB`);

  return filepath;
}

async function importRemote(filepath) {
  console.log("\n--- Mengimport ke server remote ---\n");
  console.log(`  Host: ${REMOTE.host}:${REMOTE.port}`);
  console.log(`  Database: ${REMOTE.database}\n`);

  const sqlContent = fs.readFileSync(filepath, "utf8");

  const conn = await mysql.createConnection({
    host: REMOTE.host,
    port: REMOTE.port,
    user: REMOTE.user,
    password: REMOTE.password,
    charset: "utf8mb4",
    multipleStatements: true,
  });

  // Eksekusi seluruh isi file SQL sekaligus (multipleStatements aktif).
  // DROP_DATABASE/CREATE_TABLE hanya ada jika DROP_FIRST = true.
  try {
    await conn.query(sqlContent);
    console.log("Import berhasil: seluruh statement dieksekusi.");
  } catch (err) {
    throw new Error(
      `Import gagal: ${err.message}\nPastikan struktur tabel di remote sama dengan local (atau set DROP_FIRST = true).`,
    );
  } finally {
    conn.end();
  }
  console.log(`Database ${REMOTE.database} sudah terisi data dari local.`);
}

async function main() {
  console.log("=== PULL DATABASE: LOCAL → REMOTE ===\n");

  try {
    const filepath = await exportLocal();

    if (IMPORT_REMOTE) {
      const required = ["host", "user", "password", "database"];
      const missing = required.filter((k) => REMOTE[k].includes("your-"));
      if (missing.length > 0) {
        console.log(
          `\nLEWATKAN IMPORT: konfigurasi REMOTE belum diisi (${missing.join(", ")}).`,
        );
        console.log(
          "Isi konfigurasi REMOTE di script ini, lalu set IMPORT_REMOTE = true.",
        );
      } else {
        await importRemote(filepath);
      }
    } else {
      console.log("\nIMPORT_REMOTE = false, import ke server dilewati.");
      console.log("File SQL siap: upload ke server dan import manual:");
      console.log("  mysql -h <host> -u <user> -p <db_name> < " + filepath);
    }

    console.log("\n=== SELESAI ===");
  } catch (err) {
    console.error("\nError:", err.message);
    process.exit(1);
  }
}

main();
