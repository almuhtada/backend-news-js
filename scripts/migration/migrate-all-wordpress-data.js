/**
 * Complete WordPress Migration Script
 * Migrate ALL data from WordPress to clean new database structure
 * SMART: Skip already migrated data
 *
 * Usage: node scripts/migration/migrate-all-wordpress-data.js
 */

require("dotenv").config();
const { Op } = require("sequelize");
const sequelize = require("../../config/database");
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
} = require("../../schema");

const WP_PREFIX = "wp8o_";

// ========================================
// 1. MIGRATE USERS
// ========================================
async function migrateUsers() {
  console.log("👥 Migrating users...");

  try {
    const existingUsers = await User.findAll({
      where: { wp_user_id: { [Op.ne]: null } },
      attributes: ["id", "wp_user_id"],
    });

    const userMapping = {};
    const existingWpIds = new Set();
    existingUsers.forEach((u) => {
      userMapping[u.wp_user_id] = u.id;
      existingWpIds.add(u.wp_user_id);
    });

    if (existingUsers.length > 0) {
      console.log(`📌 Found ${existingUsers.length} users already migrated, will continue...`);
    }

    const [wpUsers] = await sequelize.query(`
      SELECT u.ID, u.user_login, u.user_email, u.user_pass, u.display_name, u.user_url, u.user_registered
      FROM ${WP_PREFIX}users u
    `);

    console.log(`Found ${wpUsers.length} users in WordPress`);
    const toMigrate = wpUsers.filter((u) => !existingWpIds.has(u.ID));
    console.log(`👥 Need to migrate: ${toMigrate.length} new users\n`);

    if (toMigrate.length === 0) {
      console.log(`✅ All users already migrated\n`);
      return userMapping;
    }

    for (const wpUser of toMigrate) {
      const [roleMeta] = await sequelize.query(`
        SELECT meta_value FROM ${WP_PREFIX}usermeta
        WHERE user_id = ${wpUser.ID} AND meta_key = '${WP_PREFIX}capabilities' LIMIT 1
      `);

      const [firstName] = await sequelize.query(`
        SELECT meta_value FROM ${WP_PREFIX}usermeta
        WHERE user_id = ${wpUser.ID} AND meta_key = 'first_name' LIMIT 1
      `);

      const [lastName] = await sequelize.query(`
        SELECT meta_value FROM ${WP_PREFIX}usermeta
        WHERE user_id = ${wpUser.ID} AND meta_key = 'last_name' LIMIT 1
      `);

      let role = "user";
      if (roleMeta.length > 0 && roleMeta[0].meta_value) {
        const capabilities = roleMeta[0].meta_value;
        if (capabilities.includes("administrator")) role = "administrator";
        else if (capabilities.includes("editor")) role = "editor";
        else if (capabilities.includes("author")) role = "author";
        else if (capabilities.includes("contributor")) role = "contributor";
        else if (capabilities.includes("subscriber")) role = "subscriber";
      }

      const [user] = await User.findOrCreate({
        where: { email: wpUser.user_email },
        defaults: {
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
        },
      });

      userMapping[wpUser.ID] = user.id;
      console.log(`✓ User: ${wpUser.user_login} (${role})`);
    }

    console.log(`✅ ${toMigrate.length} new users migrated (total: ${Object.keys(userMapping).length})\n`);
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
    const existingCategories = await Category.findAll({
      where: { wp_term_id: { [Op.ne]: null } },
      attributes: ["id", "wp_term_id"],
    });

    const categoryMapping = {};
    const existingWpIds = new Set();
    existingCategories.forEach((c) => {
      categoryMapping[c.wp_term_id] = c.id;
      existingWpIds.add(c.wp_term_id);
    });

    if (existingCategories.length > 0) {
      console.log(`📌 Found ${existingCategories.length} categories already migrated, will continue...`);
    }

    const [wpCategories] = await sequelize.query(`
      SELECT t.term_id, t.name, t.slug, tt.description, tt.parent
      FROM ${WP_PREFIX}terms t
      INNER JOIN ${WP_PREFIX}term_taxonomy tt ON t.term_id = tt.term_id
      WHERE tt.taxonomy = 'category'
    `);

    console.log(`Found ${wpCategories.length} categories in WordPress`);
    const toMigrate = wpCategories.filter((c) => !existingWpIds.has(c.term_id));
    console.log(`🏷️  Need to migrate: ${toMigrate.length} new categories\n`);

    if (toMigrate.length === 0) {
      console.log(`✅ All categories already migrated\n`);
      return categoryMapping;
    }

    for (const wpCat of toMigrate) {
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

    for (const [termId, data] of Object.entries(categoryMapping)) {
      if (typeof data === 'object' && data.parent > 0 && categoryMapping[data.parent]) {
        const parentId = typeof categoryMapping[data.parent] === 'object' ? categoryMapping[data.parent].id : categoryMapping[data.parent];
        await Category.update(
          { parent_id: parentId },
          { where: { wp_term_id: parseInt(termId) } }
        );
      }
    }

    console.log(`✅ ${toMigrate.length} new categories migrated (total: ${Object.keys(categoryMapping).length})\n`);
    return Object.fromEntries(Object.entries(categoryMapping).map(([k, v]) => [k, typeof v === 'object' ? v.id : v]));
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
    const existingTags = await Tag.findAll({
      where: { wp_term_id: { [Op.ne]: null } },
      attributes: ["id", "wp_term_id"],
    });

    const tagMapping = {};
    const existingWpIds = new Set();
    existingTags.forEach((t) => {
      tagMapping[t.wp_term_id] = t.id;
      existingWpIds.add(t.wp_term_id);
    });

    if (existingTags.length > 0) {
      console.log(`📌 Found ${existingTags.length} tags already migrated, will continue...`);
    }

    const [wpTags] = await sequelize.query(`
      SELECT t.term_id, t.name, t.slug, tt.description
      FROM ${WP_PREFIX}terms t
      INNER JOIN ${WP_PREFIX}term_taxonomy tt ON t.term_id = tt.term_id
      WHERE tt.taxonomy = 'post_tag'
    `);

    console.log(`Found ${wpTags.length} tags in WordPress`);
    const toMigrate = wpTags.filter((t) => !existingWpIds.has(t.term_id));
    console.log(`🏷️  Need to migrate: ${toMigrate.length} new tags\n`);

    if (toMigrate.length === 0) {
      console.log(`✅ All tags already migrated\n`);
      return tagMapping;
    }

    let count = 0;

    for (const wpTag of toMigrate) {
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
      if (count % 500 === 0) console.log(`   ... ${count}/${toMigrate.length} tags migrated`);
    }

    console.log(`✅ ${count} new tags migrated (total: ${Object.keys(tagMapping).length})\n`);
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
    const existingMedia = await Media.findAll({
      where: { wp_attachment_id: { [Op.ne]: null } },
      attributes: ["id", "wp_attachment_id"],
    });

    const mediaMapping = {};
    const existingWpIds = new Set();
    existingMedia.forEach((m) => {
      mediaMapping[m.wp_attachment_id] = m.id;
      existingWpIds.add(m.wp_attachment_id);
    });

    if (existingMedia.length > 0) {
      console.log(`📌 Found ${existingMedia.length} media files already migrated, will continue...`);
    }

    const [wpMedia] = await sequelize.query(`
      SELECT p.ID, p.post_author, p.guid as url, p.post_title as title,
             p.post_excerpt as caption, p.post_content as description,
             p.post_mime_type as mime_type, p.post_date
      FROM ${WP_PREFIX}posts p
      WHERE p.post_type = 'attachment' AND p.post_mime_type LIKE 'image/%'
      ORDER BY p.post_date DESC
    `);

    console.log(`Found ${wpMedia.length} media files in WordPress`);
    const toMigrate = wpMedia.filter((m) => !existingWpIds.has(m.ID));
    console.log(`📸 Need to migrate: ${toMigrate.length} new media files\n`);

    if (toMigrate.length === 0) {
      console.log(`✅ All media files already migrated\n`);
      return mediaMapping;
    }

    let count = 0;

    for (const wpFile of toMigrate) {
      const [fileMeta] = await sequelize.query(`
        SELECT meta_value FROM ${WP_PREFIX}postmeta
        WHERE post_id = ${wpFile.ID} AND meta_key = '_wp_attached_file' LIMIT 1
      `);

      const [altMeta] = await sequelize.query(`
        SELECT meta_value FROM ${WP_PREFIX}postmeta
        WHERE post_id = ${wpFile.ID} AND meta_key = '_wp_attachment_image_alt' LIMIT 1
      `);

      const filename = fileMeta.length > 0 ? fileMeta[0].meta_value : null;
      const altText = altMeta.length > 0 ? altMeta[0].meta_value : null;

      const [media] = await Media.findOrCreate({
        where: { wp_attachment_id: wpFile.ID },
        defaults: {
          wp_attachment_id: wpFile.ID,
          filename: filename ? filename.split("/").pop() : `attachment-${wpFile.ID}`,
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
      if (count % 500 === 0) console.log(`   ... ${count}/${toMigrate.length} media files migrated`);
    }

    console.log(`✅ ${count} new media files migrated (total: ${Object.keys(mediaMapping).length})\n`);
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
    // Get existing posts mapping
    const existingPosts = await Post.findAll({
      where: { wp_post_id: { [Op.ne]: null } },
      attributes: ["id", "wp_post_id"],
    });

    const postMapping = {};
    const existingWpIds = new Set();
    existingPosts.forEach((p) => {
      postMapping[p.wp_post_id] = p.id;
      existingWpIds.add(p.wp_post_id);
    });

    if (existingPosts.length > 0) {
      console.log(`📌 Found ${existingPosts.length} posts already migrated, will continue...`);
    }

    const [wpPosts] = await sequelize.query(`
      SELECT p.ID, p.post_author, p.post_date, p.post_content, p.post_title,
             p.post_excerpt, p.post_status, p.post_name as slug, p.post_modified, p.comment_status,
             (SELECT meta_value FROM ${WP_PREFIX}postmeta WHERE post_id = p.ID AND meta_key = '_thumbnail_id' LIMIT 1) as thumbnail_id
      FROM ${WP_PREFIX}posts p
      WHERE p.post_type = 'post' AND p.post_status IN ('publish', 'draft', 'pending')
      ORDER BY p.post_date DESC
    `);

    console.log(`Found ${wpPosts.length} posts in WordPress`);
    const toMigrate = wpPosts.filter((p) => !existingWpIds.has(p.ID));
    console.log(`📝 Need to migrate: ${toMigrate.length} new posts\n`);

    if (toMigrate.length === 0) {
      console.log(`✅ All posts already migrated\n`);
      return postMapping;
    }

    let count = 0;

    for (const wpPost of toMigrate) {
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

      // Categories
      const [postCats] = await sequelize.query(`
        SELECT tt.term_id FROM ${WP_PREFIX}term_relationships tr
        JOIN ${WP_PREFIX}term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
        WHERE tr.object_id = ${wpPost.ID} AND tt.taxonomy = 'category'
      `);

      for (const rel of postCats) {
        if (categoryMapping[rel.term_id]) {
          await PostCategory.findOrCreate({
            where: { post_id: post.id, category_id: categoryMapping[rel.term_id] },
          });
        }
      }

      // Tags
      const [postTags] = await sequelize.query(`
        SELECT tt.term_id FROM ${WP_PREFIX}term_relationships tr
        JOIN ${WP_PREFIX}term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
        WHERE tr.object_id = ${wpPost.ID} AND tt.taxonomy = 'post_tag'
      `);

      for (const rel of postTags) {
        if (tagMapping[rel.term_id]) {
          await PostTag.findOrCreate({
            where: { post_id: post.id, tag_id: tagMapping[rel.term_id] },
          });
        }
      }

      count++;
      if (count % 100 === 0) console.log(`   ... ${count}/${toMigrate.length} posts migrated`);
    }

    console.log(`✅ ${count} new posts migrated (total: ${Object.keys(postMapping).length})\n`);
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
    const existingPages = await Page.findAll({
      where: { wp_page_id: { [Op.ne]: null } },
      attributes: ["id", "wp_page_id"],
    });

    const pageMapping = {};
    const existingWpIds = new Set();
    existingPages.forEach((p) => {
      pageMapping[p.wp_page_id] = p.id;
      existingWpIds.add(p.wp_page_id);
    });

    if (existingPages.length > 0) {
      console.log(`📌 Found ${existingPages.length} pages already migrated, will continue...`);
    }

    const [wpPages] = await sequelize.query(`
      SELECT p.ID, p.post_author, p.post_date, p.post_content, p.post_title,
             p.post_status, p.post_name as slug, p.post_modified, p.post_parent, p.menu_order
      FROM ${WP_PREFIX}posts p
      WHERE p.post_type = 'page' AND p.post_status IN ('publish', 'draft', 'private')
      ORDER BY p.menu_order ASC
    `);

    console.log(`Found ${wpPages.length} pages in WordPress`);
    const toMigrate = wpPages.filter((p) => !existingWpIds.has(p.ID));
    console.log(`📄 Need to migrate: ${toMigrate.length} new pages\n`);

    if (toMigrate.length === 0) {
      console.log(`✅ All pages already migrated\n`);
      return Object.fromEntries(Object.entries(pageMapping).map(([k, v]) => [k, typeof v === 'object' ? v.id : v]));
    }

    for (const wpPage of toMigrate) {
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

    for (const [wpId, data] of Object.entries(pageMapping)) {
      if (typeof data === 'object' && data.parent > 0 && pageMapping[data.parent]) {
        await Page.update(
          { parent_id: typeof pageMapping[data.parent] === 'object' ? pageMapping[data.parent].id : pageMapping[data.parent] },
          { where: { wp_page_id: parseInt(wpId) } }
        );
      }
    }

    console.log(`✅ ${toMigrate.length} new pages migrated (total: ${Object.keys(pageMapping).length})\n`);
    return Object.fromEntries(Object.entries(pageMapping).map(([k, v]) => [k, typeof v === 'object' ? v.id : v]));
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
    const existingComments = await Comment.findAll({
      where: { wp_comment_id: { [Op.ne]: null } },
      attributes: ["id", "wp_comment_id"],
    });

    const commentMapping = {};
    const existingWpIds = new Set();
    existingComments.forEach((c) => {
      commentMapping[c.wp_comment_id] = c.id;
      existingWpIds.add(c.wp_comment_id);
    });

    if (existingComments.length > 0) {
      console.log(`📌 Found ${existingComments.length} comments already migrated, will continue...`);
    }

    const [wpComments] = await sequelize.query(`
      SELECT c.comment_ID, c.comment_post_ID, c.comment_author, c.comment_author_email,
             c.comment_author_url, c.comment_author_IP, c.comment_date, c.comment_content,
             c.comment_approved, c.comment_parent, c.user_id, c.comment_agent,
             c.comment_type, c.comment_karma
      FROM ${WP_PREFIX}comments c
      WHERE c.comment_approved != 'trash'
      ORDER BY c.comment_date ASC
    `);

    console.log(`Found ${wpComments.length} comments in WordPress`);
    const toMigrate = wpComments.filter((c) => !existingWpIds.has(c.comment_ID) && postMapping[c.comment_post_ID]);
    console.log(`💬 Need to migrate: ${toMigrate.length} new comments\n`);

    if (toMigrate.length === 0) {
      console.log(`✅ All comments already migrated\n`);
      return Object.fromEntries(Object.entries(commentMapping).map(([k, v]) => [k, typeof v === 'object' ? v.id : v]));
    }

    let count = 0;

    for (const wpComment of toMigrate) {

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
          user_id: wpComment.user_id > 0 && userMapping[wpComment.user_id] ? userMapping[wpComment.user_id] : null,
          createdAt: wpComment.comment_date,
        },
      });

      commentMapping[wpComment.comment_ID] = { id: comment.id, parent: wpComment.comment_parent };
      count++;
      if (count % 100 === 0) console.log(`   ... ${count}/${toMigrate.length} comments migrated`);
    }

    for (const [wpId, data] of Object.entries(commentMapping)) {
      if (typeof data === 'object' && data.parent > 0 && commentMapping[data.parent]) {
        const parentId = typeof commentMapping[data.parent] === 'object' ? commentMapping[data.parent].id : commentMapping[data.parent];
        await Comment.update(
          { parent_id: parentId },
          { where: { wp_comment_id: parseInt(wpId) } }
        );
      }
    }

    console.log(`✅ ${count} new comments migrated (total: ${Object.keys(commentMapping).length})\n`);
    return Object.fromEntries(Object.entries(commentMapping).map(([k, v]) => [k, typeof v === 'object' ? v.id : v]));
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
  console.log("║     🚀  WORDPRESS MIGRATION (with smart skip)  🚀              ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established\n");

    await sequelize.sync({ alter: false });
    console.log("✅ Database models synced\n");

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const userMapping = await migrateUsers();
    const categoryMapping = await migrateCategories();
    const tagMapping = await migrateTags();
    const mediaMapping = await migrateMedia(userMapping);
    const postMapping = await migratePosts(userMapping, categoryMapping, tagMapping);
    const pageMapping = await migratePages(userMapping);
    const commentMapping = await migrateComments(postMapping, userMapping);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("🎉 MIGRATION COMPLETED!\n");
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

runCompleteMigration();
