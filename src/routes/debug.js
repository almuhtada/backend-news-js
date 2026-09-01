const express = require("express");
const router = express.Router();
const { sendTelegramMessage } = require("../services/telegram.service");
const { authenticate, authorize } = require("../middleware/auth");

/**
 * Test Telegram connection
 * POST /api/debug/telegram/test
 */
router.post(
  "/telegram/test",
  authenticate,
  authorize("administrator"),
  async (req, res) => {
    try {
      const { topic = "APPROVAL", message = "Test message" } = req.body;

      console.log("[DEBUG] Testing Telegram connection...");
      console.log("[DEBUG] Topic:", topic);
      console.log("[DEBUG] Token exists:", !!process.env.TELEGRAM_BOT_TOKEN);
      console.log("[DEBUG] Chat ID:", process.env.TELEGRAM_CHAT_ID);

      const result = await sendTelegramMessage({
        topic,
        useHtml: true,
        text: `🧪 <b>TEST MESSAGE</b>\n\n${message}\n\n⏰ ${new Date().toLocaleString("id-ID")}`,
      });

      return res.json({
        success: true,
        message: "Telegram test message sent successfully",
        result: {
          messageId: result.result?.message_id,
          topic,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("[DEBUG] Telegram test failed:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to send test message",
        error: error.message,
        details: {
          tokenSet: !!process.env.TELEGRAM_BOT_TOKEN,
          chatIdSet: !!process.env.TELEGRAM_CHAT_ID,
          chatId: process.env.TELEGRAM_CHAT_ID,
          botToken: process.env.TELEGRAM_BOT_TOKEN
            ? process.env.TELEGRAM_BOT_TOKEN.substring(0, 10) + "..."
            : "NOT SET",
        },
      });
    }
  },
);

/**
 * Check pending notifications
 * GET /api/debug/notifications/pending
 */
router.get(
  "/notifications/pending",
  authenticate,
  authorize("administrator"),
  async (req, res) => {
    try {
      const { Notification } = require("../schema");

      const pending = await Notification.findAll({
        where: { status: "pending" },
        order: [["created_at", "DESC"]],
        limit: 20,
      });

      const approved = await Notification.findAll({
        where: { status: "approved" },
        order: [["updated_at", "DESC"]],
        limit: 10,
      });

      const rejected = await Notification.findAll({
        where: { status: "rejected" },
        order: [["updated_at", "DESC"]],
        limit: 10,
      });

      return res.json({
        success: true,
        data: {
          pending: {
            count: pending.length,
            items: pending.map((n) => ({
              id: n.id,
              article_uuid: n.article_uuid,
              target: n.target,
              status: n.status,
              created_at: n.created_at,
            })),
          },
          approved: {
            count: approved.length,
            items: approved.map((n) => ({
              id: n.id,
              article_uuid: n.article_uuid,
              target: n.target,
              updated_at: n.updated_at,
            })),
          },
          rejected: {
            count: rejected.length,
            items: rejected.map((n) => ({
              id: n.id,
              article_uuid: n.article_uuid,
              target: n.target,
              updated_at: n.updated_at,
            })),
          },
        },
      });
    } catch (error) {
      console.error("[DEBUG] Error fetching notifications:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch notifications",
        error: error.message,
      });
    }
  },
);

/**
 * Simulate approval action (for testing)
 * POST /api/debug/test-approval/{articleUuid}
 */
router.post(
  "/test-approval/:articleUuid",
  authenticate,
  authorize("administrator"),
  async (req, res) => {
    try {
      const { articleUuid } = req.params;
      const { Post, User } = require("../schema");
      const postService = require("../services/post.service");

      const post = await Post.findOne({ where: { uuid: articleUuid } });
      if (!post) {
        return res.status(404).json({
          success: false,
          message: "Post not found",
        });
      }

      console.log("[DEBUG] Simulating approval for post:", post.uuid);
      console.log("[DEBUG] Current user:", req.user);

      // Simulate approval
      const result = await postService.approveArticle(articleUuid, req.user);

      return res.json({
        success: true,
        message: "Test approval sent",
        data: {
          postId: result.id,
          postUuid: result.uuid,
          title: result.title,
          status: result.status,
          workflow_status: result.workflow_status,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("[DEBUG] Test approval failed:", error);
      return res.status(500).json({
        success: false,
        message: "Test approval failed",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  },
);

/**
 * Check recent activity logs
 * GET /api/debug/activity-logs?limit=50
 */
router.get(
  "/activity-logs",
  authenticate,
  authorize("administrator"),
  async (req, res) => {
    try {
      const { limit = 50 } = req.query;
      const { ArticleActivity, Post } = require("../schema");

      const activities = await ArticleActivity.findAll({
        order: [["created_at", "DESC"]],
        limit: parseInt(limit),
        include: [
          {
            model: Post,
            attributes: ["id", "uuid", "title"],
            required: false,
          },
        ],
      });

      return res.json({
        success: true,
        data: {
          count: activities.length,
          items: activities.map((a) => ({
            id: a.id,
            article_uuid: a.article_uuid,
            action: a.action,
            status_before: a.status_before,
            status_after: a.status_after,
            post_title: a.Post?.title,
            created_at: a.created_at,
          })),
        },
      });
    } catch (error) {
      console.error("[DEBUG] Error fetching activity logs:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch activity logs",
        error: error.message,
      });
    }
  },
);

module.exports = router;
