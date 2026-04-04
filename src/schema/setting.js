const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Setting = sequelize.define('Setting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Setting key (e.g., site_name, email, facebook_url)'
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Setting value'
  },
  group: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'general',
    comment: 'Setting group (general, contact, social)'
  },
  label: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Human readable label'
  },
  type: {
    type: DataTypes.ENUM('text', 'textarea', 'email', 'url', 'image'),
    defaultValue: 'text',
    comment: 'Input type for the setting'
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
  tableName: 'settings',
  timestamps: true
});

module.exports = Setting;
