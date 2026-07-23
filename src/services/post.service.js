const { Post, User, Category, Tag, Notification } = require("../schema");
const { Op } = require("sequelize");
const { generateSummary } = require("./summarizer.service");
const { sendTelegramMessage } = require("./telegram.service");
const { NotFoundError, BadRequestError } = require("../utils");
const { parsePagination } = require("../utils");
const recommendationService = require("./recommendation.service");

class PostService {
  /**
   * Generate AI summary from text content
   * @param {string} content
   * @returns {Promise<string>}
   */
  async summarizeText(content) {
    if (!content || content.trim().length === 0) {
      throw new BadRequestError("Content is required");
    }
    return await generateSummary(content);
  }

  /**
   * Get all posts with pagination and filters
   * @param {object} query - query filters
   * @returns {Promise<{posts: Array, count: number, page: number, limit: number}>}
   */
  async getAllPosts(query) {
    const {
      status,
      category,
      tag,
      search,
      sort = "published_at",
      order = "DESC",
    } = query;

    const { page, limit, offset } = parsePagination(query);

    // Build where clause
    const where = {};
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

    return { posts, count, page, limit };
  }

  /**
   * Get single post by ID
   * @param {number} id
   * @returns {Promise<Post>}
   */
  async getPostById(id) {
    const post = await Post.findOne({ where: { uuid: id } }, {
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
      throw new NotFoundError("Post not found");
    }

    await post.increment("views");
    return post;
  }

  /**
   * Get single post by slug (and increment views)
   * @param {string} slug
   * @param {object} options - { userIdentifier, userId } untuk track view log
   * @returns {Promise<Post>}
   */
  async getPostBySlug(slug, options = {}) {
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
          required: false,
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
      throw new NotFoundError("Post not found");
    }

    // Increment aggregate views counter
    await post.increment("views");

    // Track granular view log secara async (fire-and-forget)
    // Tidak blocking — error diabaikan agar tidak ganggu response
    if (options.userIdentifier) {
      recommendationService
        .trackView({
          postId: post.id,
          userIdentifier: options.userIdentifier,
          userId: options.userId || null,
        })
        .catch(() => {});
    }

    return post;
  }

  /**
   * Create new post
   * @param {object} data
   * @param {object} user - Authenticated user context
   * @returns {Promise<Post>}
   */
  async createPost(data, user) {
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
    } = data;

    // Validate required fields
    if (!title || !content) {
      throw new BadRequestError("Title and content are required");
    }

    // Use author_id from body or user context, or find an admin
    let postAuthorId = author_id || (user && user.id);
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
        throw new BadRequestError("No valid author found. Please provide author_id.");
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

    // AUTO GENERATE SUMMARY (AI)
    let summary = null;
    try {
      summary = await generateSummary(content);
    } catch (err) {
      console.error("Summary generation failed:", err);
      summary = excerpt || null; // fallback
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

    // Send Telegram Notification (non-blocking)
    const frontendUrl = process.env.FRONTEND_URL || "https://almuhtada.org";
    sendTelegramMessage({
      topic: "PENULIS",
      useHtml: true,
      text:
        `📝 <b>Berita Baru Dikirim</b>\n\n` +
        `📌 <b>Judul:</b> ${post.title}\n` +
        `✍️ <b>Penulis:</b> ${author ? author.username : "Unknown"}\n` +
        `⏰ <b>Waktu:</b> ${new Date().toLocaleString("id-ID")}\n\n` +
        `🟢 <b>Status:</b> <i>Menunggu review editor</i>\n` +
        `🔍 <a href="${frontendUrl}/detail-news/${post.slug}"><b>Lihat Lengkap</b></a>`,
    }).catch((err) => console.error("Telegram notification failed:", err));

    return createdPost;
  }

  /**
   * Update post
   * @param {number} id
   * @param {object} data
   * @returns {Promise<Post>}
   */
  async updatePost(id, data) {
    const {
      title,
      slug,
      content,
      excerpt,
      featured_image,
      status,
      category_ids,
      tag_ids,
    } = data;

    const post = await Post.findOne({ where: { uuid: id } });
    if (!post) {
      throw new NotFoundError("Post not found");
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

    return updatedPost;
  }

  /**
   * Delete post
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async deletePost(id) {
    const post = await Post.findOne({ where: { uuid: id } });
    if (!post) {
      throw new NotFoundError("Post not found");
    }
    await post.destroy();
    return true;
  }

  /**
   * Get popular posts
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getPopularPosts(limit = 5) {
    return await Post.findAll({
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
  }

  /**
   * Get recent posts
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getRecentPosts(limit = 5) {
    return await Post.findAll({
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
  }

  /**
   * Get trending/viral posts
   * @param {number} limit
   * @param {number} hours
   * @returns {Promise<Array>}
   */
  async getTrendingPosts(limit = 5, hours = 24) {
    const sequelize = require("../config/database");
    const requestedLimit = parseInt(limit);
    const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000);

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

    return posts;
  }
}

module.exports = new PostService();
