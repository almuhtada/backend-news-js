/**
 * ============================================================================
 * UPDATE FEATURED IMAGE URLs
 * ============================================================================
 *
 * Script sederhana untuk mengubah URL gambar di kolom featured_image
 * dari format lama ke format baru.
 *
 * CONTOH KONVERSI:
 *   SEBELUM: https://almuhtada.org/wp-content/uploads/2018/07/logo_terbaru.png
 *   SESUDAH: https://api.almuhtada.org/uploads/images/2018-07-logo_terbaru.png
 *
 * CARA PAKAI:
 *   node scripts/maintenance/update-featured-image-urls.js --dry-run   # Test dulu
 *   node scripts/maintenance/update-featured-image-urls.js             # Jalankan
 *
 * ============================================================================
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");
const sequelize = require("../../config/database");
const Post = require("../../schema/post");

// Konfigurasi
const BACKUP_DIR = path.join(__dirname, "..", "..", "backups");
const NEW_BASE_URL = process.env.BACKEND_URL || "https://api.almuhtada.org";
const DRY_RUN = process.argv.includes("--dry-run");

/**
 * Konversi URL lama ke URL baru
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
      return `${NEW_BASE_URL}/uploads/images/${filename}`;
    }

    // Case 2: API URL yang sudah pakai uploads/images tapi masih ada /
    const apiMatch = oldUrl.match(/\/uploads\/images\/(\d{4})\/(\d{2})\/(.+)$/);
    if (apiMatch) {
      const year = apiMatch[1];
      const month = apiMatch[2];
      const filename = apiMatch[3];
      return `${NEW_BASE_URL}/uploads/images/${year}-${month}-${filename}`;
    }

    // Tidak cocok pattern manapun
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Buat backup sebelum update
 */
async function createBackup(posts) {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupFile = path.join(BACKUP_DIR, `featured-images-backup-${timestamp}.json`);

  const backupData = {
    created_at: new Date().toISOString(),
    description: "Backup featured_image URLs sebelum update",
    total_posts: posts.length,
    posts: posts.map(p => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      featured_image: p.featured_image,
    })),
  };

  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
  return backupFile;
}

/**
 * Main function
 */
async function main() {
  console.log("=".repeat(60));
  console.log("UPDATE FEATURED IMAGE URLs");
  console.log("=".repeat(60));
  console.log(`\nTarget URL: ${NEW_BASE_URL}/uploads/images/...`);

  if (DRY_RUN) {
    console.log("\n*** MODE DRY-RUN: Tidak ada perubahan ***\n");
  }

  try {
    // Connect database
    await sequelize.authenticate();
    console.log("Database connected.\n");

    // Cari posts dengan URL yang perlu diupdate:
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

    console.log(`Ditemukan ${posts.length} posts dengan URL yang perlu diupdate\n`);

    if (posts.length === 0) {
      console.log("Tidak ada posts yang perlu diupdate. Selesai!");
      return;
    }

    // Buat backup
    if (!DRY_RUN) {
      const backupFile = await createBackup(posts);
      console.log(`[BACKUP] Tersimpan di: ${backupFile}\n`);
    }

    // Proses update
    let updated = 0;
    let skipped = 0;

    console.log("-".repeat(60));

    for (const post of posts) {
      const oldUrl = post.featured_image;
      const newUrl = convertUrl(oldUrl);

      if (!newUrl) {
        console.log(`[SKIP] Post #${post.id}: Format URL tidak dikenali`);
        console.log(`       ${oldUrl}`);
        skipped++;
        continue;
      }

      console.log(`[POST #${post.id}] ${post.title.substring(0, 40)}...`);
      console.log(`  LAMA: ${oldUrl}`);
      console.log(`  BARU: ${newUrl}`);

      if (!DRY_RUN) {
        await Post.update(
          { featured_image: newUrl },
          { where: { id: post.id } }
        );
        console.log(`  ✓ Updated`);
      } else {
        console.log(`  [DRY-RUN] Akan diupdate`);
      }

      updated++;
      console.log("");
    }

    // Summary
    console.log("-".repeat(60));
    console.log("\n=== RINGKASAN ===");
    console.log(`Total posts ditemukan : ${posts.length}`);
    console.log(`Berhasil diupdate     : ${updated}`);
    console.log(`Dilewati (skip)       : ${skipped}`);

    if (DRY_RUN) {
      console.log("\n*** Ini DRY-RUN. Jalankan tanpa --dry-run untuk update ***");
    } else {
      console.log("\nSelesai! URL sudah diupdate.");
    }

  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
