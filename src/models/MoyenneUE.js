'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/config');

const MoyenneUE = sequelize.define('MoyenneUE', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  moyenne: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  creditsAcquis: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  compense: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  etudiantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'etudiants', key: 'id' }
  },
  ueId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'ues', key: 'id' }
  }
}, {
  tableName: 'moyennes_ues',
  timestamps: true
});

module.exports = MoyenneUE;