const sequelize = require("../../src/config/database");

async function addWorkflowColumns() {
  console.log("Adding missing workflow columns to posts table...");

  const columns = [
    {
      name: "workflow_status",
      sql: `ADD COLUMN \`workflow_status\` ENUM('SUBMITTED','IN_REVIEW','REVISION_REQUIRED','RESUBMITTED','APPROVED','PUBLISHED') NOT NULL DEFAULT 'SUBMITTED' AFTER \`status\``,
    },
    {
      name: "approved_by_user_uuid",
      sql: `ADD COLUMN \`approved_by_user_uuid\` CHAR(36) NULL AFTER \`workflow_status\``,
    },
    {
      name: "approved_at",
      sql: `ADD COLUMN \`approved_at\` DATETIME NULL AFTER \`approved_by_user_uuid\``,
    },
  ];

  for (const col of columns) {
    try {
      await sequelize.query(`ALTER TABLE \`posts\` ${col.sql}`);
      console.log(`✓ Added column: ${col.name}`);
    } catch (error) {
      if (error.message.includes("Duplicate column name")) {
        console.log(`- Column ${col.name} already exists, skipping`);
      } else {
        console.error(`✗ Failed to add ${col.name}:`, error.message);
        throw error;
      }
    }
  }

  // Add index for workflow_status
  try {
    await sequelize.query(`ALTER TABLE \`posts\` ADD INDEX \`idx_workflow_status\` (\`workflow_status\`)`);
    console.log("✓ Added index: idx_workflow_status");
  } catch (error) {
    if (error.message.includes("Duplicate key name")) {
      console.log("- Index idx_workflow_status already exists");
    } else {
      console.warn("Index warning:", error.message);
    }
  }

  await sequelize.close();
  console.log("Done!");
}

if (require.main === module) {
  addWorkflowColumns()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { addWorkflowColumns };