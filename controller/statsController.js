const { Post, Category, PostCategory, PostLike, Comment } = require("../schema");
const sequelize = require("../config/database");

/**
 * Get category engagement statistics
 * GET /api/stats/category-engagement
 */
exports.getCategoryEngagement = async (req, res) => {
  try {
    // Get all posts with their categories, likes count, and comments count
    const posts = await Post.findAll({
      where: { status: "publish" },
      attributes: [
        "id",
        "views",
        [
          sequelize.literal(
            `(SELECT COUNT(*) FROM post_likes WHERE post_likes.post_id = Post.id)`
          ),
          "likes_count",
        ],
        [
          sequelize.literal(
            `(SELECT COUNT(*) FROM comments WHERE comments.post_id = Post.id AND comments.status = 'approved')`
          ),
          "comments_count",
        ],
      ],
      include: [
        {
          model: Category,
          as: "categories",
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
    });

    // Aggregate stats by category
    const categoryStats = {};

    posts.forEach((post) => {
      const likesCount = parseInt(post.getDataValue("likes_count")) || 0;
      const commentsCount = parseInt(post.getDataValue("comments_count")) || 0;
      const views = post.views || 0;

      post.categories?.forEach((category) => {
        if (!categoryStats[category.name]) {
          categoryStats[category.name] = {
            category: category.name,
            views: 0,
            likes: 0,
            comments: 0,
          };
        }

        categoryStats[category.name].views += views;
        categoryStats[category.name].likes += likesCount;
        categoryStats[category.name].comments += commentsCount;
      });
    });

    // Convert to array and sort by views
    const result = Object.values(categoryStats).sort(
      (a, b) => b.views - a.views
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error getting category engagement:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get category distribution (article count per category)
 * GET /api/stats/category-distribution
 */
exports.getCategoryDistribution = async (req, res) => {
  try {
    const categories = await Category.findAll({
      attributes: [
        "id",
        "name",
        [
          sequelize.literal(
            `(SELECT COUNT(*) FROM post_categories WHERE post_categories.category_id = Category.id)`
          ),
          "post_count",
        ],
      ],
    });

    const result = categories
      .map((cat) => ({
        name: cat.name,
        value: parseInt(cat.getDataValue("post_count")) || 0,
      }))
      .filter((cat) => cat.value > 0) // Only include categories with posts
      .sort((a, b) => b.value - a.value);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error getting category distribution:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
