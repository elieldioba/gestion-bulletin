'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/config');

const Semestre = sequelize.define('Semestre', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  libelle: {
    type: DataTypes.ENUM('S5', 'S6'),
    allowNull: false
  },
  anneeUniversitaire: {
    type: DataTypes.STRING(9),
    allowNull: false
  }
}, {
  tableName: 'semestres',
  timestamps: true
});

module.exports = Semestre;