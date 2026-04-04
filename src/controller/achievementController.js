const { Achievement } = require('../schema');

// Get all achievements
const getAllAchievements = async (req, res) => {
  try {
    const { year, search } = req.query;
    const where = {};

    if (year) {
      where.years = parseInt(year);
    }

    let achievements = await Achievement.findAll({
      where,
      order: [['years', 'DESC'], ['createdAt', 'DESC']]
    });

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      achievements = achievements.filter(
        a => a.title.toLowerCase().includes(searchLower) ||
             a.name.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      success: true,
      data: achievements
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching achievements',
      error: error.message
    });
  }
};

// Get single achievement
const getAchievementById = async (req, res) => {
  try {
    const { id } = req.params;
    const achievement = await Achievement.findByPk(id);

    if (!achievement) {
      return res.status(404).json({
        success: false,
        message: 'Achievement not found'
      });
    }

    res.json({
      success: true,
      data: achievement
    });
  } catch (error) {
    console.error('Error fetching achievement:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching achievement',
      error: error.message
    });
  }
};

// Create achievement
const createAchievement = async (req, res) => {
  try {
    const { title, name, years } = req.body;

    if (!title || !name || !years) {
      return res.status(400).json({
        success: false,
        message: 'Title, name, and years are required'
      });
    }

    const achievement = await Achievement.create({
      title,
      name,
      years: parseInt(years)
    });

    res.status(201).json({
      success: true,
      message: 'Achievement created successfully',
      data: achievement
    });
  } catch (error) {
    console.error('Error creating achievement:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating achievement',
      error: error.message
    });
  }
};

// Update achievement
const updateAchievement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, name, years } = req.body;

    const achievement = await Achievement.findByPk(id);

    if (!achievement) {
      return res.status(404).json({
        success: false,
        message: 'Achievement not found'
      });
    }

    await achievement.update({
      title: title || achievement.title,
      name: name || achievement.name,
      years: years ? parseInt(years) : achievement.years
    });

    res.json({
      success: true,
      message: 'Achievement updated successfully',
      data: achievement
    });
  } catch (error) {
    console.error('Error updating achievement:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating achievement',
      error: error.message
    });
  }
};

// Delete achievement
const deleteAchievement = async (req, res) => {
  try {
    const { id } = req.params;

    const achievement = await Achievement.findByPk(id);

    if (!achievement) {
      return res.status(404).json({
        success: false,
        message: 'Achievement not found'
      });
    }

    await achievement.destroy();

    res.json({
      success: true,
      message: 'Achievement deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting achievement:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting achievement',
      error: error.message
    });
  }
};

module.exports = {
  getAllAchievements,
  getAchievementById,
  createAchievement,
  updateAchievement,
  deleteAchievement
};
