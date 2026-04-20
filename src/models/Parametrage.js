'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/config');

const Parametrage = sequelize.define('Parametrage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cle: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  valeur: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'parametrages',
  timestamps: true
});

module.exports = Parametrage;