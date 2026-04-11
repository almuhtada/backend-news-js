const { Post, Category, PostLike, Comment } = require("../schema");
const sequelize = require("../config/database");
const { ok, serverError } = require("../shared/http/response");

// Simple in-memory cache (TTL: 2 menit)
const cache = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 2 menit

function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

function clearDashboardCache() {
  cache.delete("dashboard");
}

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

    return ok(res, result);
  } catch (error) {
    console.error("Error getting category engagement:", error);
    return serverError(res, error, "Internal server error");
  }
};

/**
 * Get all dashboard data in one request (cached)
 * GET /api/stats/dashboard
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const cached = getCache("dashboard");
    if (cached) return ok(res, cached);

    // Jalankan semua query secara paralel
    const [
      summaryRows,
      topArticles,
      lastNews,
      teamProductivity,
      recentComments,
      categoryEngagement,
      categoryDistribution,
      viewsPerDay,
    ] = await Promise.all([
      // 1. Summary: total views, total articles, total comments
      sequelize.query(
        `SELECT
           SUM(p.views)                                      AS total_views,
           COUNT(DISTINCT p.id)                              AS total_articles,
           (SELECT COUNT(*) FROM comments WHERE status NOT IN ('spam', 'trash')) AS total_comments
         FROM posts p
         WHERE p.status = 'publish'`,
        { type: sequelize.QueryTypes.SELECT }
      ),

      // 2. Top 5 artikel by views
      sequelize.query(
        `SELECT p.id, p.title, p.views AS view_count
         FROM posts p
         WHERE p.status = 'publish'
         ORDER BY p.views DESC
         LIMIT 5`,
        { type: sequelize.QueryTypes.SELECT }
      ),

      // 3. 5 berita terbaru + author + kategori pertama
      sequelize.query(
        `SELECT p.id, p.title, p.status, p.createdAt AS created_at,
                u.username AS author_username, u.display_name AS author_name,
                (SELECT c.name FROM categories c
                 INNER JOIN post_categories pc ON pc.category_id = c.id
                 WHERE pc.post_id = p.id LIMIT 1) AS category
         FROM posts p
         LEFT JOIN users u ON u.id = p.author_id
         WHERE p.status = 'publish'
         ORDER BY p.createdAt DESC
         LIMIT 5`,
        { type: sequelize.QueryTypes.SELECT }
      ),

      // 4. Team productivity: top 5 berdasarkan jumlah artikel + ambil role dari DB
      sequelize.query(
        `SELECT u.username, u.display_name, u.role, COUNT(p.id) AS total
         FROM posts p
         INNER JOIN users u ON u.id = p.author_id
         WHERE p.status = 'publish'
         GROUP BY u.id, u.username, u.display_name, u.role
         ORDER BY total DESC
         LIMIT 10`,
        { type: sequelize.QueryTypes.SELECT }
      ),

      // 5. 10 komentar terbaru (approved + pending, exclude spam/trash)
      sequelize.query(
        `SELECT c.id, c.author_name, c.content, c.createdAt AS created_at,
                p.title AS post_title
         FROM comments c
         LEFT JOIN posts p ON p.id = c.post_id
         WHERE c.status NOT IN ('spam', 'trash')
         ORDER BY c.createdAt DESC
         LIMIT 10`,
        { type: sequelize.QueryTypes.SELECT }
      ),

      // 6. Category engagement (views, likes, comments per kategori)
      sequelize.query(
        `SELECT cat.name AS category,
                SUM(p.views)                                                   AS views,
                COUNT(DISTINCT pl.id)                                          AS likes,
                COUNT(DISTINCT cm.id)                                          AS comments
         FROM categories cat
         INNER JOIN post_categories pc ON pc.category_id = cat.id
         INNER JOIN posts p            ON p.id = pc.post_id AND p.status = 'publish'
         LEFT  JOIN post_likes pl      ON pl.post_id = p.id
         LEFT  JOIN comments cm        ON cm.post_id = p.id AND cm.status NOT IN ('spam', 'trash')
         GROUP BY cat.id, cat.name
         ORDER BY views DESC`,
        { type: sequelize.QueryTypes.SELECT }
      ),

      // 7. Category distribution (jumlah artikel per kategori)
      sequelize.query(
        `SELECT cat.name, COUNT(pc.post_id) AS value
         FROM categories cat
         INNER JOIN post_categories pc ON pc.category_id = cat.id
         INNER JOIN posts p            ON p.id = pc.post_id AND p.status = 'publish'
         GROUP BY cat.id, cat.name
         HAVING value > 0
         ORDER BY value DESC`,
        { type: sequelize.QueryTypes.SELECT }
      ),

      // 8. Views per tanggal publish — semua waktu, tanpa filter tanggal
      sequelize.query(
        `SELECT DATE(p.published_at) AS date, SUM(p.views) AS views
         FROM posts p
         WHERE p.status = 'publish'
           AND p.published_at IS NOT NULL
           AND p.views > 0
         GROUP BY DATE(p.published_at)
         ORDER BY date ASC`,
        { type: sequelize.QueryTypes.SELECT }
      ),
    ]);

    // Konversi langsung — frontend (ViewsChart) yang handle filter range-nya
    const viewsData = viewsPerDay.map((r) => ({
      date: r.date?.toISOString?.().split("T")[0] ?? String(r.date),
      views: Number(r.views) || 0,
    }));

    const summary = summaryRows[0] || {};

    const result = {
      stats: {
        totalViews: Number(summary.total_views) || 0,
        totalArticles: Number(summary.total_articles) || 0,
        totalComments: Number(summary.total_comments) || 0,
      },
      topArticles: topArticles.map((a) => ({
        id: a.id,
        title: a.title,
        views: Number(a.view_count) || 0,
      })),
      lastNews: lastNews.map((n) => ({
        id: n.id,
        title: n.title,
        author: n.author_name || n.author_username || "Unknown",
        category: n.category || "Uncategorized",
        status: n.status === "publish" ? "Published" : "Draft",
        createdAt: n.created_at,
      })),
      teamProductivity: teamProductivity.map((m, i) => ({
        id: i + 1,
        name: m.display_name || m.username,
        role: ["editor", "administrator"].includes(m.role) ? "Editor" : "Penulis",
        total: Number(m.total),
      })),
      recentComments: recentComments.map((c) => ({
        id: c.id,
        author: c.author_name,
        comment: c.content.length > 100 ? c.content.substring(0, 100) + "..." : c.content,
        article: c.post_title || "Unknown Article",
        createdAt: c.created_at,
      })),
      categoryEngagement: categoryEngagement.map((c) => ({
        category: c.category,
        views: Number(c.views) || 0,
        likes: Number(c.likes) || 0,
        comments: Number(c.comments) || 0,
      })),
      categoryDistribution: categoryDistribution.map((c) => ({
        name: c.name,
        value: Number(c.value) || 0,
      })),
      viewsData,
    };

    setCache("dashboard", result);
    return ok(res, result);
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    return serverError(res, error, "Internal server error");
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

    return ok(res, result);
  } catch (error) {
    console.error("Error getting category distribution:", error);
    return serverError(res, error, "Internal server error");
  }
};
