const { Category, Post } = require("../schema");
const sequelize = require("../config/database");
const { NotFoundError, BadRequestError } = require("../utils");
const { parsePagination } = require("../utils");

// Simple cache (TTL: 5 minutes)
const _cache = new Map();
function getCache(key) {
  const e = _cache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > 5 * 60 * 1000) {
    _cache.delete(key);
    return null;
  }
  return e.data;
}
function setCache(key, data) {
  _cache.set(key, { data, ts: Date.now() });
}
function clearCache() {
  _cache.clear();
}

class CategoryService {
  /**
   * Get all categories with tree mappings and post counts
   * @returns {Promise<Array>}
   */
  async getAllCategories() {
    const cached = getCache("categories");
    if (cached) return cached;

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
    rows.forEach((r) => {
      map[r.id] = { ...r, post_count: Number(r.post_count) || 0, children: [] };
    });
    rows.forEach((r) => {
      if (r.parent_id && map[r.parent_id]) {
        map[r.parent_id].children.push({
          id: r.id,
          name: r.name,
          slug: r.slug,
        });
      }
    });
    const categories = Object.values(map);

    setCache("categories", categories);
    return categories;
  }

  /**
   * Get single category by slug
   * @param {string} slug
   * @returns {Promise<Category>}
   */
  async getCategoryBySlug(slug) {
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
      throw new NotFoundError("Category not found");
    }

    return category;
  }

  /**
   * Create a new category
   * @param {object} data
   * @returns {Promise<Category>}
   */
  async createCategory(data) {
    const { name, slug, description, parent_id } = data;

    if (!name) {
      throw new BadRequestError("Category name is required");
    }

    const category = await Category.create({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
      description,
      parent_id: parent_id || null,
    });

    clearCache();
    return category;
  }

  /**
   * Update category
   * @param {number} id
   * @param {object} data
   * @returns {Promise<Category>}
   */
  async updateCategory(id, data) {
    const { name, slug, description, parent_id } = data;

    const category = await Category.findByPk(id);
    if (!category) {
      throw new NotFoundError("Category not found");
    }

    await category.update({
      name: name || category.name,
      slug: slug || category.slug,
      description:
        description !== undefined ? description : category.description,
      parent_id: parent_id !== undefined ? parent_id : category.parent_id,
    });

    clearCache();
    return category;
  }

  /**
   * Delete category
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async deleteCategory(id) {
    const category = await Category.findByPk(id);
    if (!category) {
      throw new NotFoundError("Category not found");
    }

    await category.destroy();
    clearCache();
    return true;
  }

  /**
   * Get posts by category slug (paginated)
   * @param {string} slug
   * @param {object} query
   * @returns {Promise<{category: Category, posts: Array, count: number, page: number, limit: number}>}
   */
  async getPostsByCategory(slug, query) {
    const category = await Category.findOne({ where: { slug } });
    if (!category) {
      throw new NotFoundError("Category not found");
    }

    const { page, limit, offset } = parsePagination(query);

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

    return { category, posts, count, page, limit };
  }
}

module.exports = new CategoryService();
