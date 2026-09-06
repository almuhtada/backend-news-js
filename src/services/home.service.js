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
    let candidates = await Post.findAll({
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
        ],
        include: postInclude,
        order: [["published_at", "DESC"], ["createdAt", "DESC"]],
        limit: HOME_CANDIDATE_LIMIT,
      });
    }

    const newest = [...candidates].sort(byNewest);
    const editorial = [...candidates].sort(byEditorial);
    const popular = [...candidates].sort(byPopularity);
    const heroCandidates = [...candidates].sort(byHeroScore);
    const viralCandidates = [...candidates].sort(byEngagement);

    const heroIds = new Set();
    const hero = takeUniqueArticles(heroCandidates, heroIds, 5);

    const viralIds = new Set();
    const viral = takeUniqueArticles(viralCandidates, viralIds, 7);

    const latestIds = new Set();
    const latest = takeUniqueArticles(newest, latestIds, 6);

    const editorIds = new Set();
    const editorPicks = takeUniqueArticles(editorial, editorIds, 6);

    const mostReadIds = new Set();
    const mostRead = takeUniqueArticles(popular, mostReadIds, 6);

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
