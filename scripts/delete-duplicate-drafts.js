/**
 * Delete duplicate draft posts
 * Script to safely remove duplicate draft posts while keeping the newest one
 * IMPORTANT: Backup database first!
 */

require("dotenv").config();
const { Post, Notification, ArticleActivity } = require("../src/schema");
const { Op } = require("sequelize");
const sequelize = require("../src/config/database");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function deleteDuplicateDrafts() {
  try {
    console.log("🚨 WARNING: This script will DELETE duplicate draft posts!");
    console.log("   Ensure you have a database backup before proceeding.\n");

    const confirmed = await question(
      "Have you backed up your database? (yes/no): ",
    );
    if (confirmed.toLowerCase() !== "yes") {
      console.log("❌ Cancelled. Please backup first.");
      process.exit(0);
    }

    console.log("\n[START] Analyzing duplicates...\n");

    // Get all draft posts grouped by title
    const draftPosts = await Post.findAll({
      where: { status: "draft" },

      order: [
        ["title", "ASC"],
        ["created_at", "DESC"],
      ],
      raw: true,
    });

    // Group by title
    const titleGroups = {};
    draftPosts.forEach((post) => {
      const key = post.title.toLowerCase().trim();
      if (!titleGroups[key]) {
        titleGroups[key] = [];
      }
      titleGroups[key].push(post);
    });

    // Find duplicates (keep the newest, delete older ones)
    const toDelete = [];
    Object.entries(titleGroups)
      .filter(([_, posts]) => posts.length > 1)
      .forEach(([title, posts]) => {
        // posts are already sorted by created_at DESC (newest first)
        const keep = posts[0]; // Keep the newest
        const duplicates = posts.slice(1); // Delete the rest
        duplicates.forEach((dup) => {
          toDelete.push({
            id: dup.id,
            uuid: dup.uuid,
            title: dup.title,
            slug: dup.slug,
            createdAt: dup.createdAt,
            keepId: keep.id,
            keepUuid: keep.uuid,
            keepCreatedAt: keep.createdAt,
          });
        });
      });

    if (toDelete.length === 0) {
      console.log("✅ No duplicate draft posts found!");
      process.exit(0);
    }

    console.log(`Found ${toDelete.length} duplicate draft posts to delete:\n`);

    // Show what will be deleted
    toDelete.forEach((item, idx) => {
      console.log(`${idx + 1}. [DELETE] Post ID: ${item.id}`);
      console.log(`   Title: ${item.title}`);
      console.log(`   Slug: ${item.slug}`);
      console.log(
        `   Created: ${new Date(item.createdAt).toLocaleString("id-ID")}`,
      );
      console.log(
        `   (Keeping ID: ${item.keepId}, created ${new Date(item.keepCreatedAt).toLocaleString("id-ID")})`,
      );
      console.log("");
    });

    const proceed = await question(
      `\nProceed to delete ${toDelete.length} posts? (yes/no): `,
    );
    if (proceed.toLowerCase() !== "yes") {
      console.log("❌ Cancelled.");
      process.exit(0);
    }

    console.log(
      "\n[PROCESSING] Deleting duplicate posts and related data...\n",
    );

    // Delete in transaction
    const transaction = await sequelize.transaction();

    try {
      for (const item of toDelete) {
        // Delete notifications
        const notifCount = await Notification.destroy({
          where: {
            [Op.or]: [{ article_uuid: item.uuid }, { post_id: item.id }],
          },
          transaction,
        });

        // Delete activities
        const activityCount = await ArticleActivity.destroy({
          where: { article_uuid: item.uuid },
          transaction,
        });

        // Delete post
        await Post.destroy({
          where: { id: item.id },
          transaction,
        });

        console.log(`✅ Deleted post [${item.id}] "${item.title}"`);
        console.log(
          `   └─ Removed ${notifCount} notifications, ${activityCount} activities`,
        );
      }

      await transaction.commit();

      console.log(
        `\n✅ Successfully deleted ${toDelete.length} duplicate draft posts!`,
      );
      console.log("   All related notifications and activities removed.");

      process.exit(0);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error("[ERROR]", error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

deleteDuplicateDrafts();
