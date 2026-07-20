const rateLimit = require("express-rate-limit");

/**
 * Rate limiter middleware for authentication routes (login & register)
 * Limits each IP to 20 requests per 15 minutes.
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // Limit each IP to 20 requests per window
  message: {
    success: false,
    message: "Terlalu banyak permintaan login atau registrasi dari IP ini. Silakan coba lagi setelah 15 menit.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

module.exports = {
  authRateLimiter,
};
