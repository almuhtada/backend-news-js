const sequelize = require("../src/config/database");

async function addArchivedPostStatus() {
  await sequelize.query(`
    ALTER TABLE posts
    MODIFY COLUMN status ENUM('publish', 'draft', 'archived')
    NOT NULL DEFAULT 'draft'
  `);
}

if (require.main === module) {
  addArchivedPostStatus()
    .then(() => {
      console.log("Archived post status added successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Failed to add archived post status:", error);
      process.exit(1);
    });
}

module.exports = { addArchivedPostStatus };
