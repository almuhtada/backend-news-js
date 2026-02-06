/**
 * Clean WordPress Content
 * Membersihkan konten yang berantakan dari WordPress
 *
 * Usage: node scripts/maintenance/clean-wp-content.js
 */

require("dotenv").config();
const sequelize = require("../../config/database");
const { Post } = require("../../schema");

// Patterns to clean
const CLEANUP_PATTERNS = [
  // WordPress shortcodes
  { pattern: /\[vc_[^\]]*\]/g, replace: "" },
  { pattern: /\[\/vc_[^\]]*\]/g, replace: "" },
  { pattern: /\[et_pb_[^\]]*\]/g, replace: "" },
  { pattern: /\[\/et_pb_[^\]]*\]/g, replace: "" },
  { pattern: /\[fusion_[^\]]*\]/g, replace: "" },
  { pattern: /\[\/fusion_[^\]]*\]/g, replace: "" },
  { pattern: /\[gallery[^\]]*\]/g, replace: "" },
  { pattern: /\[caption[^\]]*\]/g, replace: "" },
  { pattern: /\[\/caption\]/g, replace: "" },

  // WordPress block comments
  { pattern: /<!-- wp:[^>]*-->/g, replace: "" },
  { pattern: /<!-- \/wp:[^>]*-->/g, replace: "" },

  // Empty paragraphs and excessive whitespace
  { pattern: /<p>\s*<\/p>/g, replace: "" },
  { pattern: /<p>&nbsp;<\/p>/g, replace: "" },
  { pattern: /&nbsp;/g, replace: " " },
  { pattern: /\n{3,}/g, replace: "\n\n" },

  // Style attributes (messy inline styles)
  { pattern: / style="[^"]*"/g, replace: "" },
  { pattern: / class="wp-[^"]*"/g, replace: "" },

  // Data attributes
  { pattern: / data-[a-z-]+="[^"]*"/g, replace: "" },

  // Empty divs and spans
  { pattern: /<div>\s*<\/div>/g, replace: "" },
  { pattern: /<span>\s*<\/span>/g, replace: "" },
];

async function cleanContent() {
  console.log("🧹 Cleaning WordPress content...\n");

  try {
    const posts = await Post.findAll();
    console.log(`Found ${posts.length} posts to clean\n`);

    let cleanedCount = 0;

    for (const post of posts) {
      let content = post.content || "";
      let originalContent = content;

      // Apply all cleanup patterns
      for (const { pattern, replace } of CLEANUP_PATTERNS) {
        content = content.replace(pattern, replace);
      }

      // Trim whitespace
      content = content.trim();

      // Check if content was changed
      if (content !== originalContent) {
        await post.update({ content });
        cleanedCount++;
        console.log(`✓ Cleaned: ${post.title.substring(0, 50)}...`);
      }
    }

    console.log(`\n✅ Cleaned ${cleanedCount} posts`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

cleanContent();
