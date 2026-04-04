const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Comment = sequelize.define(
  "Comment",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    wp_comment_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: "Original WordPress comment ID",
    },
    post_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Parent comment ID for nested/threaded comments",
    },
    author_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    author_email: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    author_url: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    author_ip: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    author_agent: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "Browser user agent string",
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    comment_type: {
      type: DataTypes.STRING(20),
      defaultValue: "comment",
      comment: "Comment type: comment, pingback, trackback",
    },
    status: {
      type: DataTypes.ENUM("approved", "pending", "spam", "trash"),
      defaultValue: "pending",
    },
    karma: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Comment karma/rating",
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "If comment by registered user",
    },
  },
  {
    tableName: "comments",
    timestamps: true,
    indexes: [
      {
        fields: ["post_id"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["author_email"],
      },
    ],
  }
);

module.exports = Comment;
