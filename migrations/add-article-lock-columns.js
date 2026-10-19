const sequelize = require("../src/config/database");

async function addColumnIfMissing(table, column, definition) {
  const [rows] = await sequelize.query(
    `SHOW COLUMNS FROM ${table} LIKE '${column}'`,
  );
  if (rows.length === 0) {
    await sequelize.query(
      `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`,
    );
    console.log(`Added column ${column} to ${table}`);
  } else {
    console.log(`Column ${column} already exists in ${table}`);
  }
}

async function up() {
  try {
    await addColumnIfMissing("posts", "locked_by", "INT NULL");
    await addColumnIfMissing("posts", "locked_name", "VARCHAR(255) NULL");
    await addColumnIfMissing("posts", "locked_at", "DATETIME NULL");
    console.log("Article lock migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await sequelize.close();
  }
}

up();
