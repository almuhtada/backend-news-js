const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const About = sequelize.define('About', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  section_key: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Key identifier for section (e.g., main_intro, founders, vision, mission)'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Section title'
  },
  content: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    comment: 'Main content text'
  },
  image_url: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Image URL if applicable'
  },
  order_number: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Display order'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional metadata in JSON format'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'about_sections',
  timestamps: true
});

module.exports = About;
