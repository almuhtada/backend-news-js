const express = require("express");
const { authenticate } = require("../middleware/auth");
const { scanContentType } = require("../controller/moderationController");

const router = express.Router();

/**
 * @swagger
 * /api/moderation/scan:
 *   post:
 *     summary: Scan satu jenis konten (komentar, berita, tag, kategori) untuk konten judi/spam
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [comment, post, tag, category]
 *           default: comment
 *         description: Jenis konten yang discan
 *     responses:
 *       200:
 *         description: Hasil scan konten judi/spam
 *       500:
 *         description: Server error
 */
router.post("/scan", authenticate, scanContentType);

module.exports = router;
