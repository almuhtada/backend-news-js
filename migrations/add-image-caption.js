require("dotenv").config();
const sequelize = require("../src/config/database");

async function up() {
  try {
    const [columns] = await sequelize.query(
      "SHOW COLUMNS FROM posts LIKE 'image_caption'",
    );
    if (columns.length === 0) {
      await sequelize.query(
        "ALTER TABLE posts ADD COLUMN image_caption TEXT NULL AFTER featured_image",
      );
      console.log("image_caption column added successfully");
    } else {
      console.log("image_caption column already exists, skipping");
    }
  } finally {
    await sequelize.close();
  }
}

up().catch((error) => {
  console.error("Error adding image_caption column:", error.message);
  process.exitCode = 1;
});
