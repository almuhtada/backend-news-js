/**
 * Update Featured Image URLs dari WordPress ke API VPS
 *
 * Mengubah:
 *   https://almuhtada.org/wp-content/uploads/2018/07/logo_terbaru.png
 * Menjadi:
 *   https://api.almuhtada.org/uploads/images/2018-07-logo_terbaru.png
 *
 * Usage:
 *   node scripts/migration/update-image-urls.js           # Jalankan update
 *   node scripts/migration/update-image-urls.js --dry-run # Test tanpa update
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");
const sequelize = require("../../config/database");
const Post = require("../../schema/post");

const BACKUP_DIR = path.join(__dirname, "..", "..", "backups");
const BACKEND_URL = process.env.BACKEND_URL || "https://api.almuhtada.org";
const DRY_RUN = process.argv.includes("--dry-run");

/**
 * Convert URL ke format yang benar
 * Ganti / dengan - pada path
 *
 * Format lama WordPress:
 *   https://almuhtada.org/wp-content/uploads/2018/07/logo.png
 *   → https://api.almuhtada.org/uploads/images/2018-07-logo.png
 *
 * Format lama API (dengan /):
 *   https://api.almuhtada.org/uploads/images/2018/07/logo.png
 *   → https://api.almuhtada.org/uploads/images/2018-07-logo.png
 */
function convertUrl(oldUrl) {
  if (!oldUrl) return null;

  try {
    // Case 1: WordPress URL dengan wp-content/uploads
    const wpMatch = oldUrl.match(/\/wp-content\/uploads\/(.+)$/);
    if (wpMatch) {
      const relativePath = wpMatch[1];
      const filename = relativePath.replace(/\//g, "-");
      return `${BACKEND_URL}/uploads/images/${filename}`;
    }

    // Case 2: API URL yang sudah pakai uploads/images tapi masih ada /
    const apiMatch = oldUrl.match(/\/uploads\/images\/(\d{4})\/(\d{2})\/(.+)$/);
    if (apiMatch) {
      const year = apiMatch[1];
      const month = apiMatch[2];
      const filename = apiMatch[3];
      return `${BACKEND_URL}/uploads/images/${year}-${month}-${filename}`;
    }

    // Tidak cocok pattern manapun
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Backup data sebelum update
 */
async function createBackup(posts) {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupFile = path.join(BACKUP_DIR, `featured-images-backup-${timestamp}.json`);

  const backupData = {
    created_at: new Date().toISOString(),
    total_posts: posts.length,
    posts: posts.map(p => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      featured_image: p.featured_image,
    })),
  };

  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
  console.log(`\n[BACKUP] Saved to: ${backupFile}\n`);
  return backupFile;
}

async function main() {
  console.log("=".repeat(60));
  console.log("UPDATE FEATURED IMAGE URLs");
  console.log("=".repeat(60));
  console.log(`\nBackend URL: ${BACKEND_URL}`);

  if (DRY_RUN) {
    console.log("\n*** DRY-RUN MODE: No changes will be made ***\n");
  }

  try {
    await sequelize.authenticate();
    console.log("Database connected.\n");

    // Get posts dengan featured_image yang perlu diupdate
    // - WordPress URL: wp-content/uploads
    // - API URL dengan slash: uploads/images/YYYY/MM/
    const posts = await Post.findAll({
      where: {
        featured_image: {
          [Op.and]: [
            { [Op.ne]: null },
            {
              [Op.or]: [
                { [Op.like]: "%wp-content/uploads%" },
                { [Op.like]: "%/uploads/images/%/%/%" }
              ]
            }
          ]
        }
      },
      attributes: ["id", "title", "slug", "featured_image"],
      raw: true,
    });

    console.log(`Found ${posts.length} posts with URLs to update\n`);

    if (posts.length === 0) {
      console.log("No posts to update. Done!");
      return;
    }

    // Create backup
    if (!DRY_RUN) {
      await createBackup(posts);
    }

    // Process each post
    let updated = 0;
    let failed = 0;

    console.log("Converting URLs:\n");
    console.log("-".repeat(60));

    for (const post of posts) {
      const oldUrl = post.featured_image;
      const newUrl = convertUrl(oldUrl);

      if (!newUrl) {
        console.log(`[SKIP] Post #${post.id}: Could not parse URL`);
        console.log(`       ${oldUrl}`);
        failed++;
        continue;
      }

      console.log(`[POST #${post.id}] ${post.title.substring(0, 40)}...`);
      console.log(`  OLD: ${oldUrl}`);
      console.log(`  NEW: ${newUrl}`);

      if (!DRY_RUN) {
        await Post.update(
          { featured_image: newUrl },
          { where: { id: post.id } }
        );
        console.log(`  ✓ Updated`);
      } else {
        console.log(`  [DRY-RUN] Would update`);
      }

      updated++;
      console.log("");
    }

    console.log("-".repeat(60));
    console.log("\n=== SUMMARY ===");
    console.log(`Total posts processed: ${posts.length}`);
    console.log(`Successfully updated: ${updated}`);
    console.log(`Failed/Skipped: ${failed}`);

    if (DRY_RUN) {
      console.log("\n*** This was a DRY-RUN. Run without --dry-run to apply changes ***");
    }

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
