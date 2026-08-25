const sequelize = require("../src/config/database");

async function addColumnIfMissing(table, column, definition) {
  const [rows] = await sequelize.query(
    `SHOW COLUMNS FROM ${table} LIKE '${column}'`,
  );
  if (rows.length === 0) {
    await sequelize.query(
      `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`,
    );
  }
}

async function up() {
  await addColumnIfMissing(
    "posts",
    "workflow_status",
    "VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED'",
  );
  await addColumnIfMissing("posts", "approved_by_user_uuid", "CHAR(36) NULL");
  await addColumnIfMissing("posts", "approved_at", "DATETIME NULL");
  await addColumnIfMissing("notifications", "article_uuid", "CHAR(36) NULL");
  await addColumnIfMissing("notifications", "user_uuid", "CHAR(36) NULL");

  await sequelize.query(
    "UPDATE posts SET workflow_status = CASE WHEN status = 'publish' THEN 'PUBLISHED' ELSE 'SUBMITTED' END WHERE workflow_status = 'SUBMITTED'",
  );

  await sequelize.query(
    "UPDATE notifications n JOIN posts p ON p.id = n.post_id SET n.article_uuid = p.uuid WHERE n.article_uuid IS NULL AND n.post_id IS NOT NULL",
  );

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS article_activities (
      activity_uuid CHAR(36) NOT NULL PRIMARY KEY,
      article_uuid CHAR(36) NOT NULL,
      user_uuid CHAR(36) NULL,
      action VARCHAR(50) NOT NULL,
      status_before VARCHAR(50) NULL,
      status_after VARCHAR(50) NOT NULL,
      comment TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_article_activities_article_uuid (article_uuid),
      INDEX idx_article_activities_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

if (require.main === module) {
  up()
    .then(() => {
      console.log("Article workflow migration completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Article workflow migration failed:", error);
      process.exit(1);
    });
}

module.exports = { up };
