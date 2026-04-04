const express = require("express");
const router = express.Router();
const publicationController = require("../controller/publicationController");

/**
 * @swagger
 * /api/publications:
 *   get:
 *     summary: Get all publications
 *     tags: [Publications]
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
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Publications retrieved successfully
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
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       file_url:
 *                         type: string
 *                       cover_image:
 *                         type: string
 *                       published_date:
 *                         type: string
 *                         format: date
 *       500:
 *         description: Server error
 */
router.get("/", publicationController.getAllPublications);

/**
 * @swagger
 * /api/publications/{id}:
 *   get:
 *     summary: Get publication by ID
 *     tags: [Publications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Publication ID
 *     responses:
 *       200:
 *         description: Publication retrieved successfully
 *       404:
 *         description: Publication not found
 *       500:
 *         description: Server error
 */
router.get("/:id", publicationController.getPublicationById);

/**
 * @swagger
 * /api/publications:
 *   post:
 *     summary: Create new publication
 *     tags: [Publications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 description: Publication title
 *               description:
 *                 type: string
 *                 description: Publication description
 *               file_url:
 *                 type: string
 *                 description: Publication file URL (PDF, etc.)
 *               cover_image:
 *                 type: string
 *                 description: Cover image URL
 *               published_date:
 *                 type: string
 *                 format: date
 *                 description: Publication date
 *     responses:
 *       201:
 *         description: Publication created successfully
 *       400:
 *         description: Invalid data
 *       500:
 *         description: Server error
 */
router.post("/", publicationController.createPublication);

/**
 * @swagger
 * /api/publications/{id}:
 *   put:
 *     summary: Update publication
 *     tags: [Publications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Publication ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               file_url:
 *                 type: string
 *               cover_image:
 *                 type: string
 *               published_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Publication updated successfully
 *       404:
 *         description: Publication not found
 *       500:
 *         description: Server error
 */
router.put("/:id", publicationController.updatePublication);

/**
 * @swagger
 * /api/publications/{id}:
 *   delete:
 *     summary: Delete publication
 *     tags: [Publications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Publication ID
 *     responses:
 *       200:
 *         description: Publication deleted successfully
 *       404:
 *         description: Publication not found
 *       500:
 *         description: Server error
 */
router.delete("/:id", publicationController.deletePublication);

module.exports = router;
