/**
 * Script untuk migrasi data dari WordPress ke sistem baru
 *
 * Cara menggunakan:
 * node scripts/migrate-from-wordpress.js
 */

require("dotenv").config();
const sequelize = require("../../config/database");
const { User, Post, Category, Tag, PostCategory, PostTag } = require("../../schema");

// Prefix tabel WordPress (sesuaikan dengan database Anda)
const WP_PREFIX = "wp8o_";

async function migrateCategories() {
  console.log("🏷️  Migrating categories...");

  try {
    // Query categories dari WordPress
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

    console.log(`Found ${wpCategories.length} categories in WordPress`);

    // Mapping WordPress category ID ke new category ID
    const categoryMapping = {};

    // Insert categories (parent first, then children)
    for (const wpCat of wpCategories) {
      const categoryData = {
        name: wpCat.name,
        slug: wpCat.slug,
        description: wpCat.description || null,
        parent_id: null, // Will be updated later for child categories
        wp_term_id: wpCat.term_id,
      };

      const [category] = await Category.findOrCreate({
        where: { slug: wpCat.slug },
        defaults: categoryData,
      });

      categoryMapping[wpCat.term_id] = category.id;
      console.log(`✓ Category migrated: ${wpCat.name}`);
    }

    // Update parent relationships
    for (const wpCat of wpCategories) {
      if (wpCat.parent > 0 && categoryMapping[wpCat.parent]) {
        await Category.update(
          { parent_id: categoryMapping[wpCat.parent] },
          { where: { wp_term_id: wpCat.term_id } }
        );
      }
    }

    console.log(`✅ ${wpCategories.length} categories migrated successfully`);
    return categoryMapping;
  } catch (error) {
    console.error("❌ Error migrating categories:", error.message);
    throw error;
  }
}

async function migrateTags() {
  console.log("🏷️  Migrating tags...");

  try {
    const [wpTags] = await sequelize.query(`
      SELECT
        t.term_id,
        t.name,
        t.slug,
        tt.description
      FROM ${WP_PREFIX}terms t
      INNER JOIN ${WP_PREFIX}term_taxonomy tt ON t.term_id = tt.term_id
      WHERE tt.taxonomy = 'post_tag'
    `);

    console.log(`Found ${wpTags.length} tags in WordPress`);

    const tagMapping = {};

    for (const wpTag of wpTags) {
      const tagData = {
        name: wpTag.name,
        slug: wpTag.slug,
        description: wpTag.description || null,
        wp_term_id: wpTag.term_id,
      };

      const [tag] = await Tag.findOrCreate({
        where: { slug: wpTag.slug },
        defaults: tagData,
      });

      tagMapping[wpTag.term_id] = tag.id;
      console.log(`✓ Tag migrated: ${wpTag.name}`);
    }

    console.log(`✅ ${wpTags.length} tags migrated successfully`);
    return tagMapping;
  } catch (error) {
    console.error("❌ Error migrating tags:", error.message);
    throw error;
  }
}

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
      // Get user role from usermeta
      const [roleMeta] = await sequelize.query(`
        SELECT meta_value
        FROM ${WP_PREFIX}usermeta
        WHERE user_id = ${wpUser.ID}
        AND meta_key = '${WP_PREFIX}capabilities'
        LIMIT 1
      `);

      // Get first and last name
      const [firstName] = await sequelize.query(`
        SELECT meta_value
        FROM ${WP_PREFIX}usermeta
        WHERE user_id = ${wpUser.ID}
        AND meta_key = 'first_name'
        LIMIT 1
      `);

      const [lastName] = await sequelize.query(`
        SELECT meta_value
        FROM ${WP_PREFIX}usermeta
        WHERE user_id = ${wpUser.ID}
        AND meta_key = 'last_name'
        LIMIT 1
      `);

      // Parse WordPress role
      let role = "user";
      if (roleMeta.length > 0 && roleMeta[0].meta_value) {
        const capabilities = roleMeta[0].meta_value;
        if (capabilities.includes("administrator")) {
          role = "administrator";
        } else if (capabilities.includes("editor")) {
          role = "editor";
        } else if (capabilities.includes("author")) {
          role = "author";
        } else if (capabilities.includes("contributor")) {
          role = "contributor";
        } else if (capabilities.includes("subscriber")) {
          role = "subscriber";
        }
      }

      const userData = {
        wp_user_id: wpUser.ID,
        username: wpUser.user_login,
        email: wpUser.user_email,
        password: wpUser.user_pass, // Keep WordPress password hash
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

    console.log(`✅ ${wpUsers.length} users migrated successfully`);
    return userMapping;
  } catch (error) {
    console.error("❌ Error migrating users:", error.message);
    throw error;
  }
}

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
        (SELECT meta_value FROM ${WP_PREFIX}postmeta WHERE post_id = p.ID AND meta_key = '_thumbnail_id' LIMIT 1) as thumbnail_id
      FROM ${WP_PREFIX}posts p
      WHERE p.post_type = 'post'
      AND p.post_status IN ('publish', 'draft', 'pending')
      ORDER BY p.post_date DESC
    `);

    console.log(`Found ${wpPosts.length} posts in WordPress`);

    const postMapping = {};

    for (const wpPost of wpPosts) {
      // Get featured image URL if exists
      let featuredImage = null;
      if (wpPost.thumbnail_id) {
        const [images] = await sequelize.query(`
          SELECT guid FROM ${WP_PREFIX}posts WHERE ID = ${wpPost.thumbnail_id}
        `);
        if (images.length > 0) {
          featuredImage = images[0].guid;
        }
      }

      const postData = {
        title: wpPost.post_title,
        slug: wpPost.slug,
        content: wpPost.post_content,
        excerpt: wpPost.post_excerpt,
        author_id: userMapping[wpPost.post_author] || 1,
        featured_image: featuredImage,
        status: wpPost.post_status === "publish" ? "publish" : "draft",
        published_at: wpPost.post_status === "publish" ? wpPost.post_date : null,
        wp_post_id: wpPost.ID,
        createdAt: wpPost.post_date,
        updatedAt: wpPost.post_modified,
      };

      const [post] = await Post.findOrCreate({
        where: { slug: wpPost.slug },
        defaults: postData,
      });

      postMapping[wpPost.ID] = post.id;

      // Migrate categories for this post
      const [postCategories] = await sequelize.query(`
        SELECT term_taxonomy_id
        FROM ${WP_PREFIX}term_relationships
        WHERE object_id = ${wpPost.ID}
        AND term_taxonomy_id IN (
          SELECT term_taxonomy_id
          FROM ${WP_PREFIX}term_taxonomy
          WHERE taxonomy = 'category'
        )
      `);

      for (const rel of postCategories) {
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

      // Migrate tags for this post
      const [postTags] = await sequelize.query(`
        SELECT term_taxonomy_id
        FROM ${WP_PREFIX}term_relationships
        WHERE object_id = ${wpPost.ID}
        AND term_taxonomy_id IN (
          SELECT term_taxonomy_id
          FROM ${WP_PREFIX}term_taxonomy
          WHERE taxonomy = 'post_tag'
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

      console.log(`✓ Post migrated: ${wpPost.post_title}`);
    }

    console.log(`✅ ${wpPosts.length} posts migrated successfully`);
    return postMapping;
  } catch (error) {
    console.error("❌ Error migrating posts:", error.message);
    throw error;
  }
}

async function runMigration() {
  console.log("🚀 Starting WordPress migration...\n");

  try {
    // Test database connection
    await sequelize.authenticate();
    console.log("✅ Database connection established\n");

    // Sync models (create tables if not exist)
    await sequelize.sync({ alter: false });
    console.log("✅ Database models synced\n");

    // Run migrations in order
    const categoryMapping = await migrateCategories();
    console.log("");

    const tagMapping = await migrateTags();
    console.log("");

    const userMapping = await migrateUsers();
    console.log("");

    const postMapping = await migratePosts(userMapping, categoryMapping, tagMapping);
    console.log("");

    console.log("🎉 Migration completed successfully!");
    console.log("\nSummary:");
    console.log(`- Categories: ${Object.keys(categoryMapping).length}`);
    console.log(`- Tags: ${Object.keys(tagMapping).length}`);
    console.log(`- Users: ${Object.keys(userMapping).length}`);
    console.log(`- Posts: ${Object.keys(postMapping).length}`);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run migration
runMigration();
