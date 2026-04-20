'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/config');

const Etudiant = sequelize.define('Etudiant', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nom: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  prenom: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  dateNaissance: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  lieuNaissance: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  typeBac: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  provenance: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  utilisateurId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'utilisateurs',
      key: 'id'
    }
  }
}, {
  tableName: 'etudiants',
  timestamps: true
});

module.exports = Etudiant;