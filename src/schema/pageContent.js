const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PageContent = sequelize.define(
  "PageContent",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    page_key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: "Unique key: griya-quran, program-pengajar, pendaftaran",
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
      comment: "JSON content of the page",
      get() {
        const rawValue = this.getDataValue("content");
        return rawValue ? JSON.parse(rawValue) : null;
      },
      set(value) {
        this.setDataValue("content", JSON.stringify(value));
      },
    },
    status: {
      type: DataTypes.ENUM("publish", "draft"),
      defaultValue: "publish",
    },
  },
  {
    tableName: "page_contents",
    timestamps: true,
  }
);

module.exports = PageContent;
