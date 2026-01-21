const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // WordPress compatibility
    wp_user_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: "Original WordPress user ID",
    },
    username: {
      type: DataTypes.STRING(60),
      allowNull: false,
      unique: true,
      comment: "user_login from WordPress",
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "WordPress password hash or bcrypt hash",
    },
    display_name: {
      type: DataTypes.STRING(250),
      allowNull: true,
      comment: "Display name from WordPress",
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM(
        "administrator",
        "editor",
        "author",
        "contributor",
        "subscriber",
        "user"
      ),
      defaultValue: "user",
      comment: "WordPress roles: administrator, editor, author, contributor, subscriber",
    },
    user_url: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    user_registered: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "WordPress registration date",
    },
  },
  {
    tableName: "users",
    timestamps: true,
  }
);

module.exports = User;
