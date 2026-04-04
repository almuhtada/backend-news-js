const { Publication } = require('../schema');

// Get all publications
const getAllPublications = async (req, res) => {
  try {
    const { year, search } = req.query;
    const where = {};

    if (year) {
      where.year = parseInt(year);
    }

    let publications = await Publication.findAll({
      where,
      order: [['year', 'DESC'], ['createdAt', 'DESC']]
    });

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      publications = publications.filter(
        p => p.title.toLowerCase().includes(searchLower) ||
             p.authors.toLowerCase().includes(searchLower) ||
             (p.journal && p.journal.toLowerCase().includes(searchLower))
      );
    }

    res.json({
      success: true,
      data: publications
    });
  } catch (error) {
    console.error('Error fetching publications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching publications',
      error: error.message
    });
  }
};

// Get single publication
const getPublicationById = async (req, res) => {
  try {
    const { id } = req.params;
    const publication = await Publication.findByPk(id);

    if (!publication) {
      return res.status(404).json({
        success: false,
        message: 'Publication not found'
      });
    }

    res.json({
      success: true,
      data: publication
    });
  } catch (error) {
    console.error('Error fetching publication:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching publication',
      error: error.message
    });
  }
};

// Create publication
const createPublication = async (req, res) => {
  try {
    const { title, authors, year, journal, link } = req.body;

    if (!title || !authors || !year) {
      return res.status(400).json({
        success: false,
        message: 'Title, authors, and year are required'
      });
    }

    const publication = await Publication.create({
      title,
      authors,
      year: parseInt(year),
      journal: journal || null,
      link: link || null
    });

    res.status(201).json({
      success: true,
      message: 'Publication created successfully',
      data: publication
    });
  } catch (error) {
    console.error('Error creating publication:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating publication',
      error: error.message
    });
  }
};

// Update publication
const updatePublication = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, authors, year, journal, link } = req.body;

    const publication = await Publication.findByPk(id);

    if (!publication) {
      return res.status(404).json({
        success: false,
        message: 'Publication not found'
      });
    }

    await publication.update({
      title: title || publication.title,
      authors: authors || publication.authors,
      year: year ? parseInt(year) : publication.year,
      journal: journal !== undefined ? journal : publication.journal,
      link: link !== undefined ? link : publication.link
    });

    res.json({
      success: true,
      message: 'Publication updated successfully',
      data: publication
    });
  } catch (error) {
    console.error('Error updating publication:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating publication',
      error: error.message
    });
  }
};

// Delete publication
const deletePublication = async (req, res) => {
  try {
    const { id } = req.params;

    const publication = await Publication.findByPk(id);

    if (!publication) {
      return res.status(404).json({
        success: false,
        message: 'Publication not found'
      });
    }

    await publication.destroy();

    res.json({
      success: true,
      message: 'Publication deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting publication:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting publication',
      error: error.message
    });
  }
};

module.exports = {
  getAllPublications,
  getPublicationById,
  createPublication,
  updatePublication,
  deletePublication
};
