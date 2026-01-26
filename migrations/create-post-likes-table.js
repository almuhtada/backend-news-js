const sequelize = require("../config/database");

async function createPostLikesTable() {
  try {
    console.log("🚀 Starting post_likes table migration...");

    // Check if table already exists
    const [tables] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'post_likes'
    `);

    const tableExists = tables[0].count > 0;

    if (tableExists) {
      console.log("✓ post_likes table already exists, skipping migration...");
      return;
    }

    // Create post_likes table
    await sequelize.query(`
      CREATE TABLE post_likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL COMMENT 'ID of the post being liked',
        user_identifier VARCHAR(255) NOT NULL COMMENT 'User identifier (IP address or user ID for logged-in users)',
        user_id INT NULL COMMENT 'ID of registered user if logged in',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        -- Indexes
        INDEX idx_post_id (post_id),
        INDEX idx_user_identifier (user_identifier),

        -- Unique constraint to prevent duplicate likes
        UNIQUE KEY unique_post_like (post_id, user_identifier),

        -- Foreign key constraints
        CONSTRAINT fk_post_like_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        CONSTRAINT fk_post_like_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log("✅ post_likes table created successfully!");
    console.log("✅ Indexes created: idx_post_id, idx_user_identifier");
    console.log("✅ Unique constraint created: unique_post_like");
    console.log("✅ Foreign keys created: fk_post_like_post, fk_post_like_user");
  } catch (error) {
    console.error("❌ Error creating post_likes table:", error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  createPostLikesTable()
    .then(() => {
      console.log("✅ Migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Migration failed:", error);
      process.exit(1);
    });
}

module.exports = createPostLikesTable;
