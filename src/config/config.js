'use strict';

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  'gestion_bulletins',
  'root',
  '',
  {
    host: 'localhost',
    port: 3306,
    dialect: 'mysql',
    logging: false
  }
);

module.exports = sequelize;