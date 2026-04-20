'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/config');

const Absence = sequelize.define('Absence', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  heures: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
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
  tableName: 'absences',
  timestamps: true
});

module.exports = Absence;