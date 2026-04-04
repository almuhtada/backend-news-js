const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PostCategory = sequelize.define(
  "PostCategory",
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
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "categories",
        key: "id",
      },
      onDelete: "CASCADE",
    },
  },
  {
    tableName: "post_categories",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["post_id", "category_id"],
      },
    ],
  }
);

module.exports = PostCategory;
