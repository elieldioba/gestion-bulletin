'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/config');

const ResultatAnnuel = sequelize.define('ResultatAnnuel', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  moyenneAnnuelle: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  decisionJury: {
    type: DataTypes.ENUM(
      'DIPLOME',
      'REPRISE_SOUTENANCE',
      'REDOUBLE'
    ),
    allowNull: true
  },
  mention: {
    type: DataTypes.ENUM(
      'PASSABLE',
      'ASSEZ_BIEN',
      'BIEN',
      'TRES_BIEN'
    ),
    allowNull: true
  },
  annee: {
    type: DataTypes.STRING(9),
    allowNull: false
  },
  etudiantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'etudiants', key: 'id' }
  }
}, {
  tableName: 'resultats_annuels',
  timestamps: true
});

module.exports = ResultatAnnuel;