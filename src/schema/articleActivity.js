const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ArticleActivity = sequelize.define(
  "ArticleActivity",
  {
    activity_uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
      allowNull: false,
    },
    article_uuid: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    user_uuid: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    status_before: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    status_after: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "article_activities",
    timestamps: false,
    indexes: [{ fields: ["article_uuid"] }, { fields: ["created_at"] }],
  },
);

module.exports = ArticleActivity;
