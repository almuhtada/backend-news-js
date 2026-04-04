const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Achievement = sequelize.define('Achievement', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Title of the achievement'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Name of the student who achieved'
  },
  years: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Year of achievement'
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
  tableName: 'achievements',
  timestamps: true
});

module.exports = Achievement;
