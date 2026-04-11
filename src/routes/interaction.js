const express = require("express");
const router = express.Router();
const interactionController = require("../controller/interactionController");

/**
 * @swagger
 * /api/posts/{id}/like:
 *   post:
 *     summary: Toggle like on a post
 *     tags: [Interactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_identifier]
 *             properties:
 *               user_identifier:
 *                 type: string
 *                 description: IP address or external user identifier
 *               user_id:
 *                 type: integer
 *                 description: Registered user ID if available
 *     responses:
 *       200:
 *         description: Like toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Server error
 */
router.post("/:id/like", interactionController.toggleLike);

/**
 * @swagger
 * /api/posts/{id}/likes:
 *   get:
 *     summary: Get like count and current like status
 *     tags: [Interactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Post ID
 *       - in: query
 *         name: user_identifier
 *         schema:
 *           type: string
 *         description: Optional identifier to check whether the user has liked the post
 *     responses:
 *       200:
 *         description: Like information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Server error
 */
router.get("/:id/likes", interactionController.getLikes);

/**
 * @swagger
 * /api/posts/{id}/comments:
 *   post:
 *     summary: Create a comment on a post
 *     tags: [Interactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [author_name, author_email, content]
 *             properties:
 *               author_name:
 *                 type: string
 *               author_email:
 *                 type: string
 *                 format: email
 *               content:
 *                 type: string
 *               author_url:
 *                 type: string
 *               parent_id:
 *                 type: integer
 *               user_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Comment created successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post("/:id/comments", interactionController.createComment);

/**
 * @swagger
 * /api/posts/{id}/comments:
 *   get:
 *     summary: Get comments for a post
 *     tags: [Interactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Post ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [approved, pending, spam, trash]
 *         description: Filter comments by status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Maximum number of comments to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: Comments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Server error
 */
router.get("/:id/comments", interactionController.getComments);

module.exports = router;
