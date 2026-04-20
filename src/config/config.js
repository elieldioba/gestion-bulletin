require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.NOM_DB || process.env.DB_NAME,
  process.env.utilisateur || process.env.DB_USER,
  process.env.mot_de_passe || process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.PORT_DB || process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    dialectOptions: {
      connectTimeout: 60000 // Optionnel : utile pour éviter les timeouts sur les connexions distantes
    }
  }
);

module.exports = sequelize;