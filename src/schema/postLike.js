const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PostLike = sequelize.define(
  "PostLike",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    post_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID of the post being liked",
    },
    user_identifier: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "User identifier (IP address or user ID for logged-in users)",
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "ID of registered user if logged in",
    },
  },
  {
    tableName: "post_likes",
    timestamps: true,
    indexes: [
      {
        fields: ["post_id"],
      },
      {
        fields: ["user_identifier"],
      },
      {
        // Prevent duplicate likes from same identifier on same post
        unique: true,
        fields: ["post_id", "user_identifier"],
        name: "unique_post_like",
      },
    ],
  }
);

module.exports = PostLike;
