const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

/**
 * PostViewLog — log setiap kali user membuka artikel.
 * Dipakai sebagai sinyal histori baca untuk sistem rekomendasi.
 * Insert dilakukan secara async (fire-and-forget) di getPostBySlug
 * sehingga tidak memperlambat response.
 */
const PostViewLog = sequelize.define(
  "PostViewLog",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    post_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID artikel yang dibuka",
    },
    user_identifier: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "IP address atau user ID untuk identify pembaca",
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "ID user jika sedang login (opsional)",
    },
    viewed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: "Waktu artikel dibuka",
    },
  },
  {
    tableName: "post_view_logs",
    timestamps: false,
    indexes: [
      { fields: ["post_id"] },
      { fields: ["user_identifier"] },
      { fields: ["viewed_at"] },
      // Untuk query "artikel yg dibaca user ini"
      { fields: ["user_identifier", "post_id"] },
    ],
  }
);

module.exports = PostViewLog;
