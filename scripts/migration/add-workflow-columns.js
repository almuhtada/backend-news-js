const sequelize = require("../../src/config/database");

async function addWorkflowColumns() {
  console.log("Adding workflow columns to posts table...");

  try {
    // Add workflow_status column
    await sequelize.query(`
      ALTER TABLE \`posts\`
      ADD COLUMN \`workflow_status\` ENUM('SUBMITTED','IN_REVIEW','REVISION_REQUIRED','RESUBMITTED','APPROVED','PUBLISHED')
      NOT NULL DEFAULT 'SUBMITTED'
      AFTER \`status\`,
      ADD COLUMN \`approved_by_user_uuid\` CHAR(36) NULL
      AFTER \`workflow_status\`,
      ADD COLUMN \`approved_at\` DATETIME NULL
      AFTER \`approved_by_user_uuid\`,
      ADD COLUMN \`published_at\` DATETIME NULL
      AFTER \`approved_at\`,
      ADD COLUMN \`rejection_reason\` TEXT NULL
      AFTER \`published_at\`
    `);

    console.log("Columns added successfully");

    // Add index for workflow_status
    await sequelize.query(`
      ALTER TABLE \`posts\` ADD INDEX \`idx_workflow_status\` (\`workflow_status\`)
    `);

    console.log("Index added successfully");

  } catch (error) {
    // Check if column already exists
    if (error.message.includes("Duplicate column name")) {
      console.log("Columns already exist, skipping...");
    } else {
      console.error("Migration failed:", error);
      throw error;
    }
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  addWorkflowColumns()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { addWorkflowColumns };