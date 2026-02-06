const sequelize = require("./config/database");

async function migrateTagsToNewTable() {
  try {
    console.log("🚀 Starting tags migration...");

    // 1. Create new tags table
    console.log("📝 Creating new tags table...");
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        slug VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_slug (slug),
        INDEX idx_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ New tags table created!");

    // 2. Copy data from wp_tags to tags
    console.log("📋 Copying tags data from wp_tags...");
    await sequelize.query(`
      INSERT INTO tags (name, slug, description)
      SELECT DISTINCT name, slug, description
      FROM wp_tags
      ON DUPLICATE KEY UPDATE
        description = VALUES(description);
    `);

    // Count migrated tags
    const [countResult] = await sequelize.query("SELECT COUNT(*) as count FROM tags");
    const tagCount = countResult[0].count;
    console.log(`✅ Migrated ${tagCount} tags to new table!`);

    // 3. Create new post_tags junction table
    console.log("📝 Creating new post_tags junction table...");
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS post_tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        tag_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_post_tag (post_id, tag_id),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
        INDEX idx_post_id (post_id),
        INDEX idx_tag_id (tag_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ New post_tags junction table created!");

    // 4. Migrate relationships from posts_tags to post_tags
    console.log("📋 Migrating post-tag relationships...");
    await sequelize.query(`
      INSERT IGNORE INTO post_tags (post_id, tag_id)
      SELECT DISTINCT
        wpt.post_id,
        t.id as tag_id
      FROM posts_tags wpt
      INNER JOIN wp_tags wt ON wpt.tag_id = wt.id
      INNER JOIN tags t ON wt.slug = t.slug
      WHERE wpt.post_id IN (SELECT id FROM posts);
    `);

    // Count migrated relationships
    const [relationCount] = await sequelize.query("SELECT COUNT(*) as count FROM post_tags");
    const relCount = relationCount[0].count;
    console.log(`✅ Migrated ${relCount} post-tag relationships!`);

    console.log("\n🎉 Migration completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   - Tags migrated: ${tagCount}`);
    console.log(`   - Relationships migrated: ${relCount}`);
    console.log("\n⚠️  Next steps:");
    console.log("   1. Update Tag model in schema/tag.js to use 'tags' table");
    console.log("   2. Update PostTag model to use 'post_tags' table");
    console.log("   3. Test the application");
    console.log("   4. If everything works, you can drop wp_tags and posts_tags tables");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    console.error("\nError details:", error.message);
    process.exit(1);
  }
}

migrateTagsToNewTable();
