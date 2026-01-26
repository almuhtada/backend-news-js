/**
 * Script to clean up messy content formatting
 * - Combines short single-sentence paragraphs into proper paragraphs
 * - Removes excessive line breaks
 * - Preserves Arabic content and already well-formatted content
 */

const { Sequelize } = require("sequelize");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// Database connection
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",
    logging: false,
  }
);

// Helper to detect if text contains Arabic characters
function hasArabic(text) {
  const arabicRegex = /[\u0600-\u06FF]/;
  return arabicRegex.test(text);
}

// Helper to strip HTML tags
function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// Count sentences in a paragraph
function countSentences(text) {
  const plainText = stripHtml(text);
  // Count periods, exclamation marks, and question marks
  const matches = plainText.match(/[.!?]+/g);
  return matches ? matches.length : 0;
}

// Clean and reformat content
function cleanContent(content) {
  if (!content) return content;

  // Check if content has Arabic - skip if yes
  if (hasArabic(content)) {
    // Only remove excessive line breaks but keep structure
    return content
      .replace(/(\r\n){3,}/g, "\r\n\r\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  // Split content by double line breaks to get paragraphs
  const paragraphs = content
    .split(/\r\n\r\n|\n\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // Check if content is already well-formatted
  // Well-formatted = most paragraphs have 3+ sentences
  const sentenceCounts = paragraphs.map((p) => countSentences(p));
  const avgSentences =
    sentenceCounts.reduce((a, b) => a + b, 0) / sentenceCounts.length;

  // If average is 3+ sentences per paragraph, content is already good
  if (avgSentences >= 3) {
    // Just clean excessive line breaks
    return content
      .replace(/(\r\n){3,}/g, "\r\n\r\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  // Content needs reformatting - combine short paragraphs
  const newParagraphs = [];
  let currentParagraph = "";
  let currentSentenceCount = 0;

  for (const para of paragraphs) {
    const sentences = countSentences(para);

    // Skip empty or very short paragraphs
    if (sentences === 0) {
      if (currentParagraph) {
        newParagraphs.push(currentParagraph.trim());
        currentParagraph = "";
        currentSentenceCount = 0;
      }
      // Keep the original paragraph (might be image, shortcode, etc)
      newParagraphs.push(para);
      continue;
    }

    // If this is a shortcode or special tag, keep it separate
    if (para.includes("[irp") || para.includes("[gallery") || para.includes("<iframe")) {
      if (currentParagraph) {
        newParagraphs.push(currentParagraph.trim());
        currentParagraph = "";
        currentSentenceCount = 0;
      }
      newParagraphs.push(para);
      continue;
    }

    // Add to current paragraph
    if (currentParagraph) {
      currentParagraph += " " + para;
    } else {
      currentParagraph = para;
    }
    currentSentenceCount += sentences;

    // If we have 4-6 sentences, finish this paragraph
    if (currentSentenceCount >= 4) {
      newParagraphs.push(currentParagraph.trim());
      currentParagraph = "";
      currentSentenceCount = 0;
    }
  }

  // Add remaining paragraph
  if (currentParagraph) {
    newParagraphs.push(currentParagraph.trim());
  }

  // Join paragraphs with double line break
  return newParagraphs.join("\r\n\r\n");
}

async function cleanAllContent() {
  try {
    console.log("🔌 Connecting to database...");
    await sequelize.authenticate();
    console.log("✅ Connected to database successfully\n");

    // Get all published posts
    console.log("📊 Fetching posts...");
    const [posts] = await sequelize.query(`
      SELECT id, title, content
      FROM posts
      WHERE status = 'publish'
      AND content IS NOT NULL
      AND content != ''
      ORDER BY id
    `);

    console.log(`📝 Found ${posts.length} posts to analyze\n`);

    // Analyze which posts need cleaning
    console.log("🔍 Analyzing content formatting...");
    const needsCleaning = [];

    for (const post of posts) {
      // Skip if Arabic
      if (hasArabic(post.content)) {
        continue;
      }

      const paragraphs = post.content
        .split(/\r\n\r\n|\n\n/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      const sentenceCounts = paragraphs.map((p) => countSentences(p));
      const avgSentences =
        sentenceCounts.reduce((a, b) => a + b, 0) / sentenceCounts.length;

      // If average is less than 2 sentences per paragraph, needs cleaning
      if (avgSentences < 2 && paragraphs.length > 5) {
        needsCleaning.push({
          id: post.id,
          title: post.title,
          avgSentences: avgSentences.toFixed(2),
          paragraphs: paragraphs.length,
        });
      }
    }

    console.log(`\n⚠️  Found ${needsCleaning.length} posts that need formatting cleanup\n`);

    if (needsCleaning.length === 0) {
      console.log("✨ All posts are already well-formatted!");
      return;
    }

    // Preview first 3 posts
    console.log("👀 Preview of posts to be cleaned:");
    needsCleaning.slice(0, 3).forEach((post, index) => {
      console.log(`\n${index + 1}. ID: ${post.id}`);
      console.log(`   Title: ${post.title}`);
      console.log(`   Avg sentences per paragraph: ${post.avgSentences}`);
      console.log(`   Total paragraphs: ${post.paragraphs}`);
    });

    // Ask for confirmation
    console.log(`\n⚠️  This will reformat ${needsCleaning.length} posts.`);
    console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...\n");

    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log("🚀 Starting to clean content...\n");

    let updatedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const postInfo of needsCleaning) {
      try {
        // Get full content
        const [fullPost] = await sequelize.query(
          "SELECT content FROM posts WHERE id = ?",
          { replacements: [postInfo.id] }
        );

        if (!fullPost || fullPost.length === 0) continue;

        const originalContent = fullPost[0].content;
        const cleanedContent = cleanContent(originalContent);

        // Only update if content changed
        if (cleanedContent !== originalContent) {
          await sequelize.query(
            "UPDATE posts SET content = ? WHERE id = ?",
            {
              replacements: [cleanedContent, postInfo.id],
            }
          );
          updatedCount++;

          if (updatedCount % 10 === 0) {
            console.log(`✓ Cleaned ${updatedCount}/${needsCleaning.length} posts...`);
          }
        } else {
          skippedCount++;
        }
      } catch (error) {
        errorCount++;
        console.error(`✗ Error cleaning post ID ${postInfo.id}:`, error.message);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 SUMMARY:");
    console.log(`   ✅ Successfully cleaned: ${updatedCount} posts`);
    console.log(`   ⏭️  Skipped (no changes): ${skippedCount} posts`);
    console.log(`   ❌ Errors: ${errorCount} posts`);
    console.log(`   📝 Total processed: ${needsCleaning.length} posts`);
    console.log("=".repeat(60));

    console.log("\n✨ Done! Content formatting has been cleaned.");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sequelize.close();
    console.log("\n🔌 Database connection closed.");
  }
}

// Run the script
if (require.main === module) {
  cleanAllContent();
}

module.exports = { cleanContent, stripHtml, hasArabic, countSentences };
