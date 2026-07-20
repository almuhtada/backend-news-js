const express = require("express");
const {
  getRelatedPosts,
  getRecommendedPosts,
  getTrendingByCategory,
  getHotTopics,
  trackView,
  toggleBookmark,
  getBookmarkStatus,
  getUserBookmarks,
} = require("../controller/recommendationController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

/* ─────────────────────────────────────────────────────────────────────────
   PUBLIC ENDPOINTS — tidak perlu login
───────────────────────────────────────────────────────────────────────── */

/**
 * @swagger
 * /api/recommendations/related/{postId}:
 *   get:
 *     summary: Get related posts for a given article (Detail News page)
 *     description: |
 *       Returns posts related to the given article using weighted strategy:
 *       - Same category (~65% of slots, highest priority)
 *       - Same tags (~25% of slots)
 *       - Same author (~10% of slots)
 *       - Fallback to trending if not enough results
 *     tags: [Recommendations]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the current article
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 6
 *         description: Max number of related posts to return
 *     responses:
 *       200:
 *         description: Related posts retrieved successfully
 *       404:
 *         description: Post not found
 */
router.get("/related/:postId", getRelatedPosts);

/**
 * @swagger
 * /api/recommendations/home:
 *   get:
 *     summary: Get personalized recommended posts for Home page
 *     description: |
 *       Returns personalized feed based on user's like history and bookmarks.
 *       Falls back to trending posts for anonymous users or users with no history.
 *       Response includes `personalized: true/false` flag.
 *       Pass X-User-Identifier header for anonymous user tracking.
 *     tags: [Recommendations]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 8
 *     responses:
 *       200:
 *         description: Recommended posts retrieved successfully
 */
router.get("/home", getRecommendedPosts);

/**
 * @swagger
 * /api/recommendations/trending-category/{categoryId}:
 *   get:
 *     summary: Get trending posts within a specific category
 *     description: Used for sidebar widget "Terpopuler di Kategori Ini" on Detail News page.
 *     tags: [Recommendations]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           default: 48
 *         description: Time window for trending calculation
 *       - in: query
 *         name: excludePostId
 *         schema:
 *           type: integer
 *         description: Exclude current post from results
 *     responses:
 *       200:
 *         description: Trending posts by category retrieved successfully
 */
router.get("/trending-category/:categoryId", getTrendingByCategory);

/**
 * @swagger
 * /api/recommendations/hot-topics:
 *   get:
 *     summary: Get hot/trending tags in a time window
 *     description: Returns tags most used in trending posts — for "Topik Hangat" widget.
 *     tags: [Recommendations]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           default: 24
 *     responses:
 *       200:
 *         description: Hot topics retrieved successfully
 */
router.get("/hot-topics", getHotTopics);

/**
 * @swagger
 * /api/recommendations/track-view:
 *   post:
 *     summary: Track article view for recommendation history
 *     description: |
 *       Fire-and-forget — always returns 200.
 *       Should be called when user opens an article.
 *       Pass X-User-Identifier header for anonymous user tracking.
 *     tags: [Recommendations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               postId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: View tracked (always succeeds)
 */
router.post("/track-view", trackView);

/* ─────────────────────────────────────────────────────────────────────────
   PROTECTED ENDPOINTS — wajib login
───────────────────────────────────────────────────────────────────────── */

/**
 * @swagger
 * /api/recommendations/bookmark/{postId}:
 *   post:
 *     summary: Toggle bookmark (save/unsave article)
 *     security:
 *       - bearerAuth: []
 *     tags: [Recommendations]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bookmark toggled successfully
 *       401:
 *         description: Unauthorized
 *   get:
 *     summary: Get bookmark status for a post
 *     security:
 *       - bearerAuth: []
 *     tags: [Recommendations]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bookmark status retrieved
 */
router.post("/bookmark/:postId", authenticate, toggleBookmark);
router.get("/bookmark/:postId", authenticate, getBookmarkStatus);

/**
 * @swagger
 * /api/recommendations/bookmarks:
 *   get:
 *     summary: Get all bookmarks for the logged-in user
 *     security:
 *       - bearerAuth: []
 *     tags: [Recommendations]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: User bookmarks retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/bookmarks", authenticate, getUserBookmarks);

module.exports = router;
