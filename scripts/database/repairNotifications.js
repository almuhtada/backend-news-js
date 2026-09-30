#!/usr/bin/env node

/**
 * Maintenance script to repair mismatched post_id / article_uuid references in notifications table.
 */

require("dotenv").config();
const { Notification, Post, User } = require("../../src/schema");

async function repairNotifications() {
  try {
    console.log("==========================================");
    console.log("🛠️  Notification Database Repair Tool");
    console.log("==========================================\n");

    const notifications = await Notification.findAll({
      include: [
        {
          model: Post,
          as: "post",
          attributes: ["id", "uuid", "title"],
        },
      ],
    });

    console.log(`Found ${notifications.length} notifications to check...\n`);

    let repairedCount = 0;

    for (const notif of notifications) {
      if (notif.category !== "news") continue;

      let matchedPost = null;

      // 1. Try match by article_uuid
      if (notif.article_uuid) {
        matchedPost = await Post.findOne({ where: { uuid: notif.article_uuid } });
      }

      // 2. Try match by target title if article_uuid didn't find post
      if (!matchedPost && notif.target) {
        matchedPost = await Post.findOne({ where: { title: notif.target } });
      }

      // 3. Fallback to post_id
      if (!matchedPost && notif.post_id) {
        matchedPost = await Post.findByPk(notif.post_id);
      }

      if (matchedPost) {
        let updated = false;

        if (notif.post_id !== matchedPost.id) {
          console.log(`[REPAIR] Notif #${notif.id} (${notif.target}): post_id ${notif.post_id} -> ${matchedPost.id}`);
          notif.post_id = matchedPost.id;
          updated = true;
        }

        if (notif.article_uuid !== matchedPost.uuid) {
          console.log(`[REPAIR] Notif #${notif.id} (${notif.target}): article_uuid ${notif.article_uuid} -> ${matchedPost.uuid}`);
          notif.article_uuid = matchedPost.uuid;
          updated = true;
        }

        if (updated) {
          await notif.save();
          repairedCount++;
        }
      }
    }

    console.log(`\n✅ Repair completed! Successfully fixed ${repairedCount} notifications.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error repairing notifications:", error);
    process.exit(1);
  }
}

repairNotifications();
