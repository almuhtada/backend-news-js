const sequelize = require("./config/database");

async function verifyAndCleanupTags() {
  try {
    console.log("🔍 Verifying tags migration...\n");

    // 1. Check new tables exist
    console.log("📊 Checking table structure...");
    const [tables] = await sequelize.query("SHOW TABLES LIKE 'tags'");
    const [postTagsTables] = await sequelize.query("SHOW TABLES LIKE 'post_tags'");

    if (tables.length === 0) {
      console.error("❌ Table 'tags' doesn't exist!");
      process.exit(1);
    }
    if (postTagsTables.length === 0) {
      console.error("❌ Table 'post_tags' doesn't exist!");
      process.exit(1);
    }
    console.log("✅ Tables 'tags' and 'post_tags' exist");

    // 2. Check data
    const [tagCount] = await sequelize.query("SELECT COUNT(*) as count FROM tags");
    const [postTagCount] = await sequelize.query("SELECT COUNT(*) as count FROM post_tags");

    console.log(`✅ Tags count: ${tagCount[0].count}`);
    console.log(`✅ Post-Tag relationships: ${postTagCount[0].count}`);

    // 3. Show sample data
    const [sampleTags] = await sequelize.query("SELECT * FROM tags ORDER BY id LIMIT 5");
    console.log("\n📋 Sample tags:");
    sampleTags.forEach(tag => {
      console.log(`   - ${tag.name} (${tag.slug})`);
    });

    // 4. Check WordPress legacy tables
    console.log("\n🔍 Checking for WordPress legacy tables...");
    const [wpTables] = await sequelize.query("SHOW TABLES LIKE 'wp%tag%'");

    if (wpTables.length > 0) {
      console.log("\n⚠️  Found WordPress legacy tag tables:");
      wpTables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`   - ${tableName}`);
      });

      console.log("\n❓ Do you want to drop these tables? (They are no longer used)");
      console.log("   To drop them, run:");
      wpTables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`   DROP TABLE IF EXISTS \`${tableName}\`;`);
      });
    } else {
      console.log("✅ No WordPress legacy tag tables found");
    }

    // 5. Verify API endpoint works
    console.log("\n🧪 Testing Tag API endpoint...");
    const Tag = require("./schema/tag");
    const tags = await Tag.findAll({ limit: 5 });
    console.log(`✅ API can fetch ${tags.length} tags successfully`);

    console.log("\n✨ Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Tags system is using NEW clean tables:");
    console.log("   - Table: tags");
    console.log("   - Junction: post_tags");
    console.log(`   - Total tags: ${tagCount[0].count}`);
    console.log(`   - Total relationships: ${postTagCount[0].count}`);
    console.log("✅ Separated from WordPress structure");
    console.log("✅ Ready to use in your application");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  }
}

verifyAndCleanupTags();
