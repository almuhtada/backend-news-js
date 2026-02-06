/**
 * ============================================================================
 * Script Migrasi Gambar WordPress ke Lokal VPS
 * ============================================================================
 *
 * Fungsi:
 * 1. Scan semua URL gambar WordPress di database (featured_image dan content)
 * 2. Download gambar ke folder uploads/images/
 * 3. Update URL di database menjadi URL lokal VPS
 *
 * ============================================================================
 * SEBELUM MENJALANKAN:
 * ============================================================================
 * 1. Pastikan WordPress masih online (untuk download gambar)
 * 2. Set BACKEND_URL di file .env dengan domain VPS kamu:
 *    BACKEND_URL=https://api.domainvpskamu.com
 *
 * ============================================================================
 * CARA PAKAI:
 * ============================================================================
 *
 * Step 1: Test dulu dengan dry-run (tidak ada perubahan)
 *   node scripts/migrate-images-to-local.js --dry-run
 *
 * Step 2: Jalankan migrasi sungguhan
 *   node scripts/migrate-images-to-local.js
 *
 * Step 3: Jika ada gambar gagal, jalankan ulang
 *   node scripts/migrate-images-to-local.js
 *
 * Step 4: Force re-download semua gambar (opsional)
 *   node scripts/migrate-images-to-local.js --force
 *
 * ============================================================================
 * OPSI:
 * ============================================================================
 * --dry-run    : Hanya tampilkan apa yang akan dilakukan, tanpa eksekusi
 * --force      : Download ulang gambar yang sudah ada
 *
 * ============================================================================
 * SETELAH MIGRASI:
 * ============================================================================
 * 1. Gambar tersimpan di: backend/uploads/images/
 * 2. URL di database sudah diupdate ke: https://domain-vps/uploads/images/...
 * 3. WordPress bisa dimatikan, gambar sudah permanen di VPS
 * 4. Backup folder uploads/ secara berkala!
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { URL } = require("url");
const sequelize = require("../../config/database");
const Post = require("../../schema/post");

// Konfigurasi
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads", "images");
const BACKUP_DIR = path.join(__dirname, "..", "..", "backups");
const WORDPRESS_DOMAIN = "almuhtada.org";

// ============================================================================
// PENTING: Sesuaikan URL ini dengan domain VPS kamu!
// ============================================================================
// Contoh:
// - Jika backend di: https://api.almuhtada.org
//   Maka: const BACKEND_URL = 'https://api.almuhtada.org';
// - Jika backend di: https://vps.example.com:3001
//   Maka: const BACKEND_URL = 'https://vps.example.com:3001';
// ============================================================================
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";
const LOCAL_URL_PREFIX = `${BACKEND_URL}/uploads/images`;

// Parse arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE_DOWNLOAD = args.includes("--force");

// Statistik
const stats = {
  totalPosts: 0,
  postsWithImages: 0,
  imagesFound: 0,
  imagesDownloaded: 0,
  imagesSkipped: 0,
  imagesFailed: 0,
  urlsUpdated: 0,
};

/**
 * Pastikan folder uploads dan backup ada
 */
function ensureDirectories() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log(`Created directory: ${UPLOADS_DIR}`);
  }
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`Created directory: ${BACKUP_DIR}`);
  }
}

/**
 * Backup data posts sebelum migrasi
 */
async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupFile = path.join(BACKUP_DIR, `posts-images-backup-${timestamp}.json`);

  console.log("\n=== CREATING BACKUP ===");

  const posts = await Post.findAll({
    attributes: ["id", "title", "slug", "featured_image", "content"],
    raw: true,
  });

  const backupData = {
    created_at: new Date().toISOString(),
    total_posts: posts.length,
    posts: posts.map(p => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      featured_image: p.featured_image,
      content_length: p.content ? p.content.length : 0,
      // Simpan content juga untuk restore penuh
      content: p.content,
    })),
  };

  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
  console.log(`Backup saved to: ${backupFile}`);
  console.log(`Total posts backed up: ${posts.length}\n`);

  return backupFile;
}

/**
 * Extract semua URL gambar WordPress dari text
 */
function extractWordPressImageUrls(text) {
  if (!text) return [];

  // Regex untuk menangkap URL gambar WordPress
  const patterns = [
    // URL lengkap dengan domain
    /https?:\/\/(?:www\.)?almuhtada\.org\/wp-content\/uploads\/[^\s"'<>]+\.(jpg|jpeg|png|gif|webp)/gi,
    // URL dengan domain lain yang mungkin di-mirror
    /https?:\/\/[^\/]+\/wp-content\/uploads\/[^\s"'<>]+\.(jpg|jpeg|png|gif|webp)/gi,
  ];

  const urls = new Set();

  patterns.forEach((pattern) => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach((url) => {
        // Bersihkan URL dari karakter yang tidak perlu
        const cleanUrl = url.replace(/['")\]>]+$/, "");
        urls.add(cleanUrl);
      });
    }
  });

  return Array.from(urls);
}

/**
 * Generate nama file lokal dari URL
 */
function generateLocalFilename(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Extract path setelah /wp-content/uploads/
    const uploadsIndex = pathname.indexOf("/wp-content/uploads/");
    if (uploadsIndex !== -1) {
      // Ambil path seperti 2025/10/Picture1.jpg
      const relativePath = pathname.substring(
        uploadsIndex + "/wp-content/uploads/".length,
      );
      // Ganti / dengan - untuk flatten struktur folder
      return relativePath.replace(/\//g, "-");
    }

    // Fallback: gunakan basename
    return path.basename(pathname);
  } catch (e) {
    // Fallback: hash dari URL
    const hash = Buffer.from(url)
      .toString("base64")
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 20);
    const ext = url.match(/\.(jpg|jpeg|png|gif|webp)$/i)?.[1] || "jpg";
    return `img-${hash}.${ext}`;
  }
}

/**
 * Download file dari URL
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;

    const request = protocol.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ImageMigrator/1.0)",
        },
        timeout: 30000,
      },
      (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }

        const file = fs.createWriteStream(destPath);
        response.pipe(file);

        file.on("finish", () => {
          file.close();
          resolve(true);
        });

        file.on("error", (err) => {
          fs.unlink(destPath, () => {}); // Delete incomplete file
          reject(err);
        });
      },
    );

    request.on("error", reject);
    request.on("timeout", () => {
      request.destroy();
      reject(new Error("Request timeout"));
    });
  });
}

/**
 * Proses satu URL gambar
 */
async function processImageUrl(url) {
  const filename = generateLocalFilename(url);
  const localPath = path.join(UPLOADS_DIR, filename);
  const localUrl = `${LOCAL_URL_PREFIX}/${filename}`;

  // Cek apakah file sudah ada
  if (fs.existsSync(localPath) && !FORCE_DOWNLOAD) {
    console.log(`  [SKIP] ${filename} (sudah ada)`);
    stats.imagesSkipped++;
    return { original: url, local: localUrl, success: true };
  }

  if (DRY_RUN) {
    console.log(`  [DRY-RUN] Akan download: ${url}`);
    console.log(`            Ke: ${localPath}`);
    return { original: url, local: localUrl, success: true };
  }

  try {
    console.log(`  [DOWNLOAD] ${url}`);
    await downloadFile(url, localPath);
    console.log(`  [OK] Saved to: ${filename}`);
    stats.imagesDownloaded++;
    return { original: url, local: localUrl, success: true };
  } catch (error) {
    console.log(`  [FAIL] ${url}: ${error.message}`);
    stats.imagesFailed++;
    return { original: url, local: null, success: false };
  }
}

/**
 * Update URL di text dengan URL lokal
 */
function replaceUrls(text, urlMappings) {
  if (!text) return text;

  let result = text;
  urlMappings.forEach(({ original, local }) => {
    if (local) {
      // Escape special regex characters in URL
      const escapedUrl = original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(new RegExp(escapedUrl, "g"), local);
    }
  });

  return result;
}

/**
 * Proses satu post
 */
async function processPost(post) {
  const allUrls = new Set();

  // Collect URLs dari featured_image
  if (
    post.featured_image &&
    post.featured_image.includes("wp-content/uploads")
  ) {
    allUrls.add(post.featured_image);
  }

  // Collect URLs dari content
  const contentUrls = extractWordPressImageUrls(post.content);
  contentUrls.forEach((url) => allUrls.add(url));

  if (allUrls.size === 0) {
    return false;
  }

  console.log(`\nPost #${post.id}: ${post.title.substring(0, 50)}...`);
  console.log(`  Ditemukan ${allUrls.size} gambar`);

  stats.postsWithImages++;
  stats.imagesFound += allUrls.size;

  // Process each URL
  const urlMappings = [];
  for (const url of allUrls) {
    const result = await processImageUrl(url);
    urlMappings.push(result);
  }

  // Update database
  if (!DRY_RUN) {
    const updates = {};

    // Update featured_image
    if (post.featured_image) {
      const mapping = urlMappings.find(
        (m) => m.original === post.featured_image,
      );
      if (mapping && mapping.local) {
        updates.featured_image = mapping.local;
      }
    }

    // Update content
    if (post.content) {
      const newContent = replaceUrls(post.content, urlMappings);
      if (newContent !== post.content) {
        updates.content = newContent;
      }
    }

    // Save to database
    if (Object.keys(updates).length > 0) {
      await Post.update(updates, { where: { id: post.id } });
      stats.urlsUpdated++;
      console.log(`  [DB] Updated post #${post.id}`);
    }
  } else {
    console.log(`  [DRY-RUN] Akan update database untuk post #${post.id}`);
  }

  return true;
}

/**
 * Main function
 */
async function main() {
  console.log("=".repeat(60));
  console.log("MIGRASI GAMBAR WORDPRESS KE LOKAL VPS");
  console.log("=".repeat(60));

  if (DRY_RUN) {
    console.log(
      "\n*** MODE DRY-RUN: Tidak ada perubahan yang akan dilakukan ***\n",
    );
  }

  try {
    // Connect to database
    await sequelize.authenticate();
    console.log("Database connected.\n");

    // Ensure directories exist
    ensureDirectories();

    // Create backup before migration
    if (!DRY_RUN) {
      const backupFile = await createBackup();
      console.log(`[BACKUP] Data tersimpan di: ${backupFile}`);
      console.log("[BACKUP] Jika ada masalah, gunakan file ini untuk restore.\n");
    }

    // Get all posts
    const posts = await Post.findAll({
      attributes: ["id", "title", "featured_image", "content"],
      order: [["id", "ASC"]],
    });

    stats.totalPosts = posts.length;
    console.log(`Total posts: ${posts.length}\n`);

    // Process each post
    for (const post of posts) {
      await processPost(post);
    }

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("RINGKASAN");
    console.log("=".repeat(60));
    console.log(`Total posts          : ${stats.totalPosts}`);
    console.log(`Posts dengan gambar  : ${stats.postsWithImages}`);
    console.log(`Gambar ditemukan     : ${stats.imagesFound}`);
    console.log(`Gambar didownload    : ${stats.imagesDownloaded}`);
    console.log(`Gambar di-skip       : ${stats.imagesSkipped}`);
    console.log(`Gambar gagal         : ${stats.imagesFailed}`);
    console.log(`Posts di-update      : ${stats.urlsUpdated}`);

    if (DRY_RUN) {
      console.log(
        "\n*** Ini adalah DRY-RUN. Jalankan tanpa --dry-run untuk eksekusi ***",
      );
    }

    if (stats.imagesFailed > 0) {
      console.log("\n[WARNING] Ada gambar yang gagal didownload!");
      console.log("Coba jalankan ulang script ini untuk retry.");
    }

    console.log("\nSelesai!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run
main();
