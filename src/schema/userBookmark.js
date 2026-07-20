const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

/**
 * UserBookmark — artikel yang disimpan user.
 * Signal eksplisit terkuat: user secara aktif menyimpan artikel.
 * Dipakai sebagai basis rekomendasi paling akurat (intent tinggi).
 */
const UserBookmark = sequelize.define(
  "UserBookmark",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID user yang menyimpan artikel (wajib login)",
    },
    post_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID artikel yang disimpan",
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "user_bookmarks",
    timestamps: false,
    indexes: [
      // Prevent duplicate bookmark
      {
        unique: true,
        fields: ["user_id", "post_id"],
        name: "unique_user_bookmark",
      },
      { fields: ["user_id"] },
      { fields: ["post_id"] },
    ],
  }
);

module.exports = UserBookmark;
