/**
 * Clean Sample Data Script
 * Delete sample/test data that was created for testing
 *
 * Usage: node scripts/clean-sample-data.js
 */

require("dotenv").config();
const sequelize = require("../config/database");
const {
  User,
  Post,
  Category,
  Tag,
  PostCategory,
  PostTag,
} = require("../schema");

async function cleanSampleData() {
  console.log("🧹 Cleaning sample/test data...\n");

  try {
    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    // Delete sample users (those without wp_user_id)
    console.log("Deleting sample users...");
    const deletedUsers = await User.destroy({
      where: { wp_user_id: null },
    });
    console.log(`✓ Deleted ${deletedUsers} sample users\n`);

    // Delete sample posts (those without wp_post_id)
    console.log("Deleting sample posts...");
    const deletedPosts = await Post.destroy({
      where: { wp_post_id: null },
    });
    console.log(`✓ Deleted ${deletedPosts} sample posts\n`);

    // Delete sample categories (those without wp_term_id)
    console.log("Deleting sample categories...");
    const deletedCategories = await Category.destroy({
      where: { wp_term_id: null },
    });
    console.log(`✓ Deleted ${deletedCategories} sample categories\n`);

    // Delete sample tags (those without wp_term_id)
    console.log("Deleting sample tags...");
    const deletedTags = await Tag.destroy({
      where: { wp_term_id: null },
    });
    console.log(`✓ Deleted ${deletedTags} sample tags\n`);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Sample data cleaned successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\nSummary:");
    console.log(`- Users removed:      ${deletedUsers}`);
    console.log(`- Posts removed:      ${deletedPosts}`);
    console.log(`- Categories removed: ${deletedCategories}`);
    console.log(`- Tags removed:       ${deletedTags}`);
    console.log("\nOnly WordPress data remains! 🎉");
  } catch (error) {
    console.error("❌ Error cleaning data:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

cleanSampleData();
