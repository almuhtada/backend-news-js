/**
 * Complete WordPress Migration Script
 * Migrate ALL data from WordPress to clean new database structure
 *
 * Usage: node scripts/migrate-all-wordpress-data.js
 */

require("dotenv").config();
const sequelize = require("../config/database");
const {
  User,
  Post,
  Page,
  Media,
  Category,
  Tag,
  Comment,
  PostCategory,
  PostTag,
} = require("../schema");

const WP_PREFIX = "wp8o_";

// ========================================
// 1. MIGRATE USERS
// ========================================
async function migrateUsers() {
  console.log("👥 Migrating users...");

  try {
    const [wpUsers] = await sequelize.query(`
      SELECT
        u.ID,
        u.user_login,
        u.user_email,
        u.user_pass,
        u.display_name,
        u.user_url,
        u.user_registered
      FROM ${WP_PREFIX}users u
    `);

    console.log(`Found ${wpUsers.length} users in WordPress`);

    const userMapping = {};

    for (const wpUser of wpUsers) {
      // Get user role
      const [roleMeta] = await sequelize.query(`
        SELECT meta_value
        FROM ${WP_PREFIX}usermeta
        WHERE user_id = ${wpUser.ID}
        AND meta_key = '${WP_PREFIX}capabilities'
        LIMIT 1
      `);

      // Get first and last name
      const [firstName] = await sequelize.query(`
        SELECT meta_value FROM ${WP_PREFIX}usermeta
        WHERE user_id = ${wpUser.ID} AND meta_key = 'first_name' LIMIT 1
      `);

      const [lastName] = await sequelize.query(`
        SELECT meta_value FROM ${WP_PREFIX}usermeta
        WHERE user_id = ${wpUser.ID} AND meta_key = 'last_name' LIMIT 1
      `);

      // Parse role
      let role = "user";
      if (roleMeta.length > 0 && roleMeta[0].meta_value) {
        const capabilities = roleMeta[0].meta_value;
        if (capabilities.includes("administrator")) role = "administrator";
        else if (capabilities.includes("editor")) role = "editor";
        else if (capabilities.includes("author")) role = "author";
        else if (capabilities.includes("contributor")) role = "contributor";
        else if (capabilities.includes("subscriber")) role = "subscriber";
      }

      const userData = {
        wp_user_id: wpUser.ID,
        username: wpUser.user_login,
        email: wpUser.user_email,
        password: wpUser.user_pass,
        display_name: wpUser.display_name || wpUser.user_login,
        first_name: firstName.length > 0 ? firstName[0].meta_value : null,
        last_name: lastName.length > 0 ? lastName[0].meta_value : null,
        role: role,
        user_url: wpUser.user_url || null,
        user_registered: wpUser.user_registered,
      };

      const [user] = await User.findOrCreate({
        where: { email: wpUser.user_email },
        defaults: userData,
      });

      userMapping[wpUser.ID] = user.id;
      console.log(`✓ User migrated: ${wpUser.user_login} (${role})`);
    }

    console.log(`✅ ${wpUsers.length} users migrated\n`);
    return userMapping;
  } catch (error) {
    console.error("❌ Error migrating users:", error.message);
    throw error;
  }
}

// ========================================
// 2. MIGRATE CATEGORIES
// ========================================
async function migrateCategories() {
  console.log("🏷️  Migrating categories...");

  try {
    const [wpCategories] = await sequelize.query(`
      SELECT
        t.term_id,
        t.name,
        t.slug,
        tt.description,
        tt.parent
      FROM ${WP_PREFIX}terms t
      INNER JOIN ${WP_PREFIX}term_taxonomy tt ON t.term_id = tt.term_id
      WHERE tt.taxonomy = 'category'
    `);

    console.log(`Found ${wpCategories.length} categories`);

    const categoryMapping = {};

    for (const wpCat of wpCategories) {
      const [category] = await Category.findOrCreate({
        where: { slug: wpCat.slug },
        defaults: {
          name: wpCat.name,
          slug: wpCat.slug,
          description: wpCat.description || null,
          parent_id: null,
          wp_term_id: wpCat.term_id,
        },
      });

      categoryMapping[wpCat.term_id] = { id: category.id, parent: wpCat.parent };
      console.log(`✓ Category: ${wpCat.name}`);
    }

    // Update parent relationships
    for (const [termId, data] of Object.entries(categoryMapping)) {
      if (data.parent > 0 && categoryMapping[data.parent]) {
        await Category.update(
          { parent_id: categoryMapping[data.parent].id },
          { where: { wp_term_id: parseInt(termId) } }
        );
      }
    }

    console.log(`✅ ${wpCategories.length} categories migrated\n`);
    return Object.fromEntries(
      Object.entries(categoryMapping).map(([k, v]) => [k, v.id])
    );
  } catch (error) {
    console.error("❌ Error migrating categories:", error.message);
    throw error;
  }
}

// ========================================
// 3. MIGRATE TAGS
// ========================================
async function migrateTags() {
  console.log("🏷️  Migrating tags...");

  try {
    const [wpTags] = await sequelize.query(`
      SELECT t.term_id, t.name, t.slug, tt.description
      FROM ${WP_PREFIX}terms t
      INNER JOIN ${WP_PREFIX}term_taxonomy tt ON t.term_id = tt.term_id
      WHERE tt.taxonomy = 'post_tag'
    `);

    console.log(`Found ${wpTags.length} tags`);

    const tagMapping = {};
    let count = 0;

    for (const wpTag of wpTags) {
      const [tag] = await Tag.findOrCreate({
        where: { slug: wpTag.slug },
        defaults: {
          name: wpTag.name,
          slug: wpTag.slug,
          description: wpTag.description || null,
          wp_term_id: wpTag.term_id,
        },
      });

      tagMapping[wpTag.term_id] = tag.id;
      count++;
      if (count % 500 === 0) console.log(`   ... ${count} tags migrated`);
    }

    console.log(`✅ ${wpTags.length} tags migrated\n`);
    return tagMapping;
  } catch (error) {
    console.error("❌ Error migrating tags:", error.message);
    throw error;
  }
}

// ========================================
// 4. MIGRATE MEDIA
// ========================================
async function migrateMedia(userMapping) {
  console.log("📸 Migrating media/attachments...");

  try {
    const [wpMedia] = await sequelize.query(`
      SELECT
        p.ID,
        p.post_author,
        p.guid as url,
        p.post_title as title,
        p.post_excerpt as caption,
        p.post_content as description,
        p.post_mime_type as mime_type,
        p.post_date
      FROM ${WP_PREFIX}posts p
      WHERE p.post_type = 'attachment'
      AND p.post_mime_type LIKE 'image/%'
      ORDER BY p.post_date DESC
    `);

    console.log(`Found ${wpMedia.length} media files`);

    const mediaMapping = {};
    let count = 0;

    for (const wpFile of wpMedia) {
      // Get file metadata
      const [fileMeta] = await sequelize.query(`
        SELECT meta_value FROM ${WP_PREFIX}postmeta
        WHERE post_id = ${wpFile.ID} AND meta_key = '_wp_attached_file'
        LIMIT 1
      `);

      const [altMeta] = await sequelize.query(`
        SELECT meta_value FROM ${WP_PREFIX}postmeta
        WHERE post_id = ${wpFile.ID} AND meta_key = '_wp_attachment_image_alt'
        LIMIT 1
      `);

      const filename = fileMeta.length > 0 ? fileMeta[0].meta_value : null;
      const altText = altMeta.length > 0 ? altMeta[0].meta_value : null;

      const [media] = await Media.findOrCreate({
        where: { wp_attachment_id: wpFile.ID },
        defaults: {
          wp_attachment_id: wpFile.ID,
          filename: filename ? filename.split('/').pop() : `attachment-${wpFile.ID}`,
          original_filename: filename,
          wp_url: wpFile.url,
          mime_type: wpFile.mime_type,
          alt_text: altText || wpFile.title,
          caption: wpFile.caption,
          description: wpFile.description,
          uploaded_by: userMapping[wpFile.post_author] || null,
          createdAt: wpFile.post_date,
        },
      });

      mediaMapping[wpFile.ID] = media.id;
      count++;
      if (count % 500 === 0) console.log(`   ... ${count} media files migrated`);
    }

    console.log(`✅ ${wpMedia.length} media files migrated\n`);
    return mediaMapping;
  } catch (error) {
    console.error("❌ Error migrating media:", error.message);
    throw error;
  }
}

// ========================================
// 5. MIGRATE POSTS
// ========================================
async function migratePosts(userMapping, categoryMapping, tagMapping) {
  console.log("📝 Migrating posts...");

  try {
    const [wpPosts] = await sequelize.query(`
      SELECT
        p.ID,
        p.post_author,
        p.post_date,
        p.post_content,
        p.post_title,
        p.post_excerpt,
        p.post_status,
        p.post_name as slug,
        p.post_modified,
        p.comment_status,
        (SELECT meta_value FROM ${WP_PREFIX}postmeta WHERE post_id = p.ID AND meta_key = '_thumbnail_id' LIMIT 1) as thumbnail_id
      FROM ${WP_PREFIX}posts p
      WHERE p.post_type = 'post'
      AND p.post_status IN ('publish', 'draft', 'pending')
      ORDER BY p.post_date DESC
    `);

    console.log(`Found ${wpPosts.length} posts`);

    const postMapping = {};
    let count = 0;

    for (const wpPost of wpPosts) {
      // Get featured image URL
      let featuredImage = null;
      if (wpPost.thumbnail_id) {
        const [images] = await sequelize.query(`
          SELECT guid FROM ${WP_PREFIX}posts WHERE ID = ${wpPost.thumbnail_id}
        `);
        if (images.length > 0) featuredImage = images[0].guid;
      }

      const [post] = await Post.findOrCreate({
        where: { slug: wpPost.slug },
        defaults: {
          title: wpPost.post_title,
          slug: wpPost.slug,
          content: wpPost.post_content,
          excerpt: wpPost.post_excerpt,
          author_id: userMapping[wpPost.post_author] || 1,
          featured_image: featuredImage,
          status: wpPost.post_status === "publish" ? "publish" : "draft",
          comment_status: wpPost.comment_status === "open" ? "open" : "closed",
          published_at: wpPost.post_status === "publish" ? wpPost.post_date : null,
          wp_post_id: wpPost.ID,
          createdAt: wpPost.post_date,
          updatedAt: wpPost.post_modified,
        },
      });

      postMapping[wpPost.ID] = post.id;

      // Migrate categories
      const [postCats] = await sequelize.query(`
        SELECT term_taxonomy_id
        FROM ${WP_PREFIX}term_relationships
        WHERE object_id = ${wpPost.ID}
        AND term_taxonomy_id IN (
          SELECT term_taxonomy_id FROM ${WP_PREFIX}term_taxonomy WHERE taxonomy = 'category'
        )
      `);

      for (const rel of postCats) {
        const [termInfo] = await sequelize.query(`
          SELECT term_id FROM ${WP_PREFIX}term_taxonomy WHERE term_taxonomy_id = ${rel.term_taxonomy_id}
        `);
        if (termInfo.length > 0 && categoryMapping[termInfo[0].term_id]) {
          await PostCategory.findOrCreate({
            where: {
              post_id: post.id,
              category_id: categoryMapping[termInfo[0].term_id],
            },
          });
        }
      }

      // Migrate tags
      const [postTags] = await sequelize.query(`
        SELECT term_taxonomy_id
        FROM ${WP_PREFIX}term_relationships
        WHERE object_id = ${wpPost.ID}
        AND term_taxonomy_id IN (
          SELECT term_taxonomy_id FROM ${WP_PREFIX}term_taxonomy WHERE taxonomy = 'post_tag'
        )
      `);

      for (const rel of postTags) {
        const [termInfo] = await sequelize.query(`
          SELECT term_id FROM ${WP_PREFIX}term_taxonomy WHERE term_taxonomy_id = ${rel.term_taxonomy_id}
        `);
        if (termInfo.length > 0 && tagMapping[termInfo[0].term_id]) {
          await PostTag.findOrCreate({
            where: {
              post_id: post.id,
              tag_id: tagMapping[termInfo[0].term_id],
            },
          });
        }
      }

      count++;
      if (count % 100 === 0) console.log(`   ... ${count} posts migrated`);
    }

    console.log(`✅ ${wpPosts.length} posts migrated\n`);
    return postMapping;
  } catch (error) {
    console.error("❌ Error migrating posts:", error.message);
    throw error;
  }
}

// ========================================
// 6. MIGRATE PAGES
// ========================================
async function migratePages(userMapping) {
  console.log("📄 Migrating pages...");

  try {
    const [wpPages] = await sequelize.query(`
      SELECT
        p.ID,
        p.post_author,
        p.post_date,
        p.post_content,
        p.post_title,
        p.post_status,
        p.post_name as slug,
        p.post_modified,
        p.post_parent,
        p.menu_order
      FROM ${WP_PREFIX}posts p
      WHERE p.post_type = 'page'
      AND p.post_status IN ('publish', 'draft', 'private')
      ORDER BY p.menu_order ASC
    `);

    console.log(`Found ${wpPages.length} pages`);

    const pageMapping = {};

    for (const wpPage of wpPages) {
      const [page] = await Page.findOrCreate({
        where: { slug: wpPage.slug },
        defaults: {
          title: wpPage.post_title,
          slug: wpPage.slug,
          content: wpPage.post_content,
          author_id: userMapping[wpPage.post_author] || 1,
          parent_id: null,
          menu_order: wpPage.menu_order,
          status: wpPage.post_status,
          published_at: wpPage.post_status === "publish" ? wpPage.post_date : null,
          wp_page_id: wpPage.ID,
          createdAt: wpPage.post_date,
          updatedAt: wpPage.post_modified,
        },
      });

      pageMapping[wpPage.ID] = { id: page.id, parent: wpPage.post_parent };
      console.log(`✓ Page: ${wpPage.post_title}`);
    }

    // Update parent relationships
    for (const [wpId, data] of Object.entries(pageMapping)) {
      if (data.parent > 0 && pageMapping[data.parent]) {
        await Page.update(
          { parent_id: pageMapping[data.parent].id },
          { where: { wp_page_id: parseInt(wpId) } }
        );
      }
    }

    console.log(`✅ ${wpPages.length} pages migrated\n`);
    return Object.fromEntries(Object.entries(pageMapping).map(([k, v]) => [k, v.id]));
  } catch (error) {
    console.error("❌ Error migrating pages:", error.message);
    throw error;
  }
}

// ========================================
// 7. MIGRATE COMMENTS
// ========================================
async function migrateComments(postMapping, userMapping) {
  console.log("💬 Migrating comments...");

  try {
    const [wpComments] = await sequelize.query(`
      SELECT
        c.comment_ID,
        c.comment_post_ID,
        c.comment_author,
        c.comment_author_email,
        c.comment_author_url,
        c.comment_author_IP,
        c.comment_date,
        c.comment_content,
        c.comment_approved,
        c.comment_parent,
        c.user_id,
        c.comment_agent,
        c.comment_type,
        c.comment_karma
      FROM ${WP_PREFIX}comments c
      WHERE c.comment_approved != 'trash'
      ORDER BY c.comment_date ASC
    `);

    console.log(`Found ${wpComments.length} comments`);

    const commentMapping = {};
    let count = 0;

    for (const wpComment of wpComments) {
      if (!postMapping[wpComment.comment_post_ID]) continue;

      let status = "pending";
      if (wpComment.comment_approved === "1") status = "approved";
      else if (wpComment.comment_approved === "spam") status = "spam";

      const [comment] = await Comment.findOrCreate({
        where: { wp_comment_id: wpComment.comment_ID },
        defaults: {
          wp_comment_id: wpComment.comment_ID,
          post_id: postMapping[wpComment.comment_post_ID],
          parent_id: null,
          author_name: wpComment.comment_author,
          author_email: wpComment.comment_author_email,
          author_url: wpComment.comment_author_url || null,
          author_ip: wpComment.comment_author_IP,
          author_agent: wpComment.comment_agent || null,
          content: wpComment.comment_content,
          comment_type: wpComment.comment_type || "comment",
          status: status,
          karma: wpComment.comment_karma || 0,
          user_id: wpComment.user_id > 0 && userMapping[wpComment.user_id]
            ? userMapping[wpComment.user_id]
            : null,
          createdAt: wpComment.comment_date,
        },
      });

      commentMapping[wpComment.comment_ID] = {
        id: comment.id,
        parent: wpComment.comment_parent,
      };
      count++;
      if (count % 100 === 0) console.log(`   ... ${count} comments migrated`);
    }

    // Update parent relationships
    for (const [wpId, data] of Object.entries(commentMapping)) {
      if (data.parent > 0 && commentMapping[data.parent]) {
        await Comment.update(
          { parent_id: commentMapping[data.parent].id },
          { where: { wp_comment_id: parseInt(wpId) } }
        );
      }
    }

    console.log(`✅ ${wpComments.length} comments migrated\n`);
    return Object.fromEntries(Object.entries(commentMapping).map(([k, v]) => [k, v.id]));
  } catch (error) {
    console.error("❌ Error migrating comments:", error.message);
    throw error;
  }
}

// ========================================
// MAIN MIGRATION FUNCTION
// ========================================
async function runCompleteMigration() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║                                                                ║");
  console.log("║     🚀  COMPLETE WORDPRESS MIGRATION TO CLEAN DATABASE  🚀     ║");
  console.log("║                                                                ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  try {
    // Connect to database
    await sequelize.authenticate();
    console.log("✅ Database connection established\n");

    // Sync models
    await sequelize.sync({ alter: false });
    console.log("✅ Database models synced\n");

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Run migrations in order
    const userMapping = await migrateUsers();
    const categoryMapping = await migrateCategories();
    const tagMapping = await migrateTags();
    const mediaMapping = await migrateMedia(userMapping);
    const postMapping = await migratePosts(userMapping, categoryMapping, tagMapping);
    const pageMapping = await migratePages(userMapping);
    const commentMapping = await migrateComments(postMapping, userMapping);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("🎉 MIGRATION COMPLETED SUCCESSFULLY!\n");
    console.log("📊 Summary:");
    console.log(`   - Users:       ${Object.keys(userMapping).length}`);
    console.log(`   - Categories:  ${Object.keys(categoryMapping).length}`);
    console.log(`   - Tags:        ${Object.keys(tagMapping).length}`);
    console.log(`   - Media:       ${Object.keys(mediaMapping).length}`);
    console.log(`   - Posts:       ${Object.keys(postMapping).length}`);
    console.log(`   - Pages:       ${Object.keys(pageMapping).length}`);
    console.log(`   - Comments:    ${Object.keys(commentMapping).length}`);
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error) {
    console.error("\n❌ MIGRATION FAILED:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run migration
runCompleteMigration();
