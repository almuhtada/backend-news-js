const express = require("express");
const router = express.Router();
const authorController = require("../controller/authorController");

/**
 * @swagger
 * /api/authors/{username}:
 *   get:
 *     summary: Get author details and their posts
 *     tags: [Authors]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Author username
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
 *     responses:
 *       200:
 *         description: Author details and posts retrieved successfully
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
 *                     author:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         username:
 *                           type: string
 *                         display_name:
 *                           type: string
 *                         email:
 *                           type: string
 *                     posts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Post'
 *                 pagination:
 *                   type: object
 *       404:
 *         description: Author not found
 *       500:
 *         description: Server error
 */
router.get("/:username", authorController.getAuthorPosts);

module.exports = router;
