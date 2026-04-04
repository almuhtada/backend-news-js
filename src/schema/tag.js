const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Tag = sequelize.define(
  "Tag",
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
    // WordPress compatibility
    wp_term_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: "Original WordPress term ID",
    },
  },
  {
    tableName: "tags",
    timestamps: true,
  }
);

module.exports = Tag;
