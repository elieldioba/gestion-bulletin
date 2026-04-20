'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/config');

const LogAudit = sequelize.define('LogAudit', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  action: {
    type: DataTypes.ENUM(
      'CREATION_NOTE',
      'MODIFICATION_NOTE',
      'SUPPRESSION_NOTE',
      'CREATION_ETUDIANT',
      'MODIFICATION_ETUDIANT',
      'SUPPRESSION_ETUDIANT',
      'CREATION_ABSENCE',
      'MODIFICATION_ABSENCE',
      'IMPORT_EXCEL',
      'GENERATION_BULLETIN',
      'CONNEXION'
    ),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  utilisateurId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'utilisateurs', key: 'id' }
  },
  ipAdresse: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  donnéesAvant: {
    type: DataTypes.JSON,
    allowNull: true
  },
  donnéesAprès: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'logs_audit',
  timestamps: true,
  updatedAt: false
});

module.exports = LogAudit;