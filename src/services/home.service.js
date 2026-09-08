const { Op } = require("sequelize");
const sequelize = require("../config/database");
const { Post, User, Category } = require("../schema");

const HOME_CANDIDATE_LIMIT = 80;
const HOME_WINDOW_DAYS = 10;
const postInclude = [
  { model: User, as: "author", attributes: ["id", "username", "display_name"] },
  {
    model: Category,
    as: "categories",
    attributes: ["id", "name", "slug"],
    through: { attributes: [] },
  },
];
const postAttributes = [
  "id",
  "uuid",
  "title",
  "slug",
  "excerpt",
  "content",
  "featured_image",
  "is_featured",
  "views",
  "published_at",
  "createdAt",
  "updatedAt",
];
const byNewest = (a, b) =>
  new Date(b.published_at || b.createdAt) -
  new Date(a.published_at || a.createdAt);
const byPopularity = (a, b) =>
  (b.views || 0) - (a.views || 0) || byNewest(a, b);
const byHeroScore = (a, b) =>
  (Number(b.views) || 0) * 2 +
    (Number(b.likes_count) || 0) * 5 +
    (Number(b.comments_count) || 0) * 10 -
    ((Number(a.views) || 0) * 2 +
      (Number(a.likes_count) || 0) * 5 +
      (Number(a.comments_count) || 0) * 10) || byNewest(a, b);
const byViralScore = (a, b) =>
  (Number(b.likes_count) || 0) * 8 +
    (Number(b.comments_count) || 0) * 20 +
    (Number(b.views) || 0) -
    ((Number(a.likes_count) || 0) * 8 +
      (Number(a.comments_count) || 0) * 20 +
      (Number(a.views) || 0)) || byNewest(a, b);
const byEditorial = (a, b) =>
  Number(b.is_featured) - Number(a.is_featured) || byPopularity(a, b);

function takeUniqueArticles(candidates, usedArticleIds, limit) {
  const selected = [];
  for (const article of candidates) {
    const articleKey = String(article.id || article.slug);
    if (selected.length >= limit || usedArticleIds.has(articleKey)) continue;
    usedArticleIds.add(articleKey);
    selected.push(article);
  }
  return selected;
}

class HomeService {
  async getHome() {
    const publishedSince = new Date();
    publishedSince.setDate(publishedSince.getDate() - HOME_WINDOW_DAYS);
    const recentCandidates = await Post.findAll({
      where: {
        status: "publish",
        published_at: { [Op.gte]: publishedSince },
      },
      attributes: [
        ...postAttributes,
        [
          sequelize.literal(
            "(Post.views * 1 + (SELECT COUNT(*) FROM post_likes WHERE post_likes.post_id = Post.id) * 5 + (SELECT COUNT(*) FROM comments WHERE comments.post_id = Post.id AND comments.status = 'approved') * 10)",
          ),
          "engagement_score",
        ],
        [
          sequelize.literal(
            "(SELECT COUNT(*) FROM post_likes WHERE post_likes.post_id = Post.id)",
          ),
          "likes_count",
        ],
        [
          sequelize.literal(
            "(SELECT COUNT(*) FROM comments WHERE comments.post_id = Post.id AND comments.status = 'approved')",
          ),
          "comments_count",
        ],
      ],
      include: postInclude,
      order: [["published_at", "DESC"]],
      limit: HOME_CANDIDATE_LIMIT,
    });

    let candidates = recentCandidates;

    if (candidates.length < 15) {
      candidates = await Post.findAll({
        where: {
          status: "publish",
        },
        attributes: [
          ...postAttributes,
          [
            sequelize.literal(
              "(Post.views * 1 + (SELECT COUNT(*) FROM post_likes WHERE post_likes.post_id = Post.id) * 5 + (SELECT COUNT(*) FROM comments WHERE comments.post_id = Post.id AND comments.status = 'approved') * 10)",
            ),
            "engagement_score",
          ],
          [
            sequelize.literal(
              "(SELECT COUNT(*) FROM post_likes WHERE post_likes.post_id = Post.id)",
            ),
            "likes_count",
          ],
          [
            sequelize.literal(
              "(SELECT COUNT(*) FROM comments WHERE comments.post_id = Post.id AND comments.status = 'approved')",
            ),
            "comments_count",
          ],
        ],
        include: postInclude,
        order: [
          ["published_at", "DESC"],
          ["createdAt", "DESC"],
        ],
        limit: HOME_CANDIDATE_LIMIT,
      });
    }

    const newest = [...recentCandidates].sort(byNewest);
    const editorial = [...candidates].sort(byEditorial);
    const popular = [...candidates].sort(byPopularity);
    const heroCandidates = [...recentCandidates].sort(byHeroScore);
    const viralCandidates = [...candidates].sort(byViralScore);

    const usedArticleIds = new Set();
    const hero = takeUniqueArticles(heroCandidates, usedArticleIds, 5);
    const latest = takeUniqueArticles(newest, usedArticleIds, 6);
    const viral = takeUniqueArticles(viralCandidates, usedArticleIds, 7);
    const editorPicks = takeUniqueArticles(editorial, usedArticleIds, 6);
    const mostRead = takeUniqueArticles(popular, usedArticleIds, 6);

    return {
      hero: { main: hero[0] || null, supporting: hero.slice(1) },
      latest,
      editorPicks,
      viral,
      mostRead,
      remaining: candidates,
    };
  }
}

module.exports = new HomeService();
module.exports.takeUniqueArticles = takeUniqueArticles;
