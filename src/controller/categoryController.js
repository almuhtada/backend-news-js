const categoryService = require("../services/category.service");
const { ok, created, paginated, asyncHandler } = require("../utils");

/**
 * Get all categories
 */
exports.getAllCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.getAllCategories();
  return ok(res, categories, "Categories retrieved successfully");
});

/**
 * Get single category by slug
 */
exports.getCategoryBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const category = await categoryService.getCategoryBySlug(slug);
  return ok(res, category, "Category retrieved successfully");
});

/**
 * Create category
 */
exports.createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  return created(res, category, "Category created successfully");
});

/**
 * Update category
 */
exports.updateCategory = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const category = await categoryService.updateCategory(uuid, req.body);
  return ok(res, category, "Category updated successfully");
});

/**
 * Delete category
 */
exports.deleteCategory = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  await categoryService.deleteCategory(uuid);
  return ok(res, null, "Category deleted successfully");
});

/**
 * Get posts by category
 */
exports.getPostsByCategory = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const { category, posts, count, page, limit } =
    await categoryService.getPostsByCategory(slug, req.query);

  return paginated(res, posts, count, page, limit, { category });
});
