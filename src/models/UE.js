'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/config');

const UE = sequelize.define('UE', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  libelle: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  semestreId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'semestres',
      key: 'id'
    }
  }
}, {
  tableName: 'ues',
  timestamps: true
});

module.exports = UE;