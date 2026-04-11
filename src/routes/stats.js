const express = require("express");
const router = express.Router();
const statsController = require("../controller/statsController");

/**
 * @swagger
 * /api/stats/category-engagement:
 *   get:
 *     summary: Get category engagement statistics
 *     tags: [Stats]
 *     description: Returns engagement metrics per category such as views, likes, and comments.
 *     responses:
 *       200:
 *         description: Category engagement statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Server error
 */
router.get("/dashboard", statsController.getDashboardStats);
router.get("/category-engagement", statsController.getCategoryEngagement);

/**
 * @swagger
 * /api/stats/category-distribution:
 *   get:
 *     summary: Get category distribution
 *     tags: [Stats]
 *     description: Returns article counts grouped by category.
 *     responses:
 *       200:
 *         description: Category distribution retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Server error
 */
router.get("/category-distribution", statsController.getCategoryDistribution);

module.exports = router;
