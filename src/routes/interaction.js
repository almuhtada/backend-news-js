const express = require("express");
const router = express.Router();
const interactionController = require("../controller/interactionController");

/**
 * @route   POST /api/posts/:id/like
 * @desc    Toggle like on a post (like/unlike)
 * @access  Public
 * @body    { user_identifier: string (IP or user ID), user_id?: number }
 */
router.post("/:id/like", interactionController.toggleLike);

/**
 * @route   GET /api/posts/:id/likes
 * @desc    Get like count and status for a post
 * @access  Public
 * @query   user_identifier?: string (to check if user has liked)
 */
router.get("/:id/likes", interactionController.getLikes);

/**
 * @route   POST /api/posts/:id/comments
 * @desc    Create a new comment on a post
 * @access  Public
 * @body    { author_name, author_email, content, author_url?, parent_id?, user_id? }
 */
router.post("/:id/comments", interactionController.createComment);

/**
 * @route   GET /api/posts/:id/comments
 * @desc    Get comments for a post
 * @access  Public
 * @query   status?: 'approved'|'pending'|'spam'|'trash', limit?: number, offset?: number
 */
router.get("/:id/comments", interactionController.getComments);

module.exports = router;
