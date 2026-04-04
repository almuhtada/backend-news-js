const express = require("express");
const router = express.Router();
const {
  telegramNotificationController,
} = require("../controller/notificationTelegramController");

/**
 * @swagger
 * /api/tele/{type}:
 *   post:
 *     summary: Kirim notifikasi Telegram (Penulis / Editor)
 *     tags:
 *       - Telegram Notification
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [submit, editor]
 *         description: |
 *           Jenis notifikasi:
 *           - submit → notifikasi penulis
 *           - editor → notifikasi editor
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required: [title, author]
 *                 properties:
 *                   title:
 *                     type: string
 *                     example: Tafsir Al-Baqarah Ayat 1–5
 *                   author:
 *                     type: string
 *                     example: Ahmad Fauzi
 *               - type: object
 *                 required: [title, editor, link]
 *                 properties:
 *                   title:
 *                     type: string
 *                     example: Tafsir Al-Baqarah Ayat 1–5
 *                   author:
 *                     type: string
 *                     example: Ahmad Fauzi
 *                   editor:
 *                     type: string
 *                     example: Ust. Ali
 *                   action:
 *                     type: string
 *                     example: Disetujui & Dipublish
 *                   link:
 *                     type: string
 *                     example: https://almuhtada.org/admin/berita/123
 *     responses:
 *       200:
 *         description: Notifikasi berhasil dikirim
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Notifikasi Telegram berhasil dikirim
 *       400:
 *         description: Request tidak valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Tipe notifikasi tidak dikenali
 *       500:
 *         description: Gagal mengirim notifikasi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Gagal mengirim notifikasi Telegram
 */
router.post("/tele/:type", telegramNotificationController);

module.exports = router;
