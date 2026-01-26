/**
 * Migration: Add editor_id column to posts table
 * Purpose: Allow posts to have an editor in addition to the author
 */

const sequelize = require("../config/database");
const { QueryInterface, DataTypes } = require("sequelize");

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    console.log("Starting migration: add-editor-to-posts");

    // Check if column already exists
    const tableDesc = await queryInterface.describeTable("posts");

    if (!tableDesc.editor_id) {
      console.log("Adding editor_id column to posts table...");

      await queryInterface.addColumn("posts", "editor_id", {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Editor who reviewed/edited the post",
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });

      console.log("✓ editor_id column added successfully");
    } else {
      console.log("editor_id column already exists, skipping...");
    }

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    console.log("Rolling back migration: add-editor-to-posts");

    // Check if column exists before removing
    const tableDesc = await queryInterface.describeTable("posts");

    if (tableDesc.editor_id) {
      console.log("Removing editor_id column from posts table...");

      await queryInterface.removeColumn("posts", "editor_id");

      console.log("✓ editor_id column removed successfully");
    } else {
      console.log("editor_id column doesn't exist, skipping...");
    }

    console.log("Rollback completed successfully");
  } catch (error) {
    console.error("Rollback failed:", error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  up()
    .then(() => {
      console.log("Migration executed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

module.exports = { up, down };
