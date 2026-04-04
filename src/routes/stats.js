const express = require("express");
const router = express.Router();
const statsController = require("../controller/statsController");

/**
 * @route   GET /api/stats/category-engagement
 * @desc    Get category engagement statistics (views, likes, comments per category)
 * @access  Public
 */
router.get("/category-engagement", statsController.getCategoryEngagement);

/**
 * @route   GET /api/stats/category-distribution
 * @desc    Get category distribution (article count per category)
 * @access  Public
 */
router.get("/category-distribution", statsController.getCategoryDistribution);

module.exports = router;
