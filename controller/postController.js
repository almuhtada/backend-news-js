const { Post, User, Category, Tag, Notification } = require("../schema");
const { Op } = require("sequelize");
const { generateSummary } = require("../services/summarizer.service");
const { sendTelegramMessage } = require("../services/telegram.service");

// Generate summary from text (untuk tombol Ringkas di frontend)
exports.summarizeText = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Content is required",
      });
    }

    const summary = await generateSummary(content);

    res.json({
      success: true,
      data: { summary },
    });
  } catch (error) {
    console.error("Error generating summary:", error);
    res.status(500).json({
      success: false,
      message: "Error generating summary",
      error: error.message || error,
    });
  }
};

// Get all posts with pagination and filters
exports.getAllPosts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      tag,
      search,
      sort = "published_at",
      order = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;

    // Build where clause
    const where = {};
    // Only filter by status if it's explicitly provided
    if (status) {
      where.status = status;
    }
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } },
      ];
    }

    // Build include array
    const include = [
      {
        model: User,
        as: "author",
        attributes: ["id", "username", "email"],
      },
      {
        model: Category,
        as: "categories",
        attributes: ["id", "name", "slug"],
        through: { attributes: [] },
      },
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name", "slug"],
        through: { attributes: [] },
      },
    ];

    // Add category filter if specified
    if (category) {
      include[1].where = { slug: category };
    }

    // Add tag filter if specified
    if (tag) {
      include[2].where = { slug: tag };
    }

    const { count, rows: posts } = await Post.findAndCountAll({
      where,
      include,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order]],
      distinct: true,
    });

    res.json({
      success: true,
      data: posts,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error getting posts:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching posts",
      error: error.message,
    });
  }
};

// Get single post by ID
exports.getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findByPk(id, {
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id", "username", "email"],
        },
        {
          model: Category,
          as: "categories",
          attributes: ["id", "name", "slug"],
          through: { attributes: [] },
        },
        {
          model: Tag,
          as: "tags",
          attributes: ["id", "name", "slug"],
          through: { attributes: [] },
        },
      ],
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    res.json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error("Error getting post:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching post",
      error: error.message,
    });
  }
};

// Get single post by slug
exports.getPostBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const post = await Post.findOne({
      where: { slug, status: "publish" },
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id", "username", "email", "display_name"],
        },
        {
          model: User,
          as: "editor",
          attributes: ["id", "username", "email", "display_name"],
          required: false, // Editor is optional
        },
        {
          model: Category,
          as: "categories",
          attributes: ["id", "name", "slug"],
          through: { attributes: [] },
        },
        {
          model: Tag,
          as: "tags",
          attributes: ["id", "name", "slug"],
          through: { attributes: [] },
        },
      ],
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Increment views
    await post.increment("views");

    res.json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error("Error getting post:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching post",
      error: error.message,
    });
  }
};

// Create new post
exports.createPost = async (req, res) => {
  try {
    const {
      title,
      slug,
      content,
      excerpt,
      featured_image,
      status = "draft",
      category_ids = [],
      tag_ids = [],
      author_id,
    } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required",
      });
    }

    // Use author_id from body or req.user, or find an admin
    let postAuthorId = author_id || (req.user && req.user.id);
    let author = null;

    if (postAuthorId) {
      author = await User.findByPk(postAuthorId);
    }

    // If no valid author, find any administrator
    if (!author) {
      author = await User.findOne({ where: { role: "administrator" } });
      if (author) {
        postAuthorId = author.id;
      } else {
        return res.status(400).json({
          success: false,
          message: "No valid author found. Please provide author_id.",
        });
      }
    }

    // Generate unique slug
    let postSlug =
      slug ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    // Check if slug exists, append timestamp if needed
    const existingPost = await Post.findOne({ where: { slug: postSlug } });
    if (existingPost) {
      postSlug = `${postSlug}-${Date.now()}`;
    }

    // 🔥 AUTO GENERATE SUMMARY (AI)
    let summary = null;
    try {
      summary = await generateSummary(content);
    } catch (err) {
      console.error("Summary generation failed:", err);
      summary = excerpt || null; // fallback aman
    }

    // Create post
    const post = await Post.create({
      title,
      slug: postSlug,
      content,
      excerpt,
      summary,
      featured_image,
      status,
      author_id: postAuthorId,
      published_at: status === "publish" ? new Date() : null,
    });

    // Add categories
    if (category_ids.length > 0) {
      await post.setCategories(category_ids);
    }

    // Add tags
    if (tag_ids.length > 0) {
      await post.setTags(tag_ids);
    }

    // Fetch post with associations
    const createdPost = await Post.findByPk(post.id, {
      include: [
        { model: User, as: "author", attributes: ["id", "username", "email"] },
        { model: Category, as: "categories", through: { attributes: [] } },
        { model: Tag, as: "tags", through: { attributes: [] } },
      ],
    });

    // Create notification
    await Notification.create({
      user_name: author ? author.username : "Unknown User",
      action: "add",
      target: title,
      status: "pending",
      description: summary || excerpt || `Berita baru ditambahkan: ${title}`,
      priority: "medium",
      category: "news",
      post_id: post.id,
    });

    // 🔔 TELEGRAM - PENULIS (non-blocking, plain text)
    sendTelegramMessage({
      topic: "PENULIS",
      text:
        `📝 Berita Baru Dikirim\n\n` +
        `📰 Judul: ${post.title}\n` +
        `✍️ Penulis: ${author ? author.username : "Unknown"}\n` +
        `⏰ Waktu: ${new Date().toLocaleString("id-ID")}\n\n` +
        `Status: Menunggu review editor`,
    }).catch((err) => console.error("Telegram notification failed:", err));

    res.status(201).json({
      success: true,
      data: createdPost,
    });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({
      success: false,
      message: "Error creating post",
      error: error.message,
    });
  }
};

// Update post
exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      slug,
      content,
      excerpt,
      featured_image,
      status,
      category_ids,
      tag_ids,
    } = req.body;

    const post = await Post.findByPk(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Update post fields
    await post.update({
      title: title || post.title,
      slug: slug || post.slug,
      content: content || post.content,
      excerpt: excerpt !== undefined ? excerpt : post.excerpt,
      featured_image:
        featured_image !== undefined ? featured_image : post.featured_image,
      status: status || post.status,
      published_at:
        status === "publish" && !post.published_at
          ? new Date()
          : post.published_at,
    });

    // Update categories if provided
    if (category_ids) {
      await post.setCategories(category_ids);
    }

    // Update tags if provided
    if (tag_ids) {
      await post.setTags(tag_ids);
    }

    // Fetch updated post with associations
    const updatedPost = await Post.findByPk(post.id, {
      include: [
        { model: User, as: "author", attributes: ["id", "username", "email"] },
        { model: Category, as: "categories", through: { attributes: [] } },
        { model: Tag, as: "tags", through: { attributes: [] } },
      ],
    });

    // Create notification for the updated post
    const author = await User.findByPk(post.author_id);
    await Notification.create({
      user_name: author ? author.username : "Unknown User",
      action: "edit",
      target: post.title,
      status: "pending",
      description: `Berita diperbarui: ${post.title}`,
      priority: "medium",
      category: "news",
      post_id: post.id,
    });

    res.json({
      success: true,
      data: updatedPost,
    });
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({
      success: false,
      message: "Error updating post",
      error: error.message,
    });
  }
};

// Delete post
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findByPk(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    await post.destroy();

    res.json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting post",
      error: error.message,
    });
  }
};

// Get popular posts
exports.getPopularPosts = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const posts = await Post.findAll({
      where: { status: "publish" },
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id", "username"],
        },
        {
          model: Category,
          as: "categories",
          attributes: ["id", "name", "slug"],
          through: { attributes: [] },
        },
      ],
      order: [["views", "DESC"]],
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      data: posts,
    });
  } catch (error) {
    console.error("Error getting popular posts:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching popular posts",
      error: error.message,
    });
  }
};

// Get recent posts
exports.getRecentPosts = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const posts = await Post.findAll({
      where: { status: "publish" },
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id", "username"],
        },
        {
          model: Category,
          as: "categories",
          attributes: ["id", "name", "slug"],
          through: { attributes: [] },
        },
      ],
      order: [["published_at", "DESC"]],
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      data: posts,
    });
  } catch (error) {
    console.error("Error getting recent posts:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching recent posts",
      error: error.message,
    });
  }
};

// Get viral/trending posts (based on engagement in last 24 hours)
exports.getTrendingPosts = async (req, res) => {
  try {
    const { limit = 5, hours = 24 } = req.query;
    const sequelize = require("../config/database");
    const requestedLimit = parseInt(limit);

    // Calculate time threshold
    const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Common attributes for both queries
    const postAttributes = [
      "id",
      "title",
      "slug",
      "excerpt",
      "featured_image",
      "views",
      "published_at",
      "createdAt",
      "updatedAt",
      // Calculate engagement score
      [
        sequelize.literal(`(
          views * 1 +
          (SELECT COUNT(*) FROM post_likes WHERE post_likes.post_id = Post.id) * 5 +
          (SELECT COUNT(*) FROM comments WHERE comments.post_id = Post.id AND comments.status = 'approved') * 10
        )`),
        "engagement_score",
      ],
      [
        sequelize.literal(
          `(SELECT COUNT(*) FROM post_likes WHERE post_likes.post_id = Post.id)`
        ),
        "likes_count",
      ],
      [
        sequelize.literal(
          `(SELECT COUNT(*) FROM comments WHERE comments.post_id = Post.id AND comments.status = 'approved')`
        ),
        "comments_count",
      ],
    ];

    const postIncludes = [
      {
        model: User,
        as: "author",
        attributes: ["id", "username"],
      },
      {
        model: Category,
        as: "categories",
        attributes: ["id", "name", "slug"],
        through: { attributes: [] },
      },
    ];

    // Try to get posts from last X hours first
    let posts = await Post.findAll({
      where: {
        status: "publish",
        published_at: {
          [Op.gte]: timeThreshold,
        },
      },
      attributes: postAttributes,
      include: postIncludes,
      order: [[sequelize.literal("engagement_score"), "DESC"]],
      limit: requestedLimit,
    });

    // If no posts or very few posts found, fallback to all-time engagement
    if (posts.length < requestedLimit) {
      posts = await Post.findAll({
        where: {
          status: "publish",
        },
        attributes: postAttributes,
        include: postIncludes,
        order: [[sequelize.literal("engagement_score"), "DESC"]],
        limit: requestedLimit,
      });
    }

    res.json({
      success: true,
      data: posts,
    });
  } catch (error) {
    console.error("Error getting trending posts:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching trending posts",
      error: error.message,
    });
  }
};
