const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Category = sequelize.define(
  "Category",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(200),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    thumbnail_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Category thumbnail/image ID",
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
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Display order for sorting",
    },
    // WordPress compatibility
    wp_term_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: "Original WordPress term ID",
    },
  },
  {
    tableName: "categories",
    timestamps: true,
  }
);

module.exports = Category;
