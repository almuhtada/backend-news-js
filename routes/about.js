const express = require("express");
const router = express.Router();
const aboutController = require("../controller/aboutController");

/**
 * @swagger
 * /api/about:
 *   get:
 *     summary: Get all about sections
 *     tags: [About]
 *     responses:
 *       200:
 *         description: About sections retrieved successfully
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
 *                       key:
 *                         type: string
 *                       title:
 *                         type: string
 *                       content:
 *                         type: string
 *                       image:
 *                         type: string
 *                       order:
 *                         type: integer
 *       500:
 *         description: Server error
 */
router.get("/", aboutController.getAllAboutSections);

/**
 * @swagger
 * /api/about/{key}:
 *   get:
 *     summary: Get about section by key
 *     tags: [About]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Section key (e.g., 'vision', 'mission', 'history')
 *     responses:
 *       200:
 *         description: About section retrieved successfully
 *       404:
 *         description: Section not found
 *       500:
 *         description: Server error
 */
router.get("/:key", aboutController.getAboutSectionByKey);

/**
 * @swagger
 * /api/about:
 *   post:
 *     summary: Create or update about section (upsert)
 *     tags: [About]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - key
 *               - title
 *               - content
 *             properties:
 *               key:
 *                 type: string
 *                 description: Unique section key
 *               title:
 *                 type: string
 *                 description: Section title
 *               content:
 *                 type: string
 *                 description: Section content (HTML)
 *               image:
 *                 type: string
 *                 description: Section image URL
 *               order:
 *                 type: integer
 *                 description: Display order
 *     responses:
 *       200:
 *         description: About section created/updated successfully
 *       400:
 *         description: Invalid data
 *       500:
 *         description: Server error
 */
router.post("/", aboutController.upsertAboutSection);

/**
 * @swagger
 * /api/about/{id}:
 *   delete:
 *     summary: Delete about section
 *     tags: [About]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: About section ID
 *     responses:
 *       200:
 *         description: About section deleted successfully
 *       404:
 *         description: Section not found
 *       500:
 *         description: Server error
 */
router.delete("/:id", aboutController.deleteAboutSection);

module.exports = router;
