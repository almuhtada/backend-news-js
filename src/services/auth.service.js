const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../schema/user");
const { Op } = require("sequelize");
const { BadRequestError, NotFoundError } = require("../utils");

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
      throw new BadRequestError("Invalid credentials");
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
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
      { expiresIn: "1h" },
    );

    return {
      token,
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
}

module.exports = new AuthService();
