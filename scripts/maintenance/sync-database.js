/**
 * Script untuk sync database schema (update tables)
 * WARNING: alter: true akan modify existing tables
 */

require("dotenv").config();
const sequelize = require("../../config/database");
require("../../schema"); // Load all models

async function syncDatabase() {
  console.log("🔄 Syncing database schema...\n");

  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established\n");

    // Sync with alter: true to update existing tables
    await sequelize.sync({ alter: true });

    console.log("✅ Database schema updated successfully!\n");
    console.log("Tables have been synchronized with current models.");
  } catch (error) {
    console.error("❌ Database sync failed:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

syncDatabase();
