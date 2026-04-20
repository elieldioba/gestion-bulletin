'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/config');

const MoyenneMatiere = sequelize.define('MoyenneMatiere', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  moyenne: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  rattrapageUtilise: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  etudiantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'etudiants', key: 'id' }
  },
  matiereId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'matieres', key: 'id' }
  }
}, {
  tableName: 'moyennes_matieres',
  timestamps: true
});

module.exports = MoyenneMatiere;