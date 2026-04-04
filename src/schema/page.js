const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Page = sequelize.define(
  "Page",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    wp_page_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: "Original WordPress page ID",
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
    content: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    author_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    template: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Page template: about, contact, privacy, etc",
    },
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Parent page ID for hierarchy",
    },
    menu_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("publish", "draft", "private"),
      defaultValue: "draft",
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true,
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
  },
  {
    tableName: "pages",
    timestamps: true,
    indexes: [
      {
        fields: ["slug"],
      },
      {
        fields: ["status"],
      },
    ],
  }
);

module.exports = Page;
