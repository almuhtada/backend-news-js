const { Op } = require("sequelize");
const sequelize = require("../config/database");
const {
  Post,
  User,
  Category,
  Tag,
  PostCategory,
  PostTag,
  PostLike,
  PostViewLog,
  UserBookmark,
} = require("../schema");
const { NotFoundError } = require("../utils");

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED INCLUDE HELPER
   Attribute set yang konsisten dipakai di semua query rekomendasi.
═══════════════════════════════════════════════════════════════════════════ */
const POST_INCLUDE = [
  {
    model: User,
    as: "author",
    attributes: ["id", "username", "display_name"],
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

const POST_ATTRIBUTES = [
  "id",
  "title",
  "slug",
  "excerpt",
  "summary",
  "featured_image",
  "views",
  "published_at",
  "author_id",
  "is_featured",
  "createdAt",
];

/* ═══════════════════════════════════════════════════════════════════════════
   ENGAGEMENT SCORE LITERAL
   Sama dengan formula di getTrendingPosts agar konsisten.
   views×1 + likes×5 + comments×10
═══════════════════════════════════════════════════════════════════════════ */
const engagementScore = sequelize.literal(`(
  Post.views * 1 +
  (SELECT COUNT(*) FROM post_likes WHERE post_likes.post_id = Post.id) * 5 +
  (SELECT COUNT(*) FROM comments WHERE comments.post_id = Post.id AND comments.status = 'approved') * 10
)`);

class RecommendationService {
  /* ─────────────────────────────────────────────────────────────────────
     1. TRACK VIEW — fire-and-forget, dipanggil saat user buka artikel
     Tidak blocking; error diabaikan agar tidak ganggu response utama.
  ───────────────────────────────────────────────────────────────────── */
  async trackView({ postId, userIdentifier, userId = null }) {
    try {
      await Promise.all([
        Post.increment("views", { where: { id: postId } }),
        PostViewLog.create({
          post_id: postId,
          user_identifier: userIdentifier,
          user_id: userId || null,
          viewed_at: new Date(),
        }),
      ]);
    } catch {
      // Silent fail — view log tidak boleh ganggu response utama
    }
  }

  /* ─────────────────────────────────────────────────────────────────────
     2. GET RELATED POSTS (untuk DETAIL NEWS page)
     Strategi bobot:
       - Kategori sama     → 60-70% slot → diambil lebih dulu
       - Tag sama          → 20-25% slot → diambil setelah kategori
       - Author sama       → 10-15% slot → diambil jika masih kurang
       - Fallback trending → jika total < limit
     Artikel saat ini selalu dikecualikan.
  ───────────────────────────────────────────────────────────────────── */
  async getRelatedPosts({ postId, limit = 6 }) {
    // Ambil data artikel saat ini (kategori + tag + author)
    const currentPost = await Post.findByPk(postId, {
      attributes: ["id", "author_id"],
      include: [
        {
          model: Category,
          as: "categories",
          attributes: ["id"],
          through: { attributes: [] },
        },
        {
          model: Tag,
          as: "tags",
          attributes: ["id"],
          through: { attributes: [] },
        },
      ],
    });

    if (!currentPost) throw new NotFoundError("Post not found");

    const categoryIds = currentPost.categories.map((c) => c.id);
    const tagIds = currentPost.tags.map((t) => t.id);
    const authorId = currentPost.author_id;

    const collected = new Map(); // id → post, untuk deduplikasi
    const limitInt = parseInt(limit);

    // ── Slot 1: Kategori sama (target ~60% dari limit) ──────────────
    const categorySlot = Math.ceil(limitInt * 0.65);
    if (categoryIds.length > 0) {
      const byCategory = await Post.findAll({
        where: { status: "publish", id: { [Op.ne]: postId } },
        attributes: [
          ...POST_ATTRIBUTES,
          [engagementScore, "engagement_score"],
        ],
        include: [
          ...POST_INCLUDE,
          {
            model: Category,
            as: "categories",
            attributes: ["id", "name", "slug"],
            through: { attributes: [] },
            where: { id: { [Op.in]: categoryIds } },
          },
        ],
        order: [[sequelize.literal("engagement_score"), "DESC"]],
        limit: categorySlot,
        subQuery: false,
      });
      byCategory.forEach((p) => collected.set(p.id, p));
    }

    // ── Slot 2: Tag sama (target ~25% dari limit) ───────────────────
    const tagSlot = Math.ceil(limitInt * 0.25);
    const remaining1 = limitInt - collected.size;
    if (tagIds.length > 0 && remaining1 > 0) {
      const byTag = await Post.findAll({
        where: {
          status: "publish",
          id: { [Op.notIn]: [postId, ...collected.keys()] },
        },
        attributes: [
          ...POST_ATTRIBUTES,
          [engagementScore, "engagement_score"],
        ],
        include: [
          ...POST_INCLUDE,
          {
            model: Tag,
            as: "tags",
            attributes: ["id", "name", "slug"],
            through: { attributes: [] },
            where: { id: { [Op.in]: tagIds } },
          },
        ],
        order: [[sequelize.literal("engagement_score"), "DESC"]],
        limit: Math.min(tagSlot, remaining1),
        subQuery: false,
      });
      byTag.forEach((p) => {
        if (!collected.has(p.id)) collected.set(p.id, p);
      });
    }

    // ── Slot 3: Author sama jika masih kurang ──────────────────────
    const remaining2 = limitInt - collected.size;
    if (remaining2 > 0) {
      const byAuthor = await Post.findAll({
        where: {
          status: "publish",
          author_id: authorId,
          id: { [Op.notIn]: [postId, ...collected.keys()] },
        },
        attributes: POST_ATTRIBUTES,
        include: POST_INCLUDE,
        order: [["published_at", "DESC"]],
        limit: remaining2,
      });
      byAuthor.forEach((p) => {
        if (!collected.has(p.id)) collected.set(p.id, p);
      });
    }

    // ── Fallback: Trending global jika masih kurang ────────────────
    const remaining3 = limitInt - collected.size;
    if (remaining3 > 0) {
      const fallback = await Post.findAll({
        where: {
          status: "publish",
          id: { [Op.notIn]: [postId, ...collected.keys()] },
        },
        attributes: [
          ...POST_ATTRIBUTES,
          [engagementScore, "engagement_score"],
        ],
        include: POST_INCLUDE,
        order: [[sequelize.literal("engagement_score"), "DESC"]],
        limit: remaining3,
      });
      fallback.forEach((p) => {
        if (!collected.has(p.id)) collected.set(p.id, p);
      });
    }

    return Array.from(collected.values()).slice(0, limitInt);
  }

  /* ─────────────────────────────────────────────────────────────────────
     3. GET RECOMMENDED POSTS (untuk HOME page)
     Personalized feed berbasis sinyal eksplisit user:
       - Logged-in user  → ambil top kategori dari likes & bookmarks
       - Anonymous user  → trending global (fallback)
     Artikel yang sudah pernah dibaca (view_logs) dikecualikan.
  ───────────────────────────────────────────────────────────────────── */
  async getRecommendedPosts({ userIdentifier, userId = null, limit = 8 }) {
    const limitInt = parseInt(limit);

    // ── Cari kategori favorit user dari likes ──────────────────────
    let preferredCategoryIds = [];

    if (userId) {
      // Logged-in: gabungkan sinyal dari likes + bookmarks
      const likedPostIds = await PostLike.findAll({
        where: { user_id: userId },
        attributes: ["post_id"],
        limit: 50,
        order: [["createdAt", "DESC"]],
      }).then((rows) => rows.map((r) => r.post_id));

      const bookmarkedPostIds = await UserBookmark.findAll({
        where: { user_id: userId },
        attributes: ["post_id"],
        limit: 30,
        order: [["created_at", "DESC"]],
      }).then((rows) => rows.map((r) => r.post_id));

      const signalPostIds = [...new Set([...likedPostIds, ...bookmarkedPostIds])];

      if (signalPostIds.length > 0) {
        // Hitung frekuensi kategori dari artikel yang diinteraksi
        const catFreq = await PostCategory.findAll({
          where: { post_id: { [Op.in]: signalPostIds } },
          attributes: [
            "category_id",
            [sequelize.fn("COUNT", sequelize.col("category_id")), "freq"],
          ],
          group: ["category_id"],
          order: [[sequelize.literal("freq"), "DESC"]],
          limit: 3, // Ambil top 3 kategori
          raw: true,
        });
        preferredCategoryIds = catFreq.map((r) => r.category_id);
      }
    } else {
      // Anonymous: gunakan sinyal dari likes via user_identifier
      const likedPostIds = await PostLike.findAll({
        where: { user_identifier: userIdentifier },
        attributes: ["post_id"],
        limit: 30,
        order: [["createdAt", "DESC"]],
      }).then((rows) => rows.map((r) => r.post_id));

      if (likedPostIds.length > 0) {
        const catFreq = await PostCategory.findAll({
          where: { post_id: { [Op.in]: likedPostIds } },
          attributes: [
            "category_id",
            [sequelize.fn("COUNT", sequelize.col("category_id")), "freq"],
          ],
          group: ["category_id"],
          order: [[sequelize.literal("freq"), "DESC"]],
          limit: 3,
          raw: true,
        });
        preferredCategoryIds = catFreq.map((r) => r.category_id);
      }
    }

    // ── Ambil ID artikel yang sudah pernah dibaca user ─────────────
    const readPostIds = await PostViewLog.findAll({
      where: { user_identifier: userIdentifier },
      attributes: ["post_id"],
      limit: 100,
      raw: true,
    }).then((rows) => rows.map((r) => r.post_id));

    // ── Query utama: artikel dari kategori favorit ──────────────────
    if (preferredCategoryIds.length > 0) {
      const recommended = await Post.findAll({
        where: {
          status: "publish",
          id: { [Op.notIn]: readPostIds.length > 0 ? readPostIds : [0] },
        },
        attributes: [
          ...POST_ATTRIBUTES,
          [engagementScore, "engagement_score"],
        ],
        include: [
          ...POST_INCLUDE,
          {
            model: Category,
            as: "categories",
            attributes: ["id", "name", "slug"],
            through: { attributes: [] },
            where: { id: { [Op.in]: preferredCategoryIds } },
          },
        ],
        order: [
          ["published_at", "DESC"],
          [sequelize.literal("engagement_score"), "DESC"],
        ],
        limit: limitInt,
        subQuery: false,
      });

      if (recommended.length >= Math.floor(limitInt * 0.5)) {
        return { posts: recommended, personalized: true };
      }
    }

    // ── Fallback: Trending global (anonymous atau data tidak cukup) ─
    const trending = await Post.findAll({
      where: {
        status: "publish",
        published_at: {
          [Op.gte]: new Date(Date.now() - 72 * 60 * 60 * 1000), // 72 jam
        },
        id: { [Op.notIn]: readPostIds.length > 0 ? readPostIds : [0] },
      },
      attributes: [
        ...POST_ATTRIBUTES,
        [engagementScore, "engagement_score"],
      ],
      include: POST_INCLUDE,
      order: [[sequelize.literal("engagement_score"), "DESC"]],
      limit: limitInt,
    });

    // Jika masih kurang dari limit, remove time filter
    if (trending.length < limitInt) {
      const fallback = await Post.findAll({
        where: {
          status: "publish",
          id: { [Op.notIn]: readPostIds.length > 0 ? readPostIds : [0] },
        },
        attributes: [
          ...POST_ATTRIBUTES,
          [engagementScore, "engagement_score"],
        ],
        include: POST_INCLUDE,
        order: [[sequelize.literal("engagement_score"), "DESC"]],
        limit: limitInt,
      });
      return { posts: fallback, personalized: false };
    }

    return { posts: trending, personalized: false };
  }

  /* ─────────────────────────────────────────────────────────────────────
     4. GET TRENDING BY CATEGORY (untuk sidebar/widget di detail page)
     Tampilkan artikel trending dalam kategori yang sama dengan artikel
     yang sedang dibaca. Berguna untuk widget "Terpopuler di Kategori Ini".
  ───────────────────────────────────────────────────────────────────── */
  async getTrendingByCategory({ categoryId, excludePostId = null, limit = 5, hours = 48 }) {
    const limitInt = parseInt(limit);
    const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000);

    const where = {
      status: "publish",
      published_at: { [Op.gte]: timeThreshold },
    };
    if (excludePostId) {
      where.id = { [Op.ne]: excludePostId };
    }

    let posts = await Post.findAll({
      where,
      attributes: [
        ...POST_ATTRIBUTES,
        [engagementScore, "engagement_score"],
      ],
      include: [
        ...POST_INCLUDE,
        {
          model: Category,
          as: "categories",
          attributes: ["id", "name", "slug"],
          through: { attributes: [] },
          where: { id: categoryId },
        },
      ],
      order: [[sequelize.literal("engagement_score"), "DESC"]],
      limit: limitInt,
      subQuery: false,
    });

    // Fallback jika kurang dari limit: hilangkan filter waktu
    if (posts.length < limitInt) {
      const fallbackWhere = { status: "publish" };
      if (excludePostId) fallbackWhere.id = { [Op.ne]: excludePostId };

      posts = await Post.findAll({
        where: fallbackWhere,
        attributes: [
          ...POST_ATTRIBUTES,
          [engagementScore, "engagement_score"],
        ],
        include: [
          ...POST_INCLUDE,
          {
            model: Category,
            as: "categories",
            attributes: ["id", "name", "slug"],
            through: { attributes: [] },
            where: { id: categoryId },
          },
        ],
        order: [[sequelize.literal("engagement_score"), "DESC"]],
        limit: limitInt,
        subQuery: false,
      });
    }

    return posts;
  }

  /* ─────────────────────────────────────────────────────────────────────
     5. TOGGLE BOOKMARK
     Tambah / hapus bookmark. Return status bookmark terkini.
  ───────────────────────────────────────────────────────────────────── */
  async toggleBookmark({ userId, postId }) {
    const existing = await UserBookmark.findOne({
      where: { user_id: userId, post_id: postId },
    });

    if (existing) {
      await existing.destroy();
      const count = await UserBookmark.count({ where: { post_id: postId } });
      return { bookmarked: false, bookmarkCount: count };
    }

    await UserBookmark.create({ user_id: userId, post_id: postId });
    const count = await UserBookmark.count({ where: { post_id: postId } });
    return { bookmarked: true, bookmarkCount: count };
  }

  /* ─────────────────────────────────────────────────────────────────────
     6. GET BOOKMARK STATUS — cek apakah user sudah bookmark post ini
  ───────────────────────────────────────────────────────────────────── */
  async getBookmarkStatus({ userId, postId }) {
    const existing = await UserBookmark.findOne({
      where: { user_id: userId, post_id: postId },
    });
    const count = await UserBookmark.count({ where: { post_id: postId } });
    return { bookmarked: !!existing, bookmarkCount: count };
  }

  /* ─────────────────────────────────────────────────────────────────────
     7. GET USER BOOKMARKS — daftar artikel yang disimpan user
  ───────────────────────────────────────────────────────────────────── */
  async getUserBookmarks({ userId, limit = 20, offset = 0 }) {
    const { count, rows } = await UserBookmark.findAndCountAll({
      where: { user_id: userId },
      include: [
        {
          model: Post,
          as: "post",
          where: { status: "publish" },
          attributes: POST_ATTRIBUTES,
          include: POST_INCLUDE,
        },
      ],
      order: [["created_at", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return {
      bookmarks: rows.map((b) => b.post).filter(Boolean),
      total: count,
    };
  }

  /* ─────────────────────────────────────────────────────────────────────
     8. GET HOT TOPICS — trending tags dalam window waktu tertentu
     Dipakai untuk widget "Topik Hangat" di Home & Explore.
  ───────────────────────────────────────────────────────────────────── */
  async getHotTopics({ limit = 10, hours = 24 }) {
    const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Cari post trending dalam window → ambil tag-nya → hitung frekuensi
    const trendingPostIds = await Post.findAll({
      where: { status: "publish", published_at: { [Op.gte]: timeThreshold } },
      attributes: ["id"],
      raw: true,
    }).then((rows) => rows.map((r) => r.id));

    if (trendingPostIds.length === 0) {
      return [];
    }

    const tagFreq = await PostTag.findAll({
      where: { post_id: { [Op.in]: trendingPostIds } },
      attributes: [
        "tag_id",
        [sequelize.fn("COUNT", sequelize.col("tag_id")), "post_count"],
      ],
      include: [
        {
          model: Tag,
          as: "tag",
          attributes: ["id", "name", "slug"],
        },
      ],
      group: ["tag_id", "tag.id", "tag.name", "tag.slug"],
      order: [[sequelize.literal("post_count"), "DESC"]],
      limit: parseInt(limit),
    });

    return tagFreq.map((row) => ({
      id: row.tag.id,
      name: row.tag.name,
      slug: row.tag.slug,
      post_count: parseInt(row.dataValues.post_count),
    }));
  }
}

module.exports = new RecommendationService();
