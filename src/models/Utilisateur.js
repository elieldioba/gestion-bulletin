'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/config');

const Utilisateur = sequelize.define('Utilisateur', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nomUtilisateur: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  motDePasse: {
    type: DataTypes.STRING(255),
    allowNull: false
  },

  role: {
    type: DataTypes.ENUM(
      'ADMINISTRATEUR',
      'ENSEIGNANT',
      'SECRETARIAT_PEDAGOGIQUE',
      'ETUDIANT'
    ),
    allowNull: false
  },

  estActif: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'utilisateurs',
  timestamps: true
});

module.exports = Utilisateur;