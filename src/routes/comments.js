const express = require("express");
const router = express.Router();
const interactionController = require("../controller/interactionController");

/**
 * @route   GET /api/comments
 * @desc    Get all comments (for dashboard)
 * @access  Public
 * @query   status?: 'approved'|'pending'|'spam'|'trash', limit?: number, offset?: number
 */
router.get("/", interactionController.getAllComments);

module.exports = router;
