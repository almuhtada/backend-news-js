const express = require("express");
const {
  getAllPosts,
  getPostByUuid,
  getPostBySlug,
  createPost,
  updatePost,
  deletePost,
  getPopularPosts,
  getRecentPosts,
  getTrendingPosts,
  summarizeText,
  submitRevision,
  startReview,
  requestRevision,
  approveArticle,
  getArticleActivity,
} = require("../controller/postController");
const { authenticate, authorize } = require("../middleware/auth");

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
 *           enum: [draft, publish, archived]
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
 * /api/posts/uuid/{uuid}:
 *   get:
 *     summary: Get post by ID
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Public post UUID
 *     responses:
 *       200:
 *         description: Post retrieved successfully
 *       404:
 *         description: Post not found
 *       500:
 *         description: Server error
 */
router.get("/uuid/:uuid", getPostByUuid);

router.post("/:uuid/submit-revision", authenticate, submitRevision);
router.post("/:uuid/start-review", authenticate, startReview);
router.post("/:uuid/request-revision", authenticate, requestRevision);
router.post("/:uuid/approve", authenticate, approveArticle);
router.get("/:uuid/activity", authenticate, getArticleActivity);

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

// Protected routes
router.post("/", authenticate, createPost);
router.put("/:id", authenticate, updatePost);
router.delete("/:id", authenticate, authorize("administrator"), deletePost);

module.exports = router;
