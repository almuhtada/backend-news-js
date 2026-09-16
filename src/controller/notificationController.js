const { Notification, Post, User } = require("../schema");
const { sendTelegramMessage } = require("../services/telegram.service");
const postService = require("../services/post.service");
const { Op } = require("sequelize");

/**
 * Resolve the article attached to a notification using its relational key.
 *
 * `post_id` is the key used to render the article in the dashboard, so it is
 * the canonical reference for moderation actions. Older notifications can
 * contain an `article_uuid` that no longer matches `post_id`; trusting that
 * UUID could approve a different article from the one shown to an editor.
 */
async function resolveNotificationPost(notification) {
  if (notification.post_id) {
    const postById = await Post.findByPk(notification.post_id);
    if (postById) {
      if (notification.article_uuid !== postById.uuid) {
        console.warn(
          `[Notification ${notification.uuid}] Repairing mismatched article reference`,
          {
            postId: notification.post_id,
            storedArticleUuid: notification.article_uuid,
            resolvedArticleUuid: postById.uuid,
          },
        );
        sendTelegramMessage({
          topic: "SYSTEM_ERROR",
          useHtml: true,
          text:
            `⚠️ <b>MISMATCH ARTICLE REFERENCE REPAIRED</b>\n\n` +
            `📌 <b>Notifikasi UUID:</b> <code>${notification.uuid}</code>\n` +
            `📝 <b>Post ID (Target):</b> <code>${notification.post_id}</code> ("${postById.title}")\n` +
            `❌ <b>Article UUID Salah:</b> <code>${notification.article_uuid}</code>\n` +
            `✅ <b>Article UUID Sinkron:</b> <code>${postById.uuid}</code>\n` +
            `⏰ <b>Waktu:</b> ${new Date().toLocaleString("id-ID")}`,
        }).catch(() => {});

        await notification.update({ article_uuid: postById.uuid });
      }
      return postById;
    }
  }

  if (notification.article_uuid) {
    const postByUuid = await Post.findOne({
      where: { uuid: notification.article_uuid },
    });
    if (postByUuid && notification.post_id !== postByUuid.id) {
      console.warn(
        `[Notification ${notification.uuid}] Repairing missing post relation`,
        {
          storedPostId: notification.post_id,
          articleUuid: notification.article_uuid,
          resolvedPostId: postByUuid.id,
        },
      );
      sendTelegramMessage({
        topic: "SYSTEM_ERROR",
        useHtml: true,
        text:
          `⚠️ <b>MISSING POST RELATION REPAIRED</b>\n\n` +
          `📌 <b>Notifikasi UUID:</b> <code>${notification.uuid}</code>\n` +
          `📝 <b>Article UUID:</b> <code>${notification.article_uuid}</code> ("${postByUuid.title}")\n` +
          `❌ <b>Post ID Lama:</b> <code>${notification.post_id}</code>\n` +
          `✅ <b>Post ID Sinkron:</b> <code>${postByUuid.id}</code>\n` +
          `⏰ <b>Waktu:</b> ${new Date().toLocaleString("id-ID")}`,
      }).catch(() => {});

      await notification.update({ post_id: postByUuid.id });
    }
    return postByUuid;
  }

  return null;
}

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

    // Frontend mengirim uuid, kadang juga id numerik. Dukung kedua-duanya.
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

    const hasArticleReference = Boolean(
      notification.post_id || notification.article_uuid,
    );
    const relatedPost = hasArticleReference
      ? await resolveNotificationPost(notification)
      : null;

    if (hasArticleReference && !relatedPost) {
      sendTelegramMessage({
        topic: "SYSTEM_ERROR",
        useHtml: true,
        text:
          `🚨 <b>ALERT ARTICLE APPROVAL BLOCKED</b>\n\n` +
          `📌 <b>Notifikasi ID/UUID:</b> <code>${id}</code>\n` +
          `👤 <b>Editor/User:</b> ${req.user?.username || req.user?.email || "Unknown"}\n` +
          `⚠️ <b>Detail:</b> Artikel yang ditautkan ke notifikasi tidak ditemukan di database (post_id: ${notification.post_id}, article_uuid: ${notification.article_uuid}). Approval dibatalkan agar tidak memproses artikel lain.\n` +
          `⏰ <b>Waktu:</b> ${new Date().toLocaleString("id-ID")}`,
      }).catch(() => {});

      return res.status(409).json({
        success: false,
        message:
          "Artikel terkait notifikasi tidak ditemukan. Approval dibatalkan agar tidak memproses artikel lain.",
      });
    }

    const articleUuid = relatedPost?.uuid || null;

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
