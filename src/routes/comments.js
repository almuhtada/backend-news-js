const express = require("express");
const router = express.Router();
const interactionController = require("../controller/interactionController");

/**
 * @swagger
 * /api/comments:
 *   get:
 *     summary: Get all comments
 *     tags: [Comments]
 *     description: Returns all comments for dashboard management.
 *     parameters:
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
router.get("/", interactionController.getAllComments);
router.post("/scan-gambling", interactionController.scanGamblingComments);
router.post("/mark-spam", interactionController.markAsSpam);
router.delete("/spam", interactionController.deleteSpamComments);

module.exports = router;
