const { PostLike, Comment, Post, User } = require("../schema");
const { Op } = require("sequelize");

/**
 * Toggle like on a post
 * POST /api/posts/:id/like
 */
exports.toggleLike = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const { user_identifier, user_id } = req.body;

    if (!user_identifier) {
      return res.status(400).json({
        success: false,
        message: "User identifier is required",
      });
    }

    // Check if post exists
    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check if user has already liked this post
    const existingLike = await PostLike.findOne({
      where: {
        post_id: postId,
        user_identifier,
      },
    });

    if (existingLike) {
      // Unlike: delete the like
      await existingLike.destroy();

      // Get updated like count
      const likeCount = await PostLike.count({
        where: { post_id: postId },
      });

      return res.status(200).json({
        success: true,
        message: "Post unliked successfully",
        data: {
          liked: false,
          likeCount,
        },
      });
    } else {
      // Like: create new like
      await PostLike.create({
        post_id: postId,
        user_identifier,
        user_id: user_id || null,
      });

      // Get updated like count
      const likeCount = await PostLike.count({
        where: { post_id: postId },
      });

      return res.status(200).json({
        success: true,
        message: "Post liked successfully",
        data: {
          liked: true,
          likeCount,
        },
      });
    }
  } catch (error) {
    console.error("Error toggling like:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get like count and status for a post
 * GET /api/posts/:id/likes
 */
exports.getLikes = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const { user_identifier } = req.query;

    // Check if post exists
    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Get like count
    const likeCount = await PostLike.count({
      where: { post_id: postId },
    });

    // Check if current user has liked (if user_identifier provided)
    let liked = false;
    if (user_identifier) {
      const existingLike = await PostLike.findOne({
        where: {
          post_id: postId,
          user_identifier,
        },
      });
      liked = !!existingLike;
    }

    return res.status(200).json({
      success: true,
      data: {
        likeCount,
        liked,
      },
    });
  } catch (error) {
    console.error("Error getting likes:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Create a new comment on a post
 * POST /api/posts/:id/comments
 */
exports.createComment = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const {
      author_name,
      author_email,
      author_url,
      author_ip,
      author_agent,
      content,
      parent_id,
      user_id,
    } = req.body;

    // Validation
    if (!author_name || !author_email || !content) {
      return res.status(400).json({
        success: false,
        message: "Author name, email, and content are required",
      });
    }

    // Check if post exists
    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // If parent_id provided, check if parent comment exists
    if (parent_id) {
      const parentComment = await Comment.findByPk(parent_id);
      if (!parentComment) {
        return res.status(404).json({
          success: false,
          message: "Parent comment not found",
        });
      }
    }

    // Create comment
    const comment = await Comment.create({
      post_id: postId,
      parent_id: parent_id || null,
      author_name,
      author_email,
      author_url: author_url || null,
      author_ip: author_ip || null,
      author_agent: author_agent || null,
      content,
      user_id: user_id || null,
      status: "approved", // Auto-approve comments
      comment_type: "comment",
      karma: 0,
    });

    return res.status(201).json({
      success: true,
      message: "Comment created successfully",
      data: comment,
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get all comments (for dashboard)
 * GET /api/comments
 */
exports.getAllComments = async (req, res) => {
  try {
    const { status = "approved", limit = 50, offset = 0 } = req.query;

    // Build where clause
    const whereClause = {};

    // Filter by status (approved, pending, spam, trash)
    if (status) {
      whereClause.status = status;
    }

    // Get comments with post and user info
    const comments = await Comment.findAll({
      where: {
        ...whereClause,
        parent_id: null, // Only get top-level comments
      },
      include: [
        {
          model: Post,
          as: "post",
          attributes: ["id", "title", "slug"],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "username", "display_name"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Get total count (ALL comments including replies)
    const total = await Comment.count({
      where: whereClause, // Count all comments, not just top-level
    });

    return res.status(200).json({
      success: true,
      data: {
        comments,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error("Error getting all comments:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get comments for a post
 * GET /api/posts/:id/comments
 */
exports.getComments = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const { status = "approved", limit = 50, offset = 0 } = req.query;

    // Check if post exists
    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Build where clause
    const whereClause = {
      post_id: postId,
    };

    // Filter by status (approved, pending, spam, trash)
    if (status) {
      whereClause.status = status;
    }

    // Get comments with nested replies
    const comments = await Comment.findAll({
      where: {
        ...whereClause,
        parent_id: null, // Only get top-level comments
      },
      include: [
        {
          model: Comment,
          as: "replies",
          where: { status: "approved" },
          required: false,
          separate: true,
          order: [["createdAt", "ASC"]],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "username", "display_name"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Get total count
    const total = await Comment.count({
      where: {
        ...whereClause,
        parent_id: null,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        comments,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error("Error getting comments:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
