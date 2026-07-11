const authService = require("../services/auth.service");
const { ok, created, asyncHandler } = require("../utils");

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
  return ok(res, result, "Login successful");
});

/**
 * Get the current user's profile
 */
const profile = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user.id);
  return ok(res, { user }, "User profile retrieved successfully");
});

module.exports = { register, login, profile };
