const sequelize = require("../config/database");

async function addRejectionReasonColumn() {
  try {
    console.log("Checking if rejection_reason column exists...");

    // Check if column already exists
    const [results] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'posts'
        AND COLUMN_NAME = 'rejection_reason'
    `);

    const columnExists = results[0].count > 0;

    if (columnExists) {
      console.log("✓ rejection_reason column already exists, skipping...");
      return;
    }

    console.log("Adding rejection_reason column to posts table...");

    await sequelize.query(`
      ALTER TABLE posts
      ADD COLUMN rejection_reason TEXT NULL
      COMMENT 'Reason for rejection if post was rejected'
    `);

    console.log("✓ rejection_reason column added successfully");
  } catch (error) {
    console.error("Error adding rejection_reason column:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  addRejectionReasonColumn()
    .then(() => {
      console.log("Migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

module.exports = { addRejectionReasonColumn };
