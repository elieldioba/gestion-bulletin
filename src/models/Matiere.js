'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/config');

const Matiere = sequelize.define('Matiere', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  libelle: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  coefficient: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  credits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  ueId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'ues',
      key: 'id'
    }
  }
}, {
  tableName: 'matieres',
  timestamps: true
});

module.exports = Matiere;