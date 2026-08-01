const postService = require("../services/post.service");
const { ok, created, paginated, asyncHandler } = require("../utils");

/**
 * Generate AI summary from text content
 */
exports.summarizeText = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const summary = await postService.summarizeText(content);
  return ok(res, { summary }, "Summary generated successfully");
});

/**
 * Get all posts with pagination and filters
 */
exports.getAllPosts = asyncHandler(async (req, res) => {
  const { posts, count, page, limit } = await postService.getAllPosts(req.query);
  return paginated(res, posts, count, page, limit);
});

/**
 * Get single post by ID
 */
exports.getPostById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const post = await postService.getPostById(id);
  return ok(res, post, "Post retrieved successfully");
});

/**
 * Get single post by slug
 */
exports.getPostBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  // Kirim user identifier agar view log bisa di-track
  const userIdentifier =
    req.headers["x-user-identifier"] ||
    req.ip ||
    req.connection?.remoteAddress ||
    "anonymous";
  const userId = req.user?.id || null;

  const post = await postService.getPostBySlug(slug, { userIdentifier, userId });
  return ok(res, post, "Post retrieved successfully");
});

/**
 * Create new post
 */
exports.createPost = asyncHandler(async (req, res) => {
  const post = await postService.createPost(req.body, req.user);
  return created(res, post, "Post created successfully");
});

/**
 * Update post
 */
exports.updatePost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const post = await postService.updatePost(id, req.body, req.user);
  return ok(res, post, "Post updated successfully");
});

/**
 * Delete post
 */
exports.deletePost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await postService.deletePost(id);
  return ok(res, null, "Post deleted successfully");
});

/**
 * Get popular posts
 */
exports.getPopularPosts = asyncHandler(async (req, res) => {
  const { limit = 5 } = req.query;
  const posts = await postService.getPopularPosts(limit);
  return ok(res, posts, "Popular posts retrieved successfully");
});

/**
 * Get recent posts
 */
exports.getRecentPosts = asyncHandler(async (req, res) => {
  const { limit = 5 } = req.query;
  const posts = await postService.getRecentPosts(limit);
  return ok(res, posts, "Recent posts retrieved successfully");
});

/**
 * Get viral/trending posts
 */
exports.getTrendingPosts = asyncHandler(async (req, res) => {
  const { limit = 5, hours = 24 } = req.query;
  const posts = await postService.getTrendingPosts(limit, hours);
  return ok(res, posts, "Trending posts retrieved successfully");
});
