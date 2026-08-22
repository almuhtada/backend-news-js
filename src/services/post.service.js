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
      exclude,
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
    if (exclude) {
      const excludedIds = String(exclude)
        .split(",")
        .map((id) => Number.parseInt(id, 10))
        .filter(Number.isInteger);
      if (excludedIds.length > 0) {
        where.id = { [Op.notIn]: excludedIds };
      }
    }

    // Build include array
    const include = [
      {
        model: User,
        as: "author",
        attributes: ["id", "uuid", "username", "email", "display_name"],
      },
      {
        model: User,
        as: "editor",
        attributes: ["id", "uuid", "username", "email", "display_name"],
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
    ];

    // Add category filter if specified
    if (category) {
      include[2].where = { slug: category };
    }

    // Add tag filter if specified
    if (tag) {
      include[3].where = { slug: tag };
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
   * Get a post by its public UUID.
   * @param {string} uuid
   * @returns {Promise<Post>}
   */
  async getPostByUuid(uuid) {
    const post = await Post.findOne({
      where: { uuid },
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id", "uuid", "username", "email", "display_name"],
        },
        {
          model: User,
          as: "editor",
          attributes: ["id", "uuid", "username", "email", "display_name"],
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
          attributes: ["id", "uuid", "username", "email", "display_name"],
        },
        {
          model: User,
          as: "editor",
          attributes: ["id", "uuid", "username", "email", "display_name"],
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
      author_uuid,
      editor_uuid,
    } = data;

    // Validate required fields
    if (!title || !content) {
      throw new BadRequestError("Title and content are required");
    }

    // Penulis: prioritaskan author_uuid (uuid, dipakai admin), lalu user yang login
    let postAuthorId = null;
    let author = null;

    if (author_uuid) {
      author = await User.findOne({ where: { uuid: author_uuid } });
      if (author) postAuthorId = author.id;
    }

    if (!postAuthorId && author_id) {
      author = await User.findByPk(author_id);
      if (author) postAuthorId = author.id;
    }

    if (!postAuthorId && user && user.id) {
      author = await User.findByPk(user.id);
      if (author) postAuthorId = author.id;
    }

    // If no valid author, find any administrator
    if (!postAuthorId) {
      author = await User.findOne({ where: { role: "administrator" } });
      if (author) {
        postAuthorId = author.id;
      } else {
        throw new BadRequestError("No valid author found. Please provide author_id.");
      }
    }

    // Editor (opsional): resolve dari uuid
    let postEditorId = null;
    if (editor_uuid) {
      const editor = await User.findOne({ where: { uuid: editor_uuid } });
      if (editor) postEditorId = editor.id;
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
      editor_id: postEditorId,
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
        {
          model: User,
          as: "author",
          attributes: ["id", "uuid", "username", "email", "display_name"],
        },
        {
          model: User,
          as: "editor",
          attributes: ["id", "uuid", "username", "email", "display_name"],
          required: false,
        },
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
   * @param {object} user - Authenticated user context (editor)
   * @returns {Promise<Post>}
   */
  async updatePost(id, data, user) {
    const {
      title,
      slug,
      content,
      excerpt,
      featured_image,
      status,
      category_ids,
      tag_ids,
      author_uuid,
      editor_uuid,
    } = data;

    const post = await Post.findOne({ where: { uuid: id } });
    if (!post) {
      throw new NotFoundError("Post not found");
    }

    // Resolve penulis/editor dari uuid jika admin mengubahnya.
    // Nilai "none" berarti dikosongkan (editor boleh null, author tetap wajib).
    let newAuthorId = null;
    let newEditorId = null;
    let clearEditor = false;
    if (author_uuid === "none") {
      newAuthorId = post.author_id; // author wajib ada, tidak dikosongkan
    } else if (author_uuid) {
      const authorUser = await User.findOne({ where: { uuid: author_uuid } });
      if (authorUser) newAuthorId = authorUser.id;
    }
    if (editor_uuid === "none") {
      clearEditor = true;
    } else if (editor_uuid) {
      const editorUser = await User.findOne({ where: { uuid: editor_uuid } });
      if (editorUser) newEditorId = editorUser.id;
    }

    // Update post fields. Jika user yang mengedit berbeda dari author,
    // catat sebagai editor terakhir.
    const isSameAuthor = user && post.author_id === user.id;
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
      author_id: newAuthorId !== null ? newAuthorId : post.author_id,
      editor_id: clearEditor
        ? null
        : newEditorId !== null
          ? newEditorId
          : user && !isSameAuthor
            ? user.id
            : post.editor_id,
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
        {
          model: User,
          as: "author",
          attributes: ["id", "uuid", "username", "email", "display_name"],
        },
        {
          model: User,
          as: "editor",
          attributes: ["id", "uuid", "username", "email", "display_name"],
          required: false,
        },
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
      // Fallback 1: Ambil berita dari 30 hari terakhir (berita baru yang banyak dilihat)
      const fallbackThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      posts = await Post.findAll({
        where: {
          status: "publish",
          published_at: {
            [Op.gte]: fallbackThreshold,
          },
        },
        attributes: postAttributes,
        include: postIncludes,
        order: [[sequelize.literal("engagement_score"), "DESC"]],
        limit: requestedLimit,
      });
    }

    if (posts.length < requestedLimit) {
      // Fallback 2: Safety net final jika artikel sangat sedikit
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
