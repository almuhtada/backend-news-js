const { Post, User, Category } = require('../schema');
const { Op } = require('sequelize');

// Get author/editor details with their posts
const getAuthorPosts = async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Find user by username or ID
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username: username },
          { id: username }
        ]
      },
      attributes: ['id', 'username', 'email', 'display_name', 'first_name', 'last_name', 'role', 'user_url', 'createdAt']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Author not found'
      });
    }

    // Get posts by this author
    const { count, rows: posts } = await Post.findAndCountAll({
      where: {
        author_id: user.id,
        status: 'publish'
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'display_name']
        },
        {
          model: Category,
          as: 'categories',
          attributes: ['id', 'name', 'slug'],
          through: { attributes: [] }
        }
      ],
      order: [['published_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        author: user,
        posts: posts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalPosts: count,
          postsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching author posts:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error fetching author posts',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = {
  getAuthorPosts
};
