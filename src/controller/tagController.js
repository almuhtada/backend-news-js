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
      `SELECT t.id, t.name, t.slug, t.description,
              COUNT(DISTINCT pt.post_id) AS post_count
       FROM tags t
       LEFT JOIN post_tags pt ON pt.tag_id = t.id
       GROUP BY t.id, t.name, t.slug, t.description
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

// Create new tag
exports.createTag = async (req, res) => {
  try {
    const { name, slug, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Tag name is required",
      });
    }

    const tag = await Tag.create({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
      description,
    });

    clearTagsCache();
    res.status(201).json({
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

    const tag = await Tag.findByPk(id);

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

    const tag = await Tag.findByPk(id);

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
