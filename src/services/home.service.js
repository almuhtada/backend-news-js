const { Op } = require("sequelize");
const sequelize = require("../config/database");
const { Post, User, Category } = require("../schema");

const HOME_CANDIDATE_LIMIT = 80;
const HOME_WINDOW_DAYS = 7;
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
const byEngagement = (a, b) =>
  (Number(b.engagement_score) || 0) - (Number(a.engagement_score) || 0) ||
  byNewest(a, b);
const byHeroScore = (a, b) =>
  (Number(b.views) || 0) * 2 +
    (Number(b.engagement_score) || 0) -
    ((Number(a.views) || 0) * 2 + (Number(a.engagement_score) || 0)) ||
  byNewest(a, b);
const byEditorial = (a, b) =>
  Number(b.is_featured) - Number(a.is_featured) || byPopularity(a, b);

function takeUniqueArticles(candidates, usedArticleIds, limit) {
  const selected = [];
  for (const article of candidates) {
    if (selected.length >= limit || usedArticleIds.has(article.id)) continue;
    usedArticleIds.add(article.id);
    selected.push(article);
  }
  return selected;
}

class HomeService {
  async getHome() {
    const publishedSince = new Date();
    publishedSince.setDate(publishedSince.getDate() - HOME_WINDOW_DAYS);
    const candidates = await Post.findAll({
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
      ],
      include: postInclude,
      order: [["published_at", "DESC"]],
      limit: HOME_CANDIDATE_LIMIT,
    });
    const newest = [...candidates].sort(byNewest);
    const editorial = [...candidates].sort(byEditorial);
    const popular = [...candidates].sort(byPopularity);
    const heroCandidates = [...candidates].sort(byHeroScore);
    const viralCandidates = [...candidates].sort(byEngagement);
    const usedArticleIds = new Set();
    const hero = takeUniqueArticles(heroCandidates, usedArticleIds, 5);
    const viral = takeUniqueArticles(viralCandidates, usedArticleIds, 4);
    const latest = takeUniqueArticles(newest, usedArticleIds, 6);
    const editorPicks = takeUniqueArticles(editorial, usedArticleIds, 4);
    const mostRead = takeUniqueArticles(popular, usedArticleIds, 5);
    if (mostRead.length < 3) {
      mostRead.push(
        ...popular
          .filter((post) => !mostRead.some((item) => item.id === post.id))
          .slice(0, 2),
      );
    }
    const remaining = candidates.filter((post) => !usedArticleIds.has(post.id));
    return {
      hero: { main: hero[0] || null, supporting: hero.slice(1) },
      latest,
      editorPicks,
      viral,
      mostRead,
      remaining,
    };
  }
}

module.exports = new HomeService();
module.exports.takeUniqueArticles = takeUniqueArticles;
