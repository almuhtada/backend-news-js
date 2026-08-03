const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const User = require("../schema/user");
const RefreshToken = require("../schema/refreshToken");
const sequelize = require("../config/database");
const { Op } = require("sequelize");
const { BadRequestError, NotFoundError } = require("../utils");
const securityAlert = require("./securityAlert.service");

const REFRESH_TOKEN_EXPIRY_MS =
  (parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS, 10) || 7) *
  24 *
  60 *
  60 *
  1000;
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "1h";

class AuthService {
  /**
   * Register a new user
   * @param {object} data - registration payload
   * @returns {Promise<{id: number, username: string, email: string}>}
   */
  async register(data) {
    const { username, email, password } = data;

    if (!username || !email || !password) {
      throw new BadRequestError("Username, email, and password are required");
    }

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestError("User already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    return { id: user.id, username: user.username, email: user.email };
  }

  /**
   * Login user and generate JWT token
   * @param {object} data - login credentials
   * @returns {Promise<{token: string, user: object}>}
   */
  async login(data) {
    const { identifier, password } = data;

    if (!identifier || !password) {
      throw new BadRequestError("Username/email and password are required");
    }

    const user = await User.findOne({
      where: { [Op.or]: [{ email: identifier }, { username: identifier }] },
    });

    if (!user) {
      securityAlert.recordFailedLogin({ headers: {}, ip: identifier }, identifier);
      throw new BadRequestError("Invalid credentials");
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      securityAlert.recordFailedLogin({ headers: {}, ip: identifier }, identifier);
      throw new BadRequestError("Invalid credentials");
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("Server configuration error: JWT_SECRET is not set");
    }

    // Generate token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY },
    );

    const refreshTokenValue = uuidv4();
    await RefreshToken.create({
      token: refreshTokenValue,
      user_id: user.id,
      expires_at: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
    });

    // Reset counter login gagal untuk IP ini
    securityAlert.resetFailedLogin(user.username);

    return {
      token,
      refreshToken: refreshTokenValue,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Get user profile by ID
   * @param {number} userId
   * @returns {Promise<object>}
   */
  async getProfile(userId) {
    const user = await User.findByPk(userId, {
      attributes: ["id", "username", "email", "role"],
    });
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return user;
  }

  async refreshAccessToken(refreshTokenValue) {
    if (!refreshTokenValue) {
      throw new BadRequestError("Refresh token is required");
    }

    const stored = await RefreshToken.findOne({
      where: { token: refreshTokenValue, revoked: false },
    });

    if (!stored) {
      throw new BadRequestError("Invalid refresh token");
    }

    if (new Date() > new Date(stored.expires_at)) {
      await stored.update({ revoked: true });
      throw new BadRequestError("Refresh token expired");
    }

    const user = await User.findByPk(stored.user_id);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const newAccessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY },
    );

    const newRefreshTokenValue = uuidv4();
    await stored.update({ revoked: true });
    await RefreshToken.create({
      token: newRefreshTokenValue,
      user_id: user.id,
      expires_at: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
    });

    return {
      token: newAccessToken,
      refreshToken: newRefreshTokenValue,
    };
  }

  async revokeAllUserTokens(userId) {
    await RefreshToken.update(
      { revoked: true },
      { where: { user_id: userId, revoked: false } },
    );
  }

  async cleanupExpiredTokens() {
    const deleted = await RefreshToken.destroy({
      where: {
        [Op.or]: [
          { expires_at: { [Op.lt]: new Date() } },
          { revoked: true },
        ],
      },
    });
    return deleted;
  }
}

module.exports = new AuthService();
