const sequelize = require("../config/database");

async function createRefreshTokensTable() {
  try {
    console.log("Starting refresh_tokens table migration...");

    const [tables] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'refresh_tokens'
    `);

    const tableExists = tables[0].count > 0;

    if (tableExists) {
      console.log("refresh_tokens table already exists, skipping...");
      return;
    }

    await sequelize.query(`
      CREATE TABLE refresh_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token VARCHAR(36) NOT NULL UNIQUE,
        user_id INT NOT NULL,
        expires_at DATETIME NOT NULL,
        revoked TINYINT(1) DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_token (token),
        INDEX idx_user_id (user_id),
        INDEX idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log("refresh_tokens table created successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

createRefreshTokensTable()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
