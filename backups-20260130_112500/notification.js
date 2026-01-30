const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Notification = sequelize.define(
  "Notification",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "Nama user yang melakukan aksi",
    },
    action: {
      type: DataTypes.ENUM("add", "edit", "delete"),
      allowNull: false,
      defaultValue: "add",
      comment: "Jenis aksi yang dilakukan",
    },
    target: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "Target dari aksi (contoh: judul berita)",
    },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      allowNull: false,
      defaultValue: "pending",
      comment: "Status persetujuan notifikasi",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Deskripsi detail dari notifikasi",
    },
    priority: {
      type: DataTypes.ENUM("low", "medium", "high"),
      allowNull: false,
      defaultValue: "medium",
      comment: "Tingkat prioritas notifikasi",
    },
    category: {
      type: DataTypes.ENUM("news", "publication", "profile", "system", "achievement"),
      allowNull: false,
      defaultValue: "news",
      comment: "Kategori notifikasi",
    },
    post_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "wp_posts",
        key: "id",
      },
      comment: "ID post terkait (jika ada)",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "updated_at",
    },
  },
  {
    tableName: "notifications",
    timestamps: true,
    underscored: true,
  }
);

module.exports = Notification;
