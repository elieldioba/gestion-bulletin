'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/config');

const Evaluation = sequelize.define('Evaluation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type: {
    type: DataTypes.ENUM('CC', 'EXAMEN', 'RATTRAPAGE'),
    allowNull: false
  },
  note: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: 0,
      max: 20
    }
  },
  dateSaisie: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW
  },
  matiereId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'matieres', key: 'id' }
  },
  etudiantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'etudiants', key: 'id' }
  }
}, {
  tableName: 'evaluations',
  timestamps: true
});

module.exports = Evaluation;