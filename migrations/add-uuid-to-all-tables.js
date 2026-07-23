const sequelize = require("../config/database");

const TABLES = [
  "users",
  "posts",
  "categories",
  "tags",
  "comments",
  "media",
  "pages",
  "page_contents",
  "achievements",
  "publications",
  "about_sections",
  "notifications",
  "post_likes",
  "post_view_logs",
  "user_bookmarks",
  "post_categories",
  "post_tags",
  "settings",
];

async function addUuidToAllTables() {
  try {
    console.log("Starting UUID column migration...");

    for (const table of TABLES) {
      const [columns] = await sequelize.query(
        `SHOW COLUMNS FROM \`${table}\` LIKE 'uuid'`
      );

      if (columns.length > 0) {
        console.log(`  [SKIP] ${table} — uuid column already exists`);
        continue;
      }

      console.log(`  [ADD]  ${table} — adding uuid column...`);
      await sequelize.query(
        `ALTER TABLE \`${table}\` ADD COLUMN \`uuid\` VARCHAR(36) NULL AFTER \`id\``
      );
      await sequelize.query(
        `UPDATE \`${table}\` SET \`uuid\` = UUID() WHERE \`uuid\` IS NULL`
      );
      await sequelize.query(
        `ALTER TABLE \`${table}\` MODIFY COLUMN \`uuid\` VARCHAR(36) NOT NULL`
      );
      await sequelize.query(
        `ALTER TABLE \`${table}\` ADD UNIQUE INDEX \`uuid\` (\`uuid\`)`
      );
    }

    console.log("\nUUID migration completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

addUuidToAllTables();
