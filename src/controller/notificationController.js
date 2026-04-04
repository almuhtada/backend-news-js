const { Notification, Post, User } = require("../schema");
const { sendTelegramMessage } = require("../services/telegram.service");
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

    const { count, rows: notifications } = await Notification.findAndCountAll({
      where,
      include: [
        {
          model: Post,
          as: "post",
          attributes: ["id", "title", "slug", "featured_image", "status"],
          required: false,
        },
      ],
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
      post_id,
    } = req.body;

    const notification = await Notification.create({
      user_name,
      action,
      target,
      status: "pending",
      description,
      priority,
      category,
      post_id,
    });

    // Include post data in response if post_id exists
    const createdNotification = await Notification.findByPk(notification.id, {
      include: [
        {
          model: Post,
          as: "post",
          attributes: ["id", "title", "slug", "featured_image", "status"],
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
    const { status, post_status, rejection_reason } = req.body; // status: approved/rejected, post_status: publish/archived, rejection_reason: alasan penolakan

    const notification = await Notification.findByPk(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    // Update notification status
    await notification.update({ status });

    let post = null;

    // If approved and has post_id, update post status
    if (status === "approved" && notification.post_id && post_status) {
      post = await Post.findByPk(notification.post_id);
      if (post) {
        await post.update({
          status: post_status,
          published_at:
            post_status === "publish" ? new Date() : post.published_at,
          rejection_reason: null, // Clear rejection reason when approved
        });
      }
    }

    // If rejected and has post_id, update post with rejection reason
    if (status === "rejected" && notification.post_id) {
      post = await Post.findByPk(notification.post_id);
      if (post) {
        await post.update({
          status: "draft", // Keep as draft so author can edit and resubmit
          rejection_reason: rejection_reason || "Tidak ada alasan yang diberikan",
        });
      }
    }
    const author = post ? await User.findByPk(post.author_id) : null;
    const editorName = req.user?.username || "Editor";

    if (status === "approved") {
      await sendTelegramMessage({
        topic: "EDITOR",
        text: `
            ✅ *Berita Disetujui & Dipublish*

            *Judul:* ${post?.title}
            *Penulis:* ${author?.username || "Unknown"}
            *Editor:* ${editorName}
            *Waktu:* ${new Date().toLocaleString("id-ID")}

            🔗 Link:
            ${process.env.ADMIN_URL}/admin/berita/${post?.id}
        `.trim(),
      });
    }

    if (status === "rejected") {
      await sendTelegramMessage({
        topic: "EDITOR",
        text: `
            ❌ Berita Ditolak

            Judul: ${post?.title}
            Penulis: ${author?.username || "Unknown"}
            Editor: ${editorName}
            Waktu: ${new Date().toLocaleString("id-ID")}

            Alasan Penolakan:
            ${rejection_reason || "Tidak ada alasan yang diberikan"}
        `.trim(),
      });
    }
    // Fetch updated notification with post
    const updatedNotification = await Notification.findByPk(id, {
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

    const notification = await Notification.findByPk(id);

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
