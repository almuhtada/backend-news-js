const PageContent = require("../schema/pageContent");

// Get all page contents
const getAllPageContents = async (req, res) => {
  try {
    const pageContents = await PageContent.findAll({
      order: [["updatedAt", "DESC"]],
    });

    res.json({
      success: true,
      data: pageContents,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get page content by key
const getPageContentByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const pageContent = await PageContent.findOne({
      where: { page_key: key },
    });

    if (!pageContent) {
      return res.status(404).json({
        success: false,
        message: "Page content not found",
      });
    }

    res.json({
      success: true,
      data: pageContent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Create or update page content (upsert)
const upsertPageContent = async (req, res) => {
  try {
    const { page_key, title, content, status } = req.body;

    if (!page_key || !title || !content) {
      return res.status(400).json({
        success: false,
        message: "page_key, title, and content are required",
      });
    }

    const [pageContent, created] = await PageContent.upsert(
      {
        page_key,
        title,
        content,
        status: status || "publish",
      },
      {
        returning: true,
      }
    );

    res.status(created ? 201 : 200).json({
      success: true,
      message: created ? "Page content created" : "Page content updated",
      data: pageContent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete page content
const deletePageContent = async (req, res) => {
  try {
    const { key } = req.params;
    const pageContent = await PageContent.findOne({
      where: { page_key: key },
    });

    if (!pageContent) {
      return res.status(404).json({
        success: false,
        message: "Page content not found",
      });
    }

    await pageContent.destroy();

    res.json({
      success: true,
      message: "Page content deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  getAllPageContents,
  getPageContentByKey,
  upsertPageContent,
  deletePageContent,
};
