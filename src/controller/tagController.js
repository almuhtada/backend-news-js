const { Tag } = require("../schema");
const sequelize = require("../config/database");

// Simple cache (TTL: 5 menit)
let _tagsCache = null;
let _tagsCacheTs = 0;
const TAGS_TTL = 5 * 60 * 1000;
function clearTagsCache() { _tagsCache = null; _tagsCacheTs = 0; }

// Get all tags
exports.getAllTags = async (req, res) => {
  try {
    if (_tagsCache && Date.now() - _tagsCacheTs < TAGS_TTL) {
      return res.json({ success: true, data: _tagsCache });
    }

    const tags = await sequelize.query(
      `SELECT t.id, t.uuid, t.name, t.slug, t.description,
              COUNT(DISTINCT pt.post_id) AS post_count
       FROM tags t
       LEFT JOIN post_tags pt ON pt.tag_id = t.id
       GROUP BY t.id, t.uuid, t.name, t.slug, t.description
       ORDER BY t.name ASC`,
      { type: sequelize.QueryTypes.SELECT }
    );

    const result = tags.map((t) => ({ ...t, post_count: Number(t.post_count) || 0 }));
    _tagsCache = result;
    _tagsCacheTs = Date.now();

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error getting tags:", error);
    res.status(500).json({ success: false, message: "Error fetching tags", error: error.message });
  }
};

// Get most used tags (sorted by post_count)
exports.getPopularTags = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const tags = await sequelize.query(
      `SELECT t.id, t.uuid, t.name, t.slug,
              COUNT(DISTINCT pt.post_id) AS post_count
       FROM tags t
       LEFT JOIN post_tags pt ON pt.tag_id = t.id
       GROUP BY t.id, t.uuid, t.name, t.slug
       ORDER BY post_count DESC, t.name ASC
       LIMIT :limit`,
      { type: sequelize.QueryTypes.SELECT, replacements: { limit } }
    );

    const result = tags.map((t) => ({ ...t, post_count: Number(t.post_count) || 0 }));
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error getting popular tags:", error);
    res.status(500).json({ success: false, message: "Error fetching popular tags", error: error.message });
  }
};

// Create new tag (or return existing if already exists)
exports.createTag = async (req, res) => {
  try {
    const { name, slug, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tag name is required",
      });
    }

    const cleanName = name.trim();
    const tagSlug =
      slug ||
      cleanName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") ||
      `tag-${Date.now()}`;

    // Find existing tag by name (case-insensitive) or slug
    const { Op } = require("sequelize");
    let tag = await Tag.findOne({
      where: {
        [Op.or]: [
          sequelize.where(
            sequelize.fn("LOWER", sequelize.col("name")),
            cleanName.toLowerCase(),
          ),
          { slug: tagSlug },
        ],
      },
    });

    if (!tag) {
      tag = await Tag.create({
        name: cleanName,
        slug: tagSlug,
        description: description || null,
      });
      clearTagsCache();
      return res.status(201).json({
        success: true,
        data: tag,
      });
    }

    return res.status(200).json({
      success: true,
      data: tag,
    });
  } catch (error) {
    console.error("Error creating tag:", error);
    res.status(500).json({
      success: false,
      message: "Error creating tag",
      error: error.message,
    });
  }
};

// Update tag
exports.updateTag = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description } = req.body;

    const tag = await Tag.findOne({ where: { uuid: id } });

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: "Tag not found",
      });
    }

    await tag.update({
      name: name || tag.name,
      slug: slug || tag.slug,
      description: description !== undefined ? description : tag.description,
    });

    clearTagsCache();
    res.json({
      success: true,
      data: tag,
    });
  } catch (error) {
    console.error("Error updating tag:", error);
    res.status(500).json({
      success: false,
      message: "Error updating tag",
      error: error.message,
    });
  }
};

// Delete tag
exports.deleteTag = async (req, res) => {
  try {
    const { id } = req.params;

    const tag = await Tag.findOne({ where: { uuid: id } });

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: "Tag not found",
      });
    }

    await tag.destroy();
    clearTagsCache();
    res.json({
      success: true,
      message: "Tag deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting tag:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting tag",
      error: error.message,
    });
  }
};
