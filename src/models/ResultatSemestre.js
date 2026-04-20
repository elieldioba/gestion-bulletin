'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/config');

const ResultatSemestre = sequelize.define('ResultatSemestre', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  moyenneSemestre: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  creditsTotal: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  valide: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  etudiantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'etudiants', key: 'id' }
  },
  semestreId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'semestres', key: 'id' }
  }
}, {
  tableName: 'resultats_semestres',
  timestamps: true
});

module.exports = ResultatSemestre;