const express = require("express");
const {
  getAllPageContents,
  getPageContentByKey,
  upsertPageContent,
  deletePageContent,
} = require("../controller/pageContentController");

const router = express.Router();

/**
 * @swagger
 * /api/page-contents:
 *   get:
 *     summary: Get all page contents
 *     tags: [Page Contents]
 *     responses:
 *       200:
 *         description: Page contents retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       page_key:
 *                         type: string
 *                       title:
 *                         type: string
 *                       content:
 *                         type: object
 *                       status:
 *                         type: string
 *       500:
 *         description: Server error
 */
router.get("/", getAllPageContents);

/**
 * @swagger
 * /api/page-contents/{key}:
 *   get:
 *     summary: Get page content by key
 *     tags: [Page Contents]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Page key (e.g., griya-quran, program-pengajar, pendaftaran)
 *     responses:
 *       200:
 *         description: Page content retrieved successfully
 *       404:
 *         description: Page content not found
 *       500:
 *         description: Server error
 */
router.get("/:key", getPageContentByKey);

/**
 * @swagger
 * /api/page-contents:
 *   post:
 *     summary: Create or update page content
 *     tags: [Page Contents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - page_key
 *               - title
 *               - content
 *             properties:
 *               page_key:
 *                 type: string
 *                 description: Unique page key
 *               title:
 *                 type: string
 *                 description: Page title
 *               content:
 *                 type: object
 *                 description: JSON content of the page
 *               status:
 *                 type: string
 *                 enum: [publish, draft]
 *                 default: publish
 *     responses:
 *       200:
 *         description: Page content updated successfully
 *       201:
 *         description: Page content created successfully
 *       400:
 *         description: Invalid data
 *       500:
 *         description: Server error
 */
router.post("/", upsertPageContent);

/**
 * @swagger
 * /api/page-contents/{key}:
 *   delete:
 *     summary: Delete page content
 *     tags: [Page Contents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Page key
 *     responses:
 *       200:
 *         description: Page content deleted successfully
 *       404:
 *         description: Page content not found
 *       500:
 *         description: Server error
 */
router.delete("/:key", deletePageContent);

module.exports = router;
