const { Category, Post } = require("../schema");
const sequelize = require("../config/database");

// Simple cache (TTL: 5 menit)
const _cache = new Map();
function getCache(key) {
  const e = _cache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > 5 * 60 * 1000) { _cache.delete(key); return null; }
  return e.data;
}
function setCache(key, data) { _cache.set(key, { data, ts: Date.now() }); }
function clearCache() { _cache.clear(); }

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const cached = getCache("categories");
    if (cached) return res.json({ success: true, data: cached });

    const rows = await sequelize.query(
      `SELECT
         cat.id, cat.name, cat.slug, cat.description, cat.parent_id,
         p.name  AS parent_name,
         p.slug  AS parent_slug,
         COUNT(DISTINCT CASE WHEN po.status = 'publish' THEN pc.post_id END) AS post_count
       FROM categories cat
       LEFT JOIN categories p        ON p.id  = cat.parent_id
       LEFT JOIN post_categories pc  ON pc.category_id = cat.id
       LEFT JOIN posts po            ON po.id = pc.post_id
       GROUP BY cat.id, cat.name, cat.slug, cat.description, cat.parent_id, p.name, p.slug
       ORDER BY cat.name ASC`,
      { type: sequelize.QueryTypes.SELECT }
    );

    // Attach children list
    const map = {};
    rows.forEach((r) => { map[r.id] = { ...r, post_count: Number(r.post_count) || 0, children: [] }; });
    rows.forEach((r) => { if (r.parent_id && map[r.parent_id]) map[r.parent_id].children.push({ id: r.id, name: r.name, slug: r.slug }); });
    const categories = Object.values(map);

    setCache("categories", categories);
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error("Error getting categories:", error);
    res.status(500).json({ success: false, message: "Error fetching categories", error: error.message });
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

    clearCache();
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

    clearCache();
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
    clearCache();
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
