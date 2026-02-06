/**
 * ============================================================================
 * Script Restore Gambar dari Backup
 * ============================================================================
 *
 * Gunakan script ini jika ada masalah setelah migrasi gambar.
 * Script ini akan mengembalikan featured_image dan content ke kondisi sebelum migrasi.
 *
 * CARA PAKAI:
 *   node scripts/migration/restore-images-from-backup.js [backup-file]
 *
 * Contoh:
 *   node scripts/migration/restore-images-from-backup.js backups/posts-images-backup-2026-02-01T10-30-00.json
 *
 * Jika tidak ada argumen, akan list semua backup yang tersedia.
 */

const fs = require("fs");
const path = require("path");
const sequelize = require("../../config/database");
const Post = require("../../schema/post");

const BACKUP_DIR = path.join(__dirname, "..", "..", "backups");

async function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log("No backups directory found.");
    return [];
  }

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith("posts-images-backup-") && f.endsWith(".json"))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log("No backup files found.");
    return [];
  }

  console.log("\nAvailable backups:");
  console.log("==================");
  files.forEach((f, i) => {
    const filePath = path.join(BACKUP_DIR, f);
    const stats = fs.statSync(filePath);
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    console.log(`${i + 1}. ${f}`);
    console.log(`   Created: ${data.created_at}`);
    console.log(`   Posts: ${data.total_posts}`);
    console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB\n`);
  });

  return files;
}

async function restoreFromBackup(backupFile) {
  let filePath = backupFile;

  // Check if it's a relative path
  if (!path.isAbsolute(backupFile)) {
    filePath = path.join(process.cwd(), backupFile);
  }

  // Try backup directory if not found
  if (!fs.existsSync(filePath)) {
    filePath = path.join(BACKUP_DIR, path.basename(backupFile));
  }

  if (!fs.existsSync(filePath)) {
    console.error(`Backup file not found: ${backupFile}`);
    process.exit(1);
  }

  console.log(`\nRestoring from: ${filePath}\n`);

  const backupData = JSON.parse(fs.readFileSync(filePath, "utf8"));

  console.log(`Backup created at: ${backupData.created_at}`);
  console.log(`Total posts to restore: ${backupData.total_posts}\n`);

  // Confirm
  console.log("WARNING: This will overwrite current featured_image and content values!");
  console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...\n");

  await new Promise(resolve => setTimeout(resolve, 5000));

  // Connect to database
  await sequelize.authenticate();
  console.log("Database connected.\n");

  let restored = 0;
  let failed = 0;

  for (const postData of backupData.posts) {
    try {
      await Post.update(
        {
          featured_image: postData.featured_image,
          content: postData.content,
        },
        { where: { id: postData.id } }
      );
      restored++;
      if (restored % 100 === 0) {
        console.log(`Restored ${restored}/${backupData.total_posts} posts...`);
      }
    } catch (error) {
      console.error(`Failed to restore post #${postData.id}: ${error.message}`);
      failed++;
    }
  }

  console.log("\n=== RESTORE COMPLETE ===");
  console.log(`Posts restored: ${restored}`);
  console.log(`Posts failed: ${failed}`);

  await sequelize.close();
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // List available backups
    const backups = await listBackups();

    if (backups.length > 0) {
      console.log("\nTo restore, run:");
      console.log(`  node scripts/migration/restore-images-from-backup.js backups/${backups[0]}`);
    }
    return;
  }

  await restoreFromBackup(args[0]);
}

main().catch(console.error);
