const sequelize = require("./config/database");

async function createNotificationsTable() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_name VARCHAR(255) NOT NULL,
        action ENUM('add', 'edit', 'delete') NOT NULL DEFAULT 'add',
        target VARCHAR(255) NOT NULL,
        status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
        description TEXT,
        priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
        category ENUM('news', 'publication', 'profile', 'system', 'achievement') NOT NULL DEFAULT 'news',
        post_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log("✓ Tabel notifications berhasil dibuat!");
    process.exit(0);
  } catch (error) {
    console.error("Error creating notifications table:", error);
    process.exit(1);
  }
}

createNotificationsTable();
