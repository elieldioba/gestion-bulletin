// Charge les variables du fichier .env
require('dotenv').config();

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,     // Nom de la base (ex: gestion_bulletins)
  process.env.DB_USER,     // Utilisateur (ex: root)
  process.env.DB_PASSWORD, // Mot de passe (vide en local par défaut)
  {
    host: process.env.DB_HOST, // S'adaptera à 'localhost' ou à l'URL Railway
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false
  }
);

module.exports = sequelize;