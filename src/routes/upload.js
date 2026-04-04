const express = require("express");
const upload = require("../middleware/upload");
const path = require("path");

const router = express.Router();

/**
 * @swagger
 * /api/upload/image:
 *   post:
 *     summary: Upload single image
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     filename:
 *                       type: string
 *                     url:
 *                       type: string
 *                     fullUrl:
 *                       type: string
 *                     size:
 *                       type: integer
 *       400:
 *         description: No file uploaded
 *       500:
 *         description: Server error
 */
router.post("/image", upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const imageUrl = `/uploads/images/${req.file.filename}`;

    res.json({
      success: true,
      message: "Image uploaded successfully",
      data: {
        filename: req.file.filename,
        url: imageUrl,
        fullUrl: `${req.protocol}://${req.get("host")}${imageUrl}`,
        size: req.file.size,
      },
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading image",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/upload/images:
 *   post:
 *     summary: Upload multiple images (max 10)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - images
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Image files to upload (max 10)
 *     responses:
 *       200:
 *         description: Images uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       filename:
 *                         type: string
 *                       url:
 *                         type: string
 *                       fullUrl:
 *                         type: string
 *                       size:
 *                         type: integer
 *       400:
 *         description: No files uploaded
 *       500:
 *         description: Server error
 */
router.post("/images", upload.array("images", 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    const images = req.files.map((file) => ({
      filename: file.filename,
      url: `/uploads/images/${file.filename}`,
      fullUrl: `${req.protocol}://${req.get("host")}/uploads/images/${file.filename}`,
      size: file.size,
    }));

    res.json({
      success: true,
      message: "Images uploaded successfully",
      data: images,
    });
  } catch (error) {
    console.error("Error uploading images:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading images",
      error: error.message,
    });
  }
});

module.exports = router;
