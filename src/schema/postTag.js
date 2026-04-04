const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PostTag = sequelize.define(
  "PostTag",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    post_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "posts",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    tag_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "tags",
        key: "id",
      },
      onDelete: "CASCADE",
    },
  },
  {
    tableName: "post_tags",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["post_id", "tag_id"],
      },
    ],
  }
);

module.exports = PostTag;
