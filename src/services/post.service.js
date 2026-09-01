const {
  Post,
  User,
  Category,
  Tag,
  Notification,
  ArticleActivity,
} = require("../schema");
const { Op } = require("sequelize");
const { generateSummary } = require("./summarizer.service");
const { sendTelegramMessage, escapeHtml } = require("./telegram.service");
const { NotFoundError, BadRequestError, ForbiddenError } = require("../utils");
const { parsePagination } = require("../utils");
const recommendationService = require("./recommendation.service");
const VALID_STATUSES = ["draft", "publish", "archived"];
const WORKFLOW = {
  SUBMITTED: "SUBMITTED",
  IN_REVIEW: "IN_REVIEW",
  REVISION_REQUIRED: "REVISION_REQUIRED",
  RESUBMITTED: "RESUBMITTED",
  APPROVED: "APPROVED",
  PUBLISHED: "PUBLISHED",
};

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
      author,
      editor,
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

    if (author) {
      include[0].where = {
        [Op.or]: [{ uuid: author }, { username: author }],
      };
      include[0].required = true;
    }

    if (editor) {
      include[1].where = { uuid: editor };
      include[1].required = true;
    }

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
      image_caption,
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

    const canManageAssignments = user?.role === "administrator";

    // Hanya administrator yang boleh memilih Penulis/Editor lain.
    const requestedAuthorUuid = canManageAssignments ? author_uuid : undefined;
    const requestedEditorUuid = canManageAssignments ? editor_uuid : undefined;

    // Penulis: prioritaskan pilihan admin, lalu user yang login
    let postAuthorId = null;
    let author = null;

    if (requestedAuthorUuid) {
      author = await User.findOne({ where: { uuid: requestedAuthorUuid } });
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
        throw new BadRequestError(
          "No valid author found. Please provide author_id.",
        );
      }
    }

    // 🔴 DUPLICATE CHECK: Jika penulis punya post dengan title sama dalam REVISION_REQUIRED,
    // UPDATE yang lama daripada bikin baru (prevent duplicate saat resubmit after rejection)
    const existingRevisionPost = await Post.findOne({
      where: {
        title,
        author_id: postAuthorId,
        workflow_status: WORKFLOW.REVISION_REQUIRED,
      },
    });

    if (existingRevisionPost) {
      console.log(
        `[CREATE_POST] Found existing REVISION_REQUIRED post, updating instead of creating new: ${existingRevisionPost.uuid}`,
      );
      // Update existing post instead of creating new
      return this.updatePost(existingRevisionPost.uuid, data, user);
    }

    // Editor (opsional): resolve dari uuid
    let postEditorId = null;
    if (requestedEditorUuid) {
      const editor = await User.findOne({
        where: { uuid: requestedEditorUuid },
      });
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

    // New posts stay as drafts until an editor approves their notification.
    // Always start as draft regardless of user selection - requires editor approval to publish
    const status = "draft";

    // Create post
    const post = await Post.create({
      title,
      slug: postSlug,
      content,
      excerpt,
      summary,
      featured_image,
      image_caption,
      status,
      workflow_status: WORKFLOW.SUBMITTED,
      author_id: postAuthorId,
      editor_id: postEditorId,
      published_at: status === "publish" ? new Date() : null,
    });

    await this.addActivity(
      post,
      user,
      "SUBMITTED",
      WORKFLOW.SUBMITTED,
      null,
      null,
    );

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

    // Pastikan hanya ada 1 notifikasi per artikel. Jangan bikin add/edit terpisah.
    await this.upsertNotificationForArticle(post, {
      user_name: author ? author.username : "Unknown User",
      action: "add",
      target: title,
      status: "pending",
      description: summary || excerpt || `Berita baru ditambahkan: ${title}`,
      priority: "medium",
      category: "news",
      post_id: post.id,
      user_uuid: author?.uuid,
    });

    // Send Telegram Notification (non-blocking)
    const frontendUrl = process.env.FRONTEND_URL || "https://almuhtada.org";
    sendTelegramMessage({
      topic: "ARTIKEL_MASUK",
      useHtml: true,
      text:
        `📝 <b>Berita Baru Dikirim</b>\n\n` +
        `📌 <b>Judul:</b> ${escapeHtml(post.title)}\n` +
        `✍️ <b>Penulis:</b> ${escapeHtml(author ? author.username : "Unknown")}\n` +
        `⏰ <b>Waktu:</b> ${new Date().toLocaleString("id-ID")}\n\n` +
        `🟢 <b>Status:</b> <i>Menunggu review editor</i>\n` +
        `🔍 <a href="${frontendUrl}/detail-news/${encodeURIComponent(post.slug)}"><b>Lihat Lengkap</b></a>`,
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
      image_caption,
      status,
      category_ids,
      tag_ids,
      author_uuid,
      editor_uuid,
    } = data;

    // Validate status value if provided
    if (status && !VALID_STATUSES.includes(status)) {
      throw new BadRequestError(
        `Invalid status. Allowed values: ${VALID_STATUSES.join(", ")}`,
      );
    }

    const post = await Post.findOne({ where: { uuid: id } });
    if (!post) {
      throw new NotFoundError("Post not found");
    }

    const canEditAnyPost = ["administrator", "editor"].includes(user?.role);
    const canManageAssignments = user?.role === "administrator";
    if (
      !canEditAnyPost &&
      !(user?.role === "author" && post.author_id === user.id)
    ) {
      throw new ForbiddenError("You can only edit your own posts");
    }

    if (
      user?.role === "author" &&
      ![
        WORKFLOW.REVISION_REQUIRED,
        WORKFLOW.SUBMITTED,
        WORKFLOW.RESUBMITTED,
        undefined,
        null,
        "",
      ].includes(post.workflow_status) &&
      post.status !== "draft"
    ) {
      throw new ForbiddenError(
        "Author can only edit posts requiring revision or drafts",
      );
    }

    if (
      status !== undefined &&
      status !== post.status &&
      user?.role !== "administrator" &&
      user?.role !== "editor"
    ) {
      throw new ForbiddenError(
        "Only administrators and editors can change post status",
      );
    }

    // Resolve penulis/editor dari uuid jika admin mengubahnya.
    // Nilai "none" berarti dikosongkan (editor boleh null, author tetap wajib).
    let newAuthorId = null;
    let newEditorId = null;
    let clearEditor = false;
    if (canManageAssignments && author_uuid === "none") {
      newAuthorId = post.author_id; // author wajib ada, tidak dikosongkan
    } else if (canManageAssignments && author_uuid) {
      const authorUser = await User.findOne({ where: { uuid: author_uuid } });
      if (authorUser) newAuthorId = authorUser.id;
    }
    if (canManageAssignments && editor_uuid === "none") {
      clearEditor = true;
    } else if (canManageAssignments && editor_uuid) {
      const editorUser = await User.findOne({ where: { uuid: editor_uuid } });
      if (editorUser) newEditorId = editorUser.id;
    }

    // Update post fields. Jika user yang mengedit berbeda dari author,
    // catat sebagai editor terakhir.
    const isSameAuthor = user && post.author_id === user.id;
    const previousWorkflow = post.workflow_status;
    let newWorkflowStatus = post.workflow_status;
    if (post.workflow_status === WORKFLOW.REVISION_REQUIRED) {
      newWorkflowStatus = WORKFLOW.RESUBMITTED;
    }

    await post.update({
      title: title || post.title,
      slug: slug || post.slug,
      content: content || post.content,
      excerpt: excerpt !== undefined ? excerpt : post.excerpt,
      featured_image:
        featured_image !== undefined ? featured_image : post.featured_image,
      image_caption:
        image_caption !== undefined ? image_caption : post.image_caption,
      status: status || post.status,
      workflow_status: newWorkflowStatus,
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

    if (previousWorkflow === WORKFLOW.REVISION_REQUIRED) {
      await this.addActivity(
        post,
        user,
        "RESUBMITTED",
        WORKFLOW.RESUBMITTED,
        "Artikel telah diperbarui setelah revisi.",
        WORKFLOW.REVISION_REQUIRED,
      );
    }

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

    // Create or update notification for the updated post
    const author = await User.findByPk(post.author_id);
    const isAlreadyApproved =
      post.status === "publish" ||
      [WORKFLOW.APPROVED, WORKFLOW.PUBLISHED].includes(previousWorkflow);

    // Status notifikasi yang sesuai:
    // Jika artikel sudah dipublikasikan/disetujui sebelumnya dan diedit (misal koreksi typo oleh admin/editor),
    // jangan kembalikan status notifikasinya ke "pending", tetap "approved"!
    // Hanya jika artikel tadinya dalam status revisi yang dikirim ulang atau draf baru yang diedit oleh author,
    // status notifikasinya adalah "pending".
    let notifStatus = "pending";
    if (isAlreadyApproved && previousWorkflow !== WORKFLOW.REVISION_REQUIRED) {
      notifStatus = "approved";
    }

    const notifDesc =
      previousWorkflow === WORKFLOW.REVISION_REQUIRED
        ? `Revisi terkirim: ${post.title}`
        : isAlreadyApproved
          ? `Berita diperbarui: ${post.title}`
          : `Draf diperbarui: ${post.title}`;

    await this.upsertNotificationForArticle(post, {
      user_name: author ? author.username : "Unknown User",
      action: "edit",
      target: post.title,
      status: notifStatus,
      description: notifDesc,
      priority: "medium",
      category: "news",
      post_id: post.id,
      user_uuid: user?.uuid || author?.uuid,
    });

    return updatedPost;
  }

  async upsertNotificationForArticle(post, payload) {
    const notifications = await Notification.findAll({
      where: { article_uuid: post.uuid },
      order: [["created_at", "ASC"]],
    });

    if (notifications.length > 1) {
      const [primary, ...duplicates] = notifications;
      await Promise.all(
        duplicates.map((notif) =>
          Notification.destroy({ where: { id: notif.id } }),
        ),
      );
      await primary.update({
        ...payload,
        article_uuid: post.uuid,
        post_id: post.id,
      });
      return primary;
    }

    if (notifications.length === 1) {
      const existing = notifications[0];
      await existing.update({
        ...payload,
        article_uuid: post.uuid,
        post_id: post.id,
      });
      return existing;
    }

    return Notification.create({
      ...payload,
      article_uuid: post.uuid,
      post_id: post.id,
    });
  }

  async addActivity(
    post,
    user,
    action,
    statusAfter,
    comment = null,
    statusBefore,
  ) {
    return ArticleActivity.create({
      article_uuid: post.uuid,
      user_uuid: user?.uuid || null,
      action,
      status_before: statusBefore ?? post.workflow_status,
      status_after: statusAfter,
      comment,
    });
  }

  async getWorkflowPost(articleUuid) {
    const post = await Post.findOne({ where: { uuid: articleUuid } });
    if (!post) throw new NotFoundError("Post not found");
    return post;
  }

  async submitRevision(articleUuid, user) {
    const post = await this.getWorkflowPost(articleUuid);
    const isAuthor = user?.role === "author" && post.author_id === user.id;
    const isStaff = ["administrator", "editor"].includes(user?.role);
    if (!isAuthor && !isStaff) {
      throw new ForbiddenError(
        "Only the article author or editor can submit a revision",
      );
    }
    if (
      ![
        WORKFLOW.REVISION_REQUIRED,
        WORKFLOW.SUBMITTED,
        WORKFLOW.RESUBMITTED,
        null,
        undefined,
      ].includes(post.workflow_status)
    ) {
      throw new ForbiddenError(
        "Only posts requiring revision can be resubmitted",
      );
    }
    const before = post.workflow_status;
    await post.update({ workflow_status: WORKFLOW.RESUBMITTED });
    await this.addActivity(
      post,
      user,
      "RESUBMITTED",
      WORKFLOW.RESUBMITTED,
      null,
      before,
    );
    await this.upsertNotificationForArticle(post, {
      user_name: user?.username || "Author",
      user_uuid: user?.uuid || null,
      action: "edit",
      target: post.title,
      status: "pending",
      description:
        "Author telah mengirim revisi dan artikel siap diperiksa kembali.",
      priority: "medium",
      category: "news",
      post_id: post.id,
    });
    await sendTelegramMessage({
      topic: "REVISI_ARTIKEL",
      useHtml: true,
      text:
        `📥 <b>REVISI ARTIKEL DIKIRIM ULANG</b>\n\n` +
        `📌 <b>Judul:</b> ${escapeHtml(post.title)}\n` +
        `✍️ <b>Penulis:</b> ${escapeHtml(user?.username || "Author")}\n` +
        `⏰ <b>Waktu:</b> ${new Date().toLocaleString("id-ID")}\n\n` +
        `🔄 <b>Status:</b> <i>Revisi Telah Terkirim (Menunggu Review Editor)</i>\n` +
        `🔍 <a href="${process.env.FRONTEND_URL || "https://almuhtada.org"}/detail-news/${encodeURIComponent(post.slug)}"><b>Lihat Artikel</b></a>`,
    }).catch(() => {});
    return post;
  }

  async startReview(articleUuid, user) {
    if (!["administrator", "editor"].includes(user?.role)) {
      throw new ForbiddenError("Only an editor can review an article");
    }
    const post = await this.getWorkflowPost(articleUuid);
    if (post.workflow_status === WORKFLOW.IN_REVIEW) {
      return post;
    }
    if (
      ![
        WORKFLOW.SUBMITTED,
        WORKFLOW.RESUBMITTED,
        WORKFLOW.REVISION_REQUIRED,
        null,
        undefined,
        "",
      ].includes(post.workflow_status)
    ) {
      throw new ForbiddenError("Article is not waiting for review");
    }
    const before = post.workflow_status;
    await post.update({ workflow_status: WORKFLOW.IN_REVIEW });
    await this.addActivity(
      post,
      user,
      "IN_REVIEW",
      WORKFLOW.IN_REVIEW,
      null,
      before,
    );
    return post;
  }

  async requestRevision(articleUuid, user, comment) {
    if (!["administrator", "editor"].includes(user?.role)) {
      throw new ForbiddenError("Only an editor can request revision");
    }
    const post = await this.getWorkflowPost(articleUuid);
    const before = post.workflow_status;
    await post.update({
      workflow_status: WORKFLOW.REVISION_REQUIRED,
      rejection_reason:
        comment || "Mohon lakukan revisi sesuai catatan editor.",
      status: "draft",
    });
    await this.addActivity(
      post,
      user,
      "REVISION_REQUIRED",
      WORKFLOW.REVISION_REQUIRED,
      comment,
      before,
    );
    await this.upsertNotificationForArticle(post, {
      user_name: user?.username || "Editor",
      user_uuid: user?.uuid || null,
      action: "edit",
      target: post.title,
      status: "rejected",
      description: comment || "Artikel memerlukan revisi.",
      priority: "high",
      category: "news",
      post_id: post.id,
    });
    const author = await User.findByPk(post.author_id);
    const revisionCatatan =
      comment || "Mohon lakukan revisi sesuai catatan editor.";
    const frontendUrl = process.env.FRONTEND_URL || "https://almuhtada.org";

    // Send Telegram notification for revision request (non-blocking)
    sendTelegramMessage({
      topic: "REVISI_ARTIKEL",
      useHtml: true,
      text:
        `⚠️ <b>PERMINTAAN REVISI ARTIKEL</b>\n\n` +
        `📌 <b>Judul:</b> ${escapeHtml(post.title)}\n` +
        `✍️ <b>Penulis:</b> ${escapeHtml(author ? author.username : "Unknown")}\n` +
        `👤 <b>Editor:</b> ${escapeHtml(user?.username || "Editor")}\n` +
        `⏰ <b>Waktu:</b> ${new Date().toLocaleString("id-ID")}\n\n` +
        `📝 <b>Alasan / Catatan Revisi:</b>\n` +
        `<i>"${escapeHtml(revisionCatatan)}"</i>\n\n` +
        `🔴 <b>Status:</b> <i>Dikembalikan ke Draft (Perlu Revisi)</i>\n` +
        `🔍 <a href="${frontendUrl}/detail-news/${encodeURIComponent(post.slug)}"><b>Lihat Detail Artikel</b></a>`,
    }).catch((err) => {
      console.error(
        "[Telegram] Revision notification failed:",
        err.message || err,
      );
      this.logSystemError("Telegram revision notification failed", err, {
        articleUuid: post.uuid,
        postTitle: post.title,
        editorUuid: user?.uuid,
        type: "REVISI_ARTIKEL",
      });
    });
    return post;
  }

  async approveArticle(articleUuid, user) {
    if (!["administrator", "editor"].includes(user?.role)) {
      throw new ForbiddenError("Only an editor can approve an article");
    }
    const post = await this.getWorkflowPost(articleUuid);
    const before = post.workflow_status;
    const approvedAt = new Date();
    await post.update({
      workflow_status: WORKFLOW.APPROVED,
      status: "publish",
      approved_by_user_uuid: user?.uuid || null,
      approved_at: approvedAt,
      rejection_reason: null,
    });
    await this.addActivity(
      post,
      user,
      "APPROVED",
      WORKFLOW.APPROVED,
      null,
      before,
    );
    await this.publishArticle(post, approvedAt);
    await this.upsertNotificationForArticle(post, {
      user_name: user?.username || "Editor",
      user_uuid: user?.uuid || null,
      action: "edit",
      target: post.title,
      status: "approved",
      description: `Artikel disetujui oleh ${user?.username || "Editor"}.`,
      priority: "high",
      category: "news",
      post_id: post.id,
    });
    const author = await User.findByPk(post.author_id);
    const frontendUrl = process.env.FRONTEND_URL || "https://almuhtada.org";

    // Send Telegram notification for approval (non-blocking)
    sendTelegramMessage({
      topic: "APPROVAL",
      useHtml: true,
      text:
        `🎉 <b>ARTIKEL DISETUJUI & DIPUBLIKASIKAN</b>\n\n` +
        `📌 <b>Judul:</b> ${escapeHtml(post.title)}\n` +
        `✍️ <b>Penulis:</b> ${escapeHtml(author?.username || "-")}\n` +
        `👤 <b>Disetujui Oleh:</b> ${escapeHtml(user?.username || "Editor")}\n` +
        `⏰ <b>Waktu:</b> ${approvedAt.toLocaleString("id-ID")}\n\n` +
        `🟢 <b>Status:</b> <i>Disetujui & Diterbitkan</i>\n` +
        `🔗 <a href="${frontendUrl}/detail-news/${encodeURIComponent(post.slug)}"><b>Baca Artikel Sekarang</b></a>`,
    }).catch((err) => {
      console.error(
        "[Telegram] Approval notification failed:",
        err.message || err,
      );
      this.logSystemError("Telegram approval notification failed", err, {
        articleUuid: post.uuid,
        postTitle: post.title,
        editorUuid: user?.uuid,
        type: "APPROVAL",
      });
    });
    return post;
  }

  async publishArticle(post, approvedAt = new Date()) {
    await post.update({
      workflow_status: WORKFLOW.PUBLISHED,
      published_at: approvedAt,
    });
    await this.addActivity(
      post,
      null,
      "PUBLISHED",
      WORKFLOW.PUBLISHED,
      null,
      WORKFLOW.APPROVED,
    );
  }

  async getActivity(articleUuid) {
    await this.getWorkflowPost(articleUuid);
    return ArticleActivity.findAll({
      where: { article_uuid: articleUuid },
      order: [["created_at", "ASC"]],
    });
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
    await Notification.destroy({
      where: {
        [Op.or]: [{ article_uuid: post.uuid }, { post_id: post.id }],
      },
    });
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
          `(SELECT COUNT(*) FROM post_likes WHERE post_likes.post_id = Post.id)`,
        ),
        "likes_count",
      ],
      [
        sequelize.literal(
          `(SELECT COUNT(*) FROM comments WHERE comments.post_id = Post.id AND comments.status = 'approved')`,
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

  logSystemError(message, error, context = {}) {
    const { sendTelegramMessage } = require("./telegram.service");
    const contextStr = Object.keys(context).length
      ? `\n\n🔍 <b>Context Detail:</b>\n<code>${JSON.stringify(context, null, 2).substring(0, 800)}</code>`
      : "";

    sendTelegramMessage({
      topic: "SYSTEM_ERROR",
      useHtml: true,
      text:
        `🚨 <b>ALERT SYSTEM ERROR</b>\n\n` +
        `📌 <b>Pesan:</b> ${message}\n` +
        `⚠️ <b>Detail Error:</b> <code>${error?.message || String(error)}</code>\n` +
        `⏰ <b>Waktu:</b> ${new Date().toLocaleString("id-ID")}` +
        contextStr,
    }).catch(() => {});
    console.error("[SystemError]", message, error, context);
  }
}

module.exports = new PostService();
