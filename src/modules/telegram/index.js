const router = require("../../routes/telegram");
const debugRouter = require("../../routes/debug");

module.exports = {
  name: "Telegram Notifications",
  basePath: "/api/telegram",
  description: "Telegram Notification Service",
  router,
};

module.exports.debug = {
  name: "Debug Tools",
  basePath: "/api/debug",
  description: "Debug and diagnostic endpoints",
  router: debugRouter,
};
