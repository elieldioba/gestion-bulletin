'use strict';

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'railway',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'GNUerbqNSfKmnGAJMfOtQtoMMrkUthml',
  {
    host: process.env.DB_HOST || 'shinkansen.proxy.rlwy.net',
    port: parseInt(process.env.DB_PORT) || 14956,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      connectTimeout: 60000
    }
  }
);

module.exports = sequelize;