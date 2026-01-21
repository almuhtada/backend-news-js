const express = require("express");
const {
  getAllTags,
  createTag,
  updateTag,
  deleteTag,
} = require("../controller/tagController");

const router = express.Router();

/**
 * @swagger
 * /api/tags:
 *   get:
 *     summary: Get all tags
 *     tags: [Tags]
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
 *           maximum: 100
 *         description: Number of tags per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by tag name
 *     responses:
 *       200:
 *         description: Tags retrieved successfully
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
 *                       name:
 *                         type: string
 *                       slug:
 *                         type: string
 *                       post_count:
 *                         type: integer
 *       500:
 *         description: Server error
 */
router.get("/", getAllTags);

/**
 * @swagger
 * /api/tags:
 *   post:
 *     summary: Create new tag
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tag name
 *               slug:
 *                 type: string
 *                 description: Tag slug (auto-generated if not provided)
 *     responses:
 *       201:
 *         description: Tag created successfully
 *       400:
 *         description: Tag already exists
 *       500:
 *         description: Server error
 */
router.post("/", createTag);

/**
 * @swagger
 * /api/tags/{id}:
 *   put:
 *     summary: Update tag
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Tag ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tag updated successfully
 *       404:
 *         description: Tag not found
 *       500:
 *         description: Server error
 */
router.put("/:id", updateTag);

/**
 * @swagger
 * /api/tags/{id}:
 *   delete:
 *     summary: Delete tag
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Tag ID
 *     responses:
 *       200:
 *         description: Tag deleted successfully
 *       404:
 *         description: Tag not found
 *       500:
 *         description: Server error
 */
router.delete("/:id", deleteTag);

module.exports = router;
