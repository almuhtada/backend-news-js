#!/usr/bin/env node

/**
 * Script untuk cek tabel-tabel di database
 * Identifikasi WordPress tables yang bisa di-drop
 */

require("dotenv").config();
const mysql = require("mysql2/promise");

// Tabel-tabel baru yang digunakan oleh sistem
const ACTIVE_TABLES = [
  "about_sections",
  "achievements",
  "categories",
  "comments",
  "media",
  "notifications",
  "pages",
  "page_contents",
  "posts",
  "post_categories",
  "post_likes",
  "post_tags",
  "publications",
  "settings",
  "tags",
  "users",
];

async function checkDatabase() {
  let connection;

  try {
    console.log("==========================================");
    console.log("🔍 Database Table Check");
    console.log("==========================================\n");

    // Connect to database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
    });

    console.log("✅ Connected to database:", process.env.DB_NAME);
    console.log("");

    // Get all tables
    const [tables] = await connection.query("SHOW TABLES");
    const tableKey = `Tables_in_${process.env.DB_NAME}`;

    // Categorize tables
    const wordpressTables = [];
    const customTables = [];
    const otherTables = [];

    tables.forEach((row) => {
      const tableName = row[tableKey];

      // Detect WordPress tables (wp_, wp80, wpXX patterns)
      if (
        tableName.startsWith("wp_") ||
        tableName.startsWith("wp8o") ||
        /^wp\d+/.test(tableName)
      ) {
        wordpressTables.push(tableName);
      } else if (ACTIVE_TABLES.includes(tableName)) {
        customTables.push(tableName);
      } else {
        otherTables.push(tableName);
      }
    });

    // Display results
    console.log("📊 Database Analysis:");
    console.log("==========================================\n");

    console.log(
      `✅ CUSTOM TABLES (${customTables.length}) - DIGUNAKAN SISTEM:`,
    );
    customTables.sort().forEach((table) => {
      console.log(`   ✓ ${table}`);
    });
    console.log("");

    if (wordpressTables.length > 0) {
      console.log(
        `🗑️  WORDPRESS TABLES (${wordpressTables.length}) - BISA DI-DROP:`,
      );
      wordpressTables.sort().forEach((table) => {
        console.log(`   ✗ ${table}`);
      });
      console.log("");
    }

    if (otherTables.length > 0) {
      console.log(`⚠️  OTHER TABLES (${otherTables.length}) - CEK MANUAL:`);
      otherTables.sort().forEach((table) => {
        console.log(`   ? ${table}`);
      });
      console.log("");
    }

    // Generate DROP commands for WordPress tables
    if (wordpressTables.length > 0) {
      console.log("==========================================");
      console.log("🔥 SQL Commands untuk DROP WordPress Tables:");
      console.log("==========================================\n");

      console.log("-- Backup dulu sebelum drop!");
      console.log("-- mysqldump -u news -p news_db > backup_before_drop.sql\n");

      console.log("-- Drop WordPress tables:");
      wordpressTables.sort().forEach((table) => {
        console.log(`DROP TABLE IF EXISTS \`${table}\`;`);
      });
      console.log("");

      // Or single command
      console.log("-- Atau gunakan single command:");
      const dropAll = wordpressTables.map((t) => `\`${t}\``).join(", ");
      console.log(`DROP TABLE IF EXISTS ${dropAll};`);
      console.log("");
    }

    // Check table sizes
    console.log("==========================================");
    console.log("💾 Table Sizes:");
    console.log("==========================================\n");

    const [sizes] = await connection.query(
      `
      SELECT
        table_name AS \`table\`,
        ROUND(((data_length + index_length) / 1024 / 1024), 2) AS \`size_mb\`,
        table_rows AS \`rows\`
      FROM information_schema.TABLES
      WHERE table_schema = ?
      ORDER BY (data_length + index_length) DESC
      LIMIT 20
    `,
      [process.env.DB_NAME],
    );

    sizes.forEach((row) => {
      const marker = row.table.startsWith("wp_")
        ? "🗑️ "
        : ACTIVE_TABLES.includes(row.table)
          ? "✅ "
          : "⚠️  ";
      console.log(
        `${marker}${row.table.padEnd(40)} ${String(row.size_mb).padStart(8)} MB   ${String(row.rows).padStart(10)} rows`,
      );
    });
    console.log("");

    // Summary
    console.log("==========================================");
    console.log("📋 Summary:");
    console.log("==========================================\n");
    console.log(`Total tables: ${tables.length}`);
    console.log(`✅ Custom tables (active): ${customTables.length}`);
    console.log(`🗑️  WordPress tables (can drop): ${wordpressTables.length}`);
    console.log(`⚠️  Other tables (check manually): ${otherTables.length}`);
    console.log("");

    if (wordpressTables.length > 0) {
      console.log("💡 Recommendation:");
      console.log("   1. Backup database terlebih dahulu");
      console.log("   2. Pastikan sistem berjalan normal dengan custom tables");
      console.log("   3. Drop WordPress tables untuk clean up database");
      console.log("");
      console.log("   Command:");
      console.log(
        "   mysqldump -u news -p news_db > backup_before_cleanup.sql",
      );
      console.log("   mysql -u news -p news_db < drop_wordpress_tables.sql");
      console.log("");
    } else {
      console.log("✅ Database sudah bersih, tidak ada WordPress tables!");
      console.log("");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the check
checkDatabase();
