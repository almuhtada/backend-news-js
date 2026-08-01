const { Post, Tag, Category, Comment } = require("../schema");
const { Op } = require("sequelize");
const { detectGambling } = require("../services/spamDetector.service");

const stripHtml = (html = "") =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const TYPES = ["comment", "post", "tag", "category"];

/**
 * Scan satu jenis konten (komentar / berita / tag / kategori) untuk deteksi
 * konten judi/spam. Dipisah per jenis supaya hemat memori dan tidak
 * membebani server. Hanya deteksi — tidak mengubah data apa pun.
 *
 * POST /api/moderation/scan?type=comment|post|tag|category
 */
exports.scanContentType = async (req, res) => {
  try {
    const type = req.query.type || "comment";
    if (!TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Tipe scan tidak valid. Gunakan: ${TYPES.join(", ")}`,
      });
    }

    const detected = [];

    if (type === "comment") {
      const comments = await Comment.findAll({
        where: { status: { [Op.notIn]: ["spam", "trash"] } },
        attributes: ["id", "uuid", "content", "author_name", "author_url"],
      });
      for (const c of comments) {
        const text = [c.content, c.author_name, c.author_url || ""].join(" ");
        const { isSpam, matchedKeywords } = detectGambling(text);
        if (isSpam) {
          detected.push({
            type: "comment",
            id: c.id,
            uuid: c.uuid,
            name: c.author_name,
            preview: c.content.substring(0, 160),
            matchedKeywords,
          });
        }
      }
    } else if (type === "post") {
      const posts = await Post.findAll({
        where: { status: { [Op.notIn]: ["trash"] } },
        attributes: ["id", "uuid", "title", "content", "excerpt"],
      });
      for (const p of posts) {
        const text = [
          p.title,
          stripHtml(p.content),
          p.excerpt || "",
        ].join(" ");
        const { isSpam, matchedKeywords } = detectGambling(text);
        if (isSpam) {
          detected.push({
            type: "post",
            id: p.id,
            uuid: p.uuid,
            name: p.title,
            preview: stripHtml(p.content).substring(0, 160),
            matchedKeywords,
          });
        }
      }
    } else if (type === "tag") {
      const tags = await Tag.findAll({
        attributes: ["id", "uuid", "name", "description"],
      });
      for (const t of tags) {
        const text = [t.name, t.description || ""].join(" ");
        const { isSpam, matchedKeywords } = detectGambling(text);
        if (isSpam) {
          detected.push({
            type: "tag",
            id: t.id,
            uuid: t.uuid,
            name: t.name,
            preview: t.description || t.name,
            matchedKeywords,
          });
        }
      }
    } else if (type === "category") {
      const categories = await Category.findAll({
        attributes: ["id", "uuid", "name", "description"],
      });
      for (const cat of categories) {
        const text = [cat.name, cat.description || ""].join(" ");
        const { isSpam, matchedKeywords } = detectGambling(text);
        if (isSpam) {
          detected.push({
            type: "category",
            id: cat.id,
            uuid: cat.uuid,
            name: cat.name,
            preview: cat.description || cat.name,
            matchedKeywords,
          });
        }
      }
    }

    return res.json({
      success: true,
      message: `Scan ${type} selesai. ${detected.length} konten terdeteksi mengandung judi/spam.`,
      data: {
        type,
        count: detected.length,
        detected,
      },
    });
  } catch (error) {
    console.error(`Error scanning ${req.query.type} content:`, error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
