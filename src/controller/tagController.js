const { Tag } = require("../schema");

// Get all tags
exports.getAllTags = async (req, res) => {
  try {
    const tags = await Tag.findAll({
      order: [["name", "ASC"]],
    });

    res.json({
      success: true,
      data: tags,
    });
  } catch (error) {
    console.error("Error getting tags:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching tags",
      error: error.message,
    });
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
