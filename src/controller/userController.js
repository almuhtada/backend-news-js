const User = require("../schema/user");
const authService = require("../services/auth.service");
const { Op } = require("sequelize");
const {
  ok,
  created,
  badRequest,
  notFound,
  serverError,
} = require("../shared/http/response");

const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = {};

    if (role) {
      whereClause.role = role;
    }

    if (search) {
      whereClause = {
        ...whereClause,
        [Op.or]: [
          { username: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { display_name: { [Op.like]: `%${search}%` } },
        ],
      };
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      success: true,
      data: users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalUsers: count,
        usersPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    return serverError(res, error, "Server error");
  }
};

const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ where: { uuid: id } });

    if (!user) {
      return notFound(res, "User not found");
    }

    return ok(res, user);
  } catch (error) {
    return serverError(res, error, "Server error");
  }
};

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return notFound(res, "User not found");
    }

    return ok(res, user);
  } catch (error) {
    return serverError(res, error, "Server error");
  }
};

const createUser = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return badRequest(res, "User already exists");
    }

    // Hash password
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      display_name: username,
      role: role || "user",
    });

    // Remove password from response
    const userResponse = { ...user.toJSON() };
    delete userResponse.password;

    return created(res, userResponse, "User created successfully");
  } catch (error) {
    return serverError(res, error, "Server error");
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, password, display_name } = req.body;

    const user = await User.findOne({ where: { uuid: id } });
    if (!user) {
      return notFound(res, "User not found");
    }

    if (!username || !username.trim() || !email || !email.trim()) {
      return badRequest(res, "Username and email are required");
    }

    const existingUsername = await User.findOne({
      where: {
        username: username.trim(),
        uuid: { [Op.ne]: id },
      },
    });
    if (existingUsername) {
      return badRequest(res, "Username already exists");
    }

    // Prepare update data
    const updateData = {
      username: username.trim(),
      email: email.trim(),
      role,
    };

    // Add display_name if provided
    if (display_name !== undefined) {
      updateData.display_name = display_name?.trim() || null;
    }

    // Hash new password if provided
    if (password && password.trim()) {
      const bcrypt = require("bcryptjs");
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update user
    await user.update(updateData);

    // Revoke all refresh tokens if password changed
    if (password && password.trim()) {
      await authService.revokeAllUserTokens(user.id);
    }

    // Remove password from response
    const userResponse = { ...user.toJSON() };
    delete userResponse.password;

    return ok(res, userResponse, "User updated successfully");
  } catch (error) {
    return serverError(res, error, "Server error");
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return notFound(res, "User not found");
    }

    req.params.id = user.uuid;
    req.body.role = user.role;
    return updateUser(req, res);
  } catch (error) {
    return serverError(res, error, "Server error");
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ where: { uuid: id } });

    if (!user) {
      return notFound(res, "User not found");
    }

    await user.destroy();
    return ok(res, null, "User deleted successfully");
  } catch (error) {
    return serverError(res, error, "Server error");
  }
};

module.exports = {
  getUsers,
  getMyProfile,
  getUser,
  createUser,
  updateUser,
  updateMyProfile,
  deleteUser,
};
