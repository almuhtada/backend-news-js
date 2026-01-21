const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Media = sequelize.define(
  "Media",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    wp_attachment_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: "Original WordPress attachment ID",
    },
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    original_filename: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    file_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "Path on new server",
    },
    wp_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "Original WordPress URL",
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "File size in bytes",
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    alt_text: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    caption: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    uploaded_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "media",
    timestamps: true,
    indexes: [
      {
        fields: ["filename"],
      },
      {
        fields: ["mime_type"],
      },
    ],
  }
);

module.exports = Media;
