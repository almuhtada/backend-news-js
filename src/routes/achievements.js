const express = require("express");
const router = express.Router();
const achievementController = require("../controller/achievementController");

/**
 * @swagger
 * /api/achievements:
 *   get:
 *     summary: Get all achievements
 *     tags: [Achievements]
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
 *         description: Achievements retrieved successfully
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
 *                       image:
 *                         type: string
 *                       date:
 *                         type: string
 *                         format: date
 *       500:
 *         description: Server error
 */
router.get("/", achievementController.getAllAchievements);

/**
 * @swagger
 * /api/achievements/{id}:
 *   get:
 *     summary: Get achievement by ID
 *     tags: [Achievements]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Achievement ID
 *     responses:
 *       200:
 *         description: Achievement retrieved successfully
 *       404:
 *         description: Achievement not found
 *       500:
 *         description: Server error
 */
router.get("/:id", achievementController.getAchievementById);

/**
 * @swagger
 * /api/achievements:
 *   post:
 *     summary: Create new achievement
 *     tags: [Achievements]
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
 *                 description: Achievement title
 *               description:
 *                 type: string
 *                 description: Achievement description
 *               image:
 *                 type: string
 *                 description: Achievement image URL
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Achievement date
 *     responses:
 *       201:
 *         description: Achievement created successfully
 *       400:
 *         description: Invalid data
 *       500:
 *         description: Server error
 */
router.post("/", achievementController.createAchievement);

/**
 * @swagger
 * /api/achievements/{id}:
 *   put:
 *     summary: Update achievement
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Achievement ID
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
 *               image:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Achievement updated successfully
 *       404:
 *         description: Achievement not found
 *       500:
 *         description: Server error
 */
router.put("/:id", achievementController.updateAchievement);

/**
 * @swagger
 * /api/achievements/{id}:
 *   delete:
 *     summary: Delete achievement
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Achievement ID
 *     responses:
 *       200:
 *         description: Achievement deleted successfully
 *       404:
 *         description: Achievement not found
 *       500:
 *         description: Server error
 */
router.delete("/:id", achievementController.deleteAchievement);

module.exports = router;
