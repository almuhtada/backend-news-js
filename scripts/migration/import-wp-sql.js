/**
 * Import WordPress SQL dump to remote database
 * Handles large files by streaming line by line
 *
 * Usage: node scripts/migration/import-wp-sql.js
 */

require("dotenv").config();
const fs = require("fs");
const readline = require("readline");
const path = require("path");
const mysql = require("mysql2/promise");

const SQL_FILE = path.join(__dirname, "../../news_db.sql");

async function createConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
    connectTimeout: 60000,
    // Important for large imports
    maxAllowedPacket: 64 * 1024 * 1024,
  });
}

async function importSQL() {
  console.log("📥 Importing WordPress SQL to remote database...\n");

  if (!fs.existsSync(SQL_FILE)) {
    console.error("❌ File not found:", SQL_FILE);
    process.exit(1);
  }

  const stats = fs.statSync(SQL_FILE);
  const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`📄 File: ${SQL_FILE}`);
  console.log(`📊 Size: ${fileSizeMB} MB\n`);

  let connection = await createConnection();
  console.log(`✅ Connected to ${process.env.DB_HOST}:${process.env.DB_PORT}\n`);

  // Disable foreign key checks for faster import
  await connection.query("SET FOREIGN_KEY_CHECKS = 0");
  await connection.query("SET UNIQUE_CHECKS = 0");
  await connection.query("SET AUTOCOMMIT = 0");

  const fileStream = fs.createReadStream(SQL_FILE, { encoding: "utf8" });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let currentStatement = "";
  let lineNumber = 0;
  let executed = 0;
  let errors = 0;
  let totalLines = 0;

  // Count lines first for progress
  console.log("📖 Counting lines...");
  const countStream = fs.createReadStream(SQL_FILE);
  for await (const chunk of countStream) {
    for (const char of chunk) {
      if (char === "\n") totalLines++;
    }
  }
  console.log(`📊 Total lines: ${totalLines.toLocaleString()}\n`);
  console.log("⏳ Importing... This may take several minutes...\n");

  const startTime = Date.now();

  for await (const line of rl) {
    lineNumber++;

    // Skip comments and empty lines at statement start
    const trimmedLine = line.trim();
    if (currentStatement === "") {
      if (
        trimmedLine === "" ||
        trimmedLine.startsWith("--") ||
        trimmedLine.startsWith("/*!") ||
        trimmedLine.startsWith("/*")
      ) {
        continue;
      }
    }

    currentStatement += line + "\n";

    // Check if statement is complete
    if (trimmedLine.endsWith(";")) {
      const stmt = currentStatement.trim();

      // Skip certain statements
      if (
        stmt.length > 1 &&
        !stmt.startsWith("--") &&
        !stmt.startsWith("/*!") &&
        stmt !== ";"
      ) {
        try {
          await connection.query(stmt);
          executed++;

          // Commit every 100 statements
          if (executed % 100 === 0) {
            await connection.query("COMMIT");
            await connection.query("START TRANSACTION");
          }
        } catch (err) {
          if (
            !err.message.includes("Duplicate") &&
            !err.message.includes("already exists") &&
            !err.message.includes("doesn't exist")
          ) {
            errors++;
            if (errors <= 10) {
              console.error(`\n⚠️  Line ${lineNumber}: ${err.message.substring(0, 80)}`);
            }
          }

          // Reconnect if connection lost
          if (
            err.message.includes("ECONNRESET") ||
            err.message.includes("closed state")
          ) {
            console.log("\n🔄 Reconnecting...");
            try {
              await connection.end();
            } catch (e) {}
            connection = await createConnection();
            await connection.query("SET FOREIGN_KEY_CHECKS = 0");
          }
        }
      }

      currentStatement = "";
    }

    // Progress update
    if (lineNumber % 5000 === 0) {
      const progress = Math.round((lineNumber / totalLines) * 100);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      process.stdout.write(
        `\r⏳ Progress: ${progress}% | Lines: ${lineNumber.toLocaleString()} | Executed: ${executed} | Time: ${elapsed}s`
      );
    }
  }

  // Final commit
  await connection.query("COMMIT");
  await connection.query("SET FOREIGN_KEY_CHECKS = 1");
  await connection.query("SET UNIQUE_CHECKS = 1");
  await connection.query("SET AUTOCOMMIT = 1");

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n\n✅ Import complete!`);
  console.log(`   📊 Statements executed: ${executed}`);
  console.log(`   ⚠️  Errors (ignored): ${errors}`);
  console.log(`   ⏱️  Total time: ${totalTime}s`);

  await connection.end();
}

importSQL().catch(console.error);
