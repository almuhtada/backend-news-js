const User = require("../schema/user");

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
        [require("sequelize").Op.or]: [
          { username: { [require("sequelize").Op.like]: `%${search}%` } },
          { email: { [require("sequelize").Op.like]: `%${search}%` } },
          { display_name: { [require("sequelize").Op.like]: `%${search}%` } },
        ],
      };
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    res.json({
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
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      role,
    } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    // Hash password
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user - display_name defaults to username
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

    res.status(201).json({ success: true, data: userResponse });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role, password } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Prepare update data
    const updateData = {
      email,
      role,
    };

    // Hash new password if provided
    if (password && password.trim()) {
      const bcrypt = require("bcryptjs");
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update user
    await user.update(updateData);

    // Remove password from response
    const userResponse = { ...user.toJSON() };
    delete userResponse.password;

    res.json({ success: true, data: userResponse });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await user.destroy();
    res.json({ success: true });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
};
