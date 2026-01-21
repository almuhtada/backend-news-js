const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Publication = sequelize.define('Publication', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Title of the publication'
  },
  authors: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Authors of the publication'
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Year of publication'
  },
  journal: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Journal name'
  },
  link: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Link to the publication'
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
  tableName: 'publications',
  timestamps: true
});

module.exports = Publication;
