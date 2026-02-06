/**
 * Cleanup WordPress Tables
 * Hapus tabel WordPress setelah migrasi selesai
 *
 * Usage: node scripts/migration/cleanup-wp-tables.js
 */

require("dotenv").config();
const sequelize = require("../../config/database");

const WP_PREFIX = "wp8o_";

async function cleanupWPTables() {
  console.log("🧹 Cleaning up WordPress tables...\n");

  try {
    // Get all WordPress tables
    const [tables] = await sequelize.query(`
      SHOW TABLES LIKE '${WP_PREFIX}%'
    `);

    if (tables.length === 0) {
      console.log("✅ No WordPress tables found. Already clean!");
      return;
    }

    console.log(`Found ${tables.length} WordPress tables to remove:\n`);

    // List tables
    const tableNames = tables.map((t) => Object.values(t)[0]);
    tableNames.forEach((name) => console.log(`  - ${name}`));

    console.log("\n⚠️  WARNING: This will permanently delete these tables!");
    console.log("Press Ctrl+C within 5 seconds to cancel...\n");

    // Wait 5 seconds before proceeding
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Disable foreign key checks
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");

    // Drop each table
    for (const tableName of tableNames) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS \`${tableName}\``);
        console.log(`✓ Dropped: ${tableName}`);
      } catch (error) {
        console.error(`✗ Failed to drop ${tableName}:`, error.message);
      }
    }

    // Re-enable foreign key checks
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");

    console.log(`\n✅ Cleaned up ${tableNames.length} WordPress tables`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

cleanupWPTables();
