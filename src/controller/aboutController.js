const { About } = require('../schema');

// Get all about sections
const getAllAboutSections = async (req, res) => {
  try {
    const sections = await About.findAll({
      order: [['order_number', 'ASC'], ['id', 'ASC']]
    });

    res.json({
      success: true,
      data: sections
    });
  } catch (error) {
    console.error('Error fetching about sections:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching about sections',
      error: error.message
    });
  }
};

// Get single about section by key
const getAboutSectionByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const section = await About.findOne({
      where: { section_key: key }
    });

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    res.json({
      success: true,
      data: section
    });
  } catch (error) {
    console.error('Error fetching about section:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching about section',
      error: error.message
    });
  }
};

// Create or update about section
const upsertAboutSection = async (req, res) => {
  try {
    const { section_key, title, content, image_url, order_number, metadata } = req.body;

    if (!section_key) {
      return res.status(400).json({
        success: false,
        message: 'section_key is required'
      });
    }

    const [section, created] = await About.upsert({
      section_key,
      title,
      content,
      image_url,
      order_number: order_number || 0,
      metadata
    }, {
      returning: true
    });

    res.json({
      success: true,
      message: created ? 'Section created successfully' : 'Section updated successfully',
      data: section
    });
  } catch (error) {
    console.error('Error upserting about section:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving about section',
      error: error.message
    });
  }
};

// Delete about section
const deleteAboutSection = async (req, res) => {
  try {
    const { id } = req.params;

    const section = await About.findByPk(id);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    await section.destroy();

    res.json({
      success: true,
      message: 'Section deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting about section:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting about section',
      error: error.message
    });
  }
};

module.exports = {
  getAllAboutSections,
  getAboutSectionByKey,
  upsertAboutSection,
  deleteAboutSection
};
