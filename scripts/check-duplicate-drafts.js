/**
 * Check for duplicate draft posts
 * Script to identify and report duplicate posts in draft status
 */

require("dotenv").config();
const { Post, User, Notification } = require("../src/schema");
const { Op } = require("sequelize");
const sequelize = require("../src/config/database");

async function checkDuplicateDrafts() {
  try {
    console.log("[START] Checking duplicate drafts...\n");

    // Find posts with same slug or title in draft status
    const draftPosts = await Post.findAll({
      where: { status: "draft" },
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id", "username", "email"],
        },
      ],
      order: [
        ["title", "ASC"],
        ["createdAt", "DESC"],
      ],
      raw: false,
    });

    console.log(`📊 Total draft posts: ${draftPosts.length}\n`);

    // Group by title to find duplicates
    const titleGroups = {};
    draftPosts.forEach((post) => {
      const key = post.title.toLowerCase().trim();
      if (!titleGroups[key]) {
        titleGroups[key] = [];
      }
      titleGroups[key].push(post);
    });

    // Group by slug to find duplicates
    const slugGroups = {};
    draftPosts.forEach((post) => {
      const key = post.slug.toLowerCase().trim();
      if (!slugGroups[key]) {
        slugGroups[key] = [];
      }
      slugGroups[key].push(post);
    });

    // Report duplicates by title
    console.log("📋 DUPLICATES BY TITLE:");
    console.log("========================\n");
    let titleDupCount = 0;
    Object.entries(titleGroups)
      .filter(([_, posts]) => posts.length > 1)
      .forEach(([title, posts]) => {
        titleDupCount += posts.length;
        console.log(`🔴 Title: "${title}"`);
        console.log(`   Count: ${posts.length} posts\n`);
        posts.forEach((post, idx) => {
          console.log(
            `   ${idx + 1}. [${post.id}] UUID: ${post.uuid.substring(0, 8)}...`,
          );
          console.log(`      Slug: ${post.slug}`);
          console.log(
            `      Author: ${post.author?.username || "Unknown"} (ID: ${post.author_id})`,
          );
          console.log(`      Status: ${post.workflow_status}`);
          console.log(
            `      Created: ${post.createdAt.toLocaleString("id-ID")}`,
          );
        });
        console.log("");
      });

    // Report duplicates by slug
    console.log("\n📋 DUPLICATES BY SLUG:");
    console.log("======================\n");
    let slugDupCount = 0;
    Object.entries(slugGroups)
      .filter(([_, posts]) => posts.length > 1)
      .forEach(([slug, posts]) => {
        slugDupCount += posts.length;
        console.log(`🔴 Slug: "${slug}"`);
        console.log(`   Count: ${posts.length} posts\n`);
        posts.forEach((post, idx) => {
          console.log(
            `   ${idx + 1}. [${post.id}] UUID: ${post.uuid.substring(0, 8)}...`,
          );
          console.log(`      Title: ${post.title}`);
          console.log(
            `      Author: ${post.author?.username || "Unknown"} (ID: ${post.author_id})`,
          );
          console.log(`      Status: ${post.workflow_status}`);
          console.log(
            `      Created: ${post.created_at.toLocaleString("id-ID")}`,
          );
        });
        console.log("");
      });

    // Check for posts with multiple notifications
    console.log("\n📋 POSTS WITH MULTIPLE NOTIFICATIONS:");
    console.log("======================================\n");

    const notifCounts = await sequelize.query(
      `
      SELECT 
        article_uuid,
        COUNT(*) as notification_count,
        GROUP_CONCAT(id ORDER BY id DESC) as notification_ids
      FROM Notifications
      WHERE article_uuid IS NOT NULL
      GROUP BY article_uuid
      HAVING COUNT(*) > 1
      ORDER BY notification_count DESC
      `,
      { type: sequelize.QueryTypes.SELECT },
    );

    if (notifCounts.length > 0) {
      console.log(
        `Found ${notifCounts.length} articles with multiple notifications:\n`,
      );
      for (const notifCount of notifCounts) {
        const post = await Post.findOne({
          where: { uuid: notifCount.article_uuid },
          attributes: ["id", "title", "status", "workflow_status"],
        });
        if (post) {
          console.log(`📌 Post: ${post.title}`);
          console.log(`   UUID: ${notifCount.article_uuid.substring(0, 8)}...`);
          console.log(
            `   Status: ${post.status} | Workflow: ${post.workflow_status}`,
          );
          console.log(
            `   Notification count: ${notifCount.notification_count}`,
          );
          console.log(`   Notification IDs: ${notifCount.notification_ids}`);
          console.log("");
        }
      }
    } else {
      console.log("✅ No posts with multiple notifications found\n");
    }

    // Summary
    console.log("\n📊 SUMMARY:");
    console.log("===========");
    console.log(`Total draft posts: ${draftPosts.length}`);
    console.log(`Unique by title: ${Object.keys(titleGroups).length}`);
    console.log(`Posts in title duplicates: ${titleDupCount}`);
    console.log(`Posts in slug duplicates: ${slugDupCount}`);
    console.log(`Articles with multiple notifications: ${notifCounts.length}`);

    // If duplicates found, show deletion queries
    if (titleDupCount > 0 || slugDupCount > 0) {
      console.log("\n⚠️ RECOMMENDATION:");
      console.log("==================");
      console.log(
        "Run the delete-duplicate-drafts.js script to remove duplicates",
      );
      console.log(
        "Make sure to backup database first! Command: npm run delete-duplicate-drafts",
      );
    }

    process.exit(0);
  } catch (error) {
    console.error("[ERROR]", error);
    process.exit(1);
  }
}

checkDuplicateDrafts();
