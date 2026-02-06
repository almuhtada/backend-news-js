# 🔄 Database Migrations Guide

Dokumentasi lengkap untuk semua database migrations dalam project News Al-Muhtada.

---

## 📋 Table of Contents

1. [Quick Overview](#-quick-overview)
2. [Migration Files](#-migration-files)
3. [How to Run Migrations](#-how-to-run-migrations)
4. [Each Migration Explained](#-each-migration-explained)
5. [Rollback & Recovery](#-rollback--recovery)
6. [Best Practices](#-best-practices)
7. [Troubleshooting](#-troubleshooting)

---

## 🎯 Quick Overview

Database migrations adalah script yang mengubah struktur database. Project ini memiliki **3 migrations**:

| Migration                    | Purpose              | Status     | Run Time |
| ---------------------------- | -------------------- | ---------- | -------- |
| `add-editor-to-posts.js`     | Add editor column    | Idempotent | ~100ms   |
| `add-rejection-reason.js`    | Add rejection reason | Idempotent | ~100ms   |
| `create-post-likes-table.js` | Create likes table   | Idempotent | ~200ms   |

---

## 📁 Migration Files

Semua migration files terletak di: `/backend-news-express/migrations/`

```
migrations/
├── add-editor-to-posts.js          ← Add editor_id to posts
├── add-rejection-reason.js         ← Add rejection_reason to posts
└── create-post-likes-table.js      ← Create new post_likes table
```

---

## 🚀 How to Run Migrations

### Running Individual Migrations

```bash
# Run single migration
node migrations/add-editor-to-posts.js

# Output:
# Starting migration: add-editor-to-posts
# Adding editor_id column to posts table...
# ✓ editor_id column added successfully
# Migration completed successfully
```

### Running All Migrations

```bash
# Create helper script to run all
node -e "
  const fs = require('fs');
  const path = require('path');

  const migrationsDir = './migrations';
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.js'));

  files.forEach(file => {
    console.log(\`\nRunning: \${file}\`);
    require(path.join('./', migrationsDir, file)).up?.();
  });
"
```

### During Fresh Setup

```bash
# In app.js or initialization script
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  console.log('🔄 Running database migrations...');

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js'))
    .sort();

  for (const file of files) {
    try {
      const migration = require(path.join(migrationsDir, file));
      console.log(`✓ Running ${file}...`);

      if (migration.up) await migration.up();
      else if (migration.addRejectionReasonColumn) await migration.addRejectionReasonColumn();
      else if (typeof migration === 'function') await migration();
    } catch (error) {
      console.error(`✗ Failed to run ${file}:`, error.message);
    }
  }

  console.log('✓ All migrations completed');
}

// Run migrations before starting server
await runMigrations();
```

---

## 📖 Each Migration Explained

### 1. Add Editor to Posts (`add-editor-to-posts.js`)

**Purpose:** Add `editor_id` column to track who edited each post

**What it does:**

```sql
ALTER TABLE posts
ADD COLUMN editor_id INT AFTER author_id;

-- Add foreign key constraint
ALTER TABLE posts
ADD FOREIGN KEY (editor_id) REFERENCES users(id) ON DELETE SET NULL;
```

**Database Schema Change:**

```
posts table BEFORE:
├── id (INT, PK)
├── title (VARCHAR)
├── content (TEXT)
├── author_id (INT, FK) ← Only author
├── status (ENUM)
└── ...

posts table AFTER:
├── id (INT, PK)
├── title (VARCHAR)
├── content (TEXT)
├── author_id (INT, FK) ← Author
├── editor_id (INT, FK) ← NEW: Editor (optional)
├── status (ENUM)
└── ...
```

**Usage in Code:**

```javascript
// In postController.js or post model
const post = await Post.findOne({
  where: { id: postId },
  include: [
    { model: User, as: "author" },
    { model: User, as: "editor" }, // ← NEW
  ],
});

// Update post with editor
await post.update({ editor_id: currentUserId });

// Get editor info
const editor = await post.getEditor();
console.log(`Post edited by: ${editor.name}`);
```

**Key Features:**

- ✅ Idempotent (safe to run multiple times)
- ✅ Checks if column exists first
- ✅ Includes proper foreign key constraint
- ✅ Supports rollback (down() function)
- ✅ Includes helpful comments

**Rollback:**

```javascript
// Automatically removes column
async function down() {
  // Removes editor_id column
}
```

**Common Issues & Solutions:**
| Issue | Solution |
|-------|----------|
| "Column already exists" | Migration skips automatically ✓ |
| Foreign key error | Make sure users table exists first |
| Permission denied | Run with proper database user |

---

### 2. Add Rejection Reason (`add-rejection-reason.js`)

**Purpose:** Add `rejection_reason` column to store why posts were rejected

**What it does:**

```sql
ALTER TABLE posts
ADD COLUMN rejection_reason TEXT NULL;
```

**Database Schema Change:**

```
posts table BEFORE:
├── id (INT, PK)
├── title (VARCHAR)
├── content (TEXT)
├── status (ENUM: draft, published, rejected)
├── ...

posts table AFTER:
├── id (INT, PK)
├── title (VARCHAR)
├── content (TEXT)
├── status (ENUM: draft, published, rejected)
├── rejection_reason (TEXT) ← NEW
├── ...
```

**Usage in Code:**

```javascript
// In postController.js - Reject a post
async function rejectPost(postId, reason) {
  await Post.update(
    {
      status: "rejected",
      rejection_reason: reason, // ← NEW
    },
    { where: { id: postId } },
  );
}

// Example
await rejectPost(123, "Contains misspelled words and grammatical errors");

// Retrieve rejection reason
const post = await Post.findByPk(123);
if (post.status === "rejected") {
  console.log(`Reason: ${post.rejection_reason}`);
  // Output: Reason: Contains misspelled words and grammatical errors
}
```

**API Route Example:**

```javascript
// routes/posts.js
router.put("/:id/reject", authenticate, (req, res) => {
  const { reason } = req.body;

  Post.update(
    {
      status: "rejected",
      rejection_reason: reason,
    },
    { where: { id: req.params.id } },
  ).then(() => res.json({ success: true }));
});

// Usage:
// PUT /api/posts/123/reject
// { "reason": "Poor quality content" }
```

**Key Features:**

- ✅ TEXT field (can store long reasons)
- ✅ Nullable (optional for other statuses)
- ✅ Clear database comment
- ✅ Uses direct SQL query

**Database Check Function:**

```sql
-- Check if column exists
SELECT COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'posts'
  AND COLUMN_NAME = 'rejection_reason';
```

**Common Issues & Solutions:**
| Issue | Solution |
|-------|----------|
| Information schema query fails | Check database user permissions |
| Column already exists | Migration checks & skips automatically |
| Text too long | Use LONGTEXT instead of TEXT if needed |

---

### 3. Create Post Likes Table (`create-post-likes-table.js`)

**Purpose:** Create `post_likes` table to track user likes on posts

**What it does:**

```sql
CREATE TABLE post_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_identifier VARCHAR(255) NOT NULL,
  user_id INT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_post_like (post_id, user_identifier),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

**Database Schema:**

```
post_likes table STRUCTURE:
┌─────────────────────────────────────────────────────┐
│ Column Name      │ Type        │ Constraint          │
├─────────────────────────────────────────────────────┤
│ id               │ INT         │ PK, AUTO_INCREMENT  │
│ post_id          │ INT         │ FK → posts.id       │
│ user_identifier  │ VARCHAR(255)│ NOT NULL            │
│ user_id          │ INT         │ FK → users.id       │
│ createdAt        │ TIMESTAMP   │ DEFAULT NOW()       │
│ updatedAt        │ TIMESTAMP   │ AUTO UPDATE         │
└─────────────────────────────────────────────────────┘

Indexes:
├── PRIMARY KEY (id)
├── UNIQUE (post_id, user_identifier)
├── INDEX (post_id)
└── INDEX (user_identifier)
```

**Support for Anonymous Users:**

The `user_identifier` column allows tracking anonymous user likes:

```javascript
// For logged-in users
const like = await PostLike.create({
  post_id: postId,
  user_id: userId,
  user_identifier: `user_${userId}`, // Or just IP address
});

// For anonymous users (use IP address)
const like = await PostLike.create({
  post_id: postId,
  user_id: null, // No registered user
  user_identifier: req.ip, // IP address
});

// Ensure unique like per user (prevents duplicate likes)
const [like, created] = await PostLike.findOrCreate({
  where: {
    post_id: postId,
    user_identifier: userIdentifier,
  },
  defaults: { user_id: userId },
});
```

**Usage in Code:**

```javascript
// model/PostLike.js
const PostLike = sequelize.define("PostLike", {
  postId: DataTypes.INTEGER,
  userId: DataTypes.INTEGER,
  userIdentifier: DataTypes.STRING,
  // timestamps: true (auto handled)
});

// routes/interaction.js or similar
router.post("/posts/:postId/like", authenticate, async (req, res) => {
  try {
    const [like, created] = await PostLike.findOrCreate({
      where: {
        post_id: req.params.postId,
        user_identifier: req.user?.id || req.ip,
      },
      defaults: {
        user_id: req.user?.id,
        post_id: req.params.postId,
      },
    });

    res.json({
      success: true,
      liked: created,
      totalLikes: await PostLike.count({
        where: { post_id: req.params.postId },
      }),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get likes count
router.get("/posts/:postId/likes-count", async (req, res) => {
  const count = await PostLike.count({
    where: { post_id: req.params.postId },
  });

  res.json({ post_id: req.params.postId, likes_count: count });
});

// Get if user liked a post
router.get("/posts/:postId/user-liked", authenticate, async (req, res) => {
  const liked = await PostLike.findOne({
    where: {
      post_id: req.params.postId,
      user_identifier: req.user?.id || req.ip,
    },
  });

  res.json({ post_id: req.params.postId, liked: !!liked });
});

// Unlike post
router.delete("/posts/:postId/like", authenticate, async (req, res) => {
  await PostLike.destroy({
    where: {
      post_id: req.params.postId,
      user_identifier: req.user?.id || req.ip,
    },
  });

  res.json({ success: true });
});
```

**Key Features:**

- ✅ Supports both logged-in and anonymous users
- ✅ Prevents duplicate likes (UNIQUE constraint)
- ✅ Auto-delete likes when post is deleted (CASCADE)
- ✅ Tracks creation & update timestamps
- ✅ Proper indexes for performance
- ✅ Idempotent (checks if table exists)

**Database Query Examples:**

```sql
-- Get total likes for a post
SELECT COUNT(*) as like_count
FROM post_likes
WHERE post_id = 123;

-- Get posts with most likes
SELECT post_id, COUNT(*) as like_count
FROM post_likes
GROUP BY post_id
ORDER BY like_count DESC
LIMIT 10;

-- Check if user liked a post
SELECT * FROM post_likes
WHERE post_id = 123
  AND user_identifier = 'user_456';

-- Get all posts liked by a user
SELECT DISTINCT post_id
FROM post_likes
WHERE user_identifier = 'user_456';

-- Delete duplicate likes (keep only first)
DELETE FROM post_likes
WHERE id NOT IN (
  SELECT id FROM (
    SELECT MIN(id) as id
    FROM post_likes
    GROUP BY post_id, user_identifier
  ) t
);
```

**Common Issues & Solutions:**
| Issue | Solution |
|-------|----------|
| "Table already exists" | Migration checks & skips automatically ✓ |
| Foreign key errors | Ensure posts & users tables exist |
| Duplicate likes | Use findOrCreate() pattern |
| Performance issue | Check indexes are created: `SHOW INDEX FROM post_likes;` |
| Data lost on post delete | Expected behavior (CASCADE delete) |

---

## 🔄 Rollback & Recovery

### Automatic Rollback

Some migrations support rollback:

```javascript
// add-editor-to-posts.js has rollback support
const { up, down } = require("./migrations/add-editor-to-posts.js");

// Rollback
await down(); // Removes editor_id column
```

### Manual Rollback

For migrations without down() function:

```javascript
// Manually rollback add-rejection-reason
const sequelize = require("./config/database");

async function rollback() {
  try {
    await sequelize.query(`
      ALTER TABLE posts
      DROP COLUMN rejection_reason;
    `);
    console.log("✓ Rolled back rejection_reason column");
  } catch (error) {
    console.error("Rollback failed:", error);
  }
}

// Run
rollback().then(() => process.exit(0));
```

```javascript
// Manually rollback post_likes table
const sequelize = require("./config/database");

async function rollback() {
  try {
    await sequelize.query(`DROP TABLE post_likes;`);
    console.log("✓ Dropped post_likes table");
  } catch (error) {
    console.error("Rollback failed:", error);
  }
}

// Run
rollback().then(() => process.exit(0));
```

### Database Backup Before Migration

```bash
# Backup database before migration
mysqldump -u root -p news_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore if something goes wrong
mysql -u root -p news_db < backup_20260128_143022.sql
```

---

## ✅ Best Practices

### ✨ When Creating Migrations

1. **Make them idempotent** - Safe to run multiple times

```javascript
// Good ✓
if (!tableDesc.column_name) {
  await queryInterface.addColumn(/* ... */);
}

// Bad ✗
await queryInterface.addColumn(/* ... */); // Will error if exists
```

2. **Include proper error handling**

```javascript
// Good ✓
try {
  // migration code
} catch (error) {
  console.error("Migration failed:", error);
  throw error;
}

// Bad ✗
await sequelize.query(sql); // No error handling
```

3. **Add rollback support**

```javascript
// Good ✓
module.exports = { up, down };

// Acceptable
// (if rollback not needed or manual only)
```

4. **Use meaningful comments**

```javascript
// Good ✓
ADD COLUMN editor_id INT COMMENT 'Editor who reviewed/edited the post'

// Bad ✗
ADD COLUMN editor_id INT
```

5. **Add foreign keys when referencing other tables**

```javascript
// Good ✓
references: {
  model: 'users',
  key: 'id',
},
onUpdate: 'CASCADE',
onDelete: 'SET NULL',

// Mediocre
// (Just add the column without constraint)
```

### 📋 Migration Checklist

Before running migration:

- [ ] Backup database
- [ ] Test migration in development first
- [ ] Check migration is idempotent
- [ ] Verify all tables/columns it references exist
- [ ] Check for foreign key conflicts
- [ ] Ensure proper indexes
- [ ] Review for performance impact

After running migration:

- [ ] Verify columns/tables created
- [ ] Test application still works
- [ ] Check queries still execute
- [ ] Monitor database size changes
- [ ] Update models if needed

---

## 🐛 Troubleshooting

### Migration Fails with "Column Already Exists"

**Cause:** Migration was run before, column exists  
**Solution:** This is usually fine - migrations check and skip. If error occurs:

```bash
# Check if column exists
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'posts'
AND COLUMN_NAME = 'editor_id';

# If it exists, skip migration or create wrapper
```

### "Table doesn't exist" Error

**Cause:** Dependencies not run yet (e.g., posts table missing)  
**Solution:** Run migrations in order:

```bash
# Make sure base tables exist first
node app.js --sync-db  # Or use Sequelize sync

# Then run migrations
node migrations/add-editor-to-posts.js
node migrations/add-rejection-reason.js
node migrations/create-post-likes-table.js
```

### Foreign Key Constraint Violation

**Cause:** Referenced table/column doesn't exist  
**Solution:** Ensure dependencies exist:

```javascript
// Check foreign keys are valid
SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'post_likes'
AND REFERENCED_TABLE_NAME IS NOT NULL;
```

### Performance Issues After Migration

**Cause:** Missing indexes or large data set  
**Solution:** Verify indexes:

```javascript
// Show all indexes
SHOW INDEX FROM post_likes;

// Should see:
// - PRIMARY (id)
// - idx_post_id
// - idx_user_identifier
// - unique_post_like
```

### Duplicate Likes Created

**Cause:** Not using findOrCreate() pattern  
**Solution:** Use proper create pattern:

```javascript
// Correct ✓
const [like, created] = await PostLike.findOrCreate({
  where: {
    post_id: postId,
    user_identifier: userIdentifier,
  },
});

// Incorrect ✗
await PostLike.create({
  post_id: postId,
  user_identifier: userIdentifier,
}); // Can create duplicates!
```

### Can't Rollback Migration

**Solution:** Manual rollback:

```javascript
// Identify what was created
SHOW COLUMNS FROM posts;
SHOW TABLES;

// Manually remove
ALTER TABLE posts DROP COLUMN editor_id;
DROP TABLE post_likes;

// Verify
SHOW COLUMNS FROM posts;
SHOW TABLES;
```

---

## 📊 Quick Reference

### Running Migrations

```bash
# Individual migration
node migrations/add-editor-to-posts.js

# All migrations
npm run migrate

# With rollback
node -e "require('./migrations/add-editor-to-posts').down()"
```

### Database Queries

```sql
-- Check existing columns
SHOW COLUMNS FROM posts;

-- Check if column exists
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'posts' AND COLUMN_NAME = 'editor_id';

-- Count likes
SELECT COUNT(*) FROM post_likes WHERE post_id = 123;

-- Find duplicates
SELECT post_id, user_identifier, COUNT(*)
FROM post_likes
GROUP BY post_id, user_identifier
HAVING COUNT(*) > 1;
```

### Model Updates

After migrations, update your models:

```javascript
// schema/post.js
const Post = sequelize.define("Post", {
  // ... existing fields
  editor_id: {
    type: DataTypes.INTEGER,
    references: { model: "users", key: "id" },
  },
  rejection_reason: DataTypes.TEXT,
});

// schema/postLike.js - NEW MODEL
const PostLike = sequelize.define("PostLike", {
  post_id: DataTypes.INTEGER,
  user_id: DataTypes.INTEGER,
  user_identifier: DataTypes.STRING,
});
```

---

## 🎓 Common Tasks

### Add a New Column

```javascript
// migrations/my-migration.js
const sequelize = require("../config/database");

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    console.log("Adding new column...");

    const tableDesc = await queryInterface.describeTable("posts");

    if (!tableDesc.my_column) {
      await queryInterface.addColumn("posts", "my_column", {
        type: require("sequelize").DataTypes.STRING,
        allowNull: true,
        comment: "My column description",
      });
    }
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  const tableDesc = await queryInterface.describeTable("posts");

  if (tableDesc.my_column) {
    await queryInterface.removeColumn("posts", "my_column");
  }
}

module.exports = { up, down };
```

### Create a New Table

```javascript
// migrations/create-my-table.js
const sequelize = require("../config/database");

async function createMyTable() {
  try {
    const [tables] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'my_table'
    `);

    if (tables[0].count > 0) {
      console.log("✓ my_table already exists");
      return;
    }

    await sequelize.query(`
      CREATE TABLE my_table (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("✓ my_table created");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

module.exports = createMyTable;
```

### Modify Existing Column

```javascript
// migrations/modify-column.js
async function modifyColumn() {
  try {
    await sequelize.query(`
      ALTER TABLE posts
      MODIFY COLUMN rejection_reason LONGTEXT;
    `);

    console.log("✓ Column modified");
  } catch (error) {
    console.error("Failed:", error);
    throw error;
  }
}

module.exports = modifyColumn;
```

---

## 🎉 Summary

Your migrations:

- ✅ **add-editor-to-posts.js** - Track article editors
- ✅ **add-rejection-reason.js** - Store rejection reasons
- ✅ **create-post-likes-table.js** - Track user likes

All are:

- ✅ Idempotent (safe to run multiple times)
- ✅ Well-documented
- ✅ Include error handling
- ✅ Support rollback (when applicable)

**Next step:** Run migrations during app startup or initialization.

---

**Last Updated:** January 28, 2026  
**Status:** ✅ Complete & Ready  
**Version:** 1.0.0

For questions about specific migrations, check the migration file comments or refer to the detailed sections above.
