const express = require("express");
const {
  getAllSettings,
  getSettingByKey,
  getSettingsByGroup,
  updateSetting,
  bulkUpdateSettings,
  saveAllSettings,
  initializeSettings,
} = require("../controller/settingController");

const router = express.Router();

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Get all settings
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
 */
router.get("/", getAllSettings);

/**
 * @swagger
 * /api/settings/initialize:
 *   post:
 *     summary: Initialize default settings
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Settings initialized
 */
router.post("/initialize", initializeSettings);

/**
 * @swagger
 * /api/settings/save:
 *   post:
 *     summary: Save all settings from form
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               siteName:
 *                 type: string
 *               tagline:
 *                 type: string
 *               description:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               facebook:
 *                 type: string
 *               instagram:
 *                 type: string
 *               youtube:
 *                 type: string
 *               twitter:
 *                 type: string
 *     responses:
 *       200:
 *         description: Settings saved successfully
 */
router.post("/save", saveAllSettings);

/**
 * @swagger
 * /api/settings/bulk:
 *   put:
 *     summary: Bulk update settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - settings
 *             properties:
 *               settings:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     key:
 *                       type: string
 *                     value:
 *                       type: string
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.put("/bulk", bulkUpdateSettings);

/**
 * @swagger
 * /api/settings/group/{group}:
 *   get:
 *     summary: Get settings by group
 *     tags: [Settings]
 *     parameters:
 *       - in: path
 *         name: group
 *         required: true
 *         schema:
 *           type: string
 *         description: Setting group (general, contact, social)
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
 */
router.get("/group/:group", getSettingsByGroup);

/**
 * @swagger
 * /api/settings/{key}:
 *   get:
 *     summary: Get setting by key
 *     tags: [Settings]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Setting key
 *     responses:
 *       200:
 *         description: Setting retrieved successfully
 *       404:
 *         description: Setting not found
 */
router.get("/:key", getSettingByKey);

/**
 * @swagger
 * /api/settings/{key}:
 *   put:
 *     summary: Update a setting
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Setting key
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - value
 *             properties:
 *               value:
 *                 type: string
 *     responses:
 *       200:
 *         description: Setting updated successfully
 */
router.put("/:key", updateSetting);

module.exports = router;
