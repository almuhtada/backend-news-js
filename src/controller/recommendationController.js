const recommendationService = require("../services/recommendation.service");
const { Post, Category } = require("../schema");
const { ok, asyncHandler, NotFoundError } = require("../utils");

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER — Ekstrak user_identifier dari request
   Priority: user_id (logged-in) → X-User-Identifier header → IP address
═══════════════════════════════════════════════════════════════════════════ */
function getUserIdentifier(req) {
  if (req.user && req.user.id) {
    return `user_${req.user.id}`;
  }
  return (
    req.headers["x-user-identifier"] ||
    req.ip ||
    req.connection?.remoteAddress ||
    "anonymous"
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/recommendations/related/:postId
   Related posts untuk DETAIL NEWS page.
   Bobot: kategori ~65% · tag ~25% · author ~10% · fallback trending
───────────────────────────────────────────────────────────────────────── */
exports.getRelatedPosts = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { limit = 6 } = req.query;

  const post = await Post.findOne({ where: { uuid: postId } });
  if (!post) throw new NotFoundError("Post not found");

  const posts = await recommendationService.getRelatedPosts({
    postId: post.id,
    limit,
  });

  return ok(res, posts, "Related posts retrieved successfully");
});

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/recommendations/home
   Personalized / trending posts untuk HOME page.
   Return field `personalized: true/false` agar FE bisa tampilkan label.
───────────────────────────────────────────────────────────────────────── */
exports.getRecommendedPosts = asyncHandler(async (req, res) => {
  const { limit = 8 } = req.query;
  const userIdentifier = getUserIdentifier(req);
  const userId = req.user?.id || null;

  const result = await recommendationService.getRecommendedPosts({
    userIdentifier,
    userId,
    limit,
  });

  return ok(res, result, "Recommended posts retrieved successfully");
});

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/recommendations/trending-category/:categoryId
   Trending posts dalam satu kategori — widget sidebar detail page.
───────────────────────────────────────────────────────────────────────── */
exports.getTrendingByCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const { limit = 5, hours = 48, excludePostId } = req.query;

  const category = await Category.findOne({ where: { uuid: categoryId } });
  if (!category) throw new NotFoundError("Category not found");

  const posts = await recommendationService.getTrendingByCategory({
    categoryId: category.id,
    excludePostId: excludePostId ? parseInt(excludePostId) : null,
    limit,
    hours,
  });

  return ok(res, posts, "Trending posts by category retrieved successfully");
});

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/recommendations/hot-topics
   Hot tags trending dalam window waktu — widget "Topik Hangat" di Home.
───────────────────────────────────────────────────────────────────────── */
exports.getHotTopics = asyncHandler(async (req, res) => {
  const { limit = 10, hours = 24 } = req.query;

  const topics = await recommendationService.getHotTopics({ limit, hours });
  return ok(res, topics, "Hot topics retrieved successfully");
});

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/recommendations/track-view
   Track view log — dipanggil FE saat user membuka artikel.
   Fire-and-forget: selalu return 200 meski gagal simpan.
───────────────────────────────────────────────────────────────────────── */
exports.trackView = asyncHandler(async (req, res) => {
  const { postId } = req.body;
  const userIdentifier = getUserIdentifier(req);
  const userId = req.user?.id || null;

  if (postId) {
    const post = await Post.findOne({ where: { uuid: postId }, attributes: ["id"] });
    if (post) {
      recommendationService
        .trackView({ postId: post.id, userIdentifier, userId })
        .catch(() => {});
    }
  }

  return ok(res, null, "View tracked");
});

/* ─────────────────────────────────────────────────────────────────────────
   POST   /api/recommendations/bookmark/:postId  — toggle bookmark
   GET    /api/recommendations/bookmark/:postId  — cek status bookmark
   GET    /api/recommendations/bookmarks         — daftar bookmark user
   Semua endpoint bookmark wajib login (authenticate middleware di route)
───────────────────────────────────────────────────────────────────────── */
exports.toggleBookmark = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;

  const post = await Post.findOne({ where: { uuid: postId } });
  if (!post) throw new NotFoundError("Post not found");

  const result = await recommendationService.toggleBookmark({
    userId,
    postId: post.id,
  });

  const message = result.bookmarked
    ? "Artikel disimpan ke bookmark"
    : "Bookmark dihapus";
  return ok(res, result, message);
});

exports.getBookmarkStatus = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;

  const post = await Post.findOne({ where: { uuid: postId } });
  if (!post) throw new NotFoundError("Post not found");

  const result = await recommendationService.getBookmarkStatus({
    userId,
    postId: post.id,
  });

  return ok(res, result, "Bookmark status retrieved");
});

exports.getUserBookmarks = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit = 20, offset = 0 } = req.query;

  const result = await recommendationService.getUserBookmarks({
    userId,
    limit,
    offset,
  });

  return ok(res, result, "User bookmarks retrieved successfully");
});
