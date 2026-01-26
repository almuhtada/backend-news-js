const express = require("express");
const {
  getAllPosts,
  getPostById,
  getPostBySlug,
  createPost,
  updatePost,
  deletePost,
  getPopularPosts,
  getRecentPosts,
  getTrendingPosts,
  summarizeText,
} = require("../controller/postController");

const router = express.Router();

/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: Get all posts with pagination and filters
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: Number of posts per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category slug
 *       - in: query
 *         name: author
 *         schema:
 *           type: string
 *         description: Filter by author ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and content
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [publish, draft, pending]
 *         description: Filter by post status
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalPosts:
 *                       type: integer
 *                     postsPerPage:
 *                       type: integer
 *       500:
 *         description: Server error
 */
router.get("/", getAllPosts);

/**
 * @swagger
 * /api/posts/popular:
 *   get:
 *     summary: Get popular posts
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 10
 *         description: Number of posts to return
 *     responses:
 *       200:
 *         description: Popular posts retrieved successfully
 *       500:
 *         description: Server error
 */
router.get("/popular", getPopularPosts);

/**
 * @swagger
 * /api/posts/trending:
 *   get:
 *     summary: Get trending/viral posts (based on engagement)
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 10
 *         description: Number of posts to return
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 168
 *           default: 24
 *         description: Time window in hours
 *     responses:
 *       200:
 *         description: Trending posts retrieved successfully
 *       500:
 *         description: Server error
 */
router.get("/trending", getTrendingPosts);

/**
 * @swagger
 * /api/posts/summarize:
 *   post:
 *     summary: Generate AI summary from text
 *     tags: [Posts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Text content to summarize
 *     responses:
 *       200:
 *         description: Summary generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: string
 *       400:
 *         description: Content is required
 *       500:
 *         description: Server error
 */
router.post("/summarize", summarizeText);

/**
 * @swagger
 * /api/posts/recent:
 *   get:
 *     summary: Get recent posts
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 10
 *         description: Number of posts to return
 *     responses:
 *       200:
 *         description: Recent posts retrieved successfully
 *       500:
 *         description: Server error
 */
router.get("/recent", getRecentPosts);

/**
 * @swagger
 * /api/posts/id/{id}:
 *   get:
 *     summary: Get post by ID
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post retrieved successfully
 *       404:
 *         description: Post not found
 *       500:
 *         description: Server error
 */
router.get("/id/:id", getPostById);

/**
 * @swagger
 * /api/posts/{slug}:
 *   get:
 *     summary: Get post by slug
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Post slug
 *     responses:
 *       200:
 *         description: Post retrieved successfully
 *       404:
 *         description: Post not found
 *       500:
 *         description: Server error
 */
router.get("/:slug", getPostBySlug);

// Protected routes (uncomment when auth middleware is ready)
// const { authenticate, isAdmin } = require("../middleware/auth");
// router.post("/", authenticate, createPost);
// router.put("/:id", authenticate, updatePost);
// router.delete("/:id", authenticate, isAdmin, deletePost);

// Temporary routes without auth (for testing)
router.post("/", createPost);
router.put("/:id", updatePost);
router.delete("/:id", deletePost);

module.exports = router;
