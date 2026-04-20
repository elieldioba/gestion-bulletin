'use strict';

const app = require('./app');
const { sequelize } = require('./src/models/index');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion MySQL réussie');

    await sequelize.sync({ alter: false });
    console.log('✅ Base de données synchronisée');

    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('❌ Erreur de démarrage :', error);
    process.exit(1);
  }
}

startServer();