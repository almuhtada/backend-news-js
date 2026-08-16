const homeService = require("../services/home.service");
const { ok, asyncHandler } = require("../utils");

exports.getHome = asyncHandler(async (_req, res) => {
  const home = await homeService.getHome();
  return ok(res, home, "Homepage feed retrieved successfully");
});
