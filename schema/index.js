// Import all models
const User = require("./user");
const Post = require("./post");
const Page = require("./page");
const Media = require("./media");
const Category = require("./category");
const Tag = require("./tag");
const Comment = require("./comment");
const PostCategory = require("./postCategory");
const PostTag = require("./postTag");
const Achievement = require("./achievement");
const Publication = require("./publication");
const About = require("./about");
const Notification = require("./notification");
const PageContent = require("./pageContent");
const PostLike = require("./postLike");
const Setting = require("./setting");

// ========================================
// Define Relationships
// ========================================

// ----- User Relationships -----

// User - Post (One-to-Many)
User.hasMany(Post, { foreignKey: "author_id", as: "posts" });
Post.belongsTo(User, { foreignKey: "author_id", as: "author" });

// User - Post as Editor (One-to-Many)
User.hasMany(Post, { foreignKey: "editor_id", as: "editedPosts" });
Post.belongsTo(User, { foreignKey: "editor_id", as: "editor" });

// User - Page (One-to-Many)
User.hasMany(Page, { foreignKey: "author_id", as: "pages" });
Page.belongsTo(User, { foreignKey: "author_id", as: "author" });

// User - Media (One-to-Many)
User.hasMany(Media, { foreignKey: "uploaded_by", as: "uploads" });
Media.belongsTo(User, { foreignKey: "uploaded_by", as: "uploader" });

// User - Comment (One-to-Many) - if comment by registered user
User.hasMany(Comment, { foreignKey: "user_id", as: "comments" });
Comment.belongsTo(User, { foreignKey: "user_id", as: "user" });

// ----- Post Relationships -----

// Post - Category (Many-to-Many)
Post.belongsToMany(Category, {
  through: PostCategory,
  foreignKey: "post_id",
  otherKey: "category_id",
  as: "categories",
});
Category.belongsToMany(Post, {
  through: PostCategory,
  foreignKey: "category_id",
  otherKey: "post_id",
  as: "posts",
});

// Post - Tag (Many-to-Many)
Post.belongsToMany(Tag, {
  through: PostTag,
  foreignKey: "post_id",
  otherKey: "tag_id",
  as: "tags",
});
Tag.belongsToMany(Post, {
  through: PostTag,
  foreignKey: "tag_id",
  otherKey: "post_id",
  as: "posts",
});

// Post - Comment (One-to-Many)
Post.hasMany(Comment, { foreignKey: "post_id", as: "comments" });
Comment.belongsTo(Post, { foreignKey: "post_id", as: "post" });

// Post - PostLike (One-to-Many)
Post.hasMany(PostLike, { foreignKey: "post_id", as: "likes" });
PostLike.belongsTo(Post, { foreignKey: "post_id", as: "post" });

// User - PostLike (One-to-Many) - if like by registered user
User.hasMany(PostLike, { foreignKey: "user_id", as: "postLikes" });
PostLike.belongsTo(User, { foreignKey: "user_id", as: "user" });

// ----- Page Relationships -----

// Page self-reference for parent-child hierarchy
Page.hasMany(Page, { foreignKey: "parent_id", as: "children" });
Page.belongsTo(Page, { foreignKey: "parent_id", as: "parent" });

// ----- Category Relationships -----

// Category self-reference for parent-child
Category.hasMany(Category, { foreignKey: "parent_id", as: "children" });
Category.belongsTo(Category, { foreignKey: "parent_id", as: "parent" });

// Category - Media (thumbnail)
Category.belongsTo(Media, { foreignKey: "thumbnail_id", as: "thumbnail" });

// ----- Comment Relationships -----

// Comment self-reference for nested/threaded comments
Comment.hasMany(Comment, { foreignKey: "parent_id", as: "replies" });
Comment.belongsTo(Comment, { foreignKey: "parent_id", as: "parent" });

// ----- Notification Relationships -----

// Notification - Post (Many-to-One)
Notification.belongsTo(Post, { foreignKey: "post_id", as: "post" });
Post.hasMany(Notification, { foreignKey: "post_id", as: "notifications" });

// ========================================
// Export all models
// ========================================

module.exports = {
  User,
  Post,
  Page,
  Media,
  Category,
  Tag,
  Comment,
  PostCategory,
  PostTag,
  Achievement,
  Publication,
  About,
  Notification,
  PageContent,
  PostLike,
  Setting,
};
