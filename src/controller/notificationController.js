const { Notification, Post, User } = require("../schema");
const { sendTelegramMessage } = require("../services/telegram.service");
const postService = require("../services/post.service");
const { Op } = require("sequelize");

// Get all notifications with pagination
exports.getAllNotifications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      search,
      workflow_status,
      sort = "createdAt",
      order = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;

    // Build where clause
    const where = {};
    if (status) {
      where.status = status;
    }
    if (category) {
      where.category = category;
    }
    if (search) {
      where[Op.or] = [
        { user_name: { [Op.like]: `%${search}%` } },
        { target: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    // Jika role user adalah author, tampilkan hanya notifikasi milik author tersebut
    if (req.user?.role === "author") {
      where[Op.or] = [
        { user_uuid: req.user.uuid },
        { "$post.author_id$": req.user.id },
      ];
    }

    const postInclude = {
      model: Post,
      as: "post",
      attributes: [
        "id",
        "uuid",
        "title",
        "slug",
        "featured_image",
        "status",
        "workflow_status",
        "rejection_reason",
        "author_id",
        "image_caption",
        "approved_by_user_uuid",
        "approved_at",
        "published_at",
      ],
      required: req.user?.role === "author",
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id", "uuid", "username", "email", "display_name"],
          required: false,
        },
      ],
      ...(req.user?.role === "author"
        ? { where: { author_id: req.user.id } }
        : {}),
    };

    // Add workflow_status filter on post include
    if (workflow_status) {
      postInclude.where = {
        ...postInclude.where,
        workflow_status: workflow_status,
      };
    }

    const { count, rows: notifications } = await Notification.findAndCountAll({
      where,
      attributes: {
        exclude: ["id", "post_id"],
      },
      include: [postInclude],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order]],
    });

    res.json({
      success: true,
      data: notifications,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error getting notifications:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notifications",
      error: error.message,
    });
  }
};

// Create notification
exports.createNotification = async (req, res) => {
  try {
    const {
      user_name,
      action,
      target,
      description,
      priority = "medium",
      category = "news",
      post_uuid,
    } = req.body;

    const post = post_uuid
      ? await Post.findOne({ where: { uuid: post_uuid } })
      : null;

    if (post_uuid && !post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const notification = await Notification.create({
      user_name,
      action,
      target,
      status: "pending",
      description,
      priority,
      category,
      post_id: post?.id,
      article_uuid: post?.uuid,
      user_uuid: req.user?.uuid || null,
    });

    // Include post data in response if post_id exists
    const createdNotification = await Notification.findByPk(notification.id, {
      attributes: {
        exclude: ["id", "post_id"],
      },
      include: [
        {
          model: Post,
          as: "post",
          attributes: [
            "id",
            "uuid",
            "title",
            "slug",
            "featured_image",
            "status",
          ],
          include: [
            {
              model: User,
              as: "author",
              attributes: ["id", "uuid", "username", "email", "display_name"],
              required: false,
            },
          ],
        },
      ],
    });

    res.status(201).json({
      success: true,
      data: createdNotification,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({
      success: false,
      message: "Error creating notification",
      error: error.message,
    });
  }
};

// Update notification status (approve/reject)
exports.updateNotificationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, post_status, rejection_reason } = req.body;

    // Frontend mengirim uuid, kadang juga id numerik. Duk kedua-duanya.
    const notification = await Notification.findOne({
      where: {
        [Op.or]: [{ id }, { uuid: id }],
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    const articleUuid = notification.article_uuid;
    if (articleUuid && status === "approved") {
      // postService.approveArticle already handles:
      // - updating post status to APPROVED then PUBLISHED
      // - activity logging
      // - Telegram notification with correct data
      const approvedPost = await postService.approveArticle(
        articleUuid,
        req.user,
      );
      // Update notification status to approved
      await notification.update({ status: "approved" });
      return res.json({ success: true, data: approvedPost });
    }
    if (articleUuid && status === "rejected") {
      const revisedPost = await postService.requestRevision(
        articleUuid,
        req.user,
        rejection_reason,
      );
      // Update notification status to rejected
      await notification.update({ status: "rejected" });
      return res.json({ success: true, data: revisedPost });
    }

    // For other status changes, just update notification
    await notification.update({ status });

    let post = null;

    // If approved and has post_id, update post status (legacy path)
    if (status === "approved" && notification.post_id && post_status) {
      post = await Post.findByPk(notification.post_id);
      if (post) {
        await post.update({
          status: post_status,
          published_at:
            post_status === "publish" ? new Date() : post.published_at,
          rejection_reason: null, // Clear rejection reason when approved
          editor_id: req.user?.id || post.editor_id, // Editor yang menyetujui
        });
      }
    }

    // If rejected and has post_id, update post with rejection reason
    if (status === "rejected" && notification.post_id) {
      post = await Post.findByPk(notification.post_id);
      if (post) {
        await post.update({
          status: "draft",
          rejection_reason:
            rejection_reason || "Tidak ada alasan yang diberikan",
        });
      }
    }
    const author = post ? await User.findByPk(post.author_id) : null;
    const editorName = req.user?.username || "Editor";

    // Telegram notifications are now handled by postService methods
    // No duplicate sending here to ensure data consistency

    // Fetch updated notification with post
    const updatedNotification = await Notification.findByPk(notification.id, {
      include: [
        {
          model: Post,
          as: "post",
          attributes: ["id", "title", "slug", "featured_image", "status"],
        },
      ],
    });

    res.json({
      success: true,
      data: updatedNotification,
    });
  } catch (error) {
    console.error("Error updating notification:", error);
    // Log system error to Telegram
    const { sendTelegramMessage } = require("../services/telegram.service");
    sendTelegramMessage({
      topic: "SYSTEM_ERROR",
      useHtml: true,
      text:
        `🚨 <b>ALERT SYSTEM ERROR</b>\n\n` +
        `📌 <b>Operasi:</b> Update notification status\n` +
        `⚠️ <b>Detail Error:</b> <code>${error.message}</code>\n` +
        `🆔 <b>ID / UUID Notifikasi:</b> <code>${req.params.id}</code>\n` +
        `⏰ <b>Waktu:</b> ${new Date().toLocaleString("id-ID")}`,
    }).catch(() => {});
    res.status(500).json({
      success: false,
      message: "Error updating notification",
      error: error.message,
    });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({ where: { uuid: id } });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    await notification.destroy();

    res.json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting notification",
      error: error.message,
    });
  }
};

// Get notification statistics
exports.getNotificationStats = async (req, res) => {
  try {
    const total = await Notification.count();
    const pending = await Notification.count({ where: { status: "pending" } });
    const approved = await Notification.count({
      where: { status: "approved" },
    });
    const rejected = await Notification.count({
      where: { status: "rejected" },
    });
    const highPriority = await Notification.count({
      where: { priority: "high" },
    });

    res.json({
      success: true,
      data: {
        total,
        pending,
        approved,
        rejected,
        highPriority,
      },
    });
  } catch (error) {
    console.error("Error getting notification stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notification statistics",
      error: error.message,
    });
  }
};
