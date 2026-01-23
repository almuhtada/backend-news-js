const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Post = sequelize.define(
  "Post",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: true,
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    content: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    excerpt: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    author_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    featured_image: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("publish", "draft", "pending", "trash"),
      defaultValue: "draft",
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    views: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Featured/highlighted post",
    },
    comment_status: {
      type: DataTypes.ENUM("open", "closed"),
      defaultValue: "open",
    },
    meta_title: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "SEO meta title",
    },
    meta_description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "SEO meta description",
    },
    // WordPress compatibility fields
    wp_post_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: "Original WordPress post ID",
    },
  },
  {
    tableName: "posts",
    timestamps: true,
    indexes: [
      {
        fields: ["slug"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["published_at"],
      },
    ],
  },
);

module.exports = Post;
