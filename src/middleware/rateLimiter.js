const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const rateLimitMessage = {
  success: false,
  message: "Terlalu banyak percobaan. Silakan coba lagi setelah 15 menit.",
};

/** Registrasi tetap dibatasi per alamat IP untuk mencegah pembuatan akun massal. */
const registerRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // Limit each IP to 20 requests per window
  message: {
    success: false,
    message:
      "Terlalu banyak permintaan registrasi dari IP ini. Silakan coba lagi setelah 15 menit.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Login dibatasi per akun, bukan per IP.
 * Dengan begitu kegagalan satu user di jaringan yang sama tidak mengunci user lain.
 * Request berhasil tidak dihitung sebagai percobaan gagal.
 */
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const identifier = String(req.body?.identifier || "")
      .trim()
      .toLowerCase();
    return identifier
      ? `account:${identifier}`
      : `ip:${ipKeyGenerator(req.ip)}`;
  },
  message: rateLimitMessage,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  registerRateLimiter,
  loginRateLimiter,
};
