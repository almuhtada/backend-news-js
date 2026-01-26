/**
 * Script to generate excerpts for posts that don't have one
 * This will extract the first few sentences from the content
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

// Helper function to strip HTML tags
function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ") // Remove HTML tags
    .replace(/&nbsp;/g, " ") // Replace &nbsp;
    .replace(/&amp;/g, "&") // Replace &amp;
    .replace(/&lt;/g, "<") // Replace &lt;
    .replace(/&gt;/g, ">") // Replace &gt;
    .replace(/&quot;/g, '"') // Replace &quot;
    .replace(/&#39;/g, "'") // Replace &#39;
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .trim();
}

// Helper function to generate excerpt from content
function generateExcerpt(content, maxLength = 200) {
  if (!content) return "";

  // Strip HTML tags
  let text = stripHtml(content);

  // If text is shorter than maxLength, return it
  if (text.length <= maxLength) {
    return text;
  }

  // Try to cut at sentence end
  let excerpt = text.substring(0, maxLength);

  // Find last sentence ending (., !, ?)
  const lastSentenceEnd = Math.max(
    excerpt.lastIndexOf(". "),
    excerpt.lastIndexOf("! "),
    excerpt.lastIndexOf("? ")
  );

  if (lastSentenceEnd > maxLength * 0.6) {
    // If we found a sentence ending in the last 40% of text, use it
    excerpt = text.substring(0, lastSentenceEnd + 1);
  } else {
    // Otherwise, cut at last space and add ellipsis
    const lastSpace = excerpt.lastIndexOf(" ");
    if (lastSpace > 0) {
      excerpt = text.substring(0, lastSpace) + "...";
    } else {
      excerpt = excerpt + "...";
    }
  }

  return excerpt.trim();
}

async function generateExcerpts() {
  try {
    console.log("🔌 Connecting to database...");
    await sequelize.authenticate();
    console.log("✅ Connected to database successfully\n");

    // Get all posts without excerpts
    console.log("📊 Fetching posts without excerpts...");
    const [posts] = await sequelize.query(`
      SELECT id, title, content, excerpt
      FROM posts
      WHERE excerpt IS NULL OR excerpt = '' OR TRIM(excerpt) = ''
      ORDER BY id
    `);

    console.log(`📝 Found ${posts.length} posts without excerpts\n`);

    if (posts.length === 0) {
      console.log("✨ All posts already have excerpts!");
      return;
    }

    // Preview first 3 posts
    console.log("👀 Preview of first 3 posts:");
    posts.slice(0, 3).forEach((post, index) => {
      const generatedExcerpt = generateExcerpt(post.content);
      console.log(`\n${index + 1}. ID: ${post.id}`);
      console.log(`   Title: ${post.title}`);
      console.log(`   Generated Excerpt: "${generatedExcerpt}"`);
    });

    // Ask for confirmation
    console.log(`\n⚠️  This will update ${posts.length} posts with auto-generated excerpts.`);
    console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...\n");

    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log("🚀 Starting to generate excerpts...\n");

    let updatedCount = 0;
    let errorCount = 0;

    for (const post of posts) {
      try {
        const excerpt = generateExcerpt(post.content);

        if (excerpt) {
          await sequelize.query(
            "UPDATE posts SET excerpt = ? WHERE id = ?",
            {
              replacements: [excerpt, post.id],
            }
          );
          updatedCount++;

          if (updatedCount % 10 === 0) {
            console.log(`✓ Updated ${updatedCount}/${posts.length} posts...`);
          }
        }
      } catch (error) {
        errorCount++;
        console.error(`✗ Error updating post ID ${post.id}:`, error.message);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 SUMMARY:");
    console.log(`   ✅ Successfully updated: ${updatedCount} posts`);
    console.log(`   ❌ Errors: ${errorCount} posts`);
    console.log(`   📝 Total processed: ${posts.length} posts`);
    console.log("=".repeat(60));

    console.log("\n✨ Done! All excerpts have been generated.");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sequelize.close();
    console.log("\n🔌 Database connection closed.");
  }
}

// Run the script
if (require.main === module) {
  generateExcerpts();
}

module.exports = { generateExcerpt, stripHtml };
