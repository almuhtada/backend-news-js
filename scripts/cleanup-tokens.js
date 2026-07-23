require("dotenv").config();
const sequelize = require("../config/database");
const authService = require("../services/auth.service");

async function cleanupTokens() {
  try {
    await sequelize.authenticate();
    console.log("Database connected");

    const deleted = await authService.cleanupExpiredTokens();
    console.log(`Cleaned up ${deleted} expired/revoked refresh token(s)`);

    process.exit(0);
  } catch (error) {
    console.error("Cleanup failed:", error.message);
    process.exit(1);
  }
}

cleanupTokens();
