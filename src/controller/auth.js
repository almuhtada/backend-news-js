const authService = require("../services/auth.service");
const { ok, created, asyncHandler } = require("../utils");
const securityAlert = require("../services/securityAlert.service");

/**
 * Register a new user
 */
const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  return created(res, result, "User registered successfully");
});

/**
 * Login user and return JWT token
 */
const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);

  // Alert ke Telegram saat ada login ke panel (admin/editor) agar
  // admin tahu jika ada yang masuk ke akun dari luar.
  if (result?.user) {
    securityAlert.notifyAdminLogin(req, result.user);
  }

  return ok(res, result, "Login successful");
});

/**
 * Get the current user's profile
 */
const profile = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user.id);
  return ok(res, { user }, "User profile retrieved successfully");
});

const refreshToken = asyncHandler(async (req, res) => {
  const result = await authService.refreshAccessToken(req.body.refreshToken);
  return ok(res, result, "Token refreshed successfully");
});

module.exports = { register, login, profile, refreshToken };
