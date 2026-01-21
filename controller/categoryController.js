const { Category, Post } = require("../schema");

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const { Sequelize } = require('sequelize');
    const categories = await Category.findAll({
      attributes: {
        include: [
          [
            Sequelize.literal(`(
              SELECT COUNT(DISTINCT posts.id)
              FROM posts
              INNER JOIN post_categories ON posts.id = post_categories.post_id
              WHERE post_categories.category_id = Category.id
              AND posts.status = 'publish'
            )`),
            'post_count'
          ]
        ]
      },
      include: [
        {
          model: Category,
          as: "parent",
          attributes: ["id", "name", "slug"],
        },
        {
          model: Category,
          as: "children",
          attributes: ["id", "name", "slug"],
        },
      ],
      order: [["name", "ASC"]],
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error getting categories:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching categories",
      error: error.message,
    });
  }
};

// Get single category
exports.getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({
      where: { slug },
      include: [
        {
          model: Category,
          as: "parent",
          attributes: ["id", "name", "slug"],
        },
        {
          model: Category,
          as: "children",
          attributes: ["id", "name", "slug"],
        },
      ],
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Error getting category:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching category",
      error: error.message,
    });
  }
};

// Create category
exports.createCategory = async (req, res) => {
  try {
    const { name, slug, description, parent_id } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const category = await Category.create({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
      description,
      parent_id: parent_id || null,
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({
      success: false,
      message: "Error creating category",
      error: error.message,
    });
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, parent_id } = req.body;

    const category = await Category.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    await category.update({
      name: name || category.name,
      slug: slug || category.slug,
      description: description !== undefined ? description : category.description,
      parent_id: parent_id !== undefined ? parent_id : category.parent_id,
    });

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({
      success: false,
      message: "Error updating category",
      error: error.message,
    });
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    await category.destroy();

    res.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting category",
      error: error.message,
    });
  }
};

// Get posts by category
exports.getPostsByCategory = async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const category = await Category.findOne({ where: { slug } });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const offset = (page - 1) * limit;

    const { count, rows: posts } = await Post.findAndCountAll({
      include: [
        {
          model: Category,
          as: "categories",
          where: { id: category.id },
          attributes: [],
        },
      ],
      where: { status: "publish" },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["published_at", "DESC"]],
      distinct: true,
    });

    res.json({
      success: true,
      data: {
        category,
        posts,
      },
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error getting posts by category:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching posts by category",
      error: error.message,
    });
  }
};
